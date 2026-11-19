import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Alteracao, BuscarNormasEntrada, BuscarNormasSaida, HistoricoNormaSaida, ImpactoNormaSaida, LawUri,
  ListarJurisdicoesSaida, Norma, TipoAlteracao,
} from "../types.ts";
import { FONTES, normasLocais } from "./adaptadores.ts";
import { CATALOGO, uriCatalogo } from "./catalogo.ts";
import {
  dividirDispositivos, estaRevogado, normalizar, normalizarAlinhado, referenciaAto, rotuloDispositivo, tokenizar,
} from "./texto.ts";

/** data/snapshot/manifest.json, escrito por npm run data:fetch: commit exato de cada fonte. */
type Manifesto = Record<string, { repo: string; commit: string; atualizado_em: string }>;

interface Alterado {
  uri: LawUri;
  normaAlterada: LawUri;
  dispositivo: string;
  tipo: TipoAlteracao;
  nota: string;
}

export interface Apelido {
  /** Normalizado (minúsculo, sem acento). */
  apelido: string;
  /** Como foi escrito no catálogo ou na fonte. */
  original: string;
  /** Sigla ("CF", "CDC", "CF/88"): casa só em maiúsculas, para "cc" ou "et" soltos no texto não virarem citação. */
  sigla: boolean;
  /** Global; aplicar ao texto sem acento, minúsculo se não for sigla. */
  re: RegExp;
  uri: LawUri;
  jurisdicao: string;
  nome: string;
}

const K1 = 1.2;
const B = 0.75;
const PESO_TITULO = 3;
/** …/art-5/inc-13 → [artigo, dispositivo] */
const URI_DISPOSITIVO = /^(law:\/\/.+\/(?:adct-)?art-[\w-]+?)\/(caput|inc-\d+|par-\d+|par-unico)$/;
const URI_ARTIGO = /^(law:\/\/.+)\/((?:adct-)?art-[\w-]+)$/;

export function permalink(repo: string, commit: string, caminho: string): string {
  return `https://github.com/${repo}/blob/${commit}/${caminho.split("/").map(encodeURIComponent).join("/")}`;
}

/** URI do dispositivo dentro do artigo ("caput" é o próprio artigo). */
export function uriDispositivo(uriArtigo: string, dispositivo: string): LawUri {
  return (dispositivo === "caput" ? uriArtigo : `${uriArtigo}/${dispositivo}`) as LawUri;
}

/**
 * Índice em memória: BM25 sobre índice invertido (título com peso 3), genealogia reversa e apelidos para citações.
 * shortcut: tudo em memória e sem persistência do índice; com mais de ~200 mil normas, mover para SQLite FTS5.
 */
export class Indice {
  private readonly docs: Norma[] = [];
  private readonly porUri = new Map<string, number>();
  private readonly postings = new Map<string, number[]>();
  private readonly comprimentos: number[] = [];
  private somaComprimentos = 0;
  private readonly artigosPorNorma = new Map<string, string[]>();
  private readonly alteradasPor = new Map<string, Alterado[]>();
  private cacheApelidos: Apelido[] | undefined;
  readonly fontes: { pasta: string; repo: string; commit?: string }[] = [];

  constructor(normas: Norma[] = []) {
    for (const n of normas) this.adicionar(n);
  }

  /** Carrega as FONTES do snapshot (com permalinks do manifesto) e as normas locais (B2B), se houver. */
  static async carregar(dirSnapshot: string, dirLocal?: string): Promise<Indice> {
    const arqManifesto = join(dirSnapshot, "manifest.json");
    const manifesto: Manifesto = existsSync(arqManifesto) ? JSON.parse(readFileSync(arqManifesto, "utf8")) : {};
    const indice = new Indice();
    for (const { pasta, adaptador } of FONTES) {
      const dir = join(dirSnapshot, pasta);
      if (!existsSync(dir)) {
        console.error(`LawMCP: fonte "${pasta}" ausente em ${dir}. Rode npm run data:fetch.`);
        continue;
      }
      const m = manifesto[pasta];
      for (const n of await adaptador.carregar(dir)) {
        if (m) Object.assign(n.origem, { commit: m.commit, permalink: permalink(n.origem.repo, m.commit, n.origem.caminho) });
        indice.adicionar(n);
      }
      indice.fontes.push({ pasta, repo: adaptador.nome, ...(m ? { commit: m.commit } : {}) });
    }
    if (dirLocal && existsSync(dirLocal)) {
      for (const n of await normasLocais.carregar(dirLocal)) indice.adicionar(n);
      indice.fontes.push({ pasta: "local", repo: "local" });
    }
    return indice;
  }

  /** Indexa uma norma (também usado por adicionar_norma). URIs repetidas ficam com a primeira. */
  adicionar(n: Norma): boolean {
    if (this.porUri.has(n.uri)) return false;
    const i = this.docs.length;
    this.docs.push(n);
    this.porUri.set(n.uri, i);

    const tf = new Map<string, number>();
    let comprimento = 0;
    for (const t of tokenizar(n.titulo)) { tf.set(t, (tf.get(t) ?? 0) + PESO_TITULO); comprimento += PESO_TITULO; }
    for (const t of tokenizar(n.texto)) { tf.set(t, (tf.get(t) ?? 0) + 1); comprimento++; }
    for (const [t, f] of tf) {
      const p = this.postings.get(t);
      if (p) p.push(i, f);
      else this.postings.set(t, [i, f]);
    }
    this.comprimentos.push(comprimento);
    this.somaComprimentos += comprimento;

    const art = URI_ARTIGO.exec(n.uri);
    if (art) {
      const lista = this.artigosPorNorma.get(art[1]!) ?? [];
      lista.push(art[2]!);
      this.artigosPorNorma.set(art[1]!, lista);
    }
    for (const a of n.alteracoes ?? []) {
      if (!a.norma) continue;
      const lista = this.alteradasPor.get(a.norma) ?? [];
      lista.push({ uri: uriDispositivo(n.uri, a.dispositivo), normaAlterada: (art?.[1] ?? n.uri) as LawUri, dispositivo: a.dispositivo, tipo: a.tipo, nota: a.nota });
      this.alteradasPor.set(a.norma, lista);
    }
    if (n.apelidos?.length) this.cacheApelidos = undefined;
    return true;
  }

  /** Troca uma norma e seus artigos por uma nova versão. Os documentos antigos ficam órfãos e somem das respostas. */
  substituir(itens: Norma[]): void {
    const raiz = itens[0]?.uri;
    if (!raiz) return;
    for (const uri of [...this.porUri.keys()]) if (uri === raiz || uri.startsWith(`${raiz}/`)) this.porUri.delete(uri);
    this.artigosPorNorma.delete(raiz);
    for (const n of itens) this.adicionar(n);
  }

  private vivo(d: number): boolean {
    return this.porUri.get(this.docs[d]!.uri) === d;
  }

  get total(): number {
    return this.porUri.size;
  }

  /** Normas inteiras (sem artigos e dispositivos), para listar como resources. */
  principais(): Norma[] {
    return this.docs.filter((n, d) => this.vivo(d) && !URI_ARTIGO.test(n.uri));
  }

  /** Norma, artigo ou dispositivo (…/art-5/inc-13, …/art-59/par-1), extraído na hora. */
  ler(uri: string): Norma | undefined {
    const limpo = uri.trim().replace(/\/+$/, "");
    const i = this.porUri.get(limpo);
    if (i !== undefined) return this.docs[i];
    const m = URI_DISPOSITIVO.exec(limpo);
    if (!m) return undefined;
    const art = this.ler(m[1]!);
    if (!art) return undefined;
    const bloco = m[2] === "caput" ? dividirDispositivos(art.texto).get("caput") : dividirDispositivos(art.texto).get(m[2]!);
    if (!bloco) return undefined;
    const { apelidos: _, alteracoes, ...resto } = art;
    const dele = alteracoes?.filter((a) => a.dispositivo === m[2]);
    return {
      ...resto, uri: limpo as LawUri, tipo: "dispositivo",
      titulo: `${art.titulo.replace(/,.*$/, "")}, ${rotuloDispositivo(m[2]!)}, ${art.titulo.replace(/^[^,]*,\s*/, "")}`,
      texto: bloco, situacao: art.situacao === "revogada" || estaRevogado(bloco) ? "revogada" : art.situacao,
      ...(dele?.length ? { alteracoes: dele } : {}),
    };
  }

  /** Ids dos dispositivos de um artigo, para dizer o que existe quando a citação erra. */
  dispositivos(uriArtigo: string): string[] {
    const art = this.ler(uriArtigo);
    return art ? [...dividirDispositivos(art.texto).keys()] : [];
  }

  /** Faixa numérica dos artigos de uma norma (ex.: 1 a 119), ou undefined se ela não é dividida em artigos. */
  faixaArtigos(uriNorma: string): { min: number; max: number; total: number } | undefined {
    const nums = (this.artigosPorNorma.get(uriNorma) ?? []).map((a) => /^art-(\d+)/.exec(a)?.[1]).filter(Boolean).map(Number);
    return nums.length ? { min: Math.min(...nums), max: Math.max(...nums), total: nums.length } : undefined;
  }

  listarJurisdicoes(): ListarJurisdicoesSaida {
    const mapa = new Map<string, { tipos: Set<string>; total: number; fontes: Map<string, string | undefined> }>();
    for (const [d, n] of this.docs.entries()) {
      if (!this.vivo(d)) continue;
      const j = mapa.get(n.jurisdicao) ?? { tipos: new Set<string>(), total: 0, fontes: new Map() };
      j.tipos.add(n.tipo);
      j.total++;
      j.fontes.set(n.origem.repo, n.origem.commit);
      mapa.set(n.jurisdicao, j);
    }
    return {
      total: this.total,
      jurisdicoes: [...mapa].sort(([a], [b]) => a.localeCompare(b)).map(([jurisdicao, j]) => ({
        jurisdicao, tipos: [...j.tipos].sort(), total: j.total,
        fontes: [...j.fontes].map(([repo, commit]) => ({ repo, ...(commit ? { commit: commit.slice(0, 12) } : {}) })),
      })),
    };
  }

  buscar(e: BuscarNormasEntrada): BuscarNormasSaida {
    const termos = [...new Set(tokenizar(e.consulta))];
    if (!termos.length) return { resultados: [] };
    const limite = Math.min(Math.max(e.limite ?? 10, 1), 50);
    const tipo = e.tipo ? normalizar(e.tipo) : undefined;
    const passa = (n: Norma) =>
      (!e.jurisdicao || n.jurisdicao === e.jurisdicao || n.jurisdicao.startsWith(`${e.jurisdicao}/`)) &&
      (!tipo || normalizar(n.tipo).includes(tipo)) &&
      (!e.ano || (n.data?.startsWith(String(e.ano)) ?? false));

    const N = this.docs.length;
    const media = this.somaComprimentos / Math.max(N, 1);
    const score = new Map<number, number>();
    const casados = new Map<number, number>();
    for (const t of termos) {
      const p = this.postings.get(t);
      if (!p) continue;
      const df = p.length / 2;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      for (let k = 0; k < p.length; k += 2) {
        const d = p[k]!;
        const f = p[k + 1]!;
        const s = (idf * f * (K1 + 1)) / (f + K1 * (1 - B + (B * this.comprimentos[d]!) / media));
        score.set(d, (score.get(d) ?? 0) + s);
        casados.set(d, (casados.get(d) ?? 0) + 1);
      }
    }
    const minimo = termos.length <= 2 ? termos.length : Math.ceil(termos.length * 0.6);
    let candidatos = [...score]
      .filter(([d]) => (casados.get(d) ?? 0) >= minimo && this.vivo(d) && passa(this.docs[d]!))
      .map(([d, s]) => ({ d, s: s * ((casados.get(d) ?? 0) / termos.length) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, Math.max(limite * 4, 40));
    // Frase exata (com stopwords) vale mais: "direito de arrependimento".
    const frase = normalizar(e.consulta).replace(/[^a-z0-9]+/g, " ").trim();
    if (termos.length >= 2) {
      candidatos = candidatos
        .map((c) => {
          const n = this.docs[c.d]!;
          const alvo = normalizar(`${n.titulo} ${n.texto.slice(0, 200_000)}`).replace(/[^a-z0-9]+/g, " ");
          return alvo.includes(frase) ? { d: c.d, s: c.s * 1.8 } : c;
        })
        .sort((a, b) => b.s - a.s);
    }
    return {
      resultados: candidatos.slice(0, limite).map(({ d }) => {
        const { uri, jurisdicao, tipo: t, titulo, data, situacao, fonte, texto } = this.docs[d]!;
        return { uri, jurisdicao, tipo: t, titulo, ...(data ? { data } : {}), situacao, fonte, trecho: trecho(texto, termos) };
      }),
    };
  }

  /** Genealogia: para artigo/dispositivo, cada alteração; para norma inteira, quais normas mais a alteraram. */
  historico(uri: string): HistoricoNormaSaida | undefined {
    const n = this.ler(uri);
    if (!n) return undefined;
    const ehNormaInteira = !URI_ARTIGO.test(n.uri) && !URI_DISPOSITIVO.test(n.uri);
    const uriArtigo = URI_DISPOSITIVO.exec(n.uri)?.[1] ?? n.uri;
    const alteracoes = ehNormaInteira
      ? (this.artigosPorNorma.get(n.uri) ?? []).flatMap((a) =>
          (this.ler(`${n.uri}/${a}`)?.alteracoes ?? []).filter(relevante).map((x) => ({ ...x, uriDispositivo: uriDispositivo(`${n.uri}/${a}`, x.dispositivo) })))
      : (n.alteracoes ?? []).filter(relevante).map((x) => ({ ...x, uriDispositivo: uriDispositivo(uriArtigo, x.dispositivo) }));
    const porNorma = new Map<string, { norma?: LawUri; rotulo: string; total: number }>();
    for (const a of alteracoes) {
      if (!a.norma) continue;
      const atual = porNorma.get(a.norma) ?? { norma: a.norma, rotulo: a.rotuloNorma ?? a.norma, total: 0 };
      atual.total++;
      porNorma.set(a.norma, atual);
    }
    return {
      uri: n.uri, titulo: n.titulo,
      alteracoes: ehNormaInteira ? [] : alteracoes,
      alteradoras: [...porNorma.values()].sort((a, b) => b.total - a.total).slice(0, 40)
        .map((a) => ({ ...a, naBase: a.norma ? this.porUri.has(a.norma) : false })),
      total: alteracoes.length,
    };
  }

  /** Resolve "Lei 13.467/2017", "Reforma Trabalhista" ou uma URI para a URI da norma. */
  resolverNorma(entrada: string): { uri: LawUri; rotulo: string } | undefined {
    const t = entrada.trim();
    if (t.startsWith("law://")) return { uri: t.replace(/\/+$/, "") as LawUri, rotulo: this.ler(t)?.titulo ?? t };
    const ref = referenciaAto(t);
    if (ref) return { uri: `law://br/federal/${ref.id}`, rotulo: ref.rotulo };
    const alvo = normalizar(t);
    const ap = this.apelidos().find((a) => a.apelido === alvo);
    return ap ? { uri: ap.uri, rotulo: ap.nome } : undefined;
  }

  /** Impacto reverso: tudo o que uma norma alterou na base, agrupado pela norma alterada. */
  impacto(entrada: string, limite = 100): ImpactoNormaSaida | undefined {
    const alvo = this.resolverNorma(entrada);
    if (!alvo) return undefined;
    const lista = this.alteradasPor.get(alvo.uri) ?? [];
    const grupos = new Map<string, ImpactoNormaSaida["porNorma"][number]>();
    let restantes = Math.min(Math.max(limite, 1), 500);
    for (const a of lista) {
      const g = grupos.get(a.normaAlterada) ?? { uri: a.normaAlterada, titulo: this.ler(a.normaAlterada)?.titulo ?? a.normaAlterada, total: 0, dispositivos: [] };
      g.total++;
      if (restantes > 0) { g.dispositivos.push({ uri: a.uri, dispositivo: a.dispositivo, tipo: a.tipo, nota: a.nota }); restantes--; }
      grupos.set(a.normaAlterada, g);
    }
    return {
      norma: { uri: alvo.uri, rotulo: alvo.rotulo, naBase: this.porUri.has(alvo.uri) },
      total: lista.length,
      porNorma: [...grupos.values()].sort((a, b) => b.total - a.total),
    };
  }

  /** Apelidos de todas as normas (catálogo + base), do maior para o menor, para o verificador de citações. */
  apelidos(): Apelido[] {
    if (this.cacheApelidos) return this.cacheApelidos;
    const vistos = new Set<string>();
    const lista: Apelido[] = [];
    const add = (original: string, uri: LawUri, jurisdicao: string, nome: string) => {
      const a = normalizar(original).trim();
      if (a.length < 2 || vistos.has(`${a}|${uri}`)) return;
      vistos.add(`${a}|${uri}`);
      const sigla = /^[A-Z][A-Z0-9/]{1,9}$/.test(original);
      const alvo = sigla ? original.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : a;
      const esc = alvo.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&").replace(/\s+/g, "\\s+");
      lista.push({ apelido: a, original, sigla, re: new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, "gu"), uri, jurisdicao, nome });
    };
    for (const e of CATALOGO) for (const a of e.apelidos) add(a, uriCatalogo(e), e.jurisdicao, e.nome);
    for (const [d, n] of this.docs.entries()) if (this.vivo(d)) for (const a of n.apelidos ?? []) add(a, n.uri, n.jurisdicao, n.titulo);
    this.cacheApelidos = lista.sort((a, b) => b.apelido.length - a.apelido.length);
    return this.cacheApelidos;
  }
}

/** "Vigência" e "Regulamento" soltos, sem norma alteradora, não contam a história do dispositivo. */
const relevante = (a: Alteracao) => Boolean(a.norma) || !["vigencia", "outro"].includes(a.tipo);

/** ~240 caracteres ao redor do primeiro termo encontrado. */
function trecho(original: string, termos: string[]): string {
  const janela = original.length > 300_000 ? original.slice(0, 300_000) : original;
  const n = normalizarAlinhado(janela);
  const posicoes = termos.map((t) => n.search(new RegExp(`(?<![a-z0-9])${t}`))).filter((i) => i >= 0);
  const pos = posicoes.length ? Math.min(...posicoes) : 0;
  const inicio = Math.max(0, pos - 80);
  const s = original.slice(inicio, inicio + 240).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return `${inicio > 0 ? "…" : ""}${s}${inicio + 240 < original.length ? "…" : ""}`;
}
