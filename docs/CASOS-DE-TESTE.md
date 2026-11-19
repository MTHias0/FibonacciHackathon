# Casos de teste do verificador

Entrada da tool `verificar_citacoes` (`texto` e, se indicado, `jurisdicao`) e o status esperado para cada citação.
O **esperado** é a verdade jurídica, conferida no snapshot (que bate com o Planalto e o BOE, ver `CONFERENCIA-SNAPSHOT.md`). A coluna **hoje** mostra o que o verificador do commit `29dfc93` responde (rodado em 2026-11-19): ✓ = acertou. Divergência entre as duas colunas = teste que deve falhar até o MCP v2.

URIs abreviadas: `cf` = `law://br/federal/constituicao-1988`, `cdc` = `…/lei-8078-1990`, `clt` = `…/decreto-lei-5452-1943`, `inq` = `…/lei-8245-1991`, `cc` = `…/lei-10406-2002`, `ce` = `law://es/BOE-A-1978-31229`, `cc-es` = `law://es/BOE-A-1889-4763`.

| # | Tipo | Texto | Jur. | Esperado | Hoje |
|---|---|---|---|---|---|
| 1 | petição | O consumidor pode se arrepender da compra online em até 7 dias, nos termos do art. 49 do CDC. | br | `ok` cdc/art-49 | ✓ |
| 2 | aspas corretas | Conforme o art. 49 do CDC, "O consumidor pode desistir do contrato, no prazo de 7 dias a contar de sua assinatura". | br | `ok` cdc/art-49 | ✓ |
| 3 | aspas alteradas (IA) | O art. 49 do CDC garante: "O consumidor pode desistir do contrato, no prazo de 30 dias a contar de sua assinatura". | br | `divergente` cdc/art-49 (7 → 30 dias) | ✓ |
| 4 | aspas corretas | Nos termos do art. 5º da CF, "Todos são iguais perante a lei, sem distinção de qualquer natureza". | br | `ok` cf/art-5 | **nada** |
| 5 | aspas alteradas (IA) | O art. 5º da CF diz que "Todos são iguais perante a lei, sem distinção de raça ou religião". | br | `divergente` cf/art-5 | **nada** |
| 6 | revogado | A empregada tem direito a 15 minutos de descanso antes da hora extra, como prevê o art. 384 da CLT. | br | `revogada` clt/art-384 (Lei 13.467/2017) | ✓ |
| 7 | revogado | O art. 233 da CF trata da comprovação de obrigações trabalhistas do empregador rural. | br | `revogada` cf/art-233 (EC 28/2000) | **nada** |
| 8 | artigo inexistente (IA) | O art. 251 da Constituição Federal garante o direito à desconexão digital. | br | `inexistente` cf/art-251 (a CF vai até o 250) | ✓ |
| 9 | artigo inexistente | O despejo por denúncia vazia está no art. 95 da Lei 8.245/91. | br | `inexistente` inq/art-95 (a lei vai até o 90) | ✓ |
| 10 | inciso inexistente (IA) | É assegurado o habeas data digital (art. 5º, LXXX, da CF). | br | `inexistente` cf/art-5/inc-80 (o art. 5º vai até o LXXIX) | **nada** |
| 11 | inciso | A jornada máxima está no art. 7º, XIII, da CF. | br | `ok` cf/art-7/inc-13 | **nada** |
| 12 | inciso | Cabe a inversão do ônus da prova, nos termos do art. 6º, VIII, do CDC. | br | `ok` cdc/art-6/inc-8 | parcial: cdc/art-6, sem inciso |
| 13 | lista | Violação dos arts. 5º e 251 da CF. | br | `ok` cf/art-5 e `inexistente` cf/art-251 | **nada** |
| 14 | ordem invertida | CF, art. 5º. | br | `ok` cf/art-5 | **nada** |
| 15 | lei inventada (IA) | A Lei nº 19.999/2023, art. 3º, proíbe a cobrança de taxa de conveniência. | br | `fora_da_base` (não dá para afirmar que não existe) | ✓ |
| 16 | lei real fora da base | O dever de motivação está no art. 2º da Lei 9.784/99. | br | `fora_da_base` | ✓ |
| 17 | Código Civil BR × ES | Quem causa dano a outrem comete ato ilícito (art. 186 do Código Civil). | br | `ok` cc/art-186 | **errado**: ok em cc-es/art-186 |
| 18 | Espanha | Los españoles son iguales ante la ley (artículo 14 de la Constitución Española). | es | `ok` ce/art-14 | ✓ |
| 19 | Espanha, inexistente | El artículo 170 de la Constitución regula el derecho a la vivienda digna. | es | `inexistente` ce/art-170 (a CE vai até o 169) | ✓ |
| 20 | Código Civil ES | La responsabilidad extracontractual está en el artículo 1902 del Código Civil. | es | `ok` cc-es/art-1902 | ✓ |

## O que os casos mostram hoje

- **"da CF" não é reconhecido** (casos 4, 5, 7, 10, 11, 13 e 14): a CF do snapshot atual não tem apelidos. O `src/dados/catalogo.ts` do MCP v2 adiciona "CF", "CRFB" etc.
- **Código Civil cai na Espanha** (caso 17): sem o CC brasileiro na base, o apelido casa com o espanhol mesmo com `jurisdicao: "br"`. O v2 traz o `lei-10406-2002` e o catálogo resolve.
- **Incisos e listas** (10 a 13) dependem do parser novo do v2.
- O caso 15 é o limite honesto do produto: lei inventada vira `fora_da_base`, não `inexistente`.

## Ao virar teste (depois do MCP v2)

Um `it` por linha em `src/lawmcp.test.ts`, comparando `status` e `uri` de cada citação na ordem do texto. Casos 10, 11 e 13 assumem URIs de dispositivo (`/inc-N`) como no exemplo do roadmap (`…/art-5/inc-13`); ajuste se o v2 usar outro formato.
