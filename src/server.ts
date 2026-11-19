import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { verificarCitacoes } from "./citacoes.ts";
import { normasDeArquivoLocal } from "./dados/adaptadores.ts";
import { Indice } from "./dados/indice.ts";
import { lerPastaParaImportar, salvarNormaLocal, salvarNormasLocais, SLUG, versoesLocais } from "./dados/locais.ts";
import { AVISO, type CompararJurisdicoesSaida, type ImportarNormasSaida, type LerNormaSaida, type Norma } from "./types.ts";

/** Pasta dos dados oficiais: LAWMCP_DATA ou data/snapshot na raiz do projeto (vale para src/ e dist/). */
export const DIR_SNAPSHOT = process.env.LAWMCP_DATA ?? fileURLToPath(new URL("../data/snapshot", import.meta.url));
/** Normas privadas (B2B), num repositório git próprio: LAWMCP_LOCAL ou data/local. */
export const DIR_LOCAL = process.env.LAWMCP_LOCAL ?? fileURLToPath(new URL("../data/local", import.meta.url));
/** Limite de texto por resposta, para não estourar o contexto do cliente. */
const MAX_TEXTO = 20_000;

const URI = z.string().regex(/^law:\/\/[\w./-]+$/, "URI no formato law://jurisdicao/id[/art-N[/inc-N]]").max(300);

const INSTRUCOES = `LawMCP: leis de vários países, estados e municípios como contexto verificável.
- Nunca cite lei de memória. Ache com buscar_normas, leia com ler_norma (vale para artigo e dispositivo: …/art-5/inc-13) e cite a URI e o permalink.
- Antes de entregar um texto com citações (resposta, petição, parecer), rode verificar_citacoes e corrija o que vier revogada, inexistente ou divergente.
- "fora_da_base" não quer dizer que a lei não existe: diga que não foi possível verificar.
- Para "o que mudou" use historico_norma (um artigo, ou as versões de uma norma privada) ou impacto_da_norma (o que uma lei alterou).
- Normas privadas de escritórios e empresas: adicionar_norma (uma) ou importar_normas (uma pasta de Markdown), em law://local/…. Para comparar países, comparar_jurisdicoes com a consulta traduzida para o idioma de cada um.
- Conteúdo informativo: não substitui a publicação oficial nem um advogado.`;

const json = (dados: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(dados, null, 2) }] });
const erro = (mensagem: string) => ({ content: [{ type: "text" as const, text: mensagem }], isError: true });
/** Tira campos undefined que o zod devolve, para casar com exactOptionalPropertyTypes do contrato. */
const semVazios = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as { [K in keyof T]: Exclude<T[K], undefined> };

function paraLeitura(n: Norma, max = MAX_TEXTO): LerNormaSaida {
  const truncado = n.texto.length > max;
  const { apelidos: _, ...resto } = n;
  return {
    ...resto,
    texto: truncado ? `${n.texto.slice(0, max)}\n\n[… texto truncado. Leia artigo por artigo: ${n.uri}/art-N]` : n.texto,
    aviso: AVISO, ...(truncado ? { truncado } : {}),
  };
}

function markdown(n: Norma, max: number): string {
  const o = paraLeitura(n, max);
  return [
    `# ${o.titulo}`, "",
    `- URI: ${o.uri}`, `- Situação: ${o.situacao}`, ...(o.data ? [`- Data: ${o.data}`] : []),
    `- Fonte oficial: ${o.fonte}`, ...(o.origem.permalink ? [`- Permalink do texto: ${o.origem.permalink}`] : []),
    "", o.texto, "", `> ${AVISO}`,
  ].join("\n");
}

export interface OpcoesServidor {
  /** Onde adicionar_norma grava. Sem isso, a tool responde com erro. */
  dirLocal?: string;
  dirSnapshot?: string;
}

/** Recebe o índice pronto ou a promessa dele: o cliente conecta na hora e as tools esperam a carga. */
export function criarServidor(indicePronto: Indice | Promise<Indice>, opcoes: OpcoesServidor = {}): McpServer {
  const server = new McpServer({ name: "lawmcp", version: "0.2.0" }, { instructions: INSTRUCOES });
  const indice = () => Promise.resolve(indicePronto);
  const leitura = { readOnlyHint: true, openWorldHint: false };

  server.registerTool("listar_jurisdicoes", {
    title: "Listar jurisdições",
    description: "Lista as jurisdições carregadas (br/federal, br/sp/birigui, es, local/…), os tipos de norma, o total e o commit de cada fonte. Use antes de buscar, para saber o que existe.",
    inputSchema: {},
    annotations: leitura,
  }, async () => json((await indice()).listarJurisdicoes()));

  server.registerTool("buscar_normas", {
    title: "Buscar normas",
    description: "Busca leis, códigos e artigos por palavras-chave (ranking BM25) em qualquer jurisdição. Devolve URIs law:// para ler com ler_norma. Filtre por jurisdição (prefixo: \"br\" inclui \"br/sp/birigui\"), tipo e ano. Escreva a consulta no idioma da jurisdição.",
    inputSchema: {
      consulta: z.string().min(1).max(500).describe("Palavras-chave, ex.: \"direito de arrependimento\""),
      jurisdicao: z.string().max(100).optional().describe("Prefixo da jurisdição: br, br/federal, br/sp/birigui, es"),
      tipo: z.string().max(60).optional().describe("Ex.: artigo, código, lei, artículo"),
      ano: z.number().int().min(1800).max(2100).optional(),
      limite: z.number().int().min(1).max(50).optional().describe("Padrão 10"),
    },
    annotations: leitura,
  }, async (e) => json({ ...(await indice()).buscar(semVazios(e)), aviso: AVISO }));

  server.registerTool("ler_norma", {
    title: "Ler norma",
    description: "Lê o texto oficial de uma norma, artigo ou dispositivo pela URI: law://br/federal/lei-8078-1990/art-49, law://br/federal/constituicao-1988/art-5/inc-13, …/art-59/par-1, law://es/BOE-A-1978-31229/art-14. Traz fonte, situação, genealogia (alteracoes) e permalink do texto no commit exato. Cite sempre o permalink.",
    inputSchema: { uri: URI },
    annotations: leitura,
  }, async ({ uri }) => {
    const norma = (await indice()).ler(uri);
    return norma ? json(paraLeitura(norma)) : erro(`Norma não encontrada: ${uri}. Use buscar_normas para achar a URI correta.`);
  });

  server.registerTool("verificar_citacoes", {
    title: "Verificar citações jurídicas",
    description: "Confere as citações de lei de um texto (petição, parecer, resposta de IA) até o nível de inciso e parágrafo: \"art. 5º, XIII, da CF\", \"arts. 5º a 7º da LGPD\", \"§ 1º do art. 59 da CLT\", \"artículo 14 de la Constitución\". Marca cada uma como ok, revogada, inexistente, divergente (trecho entre aspas diferente do oficial) ou fora_da_base, com permalink. Use antes de entregar qualquer texto que cite leis.",
    inputSchema: {
      texto: z.string().min(1).max(50_000),
      jurisdicao: z.string().max(100).optional().describe("Jurisdição padrão para nomes ambíguos como \"Código Civil\". Padrão: br"),
    },
    annotations: leitura,
  }, async (e) => json({ ...verificarCitacoes(await indice(), semVazios(e)), aviso: AVISO }));

  server.registerTool("comparar_jurisdicoes", {
    title: "Comparar jurisdições",
    description: "Busca o mesmo tema em várias jurisdições lado a lado (ex.: igualdade no Brasil e na Espanha). Mande a consulta já traduzida para o idioma de cada jurisdição.",
    inputSchema: {
      consultas: z.array(z.object({
        jurisdicao: z.string().min(1).max(100),
        consulta: z.string().min(1).max(500),
      })).min(2).max(6).describe("[{jurisdicao:\"br\", consulta:\"igualdade perante a lei\"}, {jurisdicao:\"es\", consulta:\"iguales ante la ley\"}]"),
      limite: z.number().int().min(1).max(10).optional().describe("Resultados por jurisdição. Padrão 3"),
    },
    annotations: leitura,
  }, async ({ consultas, limite }) => {
    const ind = await indice();
    const saida: CompararJurisdicoesSaida = {
      comparacao: consultas.map((c) => ({ ...c, resultados: ind.buscar({ consulta: c.consulta, jurisdicao: c.jurisdicao, limite: limite ?? 3 }).resultados })),
    };
    return json({ ...saida, aviso: AVISO });
  });

  server.registerTool("historico_norma", {
    title: "Histórico (genealogia) de uma norma",
    description: "Mostra quem alterou um artigo ou dispositivo e como (redação dada, incluído, revogado), com a norma alteradora. Para uma norma inteira, lista as leis que mais a alteraram. Ex.: law://br/federal/decreto-lei-5452-1943/art-59. Em normas privadas (law://local/…), traz as versões do git local com os artigos incluídos, alterados e removidos em cada uma.",
    inputSchema: { uri: URI },
    annotations: leitura,
  }, async ({ uri }) => {
    const ind = await indice();
    const h = ind.historico(uri);
    if (!h) return erro(`Norma não encontrada: ${uri}. Use buscar_normas para achar a URI correta.`);
    const { origem } = ind.ler(uri)!;
    // law://local/{org}/{norma}/{art-N}/…: o 4º segmento é o artigo.
    const versoes = opcoes.dirLocal && origem.repo === "local" ? versoesLocais(opcoes.dirLocal, origem.caminho, h.uri.slice(6).split("/")[3]) : undefined;
    return json({ ...h, ...(versoes ? { versoes } : {}), aviso: AVISO });
  });

  server.registerTool("impacto_da_norma", {
    title: "Impacto de uma norma",
    description: "Responde \"o que esta lei mudou?\": lista os artigos e dispositivos da base alterados, incluídos ou revogados por ela, agrupados pela norma alterada. Aceita URI, número (\"Lei 13.467/2017\") ou nome (\"Reforma Trabalhista\", \"LGPD\").",
    inputSchema: {
      norma: z.string().min(2).max(200),
      limite: z.number().int().min(1).max(500).optional().describe("Máximo de dispositivos listados. Padrão 100"),
    },
    annotations: leitura,
  }, async ({ norma, limite }) => {
    const r = (await indice()).impacto(norma, limite);
    if (!r) return erro(`Não reconheci a norma "${norma}". Use a URI (law://br/federal/lei-13467-2017), o número (Lei 13.467/2017) ou o nome.`);
    return json({ ...r, ...(r.total ? {} : { observacao: "Nenhuma alteração desta norma registrada nas normas da base. Isso não quer dizer que ela não alterou outras leis." }), aviso: AVISO });
  });

  server.registerTool("adicionar_norma", {
    title: "Adicionar norma privada",
    description: "Adiciona ou atualiza uma norma privada de um escritório ou empresa (política interna, contrato-padrão, regulamento) em law://local/{organizacao}/…. Cada versão vira um commit num repositório git local, e a norma passa a valer em buscar_normas, ler_norma e verificar_citacoes. Nunca grava em jurisdições oficiais.",
    inputSchema: {
      organizacao: z.string().regex(SLUG, "slug: minúsculas, números e hífen").describe("Ex.: escritorio-silva"),
      tipo: z.string().min(2).max(60).describe("Ex.: política interna, regulamento, contrato-padrão"),
      titulo: z.string().min(3).max(200),
      numero: z.string().max(40).optional(),
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "AAAA-MM-DD").optional(),
      fonte: z.string().min(1).max(500).describe("URL ou referência do documento original"),
      texto: z.string().min(10).max(200_000).describe("Markdown. Use \"Art. 1º …\" em linhas próprias para dividir em artigos."),
      apelidos: z.array(z.string().min(2).max(80)).max(10).optional().describe("Nomes pelos quais a norma é citada, ex.: \"Política de Privacidade\""),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (e) => {
    if (!opcoes.dirLocal) return erro("adicionar_norma está desligada: o servidor foi iniciado sem pasta local.");
    const ind = await indice();
    try {
      const { arquivo, commit, novaVersao } = salvarNormaLocal(opcoes.dirLocal, semVazios(e));
      const itens = await normasDeArquivoLocal(opcoes.dirLocal, arquivo, commit);
      ind.substituir(itens);
      server.sendResourceListChanged();
      return json({ uri: itens[0]!.uri, commit, artigos: itens.length - 1, novaVersao });
    } catch (err) {
      return erro(`Não foi possível salvar: ${(err as Error).message}`);
    }
  });

  server.registerTool("importar_normas", {
    title: "Importar pasta de normas privadas",
    description: "Importa de uma vez uma pasta de Markdown do computador (um .md por norma; frontmatter opcional: titulo, tipo, numero, data, fonte, apelidos) para law://local/{organizacao}/…, criando a jurisdição local/{organizacao}. Tudo vira um commit no git local; importar de novo grava só o que mudou, como nova versão (veja com historico_norma). Nunca grava em jurisdições oficiais.",
    inputSchema: {
      organizacao: z.string().regex(SLUG, "slug: minúsculas, números e hífen").describe("Ex.: escritorio-silva"),
      pasta: z.string().min(1).max(1000).describe("Caminho absoluto da pasta, ex.: /Users/ana/Documentos/politicas"),
      tipo: z.string().min(2).max(60).optional().describe("Tipo para arquivos sem \"tipo\" no frontmatter. Padrão: norma interna"),
      fonte: z.string().min(1).max(500).optional().describe("Fonte para arquivos sem \"fonte\" no frontmatter"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (e) => {
    if (!opcoes.dirLocal) return erro("importar_normas está desligada: o servidor foi iniciado sem pasta local.");
    const ind = await indice();
    try {
      const { entradas, ignorados } = await lerPastaParaImportar(semVazios(e));
      if (!entradas.length) return erro(`Nada para importar: ${ignorados.map((i) => `${i.arquivo} (${i.motivo})`).join("; ")}`);
      const { salvas, commit } = salvarNormasLocais(opcoes.dirLocal, entradas);
      const normas: ImportarNormasSaida["normas"] = [];
      for (const s of salvas) {
        const itens = await normasDeArquivoLocal(opcoes.dirLocal, s.arquivo, commit);
        ind.substituir(itens);
        normas.push({ uri: itens[0]!.uri, titulo: s.titulo, artigos: itens.length - 1 });
      }
      server.sendResourceListChanged();
      const saida: ImportarNormasSaida = {
        jurisdicao: `local/${e.organizacao}`, commit, total: salvas.length,
        novas: salvas.filter((s) => !s.novaVersao).length,
        atualizadas: salvas.filter((s) => s.novaVersao && s.mudou).length,
        inalteradas: salvas.filter((s) => !s.mudou).length,
        normas: normas.slice(0, 100), ignorados,
      };
      return json(saida);
    } catch (err) {
      return erro(`Não foi possível importar: ${(err as Error).message}`);
    }
  });

  // ---- Resources: cada norma é um documento que o cliente pode anexar ao contexto ----
  server.registerResource("norma", new ResourceTemplate("law://{+caminho}", {
    list: async () => ({
      resources: (await indice()).principais().map((n) => ({ uri: n.uri, name: n.titulo, mimeType: "text/markdown", description: `${n.jurisdicao} · ${n.tipo}` })),
    }),
  }), {
    title: "Norma",
    description: "Texto de uma norma, artigo ou dispositivo em Markdown, com fonte e permalink.",
    mimeType: "text/markdown",
  }, async (uri) => {
    const n = (await indice()).ler(uri.href);
    if (!n) throw new Error(`Norma não encontrada: ${uri.href}`);
    return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: markdown(n, 100_000) }] };
  });

  server.registerResource("sobre", "lawmcp://sobre", {
    title: "Sobre o LawMCP",
    description: "Cobertura da base, fontes e commits usados.",
    mimeType: "application/json",
  }, async (uri) => {
    const ind = await indice();
    const arq = join(opcoes.dirSnapshot ?? DIR_SNAPSHOT, "manifest.json");
    const manifesto = existsSync(arq) ? JSON.parse(readFileSync(arq, "utf8")) : {};
    return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ ...ind.listarJurisdicoes(), manifesto, aviso: AVISO }, null, 2) }] };
  });

  // ---- Prompts: fluxos prontos para o usuário escolher no cliente ----
  const prompt = (texto: string) => ({ messages: [{ role: "user" as const, content: { type: "text" as const, text: texto } }] });

  server.registerPrompt("responder_com_citacao", {
    title: "Responder com citação verificada",
    description: "Responde uma dúvida jurídica citando só o que foi lido na base, com permalink.",
    argsSchema: { pergunta: z.string(), jurisdicao: z.string().optional() },
  }, ({ pergunta, jurisdicao }) => prompt(
    `Responda com base apenas no LawMCP${jurisdicao ? ` (jurisdição ${jurisdicao})` : ""}: ${pergunta}\n\n` +
    "1. Use buscar_normas e ler_norma para achar os artigos aplicáveis.\n2. Escreva a resposta citando artigo, URI e permalink.\n" +
    "3. Rode verificar_citacoes no seu texto final e corrija o que não vier ok.\n4. Termine com o aviso de que não substitui um advogado."));

  server.registerPrompt("explicar_para_cidadao", {
    title: "Explicar a lei para um cidadão",
    description: "Explica em linguagem simples, sem juridiquês, com a lei por trás.",
    argsSchema: { duvida: z.string() },
  }, ({ duvida }) => prompt(
    `Explique para uma pessoa sem formação jurídica: ${duvida}\n\n` +
    "Ache a lei com buscar_normas e leia com ler_norma. Responda em frases curtas, com um exemplo do dia a dia, e no fim mostre a lei usada (artigo e permalink). " +
    "Se depender do caso concreto, diga para procurar um advogado ou a Defensoria Pública."));

  server.registerPrompt("revisar_peca", {
    title: "Revisar citações de uma peça",
    description: "Confere todas as citações de uma petição, parecer ou contrato.",
    argsSchema: { texto: z.string() },
  }, ({ texto }) => prompt(
    `Revise as citações legais desta peça com verificar_citacoes:\n\n${texto}\n\n` +
    "Monte uma tabela: citação, status, problema e correção sugerida. Para cada revogada ou inexistente, use buscar_normas para sugerir o dispositivo certo. " +
    "Para divergente, mostre a redação oficial com ler_norma."));

  server.registerPrompt("comparar_paises", {
    title: "Comparar a lei entre países",
    description: "Compara como Brasil, Espanha e outras jurisdições tratam um tema.",
    argsSchema: { tema: z.string(), jurisdicoes: z.string().optional().describe("Separadas por vírgula. Padrão: br, es") },
  }, ({ tema, jurisdicoes }) => prompt(
    `Compare como ${jurisdicoes ?? "br, es"} tratam: ${tema}.\n\n` +
    "Traduza a consulta para o idioma de cada jurisdição e use comparar_jurisdicoes. Leia os artigos principais com ler_norma. " +
    "Responda com uma tabela (jurisdição, regra, artigo com permalink) e um parágrafo com semelhanças e diferenças."));

  return server;
}

// Executado direto (npm run mcp): stdout é do protocolo MCP, então logs só vão para o stderr.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const inicio = performance.now();
  const indice = Indice.carregar(DIR_SNAPSHOT, DIR_LOCAL);
  indice.then(
    (i) => console.error(`LawMCP: ${i.total} normas carregadas em ${Math.round(performance.now() - inicio)} ms (${DIR_SNAPSHOT})`),
    (err: unknown) => { console.error("LawMCP: falha ao carregar a base", err); process.exit(1); },
  );
  await criarServidor(indice, { dirLocal: DIR_LOCAL }).connect(new StdioServerTransport());
}

