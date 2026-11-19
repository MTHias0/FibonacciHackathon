import assert from "node:assert/strict";
import test from "node:test";
import { rotear } from "./roteador.ts";

test("roteador: perguntas da demo caem na tool certa", () => {
  assert.deepEqual(rotear("O art. 49 do CDC ainda vale? Cite a fonte."), { tool: "verificar_citacoes", args: { texto: "O art. 49 do CDC ainda vale? Cite a fonte." }, depois: "ler_norma" });
  assert.equal(rotear("Verifique as citações: segundo o art. 999 do CDC").depois, undefined);
  assert.deepEqual(rotear("O que a Reforma Trabalhista mudou na CLT?").args, { norma: "Reforma Trabalhista", limite: 60 });
  assert.equal(rotear("Quem alterou o art. 59 da CLT?").depois, "historico_norma");
  assert.deepEqual(rotear("Compare igualdade perante a lei no Brasil e na Espanha").args.consultas, [
    { jurisdicao: "br", consulta: "igualdade perante a lei" }, { jurisdicao: "es", consulta: "igualdade perante a lei" },
  ]);
  assert.deepEqual(rotear("Que leis de Birigui falam de IPTU?").args, { consulta: "IPTU", limite: 8, jurisdicao: "br/sp/birigui" });
  assert.equal(rotear("law://br/federal/lei-8078-1990/art-49").tool, "ler_norma");
  assert.equal(rotear("histórico de law://br/federal/decreto-lei-5452-1943/art-59").tool, "historico_norma");
});

test("roteador: modo explícito vence a heurística", () => {
  assert.equal(rotear("art. 5º da CF", "buscar").tool, "buscar_normas");
  assert.deepEqual(rotear("igualdade | iguales ante la ley", "comparar").args.consultas, [
    { jurisdicao: "br", consulta: "igualdade" }, { jurisdicao: "es", consulta: "iguales ante la ley" },
  ]);
  assert.equal(rotear("LGPD", "impacto").tool, "impacto_da_norma");
});

test("roteador: o filtro de jurisdição vale para busca e verificação", () => {
  assert.equal(rotear("IPTU", "auto", "br").args.jurisdicao, "br");
  assert.equal(rotear("leis de Birigui sobre IPTU", "auto", "es").args.jurisdicao, "es");
  assert.deepEqual(rotear("art. 1.902 do Código Civil", "verificar", "es").args, { texto: "art. 1.902 do Código Civil", jurisdicao: "es" });
  assert.equal(rotear("IPTU").args.jurisdicao, undefined);
});
