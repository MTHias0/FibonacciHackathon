import type { Apelido, Indice } from "./dados/indice.ts";
import { ATO, normalizar, numeroParaRomano, referenciaDeMatch, romanoParaNumero, rotuloDispositivo } from "./dados/texto.ts";
import type { CitacaoVerificada, LawUri, StatusCitacao, VerificarCitacoesEntrada, VerificarCitacoesSaida } from "./types.ts";

/** Palavra que abre uma citação: "art.", "arts.", "artigo", "artículo", "Art". */
const CHAVE_ARTIGO = /\b(art(?:igo|[íi]culo)?s?)\.?\s*(?=\d)/giu;
/** Número de artigo: "5º", "1.025", "7º-A", "14 bis". */
const NUMERO = /^\s*(\d{1,4}(?:\.\d{3})*)\s*(?:[º°ª]|o(?![\p{L}]))?(?:\s*-\s*([A-Z])(?![\p{L}]))?(?:\s+(bis|ter|quater)\b)?/iu;
/** Separadores entre artigos de uma lista ("5º, 6º e 7º") e de faixa ("5º a 7º"). */
const LISTA = /^\s*(?:,|\be\b|\by\b|\bou\b)\s*(?:o\s+|os\s+|art(?:igo|[íi]culo)?s?\.?\s*)?(?=\d)/iu;
const FAIXA = /^\s*(?:\ba\b|\baté\b|\bal\b)\s*(?=\d)/iu;
/** Dispositivo depois do número: ", XIII", ", inciso XIII", ", § 1º", ", parágrafo único", ", caput". */
const DEP_INCISO = /^\s*(?:,|\be\b|\by\b)?\s*(?:inc(?:iso|\.)?s?\s+)?([IVXLCDM]+)(?![\p{L}\p{N}/])/u;
const DEP_PARAGRAFO = /^\s*,?\s*(?:§§?|par[áa]grafo|apartado)\s*(\d+)\s*[º°o]?(?![\p{L}\p{N}])/iu;
const DEP_UNICO = /^\s*,?\s*par[áa]grafo\s+[úu]nico/iu;
const DEP_CAPUT = /^\s*,?\s*caput\b/iu;
const DEP_ALINEA = /^\s*,?\s*al[íi]nea\s+["“]?[a-z]["”]?/iu;
/** Dispositivo antes do artigo: "inciso XIII do art. 5º", "§ 1º do art. 59", "parágrafo único do art. 3º". */
const ANTES_DISPOSITIVO = /(?:inc(?:iso|\.)\s+([IVXLCDM]+)|§\s*(\d+)\s*[º°o]?|par[áa]grafo\s+([úu]nico|\d+)\s*[º°o]?)\s*,?\s*d[oa]\s*$/iu;
/** Referência interna: "art. 3º desta Lei" não aponta para norma conhecida. */
const INTERNA = /^\s*,?\s*(?:dest[ae]|da\s+presente|de\s+est[ae]|del\s+presente|de\s+la\s+presente)\b/iu;
/** Fim de frase: a norma citada não atravessa ponto final, ponto e vírgula ou quebra de linha. */
const FIM_FRASE = /[;\n]|\.\s+(?=\p{Lu})/u;
/** Pistas de espanhol: escolhe "Código Civil" da Espanha em vez do brasileiro. */
const PISTA_ES = /\b(?:art[íi]culo|del|de\s+la|apartado|ley\s+org[áa]nica)\b/iu;

interface Alvo {
  numero: number;
  id: string;
  rotulo: string;
  dispositivos: string[];
}

interface Norma {
  uri: LawUri;
  rotulo: string;
  inicio: number;
  fim: number;
}

/** Mesmo comprimento do original, sem acento; minúsculo só quando pedido (siglas comparam com maiúsculas). */
function semAcento(s: string, minusculo: boolean): string {
  let out = "";
  for (const c of s) {
    const n = c.normalize("NFD").replace(/[̀-ͯ]/g, "");
    const m = minusculo ? n.toLowerCase() : n;
    out += m.length === c.length ? m : c;
  }
  return out;
}

/** Norma citada num trecho: ato com número ("Lei 8.078/90") ou apelido ("CDC", "Código Civil"). */
function normaNoTrecho(trecho: string, apelidos: Apelido[], preferida: string, ultima: boolean): Norma | undefined {
  const candidatos: (Norma & { pref: boolean; len: number })[] = [];
  for (const m of trecho.matchAll(new RegExp(ATO.source, "giu"))) {
    const ref = referenciaDeMatch(m);
    if (ref) candidatos.push({ uri: `law://br/federal/${ref.id}`, rotulo: ref.rotulo, inicio: m.index, fim: m.index + m[0].length, pref: true, len: m[0].length });
  }
  const baixo = semAcento(trecho, true);
  const alto = semAcento(trecho, false);
  for (const a of apelidos) {
    a.re.lastIndex = 0;
    for (const m of (a.sigla ? alto : baixo).matchAll(a.re)) {
      const pref = a.jurisdicao === preferida || a.jurisdicao.startsWith(`${preferida}/`);
      candidatos.push({ uri: a.uri, rotulo: a.nome, inicio: m.index, fim: m.index + m[0].length, pref, len: m[0].length });
    }
  }
  if (!candidatos.length) return undefined;
  // Mais perto do artigo; no mesmo ponto, o nome mais longo; empate entre países, a jurisdição preferida.
  candidatos.sort((x, y) =>
    (ultima ? y.fim - x.fim : x.inicio - y.inicio) || y.len - x.len || Number(y.pref) - Number(x.pref));
  return candidatos[0];
}

function lerDispositivos(texto: string, siglas: Set<string>): { dispositivos: string[]; fim: number } {
  const dispositivos: string[] = [];
  let pos = 0;
  for (;;) {
    const resto = texto.slice(pos);
    let m: RegExpExecArray | null;
    if ((m = DEP_UNICO.exec(resto))) dispositivos.push("par-unico");
    else if ((m = DEP_PARAGRAFO.exec(resto))) dispositivos.push(`par-${Number(m[1])}`);
    else if ((m = DEP_CAPUT.exec(resto))) dispositivos.push("caput");
    else if ((m = DEP_ALINEA.exec(resto))) { /* alínea: aceita, mas confere só o inciso */ }
    else if ((m = DEP_INCISO.exec(resto)) && !siglas.has(m[1]!) && romanoParaNumero(m[1]!)) {
      // Inciso logo depois de parágrafo pertence a ele: "§ 2º, I" → par-2-inc-1.
      const anterior = dispositivos.at(-1);
      const n = romanoParaNumero(m[1]!)!;
      dispositivos.push(anterior?.startsWith("par-") && !anterior.includes("-inc-") ? `${anterior}-inc-${n}` : `inc-${n}`);
      if (anterior?.startsWith("par-") && !anterior.includes("-inc-")) dispositivos.splice(-2, 1);
    } else break;
    pos += m[0].length;
  }
  return { dispositivos, fim: pos };
}

function rotuloArtigo(m: RegExpExecArray): string {
  return `art. ${m[1]}${/^\d$/.test(m[1]!) ? "º" : ""}${m[2] ? `-${m[2].toUpperCase()}` : ""}${m[3] ? ` ${m[3]}` : ""}`;
}

function idDe(m: RegExpExecArray): string {
  return `art-${Number(m[1]!.replace(/\./g, ""))}${m[2] ? `-${m[2].toLowerCase()}` : ""}${m[3] ? `-${m[3].toLowerCase()}` : ""}`;
}

/** Lê "5º, XIII e XIV, 6º e 7º a 9º" a partir da posição logo depois de "arts.". */
function lerAlvos(texto: string, siglas: Set<string>): { alvos: Alvo[]; fim: number } {
  const alvos: Alvo[] = [];
  let pos = 0;
  let faixa = false;
  for (;;) {
    const m = NUMERO.exec(texto.slice(pos));
    if (!m) break;
    pos += m[0].length;
    const d = lerDispositivos(texto.slice(pos), siglas);
    pos += d.fim;
    const alvo: Alvo = { numero: Number(m[1]!.replace(/\./g, "")), id: idDe(m), rotulo: rotuloArtigo(m), dispositivos: d.dispositivos };
    const ultimo = alvos.at(-1);
    if (faixa && ultimo && !m[2] && !m[3] && alvo.numero > ultimo.numero) {
      // Faixa "arts. 5º a 9º": confere todos se for curta, senão só as pontas.
      const passo = alvo.numero - ultimo.numero <= 15 ? 1 : alvo.numero - ultimo.numero;
      for (let n = ultimo.numero + passo; n < alvo.numero; n += passo) {
        alvos.push({ numero: n, id: `art-${n}`, rotulo: `art. ${n}${n < 10 ? "º" : ""}`, dispositivos: [] });
      }
    }
    alvos.push(alvo);
    const resto = texto.slice(pos);
    const f = FAIXA.exec(resto);
    const l = f ? null : LISTA.exec(resto);
    if (!f && !l) break;
    faixa = Boolean(f);
    pos += (f ?? l)![0].length;
  }
  return { alvos, fim: pos };
}

function faixaIncisos(ids: string[]): string {
  const incisos = ids.map((d) => /^inc-(\d+)$/.exec(d)?.[1]).filter(Boolean).map(Number);
  const pars = ids.filter((d) => /^par-(\d+|unico)$/.test(d));
  const partes: string[] = [];
  if (incisos.length) partes.push(`incisos ${numeroParaRomano(Math.min(...incisos))} a ${numeroParaRomano(Math.max(...incisos))}`);
  if (pars.length) partes.push(pars.map(rotuloDispositivo).join(", "));
  return partes.length ? partes.join("; ") : "só o caput";
}

/**
 * Confere as citações de lei de um texto contra a base: artigo, inciso e parágrafo, vigência e redação entre aspas.
 * Citação sem norma identificável ("art. 5º" solto, "art. 3º desta Lei") fica de fora: não dá para afirmar nada.
 */
export function verificarCitacoes(indice: Indice, e: VerificarCitacoesEntrada): VerificarCitacoesSaida {
  const apelidos = indice.apelidos();
  const siglas = new Set(apelidos.filter((a) => a.sigla).map((a) => a.original));
  const padrao = e.jurisdicao ?? "br";
  const texto = e.texto;
  const citacoes: CitacaoVerificada[] = [];
  let fimAnterior = 0;

  for (const chave of texto.matchAll(CHAVE_ARTIGO)) {
    if (chave.index < fimAnterior) continue; // já consumido como parte de uma lista
    const posNumero = chave.index + chave[0].length;
    const { alvos, fim } = lerAlvos(texto.slice(posNumero), siglas);
    if (!alvos.length) continue;
    let inicio = chave.index;
    let fimCitacao = posNumero + fim;

    // Dispositivo antes: "§ 1º do art. 59".
    const antesDisp = ANTES_DISPOSITIVO.exec(texto.slice(Math.max(fimAnterior, inicio - 40), inicio));
    if (antesDisp) {
      const disp = antesDisp[1] ? `inc-${romanoParaNumero(antesDisp[1]) ?? 0}` : antesDisp[2] ? `par-${Number(antesDisp[2])}` : /nico/i.test(antesDisp[3]!) ? "par-unico" : `par-${Number(antesDisp[3])}`;
      alvos[0]!.dispositivos.unshift(disp);
      inicio -= antesDisp[0].length;
    }

    // Norma: depois ("… da CF", "… do CDC") e, se não houver, antes ("CF, art. 5º"), sem atravessar a frase nem outra citação.
    let depois = texto.slice(fimCitacao, fimCitacao + 120);
    const corte = depois.search(FIM_FRASE);
    if (corte >= 0) depois = depois.slice(0, corte);
    const proxima = depois.search(/\bart(?:igo|[íi]culo)?s?\.?\s*\d/iu);
    if (proxima >= 0) depois = depois.slice(0, proxima);
    if (INTERNA.test(depois)) { fimAnterior = fimCitacao; continue; }
    const preferida = PISTA_ES.test(`${chave[0]} ${depois.slice(0, 12)}`) ? "es" : padrao;
    let norma: Norma | undefined;
    const aposCitacao = normaNoTrecho(depois, apelidos, preferida, false);
    if (aposCitacao && aposCitacao.inicio <= 40) {
      norma = aposCitacao;
      fimCitacao += aposCitacao.fim;
    } else {
      let antes = texto.slice(Math.max(fimAnterior, inicio - 80), inicio);
      const quebra = Math.max(antes.lastIndexOf("\n"), antes.lastIndexOf(";"), antes.search(/\.\s+\p{Lu}[^.]*$/u));
      if (quebra >= 0) antes = antes.slice(quebra + 1);
      const antesCitacao = normaNoTrecho(antes, apelidos, preferida, true);
      if (antesCitacao && antes.length - antesCitacao.fim <= 25) {
        norma = antesCitacao;
        inicio -= antes.length - antesCitacao.inicio;
      }
    }
    fimAnterior = fimCitacao;
    if (!norma) continue;

    const original = texto.slice(inicio, fimCitacao).replace(/\s+/g, " ").trim();
    const base = indice.ler(norma.uri);
    if (!base) {
      citacoes.push({
        citacao: original, status: "fora_da_base", uri: norma.uri,
        detalhe: `${norma.rotulo} não está carregada no LawMCP; não dá para confirmar nem negar. Confira na fonte oficial.`,
      });
      continue;
    }
    const faixa = indice.faixaArtigos(base.uri);
    const aspas = /^[^"“«\n]{0,20}["“«]([^"”»]{12,})["”»]/u.exec(texto.slice(fimCitacao));

    for (const alvo of alvos) {
      const citacao = alvos.length > 1 || alvo.dispositivos.length > 1 ? `${original} → ${alvo.rotulo}` : original;
      const uriArtigo = `${base.uri}/${alvo.id}` as LawUri;
      const art = indice.ler(uriArtigo);
      if (!art) {
        citacoes.push(faixa
          ? { citacao, status: "inexistente", uri: uriArtigo, detalhe: `${base.titulo}: vai do art. ${faixa.min} ao art. ${faixa.max}; não há ${alvo.rotulo}.` }
          : { citacao, status: "fora_da_base", uri: base.uri, detalhe: `${base.titulo} está na base, mas sem divisão por artigos.` });
        continue;
      }
      for (const disp of alvo.dispositivos.length ? alvo.dispositivos : [""]) {
        const alvoTexto = disp ? indice.ler(`${uriArtigo}/${disp}`) : art;
        const rotulo = disp ? `${alvo.rotulo}, ${rotuloDispositivo(disp.replace(/^par-(\d+|unico)-inc-(\d+)$/, "inc-$2"))}` : alvo.rotulo;
        const c = alvo.dispositivos.length > 1 ? `${original} → ${rotulo}` : citacao;
        const uri = (disp ? `${uriArtigo}/${disp}` : uriArtigo) as LawUri;
        const permalink = art.origem.permalink;
        const extra = permalink ? { permalink } : {};
        if (!alvoTexto) {
          citacoes.push({ citacao: c, status: "inexistente", uri, detalhe: `${base.titulo}: o ${alvo.rotulo} tem ${faixaIncisos(indice.dispositivos(uriArtigo))}; não há ${rotulo.replace(/^art\.[^,]*,\s*/, "")}.`, ...extra });
        } else if (alvoTexto.situacao === "revogada") {
          citacoes.push({ citacao: c, status: "revogada", uri, detalhe: `${base.titulo}: ${rotulo} está revogado.`, ...extra });
        } else if (aspas && !normalizar(alvoTexto.texto).replace(/\W+/g, " ").includes(normalizar(aspas[1]!).replace(/\W+/g, " ").trim())) {
          citacoes.push({ citacao: c, status: "divergente", uri, detalhe: "O trecho entre aspas não aparece na redação oficial.", ...extra });
        } else {
          citacoes.push({ citacao: c, status: "ok", uri, ...extra });
        }
      }
    }
  }
  const resumo: Record<StatusCitacao, number> = { ok: 0, revogada: 0, inexistente: 0, divergente: 0, fora_da_base: 0 };
  for (const c of citacoes) resumo[c.status]++;
  return { citacoes, resumo };
}
