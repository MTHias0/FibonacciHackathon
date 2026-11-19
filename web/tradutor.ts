/**
 * Tradutor de linguagem leiga para o vocabulário da lei, com um modelo local do Ollama.
 * "bater carro" não acha nada na busca BM25; "acidente de trânsito reparar o dano" acha o CTB e o Código Civil.
 * Opcional: sem Ollama, sem o modelo ou em caso de erro, devolve null e a web segue com as regras.
 * Desligue com OLLAMA_MODEL= (vazio).
 */

export const MODELO = process.env.OLLAMA_MODEL ?? "qwen2.5:7b-instruct-q4_K_M";
const URL_OLLAMA = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";

export interface Traducao { de: string; para: string; modelo: string; ms: number }
interface Opcoes { jurisdicao?: string | undefined; modelo?: string; url?: string; fetch?: typeof fetch; timeoutMs?: number }

const SISTEMA = `Você reescreve perguntas de cidadãos como consulta para um buscador de leis do Brasil e da Espanha que só entende o vocabulário da própria lei.
Troque palavras do dia a dia pelos termos jurídicos. Mantenha nomes próprios, números e siglas (IPTU, CLT, LGPD) que a pergunta trouxer.
Nunca invente número de artigo, de lei ou nome de código que a pergunta não citou: descreva o assunto, não a fonte.
As leis da Espanha estão em espanhol: se a pergunta for sobre a Espanha, escreva a consulta em espanhol jurídico.
Responda só o JSON {"consulta": "..."} com 2 a 6 palavras, sem explicação.
Exemplos:
"lei sobre tratamento de dados pessoais na espanha" -> "protección de datos personales"
"na espanha posso ser demitido sem motivo" -> "despido improcedente indemnización"
"bati o carro de outra pessoa" -> "acidente de trânsito reparar o dano"
"qual lei fala sobre bater carro no brasil" -> "acidente de trânsito reparar o dano"
"fui mandado embora" -> "despedida sem justa causa aviso prévio"
"comprei pela internet e quero devolver" -> "direito de arrependimento"
"meu chefe não paga hora extra" -> "horas extras remuneração"
"que leis de Birigui falam de IPTU" -> "IPTU"`;

const FORMATO = { type: "object", properties: { consulta: { type: "string" } }, required: ["consulta"] };

/** Valida a saída do modelo: JSON com uma consulta curta. Qualquer outra coisa vira null. */
export function limparConsulta(bruto: unknown): string | null {
  let consulta: unknown;
  try { consulta = (JSON.parse(String(bruto)) as { consulta?: unknown }).consulta; } catch { return null; }
  if (typeof consulta !== "string") return null;
  const limpa = consulta.replace(/[_"“”]/g, " ").replace(/\s+/g, " ").trim();
  return limpa.length >= 3 && limpa.length <= 120 ? limpa : null;
}

export async function traduzir(pergunta: string, opcoes: Opcoes = {}): Promise<Traducao | null> {
  const modelo = opcoes.modelo ?? MODELO;
  if (!modelo) return null;
  const inicio = performance.now();
  try {
    const r = await (opcoes.fetch ?? fetch)(`${opcoes.url ?? URL_OLLAMA}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: modelo, stream: false, format: FORMATO, keep_alive: "30m", options: { temperature: 0 },
        messages: [{ role: "system", content: SISTEMA }, { role: "user", content: pergunta.slice(0, 500) + (opcoes.jurisdicao ? `\nJurisdição: ${opcoes.jurisdicao === "es" ? "Espanha" : opcoes.jurisdicao}` : "") }],
      }),
      signal: AbortSignal.timeout(opcoes.timeoutMs ?? 20_000),
    });
    if (!r.ok) return null;
    const para = limparConsulta(((await r.json()) as { message?: { content?: string } }).message?.content);
    // Número que a pergunta não trouxe é artigo inventado pelo modelo: descarta e a web usa as regras.
    if (para?.match(/\d+/g)?.some((n) => !pergunta.includes(n))) return null;
    return para ?{ de: pergunta, para, modelo, ms: Math.round(performance.now() - inicio) } : null;
  } catch (err) {
    console.error("tradutor:", (err as Error).message);
    return null;
  }
}

/** O modelo está baixado e o Ollama responde? Usado no estado da web. */
export async function disponivel(): Promise<boolean> {
  if (!MODELO) return false;
  try {
    const r = await fetch(`${URL_OLLAMA}/api/tags`, { signal: AbortSignal.timeout(1500) });
    const { models } = (await r.json()) as { models?: { name: string }[] };
    return models?.some((m) => m.name === MODELO || m.name === `${MODELO}:latest`) ?? false;
  } catch {
    return false;
  }
}

/** Carrega o modelo na memória ao subir a web, para a primeira pergunta não esperar uns 20 s. */
export function aquecer() {
  if (MODELO) fetch(`${URL_OLLAMA}/api/generate`, { method: "POST", body: JSON.stringify({ model: MODELO, keep_alive: "30m" }) }).catch(() => {});
}
