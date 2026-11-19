import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { stringify } from "yaml";
import type { AdicionarNormaEntrada, ImportarNormasEntrada, VersaoNorma } from "../types.ts";
import { arquivosMd, envGit } from "./adaptadores.ts";
import { lerFrontmatter, texto } from "./frontmatter.ts";
import { dividirArtigos, slug, tituloDoCorpo } from "./texto.ts";

export const SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;
const MAX_ARQUIVOS = 500;
const MAX_TEXTO_NORMA = 200_000;
/** Versões mostradas por historico_norma. */
const MAX_VERSOES = 50;

const git = (dir: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=LawMCP", "-c", "user.email=lawmcp@local", "-c", "commit.gpgsign=false", ...args], {
    cwd: dir, env: envGit(), stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024,
  }).toString().trim();

const head = (raiz: string) => { try { return git(raiz, "rev-parse", "HEAD"); } catch { return ""; } };

export interface NormaSalva { arquivo: string; titulo: string; novaVersao: boolean; mudou: boolean }

/**
 * Grava normas privadas em <dir>/<organizacao>/<slug>.md e faz um único commit no repositório git de dir
 * com as que mudaram. Mesma norma de novo = nova versão no histórico.
 */
export function salvarNormasLocais(dir: string, entradas: AdicionarNormaEntrada[]): { salvas: NormaSalva[]; commit: string } {
  const raiz = resolve(dir);
  const salvas: NormaSalva[] = [];
  for (const e of entradas) {
    if (!SLUG.test(e.organizacao)) throw new Error("organizacao deve ser um slug: letras minúsculas, números e hífen (ex.: escritorio-silva).");
    const arquivo = resolve(raiz, e.organizacao, `${slug(e.titulo)}.md`);
    if (!arquivo.startsWith(raiz + sep)) throw new Error("Caminho inválido.");
    const meta = {
      titulo: e.titulo, tipo: e.tipo, ...(e.numero ? { numero: e.numero } : {}), ...(e.data ? { data: e.data } : {}),
      fonte: e.fonte, ...(e.apelidos?.length ? { apelidos: e.apelidos } : {}),
    };
    const conteudo = `---\n${stringify(meta).trim()}\n---\n\n${e.texto.trim()}\n`;
    const novaVersao = existsSync(arquivo);
    const mudou = !novaVersao || readFileSync(arquivo, "utf8") !== conteudo;
    if (mudou) {
      mkdirSync(join(raiz, e.organizacao), { recursive: true });
      writeFileSync(arquivo, conteudo);
    }
    salvas.push({ arquivo, titulo: e.titulo, novaVersao, mudou });
  }
  const mudaram = salvas.filter((s) => s.mudou);
  if (mudaram.length) {
    if (!existsSync(join(raiz, ".git"))) git(raiz, "init", "-q");
    const rels = mudaram.map((s) => relative(raiz, s.arquivo).split(sep).join("/"));
    const unica = salvas.length === 1 ? salvas[0]! : undefined;
    const mensagem = unica
      ? `${unica.novaVersao ? "Atualiza" : "Adiciona"} ${unica.titulo}`
      : `Importa ${mudaram.length} norma(s) em ${entradas[0]!.organizacao}`;
    git(raiz, "add", "--", ...rels);
    git(raiz, "commit", "-q", "-m", mensagem, "--", ...rels);
  }
  return { salvas, commit: head(raiz) };
}

export function salvarNormaLocal(dir: string, e: AdicionarNormaEntrada): { arquivo: string; commit: string; novaVersao: boolean } {
  const { salvas, commit } = salvarNormasLocais(dir, [e]);
  return { arquivo: salvas[0]!.arquivo, commit, novaVersao: salvas[0]!.novaVersao && salvas[0]!.mudou };
}

/**
 * Lê uma pasta de Markdown (um .md por norma, frontmatter opcional) para importar_normas.
 * Só lê .md; pula README, pastas ocultas, arquivos vazios ou grandes demais e títulos repetidos.
 */
export async function lerPastaParaImportar(e: ImportarNormasEntrada): Promise<{ entradas: AdicionarNormaEntrada[]; ignorados: { arquivo: string; motivo: string }[] }> {
  const caminho = e.pasta.replace(/^~(?=\/|$)/, homedir());
  if (!isAbsolute(caminho) || !statSync(caminho, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`"${e.pasta}" não é uma pasta. Use o caminho absoluto, ex.: /Users/ana/Documentos/politicas.`);
  }
  const pasta = resolve(caminho);
  const arquivos = await arquivosMd(pasta);
  if (!arquivos.length) throw new Error(`Nenhum arquivo .md em ${pasta}.`);
  if (arquivos.length > MAX_ARQUIVOS) throw new Error(`${arquivos.length} arquivos .md; o limite por importação é ${MAX_ARQUIVOS}. Importe por subpastas.`);

  const entradas: AdicionarNormaEntrada[] = [];
  const ignorados: { arquivo: string; motivo: string }[] = [];
  const vistos = new Map<string, string>();
  for (const arquivo of arquivos) {
    const rel = relative(pasta, arquivo).split(sep).join("/");
    const { meta, corpo } = lerFrontmatter(await readFile(arquivo, "utf8"));
    if (corpo.trim().length < 10) { ignorados.push({ arquivo: rel, motivo: "texto vazio" }); continue; }
    if (corpo.length > MAX_TEXTO_NORMA) { ignorados.push({ arquivo: rel, motivo: `maior que ${MAX_TEXTO_NORMA} caracteres` }); continue; }
    const titulo = texto(meta.titulo) ?? texto(meta.title) ?? tituloDoCorpo(corpo) ?? basename(arquivo, ".md");
    const anterior = vistos.get(slug(titulo));
    if (anterior) { ignorados.push({ arquivo: rel, motivo: `mesmo título de ${anterior}` }); continue; }
    vistos.set(slug(titulo), rel);
    const numero = texto(meta.numero);
    const data = texto(meta.data);
    const apelidos = Array.isArray(meta.apelidos) ? meta.apelidos.map(String) : [];
    entradas.push({
      organizacao: e.organizacao, tipo: texto(meta.tipo) ?? e.tipo ?? "norma interna", titulo,
      ...(numero ? { numero } : {}), ...(data ? { data } : {}),
      fonte: texto(meta.fonte) ?? e.fonte ?? `importado de ${basename(pasta)}/${rel}`,
      texto: corpo, ...(apelidos.length ? { apelidos } : {}),
    });
  }
  return { entradas, ignorados };
}

/**
 * Versões de uma norma privada no git local, da mais nova para a mais antiga, com os artigos incluídos,
 * alterados e removidos em cada commit. Com artigo ("art-2"), só os commits que mexeram nele.
 */
export function versoesLocais(dir: string, caminho: string, artigo?: string): VersaoNorma[] {
  const raiz = resolve(dir);
  let log: string;
  try {
    log = git(raiz, "log", "-n", String(MAX_VERSOES + 1), "--format=%H%x09%aI%x09%s", "--", caminho);
  } catch {
    return [];
  }
  const linhas = log ? log.split("\n").map((l) => l.split("\t") as [string, string, string]).reverse() : [];
  const artigosEm = (commit: string) => {
    let conteudo = "";
    try { conteudo = git(raiz, "show", `${commit}:${caminho}`); } catch { /* commit que apagou o arquivo */ }
    return new Map(dividirArtigos(lerFrontmatter(conteudo).corpo).map((a) => [a.id, a.texto.replace(/\s+/g, " ").trim()]));
  };
  let anterior = new Map<string, string>();
  const versoes: VersaoNorma[] = [];
  for (const [commit, data, mensagem] of linhas) {
    const atual = artigosEm(commit);
    versoes.push({
      commit, data, mensagem,
      incluidos: [...atual.keys()].filter((k) => !anterior.has(k)),
      alterados: [...atual.keys()].filter((k) => anterior.has(k) && anterior.get(k) !== atual.get(k)),
      removidos: [...anterior.keys()].filter((k) => !atual.has(k)),
    });
    anterior = atual;
  }
  // A mais antiga da janela foi comparada com nada; só vale se for mesmo a primeira versão.
  if (linhas.length > MAX_VERSOES) versoes.shift();
  versoes.reverse();
  if (!artigo) return versoes;
  const so = (l: string[]) => l.filter((a) => a === artigo);
  return versoes
    .map((v) => ({ ...v, incluidos: so(v.incluidos), alterados: so(v.alterados), removidos: so(v.removidos) }))
    .filter((v) => v.incluidos.length + v.alterados.length + v.removidos.length > 0);
}
