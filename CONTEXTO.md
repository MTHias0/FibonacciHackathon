# Contexto do hackathon

## Estado

- **MCP v0.2 implementado** (entregas 1 e 2): 9 tools (`listar_jurisdicoes`, `buscar_normas`, `ler_norma`, `verificar_citacoes`, `historico_norma`, `impacto_da_norma`, `comparar_jurisdicoes`, `adicionar_norma`, `importar_normas`), resources `law://…` e `lawmcp://sobre`, 4 prompts e instruções do servidor.
- Jurisdições próprias:
  - Fontes oficiais novas se registram em `data/snapshot/fontes.json`, sem código, nos formatos `ctresb` ou `markdown`. O Birigui saiu do código e foi para lá.
  - `importar_normas` transforma uma pasta de Markdown em `local/<org>`, num commit.
  - `historico_norma` mostra as versões das normas locais a partir do git, com os artigos incluídos, alterados e removidos.
- Base: 15.162 documentos (normas e artigos), sendo 11.956 de br/federal (43 normas: CF, CDC, CLT, ECA, Inquilinato, 17 códigos e 21 leis-chave), 654 de br/sp/birigui e 2.552 de es. Cada um com permalink no commit exato da fonte (`data/snapshot/manifest.json`).
- Verificado: `npm test` (18 testes, incluindo um ponta a ponta via stdio, `adicionar_norma` e `importar_normas` com git e `fontes.json`), `typecheck`, `build` e `initialize` do servidor compilado. Carga do índice: cerca de 3 s com cache de disco e 9 a 14 s a frio; o stdio conecta antes e as tools esperam a carga. Heap: cerca de 112 MB (com os trechos por dispositivo dos artigos longos, que corrigiram "igualdade perante a lei" sem o art. 5º da CF).
- Testado no MCP Inspector (web e CLI) e no Claude Desktop com o MCP v1. **Falta ensaiar o `docs/DEMO.md` no Claude Desktop com a versão atual, o Cursor e o OpenBot.**
- Roadmap por dev: `docs/ROADMAP.md`. Documentação organizada em `docs/` (índice em `docs/README.md`, páginas 01 a 09).

## Fatos

- O tema central do hackathon é integração via MCP.
- O ponto de partida é o `ctresb/leis` (leis em Markdown, com o histórico git como linha do tempo legislativa) e projetos semelhantes.
- A genealogia vem das notas de alteração das fontes ("Redação dada pela Lei nº …"), não do `git log`: os repositórios de origem não reconstroem versões antigas.

## Decisões

- TypeScript estrito, Node.js 24 ou superior, ESM. Sem frameworks até o escopo ser aprovado.
- `AGENTS.md` é a fonte única de instruções. `CONTEXTO.md` é o único registro de estado.
- Produto: **LawMCP**. A integração via MCP é o foco, com front mínimo. Público B2B (advogados, empresas, plataformas) e B2C (cidadãos).
- Município da demo: Birigui/SP (o único do ctresb com leis ordinárias, complementares e decretos entre os verificados).
- Dados da demo versionados em `data/snapshot/`, porque o clone do ctresb leva cerca de 7 min. `npm run data:fetch` regenera.
- Demo: BR federal + 1 município + Espanha, com `adicionar_norma`. MCP só local (stdio).
- **Ordem de entrega: 1) o MCP (tools P0 no Claude Desktop via stdio), 2) extras do MCP, 3) front e pitch.** Detalhes em `docs/IDEIAS-MCP.md` › Ordem de entrega.
- Prazo: 3h, 3 devs com agentes (MCP, back/dados, infra/front). Divisão em `docs/IDEIAS-MCP.md` §8 e checklist em `docs/ROADMAP.md`.
- Upgrade v0.2 pedido pelo João ("revise, otimize, implemente, quero algo único"):
  - LawCodex/br como 4ª fonte. CDC, CLT e ECA continuam vindo do legislacao-br, que tem âncoras e notas.
  - Busca BM25.
  - Permalink por commit.
  - Normas privadas em git local (`data/local/`, ignorado pelo git do projeto).
  - O contrato `src/types.ts` mudou junto: `Alteracao`, `permalink`, entradas e saídas das tools novas.
- Jurisdições próprias, pedidas pelo João:
  - `fontes.json` para fontes oficiais.
  - `importar_normas` para pastas privadas.
  - Versões do git no `historico_norma`.
  - Normas privadas continuam só em `local/<org>`.
  - O contrato ganhou só acréscimos: `versoes` em `HistoricoNormaSaida`, `VersaoNorma` e `ImportarNormas*`.

## Pendências

- Testar no Claude Desktop (config no README) e confirmar se o OpenBot suporta MCP via stdio.
- Limitações conhecidas:
  - A busca usa radical por truncamento: "igualdade" não acha "iguais".
  - O verificador não confere alíneas.
  - Citação de artigo sem norma ("art. 5º" solto) não é verificada.
  - O ctresb não é dividido em artigos.
  - Não dá para remover uma norma local pelo MCP, e todas as organizações locais são visíveis a quem conecta (ok enquanto for só stdio).
  - `importar_normas` lê qualquer pasta que o cliente indicar (só arquivos `.md`). O cliente MCP pede aprovação da chamada, mas é bom saber.
- Critérios de avaliação do hackathon e MCPs ou APIs de patrocinadores.
- Skill `grillme`, pedida por um colega: origem desconhecida.

## Próximo passo

1. Checkpoint: plugar no Claude Desktop e rodar as perguntas de demo do README.
2. Entrega 3: front mínimo em `web/` (ponte HTTP → cliente MCP), pitch e ensaio. Ver `docs/ROADMAP.md`.

<!-- Atualizado em 2026-11-19 por Claude (sessão de João Matheus). -->
