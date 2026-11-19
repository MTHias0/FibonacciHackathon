import { existsSync } from "node:fs";
import { join } from "node:path";
import type { BuscarNormasEntrada, BuscarNormasSaida, ListarJurisdicoesSaida, Norma } from "../types.ts";
import { FONTES } from "./adaptadores.ts";

type Doc = { norma: Norma; titulo: string; texto: string };

const STOPWORDS = new Set("de da do das dos e o a os as em no na nos nas para por com que um uma la el los las y en del al se".split(" "));

/** Minúsculas e sem acento, preservando o tamanho do texto (para recortar o trecho no original). */
export function normalizar(s: string): string {
  let out = "";
  for (const c of s) out += (c.normalize("NFD")[0] ?? c).toLowerCase();
  return out;
}

function termos(consulta: string): string[] {
  return [...new Set(normalizar(consulta).split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 1 && !STOPWORDS.has(t)))];
}

function contar(texto: string, termo: string, max: number): number {
  let n = 0;
  for (let i = texto.indexOf(termo); i !== -1 && n < max; i = texto.indexOf(termo, i + termo.length)) n++;
  return n;
}

/** Índice em memória. shortcut: busca linear por contagem de termos; trocar por SQLite FTS5 se passar de ~100 mil normas. */
export class Indice {
  private readonly porUri = new Map<string, Norma>();
  private readonly docs: Doc[] = [];

  constructor(normas: Norma[]) {
    for (const norma of normas) {
      this.porUri.set(norma.uri, norma);
      this.docs.push({ norma, titulo: normalizar(norma.titulo), texto: normalizar(norma.texto) });
    }
  }

  /** Carrega todas as FONTES presentes em `dirSnapshot`. Fontes sem pasta são ignoradas, com aviso no stderr. */
  static async carregar(dirSnapshot: string): Promise<Indice> {
    const normas: Norma[] = [];
    for (const { pasta, adaptador } of FONTES) {
      const dir = join(dirSnapshot, pasta);
      if (!existsSync(dir)) {
        console.error(`LawMCP: fonte "${pasta}" ausente em ${dir}. Rode npm run data:fetch.`);
        continue;
      }
      normas.push(...(await adaptador.carregar(dir)));
    }
    return new Indice(normas);
  }

  get total(): number {
    return this.porUri.size;
  }

  todas(): Iterable<Norma> {
    return this.porUri.values();
  }

  ler(uri: string): Norma | undefined {
    return this.porUri.get(uri.replace(/\/+$/, ""));
  }

  listarJurisdicoes(): ListarJurisdicoesSaida {
    const mapa = new Map<string, { tipos: Set<string>; total: number }>();
    for (const n of this.porUri.values()) {
      const j = mapa.get(n.jurisdicao) ?? { tipos: new Set<string>(), total: 0 };
      j.tipos.add(n.tipo);
      j.total++;
      mapa.set(n.jurisdicao, j);
    }
    return {
      jurisdicoes: [...mapa].sort(([a], [b]) => a.localeCompare(b))
        .map(([jurisdicao, j]) => ({ jurisdicao, tipos: [...j.tipos].sort(), total: j.total })),
    };
  }

  buscar(e: BuscarNormasEntrada): BuscarNormasSaida {
    const ts = termos(e.consulta);
    const limite = Math.min(Math.max(e.limite ?? 10, 1), 50);
    const tipo = e.tipo ? normalizar(e.tipo) : undefined;
    const minimo = Math.ceil(ts.length / 2);
    const achados: { doc: Doc; score: number }[] = [];
    for (const doc of this.docs) {
      const n = doc.norma;
      if (e.jurisdicao && n.jurisdicao !== e.jurisdicao && !n.jurisdicao.startsWith(`${e.jurisdicao}/`)) continue;
      if (tipo && !normalizar(n.tipo).includes(tipo)) continue;
      if (e.ano && !n.data?.startsWith(String(e.ano))) continue;
      let score = 0;
      let casados = 0;
      for (const t of ts) {
        const s = (doc.titulo.includes(t) ? 5 : 0) + contar(doc.texto, t, 10);
        if (s > 0) casados++;
        score += s;
      }
      if (ts.length === 0 ? true : casados >= minimo && score > 0) achados.push({ doc, score: score + casados * 10 });
    }
    achados.sort((a, b) => b.score - a.score);
    return {
      resultados: achados.slice(0, limite).map(({ doc }) => {
        const { uri, jurisdicao, tipo: t, titulo, data, situacao, fonte } = doc.norma;
        return { uri, jurisdicao, tipo: t, titulo, ...(data ? { data } : {}), situacao, fonte, trecho: trecho(doc.norma.texto, doc.texto, ts) };
      }),
    };
  }
}

/** ~240 caracteres ao redor do primeiro termo encontrado. */
function trecho(original: string, normalizado: string, ts: string[]): string {
  const pos = Math.min(...ts.map((t) => normalizado.indexOf(t)).filter((i) => i >= 0), Number.MAX_SAFE_INTEGER);
  const inicio = pos === Number.MAX_SAFE_INTEGER ? 0 : Math.max(0, pos - 80);
  const s = original.slice(inicio, inicio + 240).replace(/\s+/g, " ").trim();
  return `${inicio > 0 ? "…" : ""}${s}${inicio + 240 < original.length ? "…" : ""}`;
}
