import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { verificarCitacoes } from "./citacoes.ts";
import { Indice } from "./dados/indice.ts";
import { AVISO, type LawUri, type LerNormaSaida } from "./types.ts";

/** Pasta dos dados: LAWMCP_DATA ou data/snapshot na raiz do projeto (vale para src/ e dist/). */
export const DIR_SNAPSHOT = process.env.LAWMCP_DATA ?? fileURLToPath(new URL("../data/snapshot", import.meta.url));
/** Limite de texto por resposta, para não estourar o contexto do cliente. */
const MAX_TEXTO = 20_000;

const json = (dados: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(dados, null, 2) }] });
const erro = (mensagem: string) => ({ content: [{ type: "text" as const, text: mensagem }], isError: true });

export function criarServidor(indice: Indice): McpServer {
  const server = new McpServer({ name: "lawmcp", version: "0.1.0" });
  const leitura = { readOnlyHint: true, openWorldHint: false };

  server.registerTool("listar_jurisdicoes", {
    title: "Listar jurisdições",
    description: "Lista as jurisdições carregadas no LawMCP (ex.: br/federal, br/sp/birigui, es), os tipos de norma de cada uma e o total. Use antes de buscar, para saber o que existe.",
    inputSchema: {},
    annotations: leitura,
  }, async () => json(indice.listarJurisdicoes()));

  server.registerTool("buscar_normas", {
    title: "Buscar normas",
    description: "Busca leis, decretos e artigos por palavras-chave em qualquer jurisdição. Devolve URIs law:// para ler com ler_norma. Filtre por jurisdição (prefixo: \"br\" inclui \"br/sp/birigui\"), tipo e ano.",
    inputSchema: {
      consulta: z.string().min(1).max(500).describe("Palavras-chave, ex.: \"direito de arrependimento\""),
      jurisdicao: z.string().max(100).optional().describe("Prefixo da jurisdição: br, br/federal, br/sp/birigui, es"),
      tipo: z.string().max(60).optional().describe("Ex.: artigo, lei, decreto, artículo"),
      ano: z.number().int().min(1800).max(2100).optional(),
      limite: z.number().int().min(1).max(50).optional().describe("Padrão 10"),
    },
    annotations: leitura,
  }, async (e) => json({ ...indice.buscar({
    consulta: e.consulta,
    ...(e.jurisdicao ? { jurisdicao: e.jurisdicao } : {}),
    ...(e.tipo ? { tipo: e.tipo } : {}),
    ...(e.ano ? { ano: e.ano } : {}),
    ...(e.limite ? { limite: e.limite } : {}),
  }), aviso: AVISO }));

  server.registerTool("ler_norma", {
    title: "Ler norma",
    description: "Lê o texto oficial de uma norma ou artigo pela URI (ex.: law://br/federal/lei-8078-1990/art-49, law://es/BOE-A-1978-31229/art-14), com fonte, data, situação e origem. Cite sempre a fonte.",
    inputSchema: { uri: z.string().regex(/^law:\/\/[\w./-]+$/, "URI no formato law://jurisdicao/id[/art-N]").max(300) },
    annotations: leitura,
  }, async ({ uri }) => {
    const norma = indice.ler(uri);
    if (!norma) return erro(`Norma não encontrada: ${uri}. Use buscar_normas para achar a URI correta.`);
    const truncado = norma.texto.length > MAX_TEXTO;
    const { apelidos: _, ...resto } = norma;
    const saida: LerNormaSaida = {
      ...resto, uri: norma.uri as LawUri,
      texto: truncado ? `${norma.texto.slice(0, MAX_TEXTO)}\n\n[… texto truncado. Leia artigo por artigo: ${norma.uri}/art-N]` : norma.texto,
      aviso: AVISO, ...(truncado ? { truncado } : {}),
    };
    return json(saida);
  });

  server.registerTool("verificar_citacoes", {
    title: "Verificar citações jurídicas",
    description: "Confere as citações de lei de um texto (petição, parecer, resposta de IA): marca cada uma como ok, revogada, inexistente, divergente (trecho entre aspas diferente do oficial) ou fora_da_base. Use antes de entregar qualquer resposta que cite leis.",
    inputSchema: {
      texto: z.string().min(1).max(50_000),
      jurisdicao: z.string().max(100).optional().describe("Jurisdição padrão para apelidos ambíguos. Padrão: br"),
    },
    annotations: leitura,
  }, async (e) => json({ ...verificarCitacoes(indice, { texto: e.texto, ...(e.jurisdicao ? { jurisdicao: e.jurisdicao } : {}) }), aviso: AVISO }));

  return server;
}

// Executado direto (npm run mcp): stdout é do protocolo MCP, então logs só vão para o stderr.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const indice = await Indice.carregar(DIR_SNAPSHOT);
  console.error(`LawMCP: ${indice.total} normas carregadas de ${DIR_SNAPSHOT}`);
  await criarServidor(indice).connect(new StdioServerTransport());
}
