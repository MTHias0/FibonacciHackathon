import assert from "node:assert/strict";
import { test } from "node:test";
import { verificarCitacoes } from "./citacoes.ts";
import { Indice } from "./dados/indice.ts";
import { DIR_SNAPSHOT } from "./server.ts";

const indice = await Indice.carregar(DIR_SNAPSHOT);
const status = (texto: string, jurisdicao?: string) =>
  verificarCitacoes(indice, { texto, ...(jurisdicao ? { jurisdicao } : {}) }).citacoes.map((c) => c.status);

test("carrega as jurisdições da demo", () => {
  const js = indice.listarJurisdicoes().jurisdicoes.map((j) => j.jurisdicao);
  assert.ok(js.includes("br/federal") && js.includes("es"), js.join(","));
});

test("ler_norma por artigo, no Brasil e na Espanha", () => {
  assert.match(indice.ler("law://br/federal/lei-8078-1990/art-49")?.texto ?? "", /desistir do contrato/);
  assert.match(indice.ler("law://es/BOE-A-1978-31229/art-14")?.texto ?? "", /iguales ante la ley/);
  assert.equal(indice.ler("law://br/federal/lei-8078-1990/art-9999"), undefined);
});

test("buscar_normas acha o direito de arrependimento e respeita o filtro de jurisdição", () => {
  const br = indice.buscar({ consulta: "direito de arrependimento", jurisdicao: "br" }).resultados;
  assert.ok(br.some((r) => r.uri === "law://br/federal/lei-8078-1990/art-49"), JSON.stringify(br.map((r) => r.uri)));
  const es = indice.buscar({ consulta: "igualdad", jurisdicao: "es" }).resultados;
  assert.ok(es.length > 0 && es.every((r) => r.jurisdicao === "es"));
});

test("verificar_citacoes: ok, inexistente, revogada, fora da base", () => {
  assert.deepEqual(status("Conforme o art. 49 do CDC, o consumidor pode desistir."), ["ok"]);
  assert.deepEqual(status("Nos termos da Lei nº 8.078/1990, art. 49, cabe devolução."), ["ok"]);
  assert.deepEqual(status("O art. 999 do CDC garante reembolso em dobro."), ["inexistente"]);
  assert.deepEqual(status("Segundo o art. 117 da Constituição Federal…"), ["revogada"]);
  assert.deepEqual(status("Aplica-se o art. 3º da Lei 9.999/2020."), ["fora_da_base"]);
  assert.deepEqual(status("Texto sem citação, só menciona o artigo em geral."), []);
});

test("verificar_citacoes: redação divergente entre aspas", () => {
  assert.deepEqual(status('O art. 49 do CDC diz: "o consumidor pode desistir do contrato, no prazo de 30 dias"'), ["divergente"]);
  assert.deepEqual(status('O art. 49 do CDC diz: "O consumidor pode desistir do contrato, no prazo de 7 dias"'), ["ok"]);
});

test("verificar_citacoes: citação espanhola", () => {
  assert.deepEqual(status("Según el artículo 14 de la Constitución Española, todos son iguales.", "es"), ["ok"]);
});

test("município: Birigui carregado e pesquisável", () => {
  const r = indice.buscar({ consulta: "denominação via pública", jurisdicao: "br/sp/birigui", limite: 3 }).resultados;
  assert.ok(r.length > 0 && r.every((x) => x.jurisdicao === "br/sp/birigui"));
});

test("ponta a ponta: cliente MCP real chama as tools via stdio", async () => {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
  const client = new Client({ name: "teste", version: "0.0.0" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [new URL("./server.ts", import.meta.url).pathname], stderr: "ignore" }));
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ["buscar_normas", "ler_norma", "listar_jurisdicoes", "verificar_citacoes"]);
    const texto = (r: Awaited<ReturnType<typeof client.callTool>>) => (r.content as { text: string }[])[0]!.text;
    const lida = await client.callTool({ name: "ler_norma", arguments: { uri: "law://br/federal/lei-8078-1990/art-49" } });
    assert.match(texto(lida), /desistir do contrato/);
    const faltando = await client.callTool({ name: "ler_norma", arguments: { uri: "law://br/federal/nao-existe" } });
    assert.equal(faltando.isError, true);
    const invalida = await client.callTool({ name: "ler_norma", arguments: { uri: "../../etc/passwd" } });
    assert.equal(invalida.isError, true);
  } finally {
    await client.close();
  }
});
