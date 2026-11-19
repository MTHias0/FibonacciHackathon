import type { Indice } from "./dados/indice.ts";
import { normalizar } from "./dados/indice.ts";
import type { LawUri, VerificarCitacoesEntrada, VerificarCitacoesSaida } from "./types.ts";

type Citacao = VerificarCitacoesSaida["citacoes"][number];

/** "art. 49", "artigo 5º", "Art. 103-A", "artículo 14", "art. 7º, XIII". */
const ARTIGO = /\bart(?:igo|ículo|iculo)?s?\.?\s*(\d+)\s*(?:[º°ª]|o\b)?(?:-([a-z]))?(?:\s+(bis|ter|quater)\b)?/giu;
/** "Lei nº 8.078/1990", "Decreto-Lei 5.452/43", "Lei 8.078/90". */
const NUMERO_LEI = /\b(lei|decreto-lei|decreto)\s*(?:n[º°o.]*\s*)?(\d[\d.]*)\s*\/\s*(\d{2,4})\b/iu;

/** Apelido normalizado → URI da norma (o maior apelido vence). */
function mapaApelidos(indice: Indice): { apelido: string; re: RegExp; uri: LawUri; jurisdicao: string }[] {
  const lista: { apelido: string; re: RegExp; uri: LawUri; jurisdicao: string }[] = [];
  for (const n of indice.todas()) {
    for (const a of n.apelidos ?? []) {
      const apelido = normalizar(a);
      const esc = apelido.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
      lista.push({ apelido, re: new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, "u"), uri: n.uri, jurisdicao: n.jurisdicao });
    }
  }
  return lista.sort((a, b) => b.apelido.length - a.apelido.length);
}

/** Identificador da legislacao-br a partir do número: "Lei 8.078/90" → lei-8078-1990. */
function idPorNumero(m: RegExpExecArray): string {
  const ano = m[3]!.length === 2 ? (Number(m[3]) > 30 ? `19${m[3]}` : `20${m[3]}`) : m[3]!;
  return `${m[1]!.toLowerCase()}-${m[2]!.replace(/\./g, "")}-${ano}`;
}

/**
 * Confere cada "art. N <da norma>" do texto contra o índice.
 * shortcut: só pega o primeiro artigo de listas ("arts. 5º e 7º") e não confere incisos e parágrafos;
 * evoluir para um parser de citações se o verificador virar o produto principal.
 */
export function verificarCitacoes(indice: Indice, e: VerificarCitacoesEntrada): VerificarCitacoesSaida {
  const apelidos = mapaApelidos(indice);
  const jurisdicaoPadrao = e.jurisdicao ?? "br";
  const citacoes: Citacao[] = [];

  for (const m of e.texto.matchAll(ARTIGO)) {
    const inicio = m.index;
    const fim = inicio + m[0].length;
    const depois = e.texto.slice(fim, fim + 90);
    const antes = e.texto.slice(Math.max(0, inicio - 60), inicio);
    const artigo = `art-${m[1]}${m[2] ? `-${m[2].toLowerCase()}` : ""}${m[3] ? `-${m[3].toLowerCase()}` : ""}`;

    // 1) Norma citada logo depois ("… da CF", "… do CDC", "… de la Constitución"); 2) senão, antes ("Lei 8.078/90, art. 49").
    let base: LawUri | undefined;
    let fimCitacao = fim;
    const posApelido = (trecho: string) => {
      const t = normalizar(trecho);
      let melhor: { pos: number; len: number; uri: LawUri } | undefined;
      for (const a of apelidos) {
        const r = a.re.exec(t);
        if (!r) continue;
        const preferido = a.jurisdicao === jurisdicaoPadrao || a.jurisdicao.startsWith(`${jurisdicaoPadrao}/`);
        if (!melhor || r.index < melhor.pos || (r.index === melhor.pos && preferido)) melhor = { pos: r.index, len: r[0].length, uri: a.uri };
      }
      return melhor;
    };
    const num = NUMERO_LEI.exec(depois);
    const ap = posApelido(depois);
    if (num && (!ap || num.index <= ap.pos)) {
      base = `law://br/federal/${idPorNumero(num)}`;
      fimCitacao = fim + num.index + num[0].length;
    } else if (ap) {
      base = ap.uri;
      fimCitacao = fim + ap.pos + ap.len;
    } else {
      const numAntes = NUMERO_LEI.exec(antes);
      const apAntes = posApelido(antes);
      if (numAntes) base = `law://br/federal/${idPorNumero(numAntes)}`;
      else if (apAntes) base = apAntes.uri;
    }
    if (!base) continue; // "art. 5" solto, sem norma: não dá para verificar.

    const citacao = e.texto.slice(inicio, fimCitacao).replace(/\s+/g, " ").trim();
    const norma = indice.ler(base);
    if (!norma) {
      citacoes.push({ citacao, status: "fora_da_base", detalhe: `A norma ${base} não está carregada no LawMCP.` });
      continue;
    }
    const uri: LawUri = `${norma.uri}/${artigo}`;
    const art = indice.ler(uri);
    if (!art) {
      citacoes.push({ citacao, status: "inexistente", uri, detalhe: `${norma.titulo} não tem ${artigo.replace("art-", "art. ")}.` });
      continue;
    }
    if (art.situacao === "revogada") {
      citacoes.push({ citacao, status: "revogada", uri, detalhe: `${art.titulo} está revogado.` });
      continue;
    }
    // Redação citada entre aspas logo após a citação: precisa existir no texto oficial.
    const aspas = /^[^"“«\n]{0,15}["“«]([^"”»]{12,})["”»]/u.exec(e.texto.slice(fimCitacao));
    if (aspas && !normalizar(art.texto).replace(/\s+/g, " ").includes(normalizar(aspas[1]!).replace(/\s+/g, " ").trim())) {
      citacoes.push({ citacao, status: "divergente", uri, detalhe: "O trecho entre aspas não aparece na redação oficial." });
      continue;
    }
    citacoes.push({ citacao, status: "ok", uri });
  }
  return { citacoes };
}
