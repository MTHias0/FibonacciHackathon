/**
 * Ponte do front com o LawMCP: um servidor HTTP pequeno que é um **cliente MCP** comum.
 * Sobe src/server.ts via stdio (como o Claude Desktop faz) e expõe:
 *   GET  /api/estado  tools e jurisdições carregadas
 *   POST /api/tool    { nome, args } → chama uma tool de leitura
 *   POST /api/chat    { texto, modo } → roteia para uma tool (e encadeia, se preciso) e devolve os passos
 */
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { comContexto, MODOS, rotear, type Modo } from "./roteador.ts";
import { aquecer, disponivel, MODELO, traduzir, type Traducao } from "./tradutor.ts";

const PORTA = Number(process.env.PORT ?? 5173);
const PUBLICO = fileURLToPath(new URL("./public/", import.meta.url));
const SERVIDOR_MCP = fileURLToPath(new URL("../src/server.ts", import.meta.url));
/** adicionar_norma e importar_normas gravam em disco: ficam fora da web até existir autenticação. */
const BLOQUEADAS = new Set(["adicionar_norma", "importar_normas"]);
const MAX_CORPO = 100_000;
/** Prefixo de jurisdição do filtro da tela: br, br/federal, br/sp/birigui, es. */
const JURISDICAO = /^[a-z]{2}(\/[a-z0-9-]+){0,3}$/;

const cliente = new Client({ name: "lawmcp-web", version: "0.2.0" });
await cliente.connect(new StdioClientTransport({ command: process.execPath, args: [SERVIDOR_MCP] }));
const { tools } = await cliente.listTools();
const PERMITIDAS = new Set(tools.map((t) => t.name).filter((n) => !BLOQUEADAS.has(n)));
aquecer();

interface Passo { tool: string; args: Record<string, unknown>; ms: number; resultado?: unknown; erro?: string }

async function chamar(tool: string, args: Record<string, unknown>): Promise<Passo> {
  const inicio = performance.now();
  const r = await cliente.callTool({ name: tool, arguments: args });
  const texto = (r.content as { type: string; text?: string }[]).find((c) => c.type === "text")?.text ?? "";
  const ms = Math.round(performance.now() - inicio);
  if (r.isError) return { tool, args, ms, erro: texto };
  try { return { tool, args, ms, resultado: JSON.parse(texto) }; } catch { return { tool, args, ms, resultado: texto }; }
}

async function chat(texto: string, modo: Modo, jurisdicao?: string, anteriores: string[] = []): Promise<{ passos: Passo[]; traducao?: Traducao }> {
  texto = comContexto(texto, anteriores);
  const plano = rotear(texto, modo, jurisdicao);
  // Busca em linguagem leiga: o modelo local reescreve no vocabulário da lei. Sem resultado, volta para as regras.
  if (plano.tool === "buscar_normas") {
    const traducao = await traduzir(texto, { jurisdicao: plano.args.jurisdicao as string | undefined });
    if (traducao) {
      const passo = await chamar("buscar_normas", { ...plano.args, consulta: traducao.para });
      if ((passo.resultado as { resultados?: unknown[] } | undefined)?.resultados?.length) return { passos: [passo], traducao };
    }
  }
  const passos = [await chamar(plano.tool, plano.args)];
  const citacoes = (passos[0]!.resultado as { citacoes?: { uri?: string; status: string }[] } | undefined)?.citacoes;
  const alvo = citacoes?.find((c) => c.uri && c.status !== "inexistente")?.uri;
  if (plano.depois && alvo) passos.push(await chamar(plano.depois, { uri: alvo }));
  return { passos };
}

const TIPOS: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };

function enviar(res: ServerResponse, status: number, corpo: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" }).end(JSON.stringify(corpo));
}

async function lerJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let corpo = "";
  for await (const parte of req) {
    corpo += parte;
    if (corpo.length > MAX_CORPO) throw new Error("Corpo grande demais");
  }
  const dados: unknown = JSON.parse(corpo || "{}");
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) throw new Error("JSON inválido");
  return dados as Record<string, unknown>;
}

async function estatico(caminho: string, res: ServerResponse) {
  const arquivo = normalize(join(PUBLICO, caminho === "/" ? "index.html" : caminho));
  if (!arquivo.startsWith(PUBLICO)) return enviar(res, 403, { erro: "Proibido" });
  const conteudo = await readFile(arquivo).catch(() => null);
  if (!conteudo) return enviar(res, 404, { erro: "Não encontrado" });
  res.writeHead(200, { "content-type": TIPOS[extname(arquivo)] ?? "application/octet-stream" }).end(conteudo);
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  try {
    if (req.method === "GET" && pathname === "/api/estado") {
      const passo = await chamar("listar_jurisdicoes", {});
      return enviar(res, 200, {
        tools: tools.map(({ name, title, description }) => ({ name, title, description, liberada: PERMITIDAS.has(name) })),
        jurisdicoes: passo.resultado,
        tradutor: (await disponivel()) ? MODELO : null,
      });
    }
    if (req.method === "POST" && pathname === "/api/tool") {
      const { nome, args } = await lerJson(req);
      if (typeof nome !== "string" || !PERMITIDAS.has(nome)) return enviar(res, 400, { erro: "Tool desconhecida ou bloqueada na web" });
      return enviar(res, 200, await chamar(nome, (args && typeof args === "object" ? args : {}) as Record<string, unknown>));
    }
    if (req.method === "POST" && pathname === "/api/chat") {
      const { texto, modo, jurisdicao, anteriores } = await lerJson(req);
      if (typeof texto !== "string" || !texto.trim() || texto.length > 50_000) return enviar(res, 400, { erro: "Escreva uma pergunta ou cole um texto" });
      const filtro = typeof jurisdicao === "string" && JURISDICAO.test(jurisdicao) ? jurisdicao : undefined;
      const historico = Array.isArray(anteriores) ? anteriores.filter((a): a is string => typeof a === "string").slice(-3) : [];
      return enviar(res, 200, await chat(texto, MODOS.includes(modo as Modo) ? modo as Modo : "auto", filtro, historico));
    }
    if (req.method === "GET") return estatico(pathname, res);
    enviar(res, 405, { erro: "Método não suportado" });
  } catch (err) {
    console.error("lawmcp-web:", err);
    enviar(res, 400, { erro: (err as Error).message });
  }
}).listen(PORTA, "127.0.0.1", () => console.error(`LawMCP web: http://localhost:${PORTA} (cliente MCP com ${tools.length} tools)`));
