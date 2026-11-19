/**
 * Tradutor de linguagem leiga para o vocabulário da lei, com o Claude da conta logada no Claude Code (`claude -p`).
 * "bater carro" não acha nada na busca BM25; "acidente de trânsito reparar o dano" acha o CTB e o Código Civil.
 * Opcional: sem o CLI, sem login ou em caso de erro, devolve null e a web segue com as regras.
 * Desligue com CLAUDE_MODEL= (vazio). Login: `claude auth login`.
 */
import { execFile } from "node:child_process";

export const MODELO = process.env.CLAUDE_MODEL ?? "haiku";

export interface Traducao { de: string; para: string; modelo: string; ms: number }
/** Roda o CLI com a entrada no stdin e devolve o stdout. Injetável nos testes. */
export type Executar = (args: string[], entrada: string, timeoutMs: number) => Promise<string>;
interface Opcoes { jurisdicao?: string | undefined; modelo?: string; executar?: Executar; timeoutMs?: number }

const executarClaude: Executar = (args, entrada, timeout) => new Promise((ok, falha) => {
  const filho = execFile("claude", args, { timeout, maxBuffer: 1 << 20 }, (err, stdout) => (err ? falha(err) : ok(stdout)));
  filho.stdin?.end(entrada);
});

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
  // Sem tools, MCP, hooks nem plugins: o modelo só devolve o JSON. "Pergunta:" impede que o texto vire um /comando.
  const args = ["-p", "--safe-mode", "--tools", "", "--strict-mcp-config", "--no-session-persistence", "--output-format", "json",
    "--model", modelo, "--system-prompt", SISTEMA, "--json-schema", JSON.stringify(FORMATO)];
  const entrada = `Pergunta: ${pergunta.slice(0, 500)}${opcoes.jurisdicao ? `\nJurisdição: ${opcoes.jurisdicao === "es" ? "Espanha" : opcoes.jurisdicao}` : ""}`;
  try {
    const saida = JSON.parse(await (opcoes.executar ?? executarClaude)(args, entrada, opcoes.timeoutMs ?? 30_000)) as { is_error?: boolean; result?: string; modelUsage?: Record<string, unknown> };
    if (saida.is_error) return null;
    const para = limparConsulta(saida.result);
    // Número que a pergunta não trouxe é artigo inventado pelo modelo: descarta e a web usa as regras.
    if (para?.match(/\d+/g)?.some((n) => !pergunta.includes(n))) return null;
    return para ? { de: pergunta, para, modelo: Object.keys(saida.modelUsage ?? {})[0] ?? modelo, ms: Math.round(performance.now() - inicio) } : null;
  } catch (err) {
    console.error("tradutor:", (err as Error).message);
    return null;
  }
}

/** O CLI do Claude está instalado e logado? Usado no estado da web. */
export async function disponivel(): Promise<boolean> {
  if (!MODELO) return false;
  return new Promise((ok) => execFile("claude", ["auth", "status", "--json"], { timeout: 5000 }, (err, stdout) => {
    try { ok(!err && (JSON.parse(stdout) as { loggedIn?: boolean }).loggedIn === true); } catch { ok(false); }
  }));
}
