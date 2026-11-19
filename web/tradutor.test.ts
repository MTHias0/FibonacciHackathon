import assert from "node:assert/strict";
import test from "node:test";
import { limparConsulta, traduzir, type Executar } from "./tradutor.ts";

test("tradutor: aceita só JSON com consulta curta", () => {
  assert.equal(limparConsulta('{"consulta":"acidente de trânsito  reparar o dano"}'), "acidente de trânsito reparar o dano");
  assert.equal(limparConsulta('{"consulta":"perturbação_do_descanso_noturno"}'), "perturbação do descanso noturno");
  assert.equal(limparConsulta("não é json"), null);
  assert.equal(limparConsulta('{"consulta":42}'), null);
  assert.equal(limparConsulta('{"consulta":"a"}'), null);
  assert.equal(limparConsulta(JSON.stringify({ consulta: "x".repeat(200) })), null);
});

test("tradutor: devolve a reescrita do Claude e cai para null quando o CLI falha", async () => {
  const resposta = (result: string, extra = {}) => (async () => JSON.stringify({ result, modelUsage: { "claude-haiku-5-5": {} }, ...extra })) as Executar;
  assert.deepEqual({ ...(await traduzir("bati o carro", { executar: resposta('{"consulta":"acidente de trânsito"}'), modelo: "m" })), ms: 0 }, { de: "bati o carro", para: "acidente de trânsito", modelo: "claude-haiku-5-5", ms: 0 });
  const fora = (async () => { throw new Error("ENOENT"); }) as Executar;
  assert.equal(await traduzir("bati o carro", { executar: fora, modelo: "m" }), null);
  assert.equal(await traduzir("bati o carro", { executar: resposta("Not logged in", { is_error: true }), modelo: "m" }), null);
  assert.equal(await traduzir("bati o carro", { modelo: "" }), null);
  assert.equal(await traduzir("bati o carro", { executar: resposta('{"consulta":"artigo 306 Código Penal"}'), modelo: "m" }), null);
  assert.equal((await traduzir("o que diz a lei 7462 sobre IPTU", { executar: resposta('{"consulta":"Lei 7462 IPTU"}'), modelo: "m" }))?.para, "Lei 7462 IPTU");
  let entrada = "";
  await traduzir("/login", { executar: async (_a, e) => { entrada = e; return "{}"; }, modelo: "m" });
  assert.ok(entrada.startsWith("Pergunta: /login"));
});
