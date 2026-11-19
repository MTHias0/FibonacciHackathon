/** Utilitários de texto jurídico compartilhados por adaptadores, índice e verificador. */
import type { Alteracao, TipoAlteracao } from "../types.ts";

const DIACRITICOS = /[̀-ͯ]/g;

/** Minúsculas e sem acento. */
export function normalizar(s: string): string {
  return s.normalize("NFD").replace(DIACRITICOS, "").toLowerCase();
}

/** Como normalizar, mas com o mesmo tamanho do original, para recortar trechos pelas mesmas posições. */
export function normalizarAlinhado(s: string): string {
  const n = normalizar(s);
  if (n.length === s.length) return n;
  let out = "";
  for (const c of s) out += normalizar(c).padEnd(c.length, " ").slice(0, c.length);
  return out;
}

const STOPWORDS = new Set(
  ("de da do das dos e o a os as em no na nos nas para por com que um uma ao aos se ou sua seu suas seus " +
    "la el los las y en del al lo su sus por con una uno es").split(" "),
);

/** Radical por truncamento: bom o bastante para português e espanhol ("arrependimento" ~ "arrependido"). */
function radical(t: string): string {
  return t.length > 7 ? t.slice(0, 7) : t;
}

/** Termos indexáveis de um texto (minúsculos, sem acento, sem stopwords, reduzidos ao radical). */
export function tokenizar(s: string): string[] {
  const out: string[] = [];
  for (const t of normalizar(s).split(/[^a-z0-9]+/)) if (t.length > 1 && !STOPWORDS.has(t)) out.push(radical(t));
  return out;
}

const ROMANO_VALIDO = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i;
const VALOR: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

export function romanoParaNumero(r: string): number | undefined {
  if (!r || !ROMANO_VALIDO.test(r)) return undefined;
  let total = 0;
  const s = r.toUpperCase();
  for (let i = 0; i < s.length; i++) {
    const v = VALOR[s[i]!]!;
    const prox = VALOR[s[i + 1] ?? ""] ?? 0;
    total += v < prox ? -v : v;
  }
  return total;
}

export function numeroParaRomano(n: number): string {
  const tabela: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [v, s] of tabela) while (n >= v) { out += s; n -= v; }
  return out;
}

/** "inc-13" → "inciso XIII", "par-1" → "§ 1º", "par-unico" → "parágrafo único". */
export function rotuloDispositivo(id: string): string {
  if (id === "caput") return "caput";
  if (id === "par-unico") return "parágrafo único";
  const inc = /^inc-(\d+)$/.exec(id);
  if (inc) return `inciso ${numeroParaRomano(Number(inc[1]))}`;
  const par = /^par-(\d+)$/.exec(id);
  if (par) return `§ ${par[1]}º`;
  return id;
}

// ---- Artigos ----

/**
 * Início de artigo numa linha: "#### Art. 1º", "**Art. 1.025.** …", "###### Artículo 14", "Art. 7º-A", "Artigo 3".
 * Captura: 1 número (com milhar), 2 letra (-A), 3 bis/ter.
 */
const INICIO_ARTIGO =
  /^(?:#{1,6}\s+)?\*{0,2}Art(?:\.|igo|[íi]culo)\s*(\d{1,4}(?:\.\d{3})*)\s*(?:[º°ª]|o(?=[\s.*-]))?(?:\s*-\s*([A-Z])(?=[\s.*:]|$))?(?:\s+(bis|ter|quater|quinquies))?\s*[.:]?\s*\**(?=\s|$)/iu;
const TITULO_MD = /^#{1,6}\s/;

/** "1.025" + "A" → "art-1025-a". */
export function idArtigo(numero: string, letra?: string, latim?: string): string {
  return `art-${Number(numero.replace(/\./g, ""))}${letra ? `-${letra.toLowerCase()}` : ""}${latim ? `-${latim.toLowerCase()}` : ""}`;
}

export interface Artigo {
  id: string;
  rotulo: string;
  texto: string;
}

/**
 * Divide o corpo de uma norma em artigos. Cada artigo vai até o próximo artigo ou título de seção.
 * Repetições do mesmo número (anexos, textos transcritos) ficam com a primeira ocorrência.
 */
export function dividirArtigos(corpo: string): Artigo[] {
  const artigos: Artigo[] = [];
  const vistos = new Set<string>();
  let atual: { id: string; rotulo: string; linhas: string[] } | undefined;
  const fechar = () => {
    if (atual && !vistos.has(atual.id)) {
      vistos.add(atual.id);
      artigos.push({ id: atual.id, rotulo: atual.rotulo, texto: atual.linhas.join("\n").trim() });
    }
    atual = undefined;
  };
  for (const linha of corpo.split("\n")) {
    const m = INICIO_ARTIGO.exec(linha);
    if (m) {
      fechar();
      const rotulo = `Art. ${m[1]}${/^\d$/.test(m[1]!) ? "º" : ""}${m[2] ? `-${m[2].toUpperCase()}` : ""}${m[3] ? ` ${m[3]}` : ""}`;
      atual = { id: idArtigo(m[1]!, m[2], m[3]), rotulo, linhas: [linha] };
    } else if (TITULO_MD.test(linha) || /^Bras[íi]lia,\s+\d/.test(linha)) {
      fechar();
    } else if (atual) {
      atual.linhas.push(linha);
    }
  }
  fechar();
  return artigos;
}

// ---- Dispositivos (incisos e parágrafos) ----

const ANCORA = /^#{1,6}\s*<a id="([\w-]+)"><\/a>/;
const INCISO = /^\**\s*([IVXLCDM]+)\s*[-–—]\s/;
const PARAGRAFO = /^\**\s*§\s*(\d+)\s*[º°o]?/;
const UNICO = /^\**\s*Par[áa]grafo\s+[úu]nico/i;

/** Id do dispositivo que começa nesta linha. Em texto corrido, inciso dentro de parágrafo vira "par-2-inc-1". */
function idDispositivo(linha: string, topo: string): string | undefined {
  const a = ANCORA.exec(linha);
  if (a) return a[1];
  const i = INCISO.exec(linha);
  if (i) {
    const n = romanoParaNumero(i[1]!);
    if (n) return topo.startsWith("par-") ? `${topo}-inc-${n}` : `inc-${n}`;
  }
  const p = PARAGRAFO.exec(linha);
  if (p) return `par-${Number(p[1])}`;
  if (UNICO.test(linha)) return "par-unico";
  return undefined;
}

/** "par-2-inc-1-al-a" → ["par-2", "par-2-inc-1", "par-2-inc-1-al-a"]: o texto do filho também pertence ao pai. */
function comAncestrais(id: string): string[] {
  const partes = id.split(/-(?=(?:inc|par|al)-)/);
  return partes.map((_, k) => partes.slice(0, k + 1).join("-"));
}

/**
 * Divide um artigo em dispositivos: "caput", "inc-N", "par-N", "par-unico", "par-N-inc-N", "inc-N-al-a"…
 * Entende as âncoras do legislacao-br (`## <a id="inc-1"></a>`) e o texto corrido ("I - …", "§ 1º …").
 * O bloco de um dispositivo inclui os filhos (o inciso traz as alíneas).
 */
export function dividirDispositivos(texto: string): Map<string, string> {
  const linhas = new Map<string, string[]>();
  let atuais = ["caput"];
  let topo = "caput";
  for (const linha of texto.split("\n")) {
    const id = idDispositivo(linha, topo);
    if (id) {
      atuais = comAncestrais(id);
      if (/^par-[a-z0-9]+$/.test(id)) topo = id;
      else if (/^inc-\d+$/.test(id)) topo = "caput";
    }
    for (const a of atuais) {
      const l = linhas.get(a);
      if (l) l.push(linha);
      else linhas.set(a, [linha]);
    }
  }
  const blocos = new Map<string, string>();
  for (const [id, l] of linhas) {
    const t = l.join("\n").trim();
    if (t) blocos.set(id, t);
  }
  return blocos;
}

/** Bloco revogado: "*(Revogado)*", "III - (Revogado pela Lei nº …)", "**Art. 3º** (Revogado …)". */
export function estaRevogado(bloco: string): boolean {
  const semCabecalho = bloco
    .replace(/^#{1,6}[^\n]*\n/, "")
    .replace(/^\**\s*(?:Art(?:\.|igo|[íi]culo)\s*[\d.]+\s*[º°]?(?:-[A-Z])?\.?|[IVXLCDM]+\s*[-–—]|§\s*\d+\s*[º°]?|Par[áa]grafo\s+[úu]nico\.?)\**\s*/i, "")
    .trim();
  return /^\W{0,3}revogad[oa]/i.test(semCabecalho);
}

// ---- Atos normativos citados ("Lei nº 13.467, de 2017") ----

const TIPOS_ATO: [RegExp, string, string][] = [
  [/^(?:lei\s+complementar|lcp)$/i, "lei-complementar", "Lei Complementar"],
  [/^decreto-lei$/i, "decreto-lei", "Decreto-Lei"],
  [/^lei$/i, "lei", "Lei"],
  [/^decreto$/i, "decreto", "Decreto"],
  [/^medida\s+provis[óo]ria$/i, "medida-provisoria", "Medida Provisória"],
  [/^emenda\s+constitucional$/i, "emenda-constitucional", "Emenda Constitucional"],
];

/** Ato com número e ano: "Lei nº 8.078/90", "Lei nº 13.467, de 2017", "Lei nº 7.209, de 11.7.1984", "Lei nº 13.709, de 14 de agosto de 2018". */
export const ATO =
  /\b(Lei\s+Complementar|Lcp|Decreto-Lei|Lei|Decreto|Medida\s+Provis[óo]ria|Emenda\s+Constitucional)\s*(?:n[º°o.]*\s*)?(\d[\d.]*(?:-\d+)?)\s*(?:,?\s*de\s+(?:\d{1,2}[º°]?\s+de\s+\p{L}+\s+de\s+|\d{1,2}[º°]?\.\d{1,2}\.)?(\d{4})\b|\s*\/\s*(\d{4}|\d{2})\b)/iu;

export interface ReferenciaAto {
  /** Identificador no padrão do LawMCP: "lei-13467-2017", "decreto-lei-5452-1943". */
  id: string;
  /** "Lei nº 13.467/2017" */
  rotulo: string;
}

export function referenciaDeMatch(m: RegExpExecArray): ReferenciaAto | undefined {
  const tipo = TIPOS_ATO.find(([re]) => re.test(m[1]!.replace(/\s+/g, " ")));
  if (!tipo) return undefined;
  const bruto = m[3] ?? m[4]!;
  const ano = bruto.length === 2 ? (Number(bruto) > 30 ? `19${bruto}` : `20${bruto}`) : bruto;
  const numero = m[2]!.replace(/\.$/, "").replace(/\./g, "");
  return { id: `${tipo[1]}-${numero}-${ano}`, rotulo: `${tipo[2]} nº ${m[2]!.replace(/\.$/, "")}/${ano}` };
}

/** Primeira referência a ato normativo dentro de um texto. */
export function referenciaAto(texto: string): ReferenciaAto | undefined {
  const m = ATO.exec(texto);
  return m ? referenciaDeMatch(m) : undefined;
}

// ---- Alterações (genealogia) ----

export function tipoAlteracao(nota: string): TipoAlteracao {
  if (/reda[çc][ãa]o\s+dada|alterad[oa]/i.test(nota)) return "redacao";
  if (/inclu[íi]d[oa]|acrescid[oa]|acrescentad[oa]/i.test(nota)) return "inclusao";
  if (/revogad[oa]/i.test(nota)) return "revogacao";
  if (/renumerad[oa]/i.test(nota)) return "renumeracao";
  if (/vig[êe]ncia/i.test(nota)) return "vigencia";
  if (/\bvide\b/i.test(nota)) return "vide";
  return "outro";
}

/** Converte a nota de um dispositivo ("Redação dada pela Lei nº 13.467, de 2017") em Alteracao. */
export function alteracaoDeNota(dispositivo: string, nota: string): Alteracao {
  const ref = referenciaAto(nota);
  return {
    dispositivo,
    tipo: tipoAlteracao(nota),
    nota: nota.trim(),
    ...(ref ? { norma: `law://br/federal/${ref.id}` as const, rotuloNorma: ref.rotulo } : {}),
  };
}

const NOTA_INLINE = /\(([^()]*?(?:Reda[çc][ãa]o\s+dada|Inclu[íi]d[oa]|Revogad[oa]|Acrescid[oa]|Renumerad[oa]|Vide\b)[^()]*)\)/giu;

/** Notas entre parênteses no texto corrido (formato do Planalto/LawCodex), por dispositivo. */
export function alteracoesInline(textoArtigo: string): Alteracao[] {
  const out: Alteracao[] = [];
  for (const [dispositivo, bloco] of dividirDispositivos(textoArtigo)) {
    for (const m of bloco.matchAll(NOTA_INLINE)) out.push(alteracaoDeNota(dispositivo, m[1]!));
  }
  return out;
}
