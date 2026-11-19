/**
 * Transforma a mensagem do chat em uma chamada de tool do LawMCP, sem LLM: o front é só mais um cliente MCP.
 * shortcut: regras por palavra-chave, não entende perguntas livres; trocar por um modelo com tool use quando o time aprovar.
 */

export type Modo = "auto" | "buscar" | "verificar" | "impacto" | "comparar" | "historico";
export const MODOS: Modo[] = ["auto", "buscar", "verificar", "impacto", "comparar", "historico"];

export interface Plano {
  tool: string;
  args: Record<string, unknown>;
  /** Encadeia: pega a URI da 1ª citação verificada e chama esta tool com ela. */
  depois?: "ler_norma" | "historico_norma";
}

const JURISDICOES: [RegExp, string][] = [[/\bbirigui\b/i, "br/sp/birigui"], [/\b(espanha|españa|spain)\b/i, "es"], [/\bbrasil\b/i, "br"]];
const FILLER = /\b(que|quais|qual|leis?|normas?|de|do|da|em|no|na|falam|fala|tratam|trata|sobre|existe|existem|há|me|mostre|busque|buscar|procure|birigui|espanha|brasil)\b|[?!.]/gi;
/** O que sobra de "e no Brasil?" ou "e se for na Espanha?" depois de tirar a jurisdição: não é assunto. */
const CONECTIVOS = /(?<!\p{L})(e|y|and|se|for|como|fica|quanto|aqui|lá|isso|também|tambem|então|entao)(?!\p{L})/giu;

/** Tira as jurisdições citadas (com a preposição antes: "na Espanha"), para a pergunta anterior não levar a jurisdição antiga. */
const semJurisdicao = (t: string) =>
  JURISDICOES.reduce((s, [re]) => s.replace(new RegExp(String.raw`(?:\b(?:no|na|em|de|do|da|en|in)\s+)?` + re.source, "gi"), " "), t);
const temAssunto = (t: string) => semJurisdicao(t).replace(FILLER, " ").replace(CONECTIVOS, " ").replace(/[\s,;:]+/g, "").length > 0;

/**
 * Cada mensagem chega sozinha ao roteador e ao tradutor: "no Brasil" vira uma busca sem assunto (e o modelo inventa um).
 * Pergunta de continuação herda o assunto da última pergunta que tinha um, com a jurisdição nova.
 * shortcut: só reconhece continuação sem assunto próprio; "e para MEI?" segue sozinha. Para isso, mandar o histórico ao modelo.
 */
export function comContexto(texto: string, anteriores: string[] = []): string {
  if (temAssunto(texto)) return texto;
  const base = anteriores.findLast(temAssunto);
  if (!base) return texto;
  return `${semJurisdicao(base).replace(/[\s?!.]+$/, "")} ${texto.replace(CONECTIVOS, " ")}`.replace(/\s+/g, " ").trim();
}

const URI = /law:\/\/[\w./-]+/;
const CITACAO = /\b(arts?\.?|artigos?|artículos?)\s*\d|§/i;
const HISTORICO = /quem alterou|hist[oó]ric|genealogia/i;

const verificar = (texto: string, depois?: Plano["depois"], jurisdicao?: string): Plano =>
  ({ tool: "verificar_citacoes", args: { texto, ...(jurisdicao ? { jurisdicao } : {}) }, ...(depois ? { depois } : {}) });

/** O filtro escolhido na tela vence o que o texto sugere ("birigui", "espanha"). */
function buscar(texto: string, filtro?: string): Plano {
  const jurisdicao = filtro ?? JURISDICOES.find(([re]) => re.test(texto))?.[1];
  const consulta = texto.replace(FILLER, " ").replace(/\s+/g, " ").trim() || texto;
  return { tool: "buscar_normas", args: { consulta, limite: 8, ...(jurisdicao ? { jurisdicao } : {}) } };
}

function impacto(texto: string): Plano {
  const nome = texto.match(/o que (?:a |o )?(.+?)\s+mudou/i)?.[1] ?? texto.replace(/^(o\s+)?impacto\s+d[aoe]s?\s+/i, "");
  return { tool: "impacto_da_norma", args: { norma: nome.replace(/[?!.]/g, "").trim(), limite: 60 } };
}

/** "igualdade perante a lei | iguales ante la ley" usa uma consulta por idioma; sem "|", a mesma para os dois. */
function comparar(texto: string): Plano {
  const [br, es] = texto.split("|").map((s) => s.trim());
  const tema = es ? br! : (texto.match(/compar\w*\s+(?:a |o )?(.+?)\s+(?:no|entre o?)\s+brasil/i)?.[1] ?? texto.replace(/compar\w*/i, "")).replace(/[?!.]/g, "").trim();
  return { tool: "comparar_jurisdicoes", args: { consultas: [{ jurisdicao: "br", consulta: tema }, { jurisdicao: "es", consulta: es ?? tema }], limite: 3 } };
}

/** jurisdicao: prefixo escolhido no filtro (br, br/federal, es…). Vale para busca e verificação; comparar é sempre BR × ES. */
export function rotear(texto: string, modo: Modo = "auto", jurisdicao?: string): Plano {
  const t = texto.trim();
  const uri = t.match(URI)?.[0];
  const j = jurisdicao;
  switch (modo) {
    case "verificar": return verificar(t, undefined, j);
    case "impacto": return impacto(t);
    case "comparar": return comparar(t);
    case "buscar": return buscar(t, j);
    case "historico": return uri ? { tool: "historico_norma", args: { uri } } : verificar(t, "historico_norma", j);
  }
  if (uri) return { tool: HISTORICO.test(t) ? "historico_norma" : "ler_norma", args: { uri } };
  if (/\bo que .+ mudou|\bimpacto d[aoe]/i.test(t)) return impacto(t);
  if (/\bcompar/i.test(t)) return comparar(t);
  if (CITACAO.test(t)) {
    if (HISTORICO.test(t)) return verificar(t, "historico_norma", j);
    if (/verifi|confir|confer|revis/i.test(t) || t.length > 140) return verificar(t, undefined, j);
    return verificar(t, "ler_norma", j);
  }
  return buscar(t, j);
}
