# 09. Decisões e limitações

O registro oficial do que foi decidido é o [CONTEXTO.md](../CONTEXTO.md) › Decisões. Esta página explica o porquê das decisões técnicas e reúne as limitações conhecidas.

## Decisões técnicas

| # | Decisão | Por quê | Alternativa descartada |
|---|---|---|---|
| 1 | MCP local via stdio primeiro | Tema do hackathon; zero infraestrutura; o Claude Desktop sobe o processo sozinho | Servidor HTTP remoto (exige autenticação e deploy) |
| 2 | TypeScript estrito no Node 24, rodando `.ts` direto, sem framework | Menos peças em 3 horas; o SDK oficial do MCP é TypeScript | Build obrigatório, frameworks web |
| 3 | Snapshot dos dados versionado no repo | O clone do ctresb leva cerca de 7 minutos; a demo precisa rodar offline | Baixar na partida |
| 4 | Permalink pelo commit do `manifest.json` | Cada artigo fica auditável e o link não muda quando a fonte muda ("lei com recibo") | Link para a branch principal |
| 5 | Índice BM25 em memória, sem dependência, com trechos por dispositivo nos artigos longos | 15 mil documentos e 14,5 mil trechos cabem em cerca de 112 MB; resposta em milissegundos; artigo longo não perde para artigo curto | Banco externo. Revisitar com SQLite FTS5 acima de cerca de 200 mil normas |
| 6 | Genealogia a partir das notas das fontes | Os repositórios de origem não reconstroem versões antigas pelo `git log` | Diff de commits das fontes |
| 7 | Duas fontes federais brasileiras | legislacao-br tem âncoras e notas (genealogia precisa); LawCodex cobre códigos e leis-chave | Uma fonte só, com menos cobertura ou menos detalhe |
| 8 | Normas privadas só em `local/{org}`, num git próprio fora do repo | Nunca misturar norma privada com oficial; versionamento de graça; nada privado sobe para o GitHub | Gravar no snapshot |
| 9 | Fontes simples por `fontes.json`; formatos novos por adaptador | Município ou pasta de Markdown entra sem código; formato novo exige parser de verdade | Tudo em código ou tudo em config |
| 10 | Verificador conservador | Sem norma identificável, não afirma nada; `fora_da_base` é diferente de `inexistente` | Adivinhar a norma pelo contexto |
| 11 | O stdio conecta antes de o índice carregar | O cliente não dá timeout na partida a frio | Carregar tudo antes de conectar |

### Mudanças no contrato (`src/types.ts`)

- v0.2: `Alteracao`, `permalink` na `Origem` e as entradas e saídas das tools novas.
- Jurisdições próprias: só acréscimos (`versoes` em `HistoricoNormaSaida`, `VersaoNorma`, `ImportarNormasEntrada`, `ImportarNormasSaida`).

As duas mudanças foram feitas a pedido do líder do time e estão registradas no `CONTEXTO.md`. A regra continua: mudar o contrato só combinando com o time.

## Limitações conhecidas

| Área | Limitação |
|---|---|
| Busca | Radical por truncamento: "igualdade" não acha "iguais" (o art. 5º da CF aparece porque o caput também diz "igualdade"). Os resultados são por artigo, não por dispositivo |
| Texto | O texto do legislacao-br traz âncoras HTML (`<a id="par-unico"></a>`) |
| Verificador | Não confere alíneas; ignora "art. 5º" solto, sem norma; o trecho divergente só é visto entre aspas logo depois da citação |
| Dados | As normas do Birigui (ctresb) não são divididas em artigos |
| Normas privadas | Não há tool para remover; todas as organizações ficam visíveis para quem conecta; não há hierarquia livre; arquivo importado sem `titulo` nem `# Título` recebe o nome do arquivo como título |
| `importar_normas` | Lê qualquer pasta que o cliente indicar (só `.md`); depende da aprovação do cliente MCP |
| Clientes | Testado no MCP Inspector (web e CLI) e no Claude Desktop com o MCP v1. Falta ensaiar o [DEMO.md](DEMO.md) na versão atual, testar o Cursor e confirmar o OpenBot |
| Escala | Índice só em memória; carga a frio de 9 a 14 s |
| Produto | Sem front (entrega 3), sem servidor remoto, sem autenticação |

## Maturidade por área (0 a 5)

| Área | Nota | Justificativa | Próximo passo |
|---|---|---|---|
| Tools MCP | 4 | 9 tools com schema, erros úteis e testes pelo protocolo | Testar no Claude Desktop |
| Dados e fontes | 3 | 4 fontes com commit e permalink; download reproduzível | Mais uma fonte (estado brasileiro) |
| Verificador | 3 | 18 formatos testados, desambiguação BR × ES | Alíneas e citações municipais |
| Jurisdições próprias | 3 | `fontes.json`, importação e versões testadas | Remoção e pasta permitida para importar |
| Testes | 4 | 18 testes, incluindo ponta a ponta via stdio | Casos reais de petições (Roadmap, Dev 2) |
| Integração com clientes | 3 | Inspector (web e CLI) e Claude Desktop com o MCP v1 testados; roteiro de demo pronto | Ensaiar o DEMO.md no Claude Desktop |
| Segurança e privacidade | 2 | Validação de entradas e caminhos; dados privados fora do repo | Revisão antes de qualquer uso remoto |
| Front e pitch | 0 | Não iniciado | Entrega 3 |

## Perguntas em aberto

- Quais são os critérios de avaliação do hackathon e os MCPs ou APIs de patrocinadores?
- O OpenBot do hackathon é o openbot.run? Se for, ele aceita MCP via stdio pelo painel próprio (código-fonte, 19/11/2026); falta rodar de verdade ([Guia de instalação](INSTALACAO.md#openbot)).
- Qual é a próxima fonte: um estado brasileiro, outro município ou um estado dos EUA? (Roadmap, Dev 2)
- Um servidor remoto para B2B, com autenticação e separação por organização, entra no escopo depois do hackathon?

## Evidências

`CONTEXTO.md` (Decisões e Pendências), `AGENTS.md`, `src/dados/indice.ts` (comentário `shortcut`), `src/server.ts` (carga com promessa), `src/types.ts` e `docs/ROADMAP.md`.
