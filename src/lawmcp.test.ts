import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { verificarCitacoes } from "./citacoes.ts";
import { envGit } from "./dados/adaptadores.ts";
import { Indice } from "./dados/indice.ts";
import { dividirArtigos, dividirDispositivos, referenciaAto } from "./dados/texto.ts";
import { criarServidor, DIR_SNAPSHOT } from "./server.ts";

const indice = await Indice.carregar(DIR_SNAPSHOT);
const verificar = (texto: string, jurisdicao?: string) =>
  verificarCitacoes(indice, { texto, ...(jurisdicao ? { jurisdicao } : {}) }).citacoes.map((c) => `${c.status} ${c.uri ?? ""}`.trim());
const temp = mkdtempSync(join(tmpdir(), "lawmcp-"));
// Simula um hook do git (pre-push rodando npm test): o LawMCP deve ignorar o GIT_DIR herdado e commitar só no repositório local.
process.env.GIT_DIR = join(temp, "git-dir-do-hook-inexistente");
after(() => rmSync(temp, { recursive: true, force: true }));

// ---- Utilitários de texto ----

test("texto: reconhece atos em todos os formatos de nota", () => {
  const casos: [string, string][] = [
    ["Redação dada pela Lei nº 13.467, de 2017", "lei-13467-2017"],
    ["Redação dada pela Lei nº 7.209, de 11.7.1984", "lei-7209-1984"],
    ["Incluído pela Lcp nº 123, de 2006", "lei-complementar-123-2006"],
    ["Redação dada pelo Decreto-lei nº 229, de 28.2.1967", "decreto-lei-229-1967"],
    ["Lei 8.078/90", "lei-8078-1990"],
    ["Lei nº 13.709, de 14 de agosto de 2018", "lei-13709-2018"],
    ["Emenda Constitucional nº 103, de 2019", "emenda-constitucional-103-2019"],
  ];
  for (const [nota, id] of casos) assert.equal(referenciaAto(nota)?.id, id, nota);
});

test("texto: divide artigos e dispositivos (inclusive aninhados)", () => {
  const arts = dividirArtigos("**Art. 1º** Um.\n**Art. 1.025. O** dois.\n#### Art. 7º-A\nTrês\n###### Artículo 14\nCuatro");
  assert.deepEqual(arts.map((a) => a.id), ["art-1", "art-1025", "art-7-a", "art-14"]);
  const d = dividirDispositivos("Caput:\nI - um;\nII - (Revogado)\n§ 1º Parágrafo:\nI - inciso do parágrafo\nParágrafo único. Fim");
  assert.deepEqual([...d.keys()], ["caput", "inc-1", "inc-2", "par-1", "par-1-inc-1", "par-unico"]);
  assert.match(d.get("par-1")!, /inciso do parágrafo/, "o parágrafo inclui os incisos dele");
});

// ---- Índice ----

test("carrega as jurisdições da demo com o commit de cada fonte", () => {
  const { jurisdicoes } = indice.listarJurisdicoes();
  for (const j of ["br/federal", "br/sp/birigui", "es"]) {
    const achada = jurisdicoes.find((x) => x.jurisdicao === j);
    assert.ok(achada, j);
    assert.ok(achada.fontes.every((f) => f.commit), `${j} sem commit no manifesto`);
  }
  assert.ok(indice.total > 10_000, String(indice.total));
});

test("ler_norma: artigo, inciso e parágrafo, no Brasil e na Espanha", () => {
  assert.match(indice.ler("law://br/federal/lei-8078-1990/art-49")?.texto ?? "", /desistir do contrato/);
  assert.match(indice.ler("law://es/BOE-A-1978-31229/art-14")?.texto ?? "", /iguales ante la ley/);
  assert.match(indice.ler("law://br/federal/constituicao-1988/art-5/inc-13")?.texto ?? "", /livre o exerc[íi]cio de qualquer trabalho/);
  assert.match(indice.ler("law://br/federal/lei-10406-2002/art-186")?.texto ?? "", /ato il[íi]cito/);
  assert.ok(indice.ler("law://br/federal/decreto-lei-5452-1943/art-59/par-1"));
  assert.equal(indice.ler("law://br/federal/lei-8078-1990/art-9999"), undefined);
  assert.equal(indice.ler("law://br/federal/constituicao-1988/art-5/inc-999"), undefined);
});

test("permalink aponta para o arquivo no commit do manifesto", () => {
  const manifesto = JSON.parse(readFileSync(join(DIR_SNAPSHOT, "manifest.json"), "utf8"));
  const es = indice.ler("law://es/BOE-A-1978-31229/art-14")!;
  assert.equal(es.origem.permalink, `https://github.com/legalize-dev/legalize-es/blob/${manifesto.es.commit}/${es.origem.caminho}`);
  assert.match(es.origem.caminho, /^es\/[0-9a-f]{2}\/BOE-A-1978-31229\.md$/);
  assert.match(indice.ler("law://br/federal/lei-10406-2002/art-186")!.origem.permalink ?? "", /LawCodex\/br\/blob\/[0-9a-f]{40}\/codigos\//);
});

test("buscar_normas: ranking BM25 põe o artigo certo no topo", () => {
  const top = (consulta: string, jurisdicao?: string, n = 3) =>
    indice.buscar({ consulta, limite: n, ...(jurisdicao ? { jurisdicao } : {}) }).resultados.map((r) => r.uri);
  assert.ok(top("direito de arrependimento", "br").includes("law://br/federal/lei-8078-1990/art-49"));
  assert.equal(top("iguales ante la ley", "es")[0], "law://es/BOE-A-1978-31229/art-14");
  // Artigo longo: o caput do art. 5º não pode sumir entre os 78 incisos.
  assert.equal(top("igualdade perante a lei", "br")[0], "law://br/federal/constituicao-1988/art-5");
  assert.equal(top("responsabilidade civil dano moral ato ilícito", "br")[0], "law://br/federal/lei-10406-2002/art-186");
  assert.ok(top("IPTU", "br/sp/birigui", 5).every((u) => u.startsWith("law://br/sp/birigui/")));
  assert.deepEqual(top("zzzzzz inexistente"), []);
});

// ---- Verificador de citações ----

test("verificar_citacoes: artigos, listas, faixas, incisos e parágrafos", () => {
  const casos: [string, string[]][] = [
    ["Conforme o art. 186 do Código Civil.", ["ok law://br/federal/lei-10406-2002/art-186"]],
    ["O art. 5º da CF garante a igualdade.", ["ok law://br/federal/constituicao-1988/art-5"]],
    ["arts. 5º, 6º e 7º da Constituição Federal", ["ok law://br/federal/constituicao-1988/art-5", "ok law://br/federal/constituicao-1988/art-6", "ok law://br/federal/constituicao-1988/art-7"]],
    ["arts. 1º a 3º da LGPD", ["ok law://br/federal/lei-13709-2018/art-1", "ok law://br/federal/lei-13709-2018/art-2", "ok law://br/federal/lei-13709-2018/art-3"]],
    ["art. 5º, XIII e XIV, da CF/88", ["ok law://br/federal/constituicao-1988/art-5/inc-13", "ok law://br/federal/constituicao-1988/art-5/inc-14"]],
    ["CF, art. 5º, LXXVIII", ["ok law://br/federal/constituicao-1988/art-5/inc-78"]],
    ["o § 1º do art. 59 da CLT", ["ok law://br/federal/decreto-lei-5452-1943/art-59/par-1"]],
    ["art. 1.228, § 1º, do CC", ["ok law://br/federal/lei-10406-2002/art-1228/par-1"]],
    ["art. 7º, inciso XCIX, da CF", ["inexistente law://br/federal/constituicao-1988/art-7/inc-99"]],
    ["art. 999 do CDC", ["inexistente law://br/federal/lei-8078-1990/art-999"]],
    ["art. 117 da Constituição", ["revogada law://br/federal/constituicao-1988/art-117"]],
    ["art. 3º, II, do Código Civil", ["revogada law://br/federal/lei-10406-2002/art-3/inc-2"]],
    ["Lei 9.999/2020, art. 3º", ["fora_da_base law://br/federal/lei-9999-2020"]],
    ["art. 37 da Lei 8.666/93", ["fora_da_base law://br/federal/lei-8666-1993"]],
    ["art. 33 da Lei 11.343/2006", ["ok law://br/federal/lei-11343-2006/art-33"]],
    ["artículo 14 de la Constitución Española", ["ok law://es/BOE-A-1978-31229/art-14"]],
    ["art. 3º desta Lei", []],
    ["O direito brasileiro é complexo.", []],
  ];
  for (const [texto, esperado] of casos) assert.deepEqual(verificar(texto), esperado, texto);
});

test("verificar_citacoes: Código Civil é o brasileiro, salvo citação em espanhol", () => {
  assert.deepEqual(verificar("art. 186 do Código Civil"), ["ok law://br/federal/lei-10406-2002/art-186"]);
  assert.deepEqual(verificar("artículo 1902 del Código Civil"), ["ok law://es/BOE-A-1889-4763/art-1902"]);
  assert.deepEqual(verificar("art. 1902 do Código Civil", "es"), ["ok law://es/BOE-A-1889-4763/art-1902"]);
});

test("verificar_citacoes: trecho entre aspas diferente do oficial é divergente", () => {
  assert.deepEqual(verificar('art. 49 do CDC: "O consumidor pode desistir do contrato, no prazo de 7 dias"'), ["ok law://br/federal/lei-8078-1990/art-49"]);
  assert.deepEqual(verificar('art. 49 do CDC: "O consumidor pode desistir do contrato, no prazo de 30 dias"'), ["divergente law://br/federal/lei-8078-1990/art-49"]);
});

test("verificar_citacoes: resumo, permalink e detalhe útil", () => {
  const r = verificarCitacoes(indice, { texto: "Segundo o art. 49 do CDC e o art. 999 do CDC, e ainda o art. 117 da CF." });
  assert.deepEqual(r.resumo, { ok: 1, revogada: 1, inexistente: 1, divergente: 0, fora_da_base: 0 });
  assert.match(r.citacoes[0]!.permalink ?? "", /^https:\/\/github\.com\/Evaldoes\/legislacao-br\/blob\/[0-9a-f]{40}\//);
  assert.match(r.citacoes[1]!.detalhe ?? "", /vai do art\. 1 ao art\. 119/);
});

// ---- Genealogia ----

test("historico_norma: quem alterou o art. 59 da CLT e a CLT inteira", () => {
  const art = indice.historico("law://br/federal/decreto-lei-5452-1943/art-59")!;
  assert.ok(art.alteracoes.some((a) => a.norma === "law://br/federal/lei-13467-2017" && a.dispositivo === "caput"));
  assert.ok(art.alteracoes.every((a) => a.uriDispositivo.startsWith("law://br/federal/decreto-lei-5452-1943/art-59")));
  const clt = indice.historico("law://br/federal/decreto-lei-5452-1943")!;
  assert.equal(clt.alteradoras[0]?.norma, "law://br/federal/lei-13467-2017");
  assert.equal(clt.alteradoras[0]?.naBase, true);
  assert.equal(indice.historico("law://br/federal/nao-existe"), undefined);
});

test("impacto_da_norma: o que a Reforma Trabalhista mudou, por nome, número ou URI", () => {
  const porNome = indice.impacto("Reforma Trabalhista")!;
  assert.equal(porNome.norma.uri, "law://br/federal/lei-13467-2017");
  assert.ok(porNome.total > 300, String(porNome.total));
  assert.equal(porNome.porNorma[0]?.uri, "law://br/federal/decreto-lei-5452-1943");
  assert.equal(indice.impacto("Lei nº 13.467/2017")!.total, porNome.total);
  assert.equal(indice.impacto("law://br/federal/lei-13467-2017")!.total, porNome.total);
  assert.equal(indice.impacto("uma lei qualquer"), undefined);
});

// ---- Protocolo MCP (em memória, com o índice já carregado) ----

const conectar = async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const server = criarServidor(indice, { dirLocal: temp });
  const client = new Client({ name: "teste", version: "0.0.0" });
  await Promise.all([server.connect(a), client.connect(b)]);
  const chamar = async (name: string, args: Record<string, unknown>) => {
    const r = await client.callTool({ name, arguments: args });
    const t = (r.content as { text: string }[])[0]!.text;
    return { erro: r.isError === true, texto: t, json: () => JSON.parse(t) };
  };
  return { client, chamar };
};

test("fontes.json: registra uma jurisdição em Markdown sem código e recusa configuração inválida", async () => {
  const snap = join(temp, "snapshot");
  mkdirSync(join(snap, "br-sp-teste"), { recursive: true });
  writeFileSync(join(snap, "fontes.json"), JSON.stringify({ fontes: [{ pasta: "br-sp-teste", jurisdicao: "br/sp/teste", formato: "markdown" }] }));
  writeFileSync(join(snap, "br-sp-teste", "Lei 100 de 2020.md"), "---\ntitulo: Lei Municipal nº 100/2020\nrevogada: false\n---\n\nArt. 1º Fica criado o parque municipal.\n");
  const ind = await Indice.carregar(snap);
  assert.deepEqual(ind.listarJurisdicoes().jurisdicoes.map((j) => j.jurisdicao), ["br/sp/teste"]);
  assert.match(ind.ler("law://br/sp/teste/lei-100-de-2020/art-1")!.texto, /parque/);
  assert.equal(ind.ler("law://br/sp/teste/lei-100-de-2020")!.situacao, "vigente");
  assert.ok(ind.buscar({ consulta: "parque", jurisdicao: "br/sp" }).resultados.some((r) => r.uri === "law://br/sp/teste/lei-100-de-2020/art-1"));
  writeFileSync(join(snap, "fontes.json"), JSON.stringify({ fontes: [{ pasta: "x", jurisdicao: "local/x", formato: "markdown" }] }));
  await assert.rejects(Indice.carregar(snap), /local\/ é reservado/);
});

test("MCP: 9 tools, 4 prompts, resources e instruções", async () => {
  const { client } = await conectar();
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), [
      "adicionar_norma", "buscar_normas", "comparar_jurisdicoes", "historico_norma",
      "impacto_da_norma", "importar_normas", "ler_norma", "listar_jurisdicoes", "verificar_citacoes",
    ]);
    const escrita = ["adicionar_norma", "importar_normas"];
    assert.ok(tools.filter((t) => escrita.includes(t.name)).every((t) => t.annotations?.readOnlyHint === false));
    assert.ok(tools.filter((t) => !escrita.includes(t.name)).every((t) => t.annotations?.readOnlyHint));
    const { prompts } = await client.listPrompts();
    assert.deepEqual(prompts.map((p) => p.name).sort(), ["comparar_paises", "explicar_para_cidadao", "responder_com_citacao", "revisar_peca"]);
    const p = await client.getPrompt({ name: "revisar_peca", arguments: { texto: "art. 5º da CF" } });
    assert.match((p.messages[0]!.content as { text: string }).text, /verificar_citacoes/);
    assert.match(client.getInstructions() ?? "", /Nunca cite lei de memória/);
    const { resources } = await client.listResources();
    assert.ok(resources.some((r) => r.uri === "law://br/federal/lei-8078-1990"));
    const lido = await client.readResource({ uri: "law://br/federal/lei-8078-1990/art-49" });
    assert.match((lido.contents[0] as { text: string }).text, /Permalink do texto: https:\/\/github\.com\//);
    const sobre = await client.readResource({ uri: "lawmcp://sobre" });
    assert.ok(JSON.parse((sobre.contents[0] as { text: string }).text).manifesto.es.commit);
  } finally {
    await client.close();
  }
});

test("MCP: comparar_jurisdicoes, historico_norma e impacto_da_norma", async () => {
  const { client, chamar } = await conectar();
  try {
    const cmp = (await chamar("comparar_jurisdicoes", { consultas: [
      { jurisdicao: "br", consulta: "todos são iguais perante a lei" },
      { jurisdicao: "es", consulta: "iguales ante la ley" },
    ] })).json();
    assert.equal(cmp.comparacao[0].resultados[0].uri, "law://br/federal/constituicao-1988/art-5");
    assert.equal(cmp.comparacao[1].resultados[0].uri, "law://es/BOE-A-1978-31229/art-14");
    assert.ok((await chamar("historico_norma", { uri: "law://br/federal/decreto-lei-5452-1943/art-59" })).json().total > 0);
    assert.equal((await chamar("historico_norma", { uri: "law://br/federal/nao-existe" })).erro, true);
    assert.ok((await chamar("impacto_da_norma", { norma: "Reforma Trabalhista", limite: 5 })).json().total > 300);
    assert.equal((await chamar("impacto_da_norma", { norma: "lei imaginária" })).erro, true);
    const ler = (await chamar("ler_norma", { uri: "law://br/federal/lei-10406-2002" })).json();
    assert.equal(ler.truncado, true, "Código Civil inteiro passa do limite e vem truncado");
  } finally {
    await client.close();
  }
});

test("MCP: adicionar_norma grava em git local, indexa e versiona", async () => {
  const { client, chamar } = await conectar();
  try {
    const v1 = (await chamar("adicionar_norma", {
      organizacao: "escritorio-silva", tipo: "política interna", titulo: "Política de Home Office", fonte: "intranet/rh/home-office.pdf",
      apelidos: ["PHO"], texto: "Art. 1º O trabalho remoto é permitido duas vezes por semana.\n\nArt. 2º O equipamento é fornecido pela empresa.",
    })).json();
    assert.equal(v1.uri, "law://local/escritorio-silva/politica-de-home-office");
    assert.equal(v1.artigos, 2);
    assert.match(v1.commit, /^[0-9a-f]{40}$/);
    assert.match((await chamar("ler_norma", { uri: `${v1.uri}/art-2` })).texto, /equipamento/);
    assert.deepEqual(verificar("art. 2º da PHO"), [`ok ${v1.uri}/art-2`]);
    assert.equal(indice.buscar({ consulta: "trabalho remoto", jurisdicao: "local" }).resultados[0]?.uri, `${v1.uri}/art-1`);

    const v2 = (await chamar("adicionar_norma", {
      organizacao: "escritorio-silva", tipo: "política interna", titulo: "Política de Home Office", fonte: "intranet/rh/home-office-v2.pdf",
      texto: "Art. 1º O trabalho remoto é permitido três vezes por semana.",
    })).json();
    assert.notEqual(v2.commit, v1.commit);
    assert.equal(v2.novaVersao, true);
    assert.match((await chamar("ler_norma", { uri: `${v1.uri}/art-1` })).texto, /três vezes/);
    assert.equal((await chamar("ler_norma", { uri: `${v1.uri}/art-2` })).erro, true, "artigo removido na versão 2");
    const log = execFileSync("git", ["log", "--format=%s"], { cwd: temp, env: envGit() }).toString();
    assert.match(log, /Atualiza Política de Home Office\nAdiciona Política de Home Office/);
    const h = (await chamar("historico_norma", { uri: v1.uri })).json();
    assert.deepEqual(h.versoes.map((v: { commit: string; alterados: string[]; removidos: string[] }) => [v.commit, v.alterados, v.removidos]),
      [[v2.commit, ["art-1"], ["art-2"]], [v1.commit, [], []]]);
    assert.equal((await chamar("historico_norma", { uri: `${v1.uri}/art-1` })).json().versoes.length, 2, "incluído na v1, alterado na v2");

    assert.equal((await chamar("adicionar_norma", { organizacao: "../etc", tipo: "x", titulo: "abc", fonte: "x", texto: "0123456789" })).erro, true);
  } finally {
    await client.close();
  }
});

test("MCP: importar_normas cria a jurisdição a partir de uma pasta e versiona só o que mudou", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "lawmcp-import-"));
  after(() => rmSync(pasta, { recursive: true, force: true }));
  mkdirSync(join(pasta, "rh"));
  writeFileSync(join(pasta, "etica.md"), "---\ntitulo: Código de Ética\napelidos: [CEI]\n---\n\nArt. 1º É vedado aceitar presentes.\n\nArt. 2º Conflitos de interesse devem ser informados.\n");
  writeFileSync(join(pasta, "rh", "ferias.md"), "# Regulamento de Férias\n\nArt. 1º As férias são marcadas com 30 dias de antecedência.\n");
  writeFileSync(join(pasta, "README.md"), "# Leia-me\n\nNão é norma.");
  writeFileSync(join(pasta, "vazio.md"), "---\ntitulo: Vazio\n---\n");
  const { client, chamar } = await conectar();
  try {
    const r = (await chamar("importar_normas", { organizacao: "empresa-x", pasta })).json();
    assert.equal(r.jurisdicao, "local/empresa-x");
    assert.equal(r.novas, 2);
    assert.deepEqual(r.normas.map((n: { uri: string }) => n.uri).sort(), ["law://local/empresa-x/codigo-de-etica", "law://local/empresa-x/regulamento-de-ferias"]);
    assert.deepEqual(r.ignorados, [{ arquivo: "vazio.md", motivo: "texto vazio" }]);
    assert.match((await chamar("ler_norma", { uri: "law://local/empresa-x/regulamento-de-ferias/art-1" })).texto, /30 dias/);
    assert.deepEqual(verificar("art. 2º do CEI"), ["ok law://local/empresa-x/codigo-de-etica/art-2"]);
    assert.ok(indice.listarJurisdicoes().jurisdicoes.some((j) => j.jurisdicao === "local/empresa-x"));

    writeFileSync(join(pasta, "rh", "ferias.md"), "# Regulamento de Férias\n\nArt. 1º As férias são marcadas com 45 dias de antecedência.\n\nArt. 2º Podem ser divididas em três períodos.\n");
    const r2 = (await chamar("importar_normas", { organizacao: "empresa-x", pasta })).json();
    assert.deepEqual([r2.novas, r2.atualizadas, r2.inalteradas], [0, 1, 1]);
    assert.notEqual(r2.commit, r.commit);
    const h = (await chamar("historico_norma", { uri: "law://local/empresa-x/regulamento-de-ferias" })).json();
    assert.deepEqual(h.versoes.map((v: { incluidos: string[]; alterados: string[] }) => [v.incluidos, v.alterados]), [[["art-2"], ["art-1"]], [["art-1"], []]]);
    assert.equal(h.versoes[0].commit, r2.commit);

    assert.equal((await chamar("importar_normas", { organizacao: "empresa-x", pasta: "relativa/pasta" })).erro, true);
    assert.equal((await chamar("importar_normas", { organizacao: "empresa-x", pasta: join(pasta, "nao-existe") })).erro, true);
  } finally {
    await client.close();
  }
});

// ---- Ponta a ponta: processo real via stdio, como um cliente MCP (Claude Desktop, Cursor) faz ----

test("ponta a ponta: cliente MCP real chama as tools via stdio", async () => {
  const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
  const client = new Client({ name: "teste", version: "0.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [new URL("./server.ts", import.meta.url).pathname], stderr: "ignore",
    env: { ...(process.env as Record<string, string>), LAWMCP_LOCAL: join(temp, "stdio") },
  }));
  try {
    const { tools } = await client.listTools();
    assert.equal(tools.length, 9);
    const texto = (r: Awaited<ReturnType<typeof client.callTool>>) => (r.content as { text: string }[])[0]!.text;
    assert.match(texto(await client.callTool({ name: "ler_norma", arguments: { uri: "law://br/federal/lei-8078-1990/art-49" } })), /desistir do contrato/);
    const v = JSON.parse(texto(await client.callTool({ name: "verificar_citacoes", arguments: { texto: "art. 7º, XCIX, da CF" } })));
    assert.equal(v.citacoes[0].status, "inexistente");
    assert.equal((await client.callTool({ name: "ler_norma", arguments: { uri: "law://br/federal/nao-existe" } })).isError, true);
    assert.equal((await client.callTool({ name: "ler_norma", arguments: { uri: "../../etc/passwd" } })).isError, true);
  } finally {
    await client.close();
  }
});
