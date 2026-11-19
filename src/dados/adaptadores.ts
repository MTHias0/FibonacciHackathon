import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { basename, join, posix, relative, sep } from "node:path";
import { z } from "zod";
import type { Adaptador, Alteracao, LawUri, Norma, Origem, Situacao } from "../types.ts";
import { CATALOGO } from "./catalogo.ts";
import { lerFrontmatter, texto } from "./frontmatter.ts";
import { alteracaoDeNota, alteracoesInline, dividirArtigos, estaRevogado, referenciaAto, slug, tituloDoCorpo } from "./texto.ts";

/** Lista arquivos .md recursivamente, ignorando pastas ocultas (.git…) e arquivos de documentação. */
export async function arquivosMd(dir: string): Promise<string[]> {
  const entradas = await readdir(dir, { withFileTypes: true, recursive: true });
  return entradas
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !/^(README|FONTES|LEIAME)/i.test(e.name) &&
      !relative(dir, e.parentPath).split(sep).some((p) => p.startsWith(".")))
    .map((e) => join(e.parentPath, e.name))
    .sort();
}

/** "art-049" → "art-49", "adct-art-001" → "adct-art-1", "art-103-a" → "art-103-a". */
export function normalizarArtigo(id: string): string {
  return id.toLowerCase().replace(/(^|-)0+(\d)/g, "$1$2");
}

/** Gera a norma inteira e um item por artigo, a partir do corpo em Markdown. */
function normaComArtigos(base: Norma, corpo: string, nomeCurto: string, extrairNotas: boolean): Norma[] {
  const itens: Norma[] = [base];
  for (const art of dividirArtigos(corpo)) {
    const alteracoes = extrairNotas ? alteracoesInline(art.texto) : [];
    itens.push({
      uri: `${base.uri}/${art.id}`,
      jurisdicao: base.jurisdicao,
      tipo: base.jurisdicao === "es" ? "artículo" : "artigo",
      titulo: `${art.rotulo}, ${nomeCurto}`,
      numero: art.rotulo.replace(/^Art\.\s*/, ""),
      ...(base.data ? { data: base.data } : {}),
      situacao: estaRevogado(art.texto) ? "revogada" : base.situacao,
      fonte: base.fonte,
      texto: art.texto,
      origem: { ...base.origem },
      ...(alteracoes.length ? { alteracoes } : {}),
    });
  }
  return itens;
}

/**
 * Brasil federal, a partir de Evaldoes/legislacao-br (CC0): um arquivo por artigo, com âncoras de inciso/§
 * e `notas` por dispositivo (genealogia). Snapshot: data/snapshot/br-federal/<norma>/{_norma.md, art-NNN.md}
 */
export const legislacaoBr: Adaptador = {
  nome: "Evaldoes/legislacao-br",
  jurisdicoes: ["br/federal"],
  async carregar(dir) {
    const normas: Norma[] = [];
    for (const pasta of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory())) {
      const base = join(dir, pasta.name);
      const cab = lerFrontmatter(await readFile(join(base, "_norma.md"), "utf8"));
      const id = texto(cab.meta.norma) ?? pasta.name;
      const nome = texto(cab.meta.nome) ?? id;
      const data = texto(cab.meta.data);
      const fonte = texto(cab.meta.fonte) ?? "";
      const uriNorma: LawUri = `law://br/federal/${id}`;
      normas.push({
        uri: uriNorma, jurisdicao: "br/federal", tipo: texto(cab.meta.tipo) ?? "norma", titulo: nome,
        ...(data ? { data } : {}), situacao: "vigente", fonte, texto: cab.corpo,
        apelidos: [nome, ...(Array.isArray(cab.meta.apelidos) ? cab.meta.apelidos.map(String) : [])],
        origem: { repo: this.nome, caminho: `normas/${pasta.name}/_norma.md` },
      });
      for (const arquivo of (await readdir(base)).sort()) {
        if (arquivo === "_norma.md" || !arquivo.endsWith(".md")) continue;
        const { meta, corpo } = lerFrontmatter(await readFile(join(base, arquivo), "utf8"));
        const numero = texto(meta.artigo);
        const alteracoes: Alteracao[] = Array.isArray(meta.notas)
          ? meta.notas.flatMap((n: unknown) => {
              const o = n as { dispositivo?: unknown; texto?: unknown };
              const t = texto(o?.texto);
              return t ? [alteracaoDeNota(texto(o.dispositivo) ?? "caput", t)] : [];
            })
          : [];
        normas.push({
          uri: `${uriNorma}/${normalizarArtigo(basename(arquivo, ".md"))}`,
          jurisdicao: "br/federal", tipo: "artigo", titulo: `${texto(meta.rotulo) ?? arquivo}, ${nome}`,
          ...(numero ? { numero } : {}), ...(data ? { data } : {}),
          situacao: meta.revogado === true ? "revogada" : "vigente",
          fonte: texto(meta.fonte) ?? fonte, texto: corpo,
          origem: { repo: this.nome, caminho: `normas/${pasta.name}/${arquivo}` },
          ...(alteracoes.length ? { alteracoes } : {}),
        });
      }
    }
    return normas;
  },
};

/** "urn:lex:br:federal:decreto.lei:1940-12-07;2848" → "decreto-lei-2848-1940". */
export function idDeUrn(urn: string | undefined): string | undefined {
  const m = /^urn:lex:br:federal:([a-z.]+):(\d{4})-\d{2}-\d{2};([\w.-]+)$/i.exec(urn ?? "");
  return m ? `${m[1]!.replace(/\./g, "-")}-${m[3]!.replace(/\./g, "")}-${m[2]}` : undefined;
}

/**
 * Brasil federal, a partir de LawCodex/br (texto compilado do Planalto, só redação em vigor): um arquivo por norma.
 * Códigos e leis-chave para advogados. Snapshot: data/snapshot/br-federal-lawcodex/{codigos,leis,…}/…
 */
export const lawCodexBr: Adaptador = {
  nome: "LawCodex/br",
  jurisdicoes: ["br/federal"],
  async carregar(dir) {
    const normas: Norma[] = [];
    for (const arquivo of await arquivosMd(dir)) {
      const { meta, corpo } = lerFrontmatter(await readFile(arquivo, "utf8"));
      const id = idDeUrn(texto(meta.identifier)) ?? basename(arquivo, ".md");
      const cat = CATALOGO.find((e) => e.jurisdicao === "br/federal" && e.id === id);
      const tituloOficial = texto(meta.title) ?? id;
      const nome = cat?.nome ?? tituloOficial;
      const data = texto(meta.date);
      const situacao: Situacao = meta.status === "repealed" ? "revogada" : "vigente";
      const base: Norma = {
        uri: `law://br/federal/${id}`, jurisdicao: "br/federal",
        tipo: meta.type === "code" ? "código" : (id.match(/^[a-z]+(?:-[a-z]+)*?(?=-\d)/)?.[0] ?? "norma").replace(/-/g, " "),
        titulo: cat ? `${cat.nome} (${referenciaAto(tituloOficial)?.rotulo ?? tituloOficial})` : `${tituloOficial}${texto(meta.ementa) ? `: ${texto(meta.ementa)}` : ""}`,
        ...(data ? { data } : {}), situacao, fonte: texto(meta.source) ?? "", texto: corpo,
        apelidos: [tituloOficial],
        origem: { repo: this.nome, caminho: relative(dir, arquivo).split(sep).join("/") },
      };
      normas.push(...normaComArtigos(base, corpo, nome, true));
    }
    return normas;
  },
};

/**
 * Município, a partir de ctresb/leis (textos oficiais): um arquivo por norma.
 * Para adicionar um município, registre em data/snapshot/fontes.json com formato "ctresb".
 */
export function ctresbMunicipio(jurisdicao: string, caminhoNoRepo: string, repo = "ctresb/leis"): Adaptador {
  return {
    nome: repo,
    jurisdicoes: [jurisdicao],
    async carregar(dir) {
      const normas: Norma[] = [];
      for (const arquivo of await arquivosMd(dir)) {
        const { meta, corpo } = lerFrontmatter(await readFile(arquivo, "utf8"));
        const numero = texto(meta.numero);
        const data = texto(meta.data);
        const situacao: Situacao = meta.revogada === true ? "revogada" : meta.revogada === false ? "vigente" : "desconhecida";
        normas.push({
          uri: `law://${jurisdicao}/${basename(arquivo, ".md")}`, jurisdicao,
          tipo: (texto(meta.tipo) ?? "norma").toLowerCase(),
          titulo: texto(meta.titulo) ?? basename(arquivo, ".md"),
          ...(numero ? { numero } : {}), ...(data ? { data } : {}),
          situacao, fonte: texto(meta.fonte) ?? "", texto: corpo,
          origem: { repo, caminho: posix.join(caminhoNoRepo, relative(dir, arquivo).split(sep).join("/")) },
        });
      }
      return normas;
    },
  };
}

/**
 * Espanha, a partir de legalize-dev/legalize-es (dados do BOE): um arquivo por norma, artigos em "###### Artículo N".
 * Snapshot: data/snapshot/es/<bucket>/<BOE-id>.md (mesmo caminho do repo, para o permalink funcionar).
 */
export const legalizeEs: Adaptador = {
  nome: "legalize-dev/legalize-es",
  jurisdicoes: ["es"],
  async carregar(dir) {
    const normas: Norma[] = [];
    for (const arquivo of await arquivosMd(dir)) {
      const { meta, corpo } = lerFrontmatter(await readFile(arquivo, "utf8"));
      const id = texto(meta.identifier) ?? basename(arquivo, ".md");
      const titulo = texto(meta.title) ?? id;
      const data = texto(meta.publication_date);
      const numero = texto(meta.official_number);
      const cat = CATALOGO.find((e) => e.jurisdicao === "es" && e.id === id);
      const base: Norma = {
        uri: `law://es/${id}`, jurisdicao: "es", tipo: (texto(meta.rank) ?? "norma").toLowerCase(), titulo,
        ...(numero ? { numero } : {}), ...(data ? { data } : {}),
        situacao: meta.status === "in_force" ? "vigente" : meta.status ? "revogada" : "desconhecida",
        fonte: texto(meta.source) ?? texto(meta.url_html) ?? "", texto: corpo, apelidos: [titulo],
        origem: { repo: this.nome, caminho: `es/${relative(dir, arquivo).split(sep).join("/")}` },
      };
      normas.push(...normaComArtigos(base, corpo, cat?.nome ?? titulo, false));
    }
    return normas;
  },
};

/**
 * Ambiente sem as variáveis que um hook do git exporta (GIT_DIR, GIT_INDEX_FILE…). Com elas, o git ignora o cwd
 * e lê ou commita no repositório de quem chamou: um pre-push rodando npm test commitava normas de teste no projeto.
 */
export const envGit = (): NodeJS.ProcessEnv => Object.fromEntries(Object.entries(process.env)
  .filter(([k]) => !/^GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|COMMON_DIR|NAMESPACE|PREFIX)$/.test(k)));

/** Commit atual de um repositório git local, se houver. */
function commitAtual(dir: string): string | undefined {
  if (!existsSync(join(dir, ".git"))) return undefined;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, env: envGit(), stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return undefined;
  }
}

/**
 * Uma norma em Markdown genérico, dividida em artigos. Frontmatter opcional: titulo, tipo, numero, data, fonte,
 * apelidos, revogada (true/false). Sem titulo, vale o primeiro "# Título" e depois o nome do arquivo.
 */
async function normasDeMarkdown(arquivo: string, jurisdicao: string, origem: Origem, padrao: { tipo: string; situacao: Situacao }): Promise<Norma[]> {
  const { meta, corpo } = lerFrontmatter(await readFile(arquivo, "utf8"));
  const titulo = texto(meta.titulo) ?? texto(meta.title) ?? tituloDoCorpo(corpo) ?? basename(arquivo, ".md");
  const numero = texto(meta.numero);
  const data = texto(meta.data);
  const base: Norma = {
    uri: `law://${jurisdicao}/${slug(basename(arquivo, ".md"))}`, jurisdicao,
    tipo: (texto(meta.tipo) ?? padrao.tipo).toLowerCase(), titulo,
    ...(numero ? { numero } : {}), ...(data ? { data } : {}),
    situacao: meta.revogada === true ? "revogada" : meta.revogada === false ? "vigente" : padrao.situacao,
    fonte: texto(meta.fonte) ?? "", texto: corpo,
    apelidos: [titulo, ...(Array.isArray(meta.apelidos) ? meta.apelidos.map(String) : [])],
    origem,
  };
  return normaComArtigos(base, corpo, titulo, false);
}

/** Pasta de Markdown genérico (um .md por norma), registrada em fontes.json com formato "markdown". */
export function pastaMarkdown(jurisdicao: string, caminhoNoRepo: string, repo?: string): Adaptador {
  return {
    nome: repo ?? "manual",
    jurisdicoes: [jurisdicao],
    async carregar(dir) {
      const normas: Norma[] = [];
      for (const arquivo of await arquivosMd(dir)) {
        const caminho = posix.join(caminhoNoRepo, relative(dir, arquivo).split(sep).join("/"));
        normas.push(...(await normasDeMarkdown(arquivo, jurisdicao, { repo: repo ?? "manual", caminho }, { tipo: "norma", situacao: "desconhecida" })));
      }
      return normas;
    },
  };
}

/** Lê uma norma privada salva por adicionar_norma ou importar_normas (data/local/<organizacao>/<slug>.md). */
export async function normasDeArquivoLocal(dir: string, arquivo: string, commit?: string): Promise<Norma[]> {
  const rel = relative(dir, arquivo).split(sep).join("/");
  const origem: Origem = { repo: "local", caminho: rel, ...(commit ? { commit } : {}) };
  return normasDeMarkdown(arquivo, `local/${rel.split("/")[0]!}`, origem, { tipo: "norma interna", situacao: "vigente" });
}

/** Normas privadas de escritórios e empresas (B2B), versionadas num repositório git próprio em data/local/. */
export const normasLocais: Adaptador = {
  nome: "local",
  jurisdicoes: ["local"],
  async carregar(dir) {
    const commit = commitAtual(dir);
    const normas: Norma[] = [];
    for (const arquivo of await arquivosMd(dir)) normas.push(...(await normasDeArquivoLocal(dir, arquivo, commit)));
    return normas;
  },
};

/** Fontes oficiais com adaptador próprio: pasta do snapshot → adaptador. As demais vêm de fontes.json. */
export const FONTES: { pasta: string; adaptador: Adaptador }[] = [
  { pasta: "br-federal", adaptador: legislacaoBr },
  { pasta: "br-federal-lawcodex", adaptador: lawCodexBr },
  { pasta: "es", adaptador: legalizeEs },
];

const FonteConfig = z.object({
  pasta: z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/, "slug"),
  jurisdicao: z.string().regex(/^[a-z]{2,}(?:\/[a-z0-9-]+)*$/, "ex.: br/sp/campinas")
    .refine((j) => !/^local(\/|$)/.test(j), "local/ é reservado para normas privadas"),
  formato: z.enum(["ctresb", "markdown"]),
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, "dono/repositorio do GitHub").optional(),
  caminho: z.string().regex(/^(?!\/)(?!.*\.\.)[\w./-]+$/, "caminho relativo dentro do repo").default("."),
  ignorar: z.string().optional(),
});
export type FonteConfig = z.infer<typeof FonteConfig>;

/**
 * Fontes registradas sem programar em <snapshot>/fontes.json. Formatos: "ctresb" (município do ctresb/leis) ou
 * "markdown" (um .md por norma). Sem repo, os arquivos ficam direto em <snapshot>/<pasta>/.
 */
export function fontesConfiguradas(dirSnapshot: string): FonteConfig[] {
  const arquivo = join(dirSnapshot, "fontes.json");
  if (!existsSync(arquivo)) return [];
  const r = z.object({ fontes: z.array(FonteConfig) }).safeParse(JSON.parse(readFileSync(arquivo, "utf8")));
  if (!r.success) throw new Error(`${arquivo} inválido: ${r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  const pastas = new Set(FONTES.map((f) => f.pasta));
  for (const f of r.data.fontes) {
    if (pastas.has(f.pasta)) throw new Error(`${arquivo}: pasta "${f.pasta}" repetida.`);
    pastas.add(f.pasta);
  }
  return r.data.fontes;
}

/** FONTES de código mais as de fontes.json. */
export function todasAsFontes(dirSnapshot: string): { pasta: string; adaptador: Adaptador }[] {
  return [...FONTES, ...fontesConfiguradas(dirSnapshot).map((f) => ({
    pasta: f.pasta,
    adaptador: f.formato === "ctresb" ? ctresbMunicipio(f.jurisdicao, f.caminho, f.repo) : pastaMarkdown(f.jurisdicao, f.caminho, f.repo),
  }))];
}
