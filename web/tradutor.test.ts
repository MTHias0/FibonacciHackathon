import assert from "node:assert/strict";
import test from "node:test";
import { limparConsulta, traduzir } from "./tradutor.ts";

test("tradutor: aceita só JSON com consulta curta", () => {
  assert.equal(limparConsulta('{"consulta":"acidente de trânsito  reparar o dano"}'), "acidente de trânsito reparar o dano");
  assert.equal(limparConsulta('{"consulta":"perturbação_do_descanso_noturno"}'), "perturbação do descanso noturno");
  assert.equal(limparConsulta("não é json"), null);
  assert.equal(limparConsulta('{"consulta":42}'), null);
  assert.equal(limparConsulta('{"consulta":"a"}'), null);
  assert.equal(limparConsulta(JSON.stringify({ consulta: "x".repeat(200) })), null);
});

test("tradutor: devolve a reescrita do modelo e cai para null quando o Ollama falha", async () => {
  const ok = (async () => Response.json({ message: { content: '{"consulta":"acidente de trânsito"}' } })) as typeof fetch;
  assert.deepEqual({ ...(await traduzir("bati o carro", { fetch: ok, modelo: "m" })), ms: 0 }, { de: "bati o carro", para: "acidente de trânsito", modelo: "m", ms: 0 });
  const fora = (async () => { throw new Error("ECONNREFUSED"); }) as typeof fetch;
  assert.equal(await traduzir("bati o carro", { fetch: fora, modelo: "m" }), null);
  const erro = (async () => new Response("", { status: 404 })) as typeof fetch;
  assert.equal(await traduzir("bati o carro", { fetch: erro, modelo: "m" }), null);
  assert.equal(await traduzir("bati o carro", { modelo: "" }), null);
  const inventou = (async () => Response.json({ message: { content: '{"consulta":"artigo 306 Código Penal"}' } })) as typeof fetch;
  assert.equal(await traduzir("bati o carro", { fetch: inventou, modelo: "m" }), null);
  const citou = (async () => Response.json({ message: { content: '{"consulta":"Lei 7462 IPTU"}' } })) as typeof fetch;
  assert.equal((await traduzir("o que diz a lei 7462 sobre IPTU", { fetch: citou, modelo: "m" }))?.para, "Lei 7462 IPTU");
});
