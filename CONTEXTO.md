# Contexto do hackathon

## Estado

- **MCP v0.2 implementado** (entregas 1 e 2): 9 tools (`listar_jurisdicoes`, `buscar_normas`, `ler_norma`, `verificar_citacoes`, `historico_norma`, `impacto_da_norma`, `comparar_jurisdicoes`, `adicionar_norma`, `importar_normas`), resources `law://…` e `lawmcp://sobre`, 4 prompts e instruções do servidor.
- Jurisdições próprias:
  - Fontes oficiais novas se registram em `data/snapshot/fontes.json`, sem código, nos formatos `ctresb` ou `markdown`. O Birigui saiu do código e foi para lá.
  - `importar_normas` transforma uma pasta de Markdown em `local/<org>`, num commit.
  - `historico_norma` mostra as versões das normas locais a partir do git, com os artigos incluídos, alterados e removidos.
  - O git das normas locais ignora `GIT_DIR`, `GIT_INDEX_FILE` e afins herdados do processo (`envGit` em `src/dados/adaptadores.ts`). Sem isso, um hook de pre-push rodando `npm test` commitava as normas de teste no repositório do projeto. O teste simula o hook.
- Base: 15.162 documentos (normas e artigos), sendo 11.956 de br/federal (43 normas: CF, CDC, CLT, ECA, Inquilinato, 17 códigos e 21 leis-chave), 654 de br/sp/birigui e 2.552 de es. Cada um com permalink no commit exato da fonte (`data/snapshot/manifest.json`).
- Verificado: `npm test` (18 testes, incluindo um ponta a ponta via stdio, `adicionar_norma` e `importar_normas` com git e `fontes.json`), `typecheck`, `build` e `initialize` do servidor compilado. Carga do índice: cerca de 3 s com cache de disco e 9 a 14 s a frio; o stdio conecta antes e as tools esperam a carga. Heap: cerca de 112 MB (com os trechos por dispositivo dos artigos longos, que corrigiram "igualdade perante a lei" sem o art. 5º da CF).
- Testado no MCP Inspector (web e CLI) e no Claude Desktop com o MCP v1. **Falta ensaiar o `docs/DEMO.md` no Claude Desktop com a versão atual, o Cursor e o OpenBot.**
- Página visual "do MCP ao chat web" em `docs/visual/lawmcp-ponta-a-ponta.html`, gerada com a skill Archify a partir de `docs/visual/lawmcp-ponta-a-ponta.archify.md` (arquitetura, sequência de uma pergunta com tempos medidos, decisão de `chat()`, rotas HTTP, limites). Verificada pelos gates automáticos da Archify, sem revisão visual. Regerar: `node <archify>/bin/archify.mjs finalize explainer <rascunho> <saida.html> --repo-root .`.
- Roadmap por dev: `docs/ROADMAP.md`. Documentação organizada em `docs/` (índice em `docs/README.md`, páginas 01 a 09).
- **Pitch do hackathon feito** (2026-11-19, branch `figueirego/pitch`): deck de 6 slides (limite pedido pelo Matheus) no Claude (Artifact privado do Matheus: https://claude.ai/artifact/KmScdTBkb9v6isEHmWZXEG), com a identidade do front e o roteiro falado nas notas de cada slide. Estrutura no estilo YC: capa, problema, solução com o diagrama MCP, demo (as 5 perguntas do `docs/DEMO.md` com o resultado de cada uma, que serve de plano B), o que construímos e para quem, e fechamento com próximos passos. Números conferidos no repositório (`npm test`: 24 testes passando) e na web (712 decisões sobre citações inventadas por IA, segundo a base de Damien Charlotin via Bloomberg Government, dez. 2025; 1,37 milhão de advogados, segundo a OAB). Verificado: layout numa prévia local no Chrome, com as fontes reais, sem estouro. Não verificado: o render final no Slides e os conectores do slide 5. Pendente: os nomes do time no último slide (`[Nome]`) e a aprovação do modelo de negócio (B2C grátis, B2B por assinatura), que ainda é recomendação em `docs/IDEIAS-MCP.md` § 10.
- **Front `web/` implementado** (branch `figueirego/web`): `npm run web` sobe `web/servidor.ts`, que é um cliente MCP via stdio e serve um chat em HTML/CSS/JS sem framework nem build. Layout de chat (barra lateral com histórico salvo só no navegador, caixa de mensagem com os modos, painel "Bastidores MCP" que abre e fecha), fonte Montserrat. O chat roteia por regras (`web/roteador.ts`) para buscar, verificar, impacto, histórico e Brasil × Espanha, com leitor da norma e recibo do permalink. `adicionar_norma` e `importar_normas` ficam bloqueadas na web (gravam em disco e não há autenticação).
- **Tradutor leigo → lei implementado** (`web/tradutor.ts`, aprovado pelo Matheus): nas buscas, o Claude da conta logada no Claude Code (`claude -p --safe-mode`, sem tools nem MCP, modelo `haiku`) reescreve a pergunta no vocabulário da lei (em espanhol quando é sobre a Espanha). Troca do Qwen/Ollama pedida pelo Matheus em 2026-11-19: usa a assinatura, sem chave de API nem dependência nova. Se o CLI falhar ou não estiver logado, a consulta trouxer número que a pergunta não citou (artigo inventado) ou nada for achado, a web volta para as regras. Só roda na web, o servidor MCP não muda. Variável: `CLAUDE_MODEL` (vazio desliga). Verificado: 24 testes, typecheck e 3 traduções reais (cerca de 4,5 s cada, contra 1 a 4 s do Qwen). Não verificado: o chat no navegador com o Claude. A página `docs/visual/` ainda fala em Ollama (regerar com a Archify).
- **Contexto da conversa no chat** (2026-11-19): o front manda as 3 últimas perguntas (`anteriores`) e `comContexto` (`web/roteador.ts`) faz a pergunta sem assunto ("e no Brasil?", "e na Espanha?", "e em Birigui?") herdar o assunto da última que tinha um, com a jurisdição nova, antes do roteador e do tradutor. Antes, o tradutor recebia só "no brasil" e inventava o assunto (veio lei trabalhista). "brasil" no texto agora filtra `br`. Verificado: teste do roteador e `/api/chat` real sem Ollama ("direito de arrependimento na Espanha" → "e no brasil?" busca "direito arrependimento" em br). Não verificado com o Ollama ligado. Limite: continuação com assunto próprio ("e para MEI?") não herda nada.
- **Filtro de jurisdição implementado:** seletor na caixa de mensagem (Todas, Brasil, Brasil · Federal, Brasil · Birigui (SP), Espanha), montado a partir de `listar_jurisdicoes` e lembrado no navegador. Vale para busca e verificação (prefixo, como o `buscar_normas` já aceitava) e vence o que o texto sugere; fica desligado em "O que mudou" e "Brasil × Espanha". Com Espanha escolhida, o tradutor escreve a consulta em espanhol. O servidor só aceita prefixos válidos (`br`, `br/federal`…) e ignora o resto.
- Verificado no front: `npm test` (21 testes, 3 do roteador e 2 do tradutor), `typecheck` do `src/` e do `web/`, os 6 exemplos da demo no Chrome a 1440 px (claro e escuro) e a 390 px sem rolagem lateral, e o console sem erros. Tradutor verificado com o Ollama local: "bater carro" → CTB e Código Penal Militar art. 281; "devolver compra pela internet" → CDC art. 49; "hora extra" → CLT art. 59; dados pessoais e demissão na Espanha → LOPDGDD e Estatuto de los Trabajadores art. 56 (1 a 4 s por pergunta). Não testado: Safari e Firefox, leitor de tela, máquina sem Ollama de verdade (só nos testes com fetch falso). Limite: "barulho de madrugada" traduz bem mas o snapshot não tem norma de perturbação do sossego.

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

- Testar no Claude Desktop e no OpenBot. Pelo código-fonte, o openbot.run aceita MCP via stdio no painel próprio (passos em `docs/INSTALACAO.md`); falta rodar de verdade e confirmar que é esse o OpenBot do hackathon.
- Limitações conhecidas:
  - A busca usa radical por truncamento: "igualdade" não acha "iguais".
  - O verificador não confere alíneas.
  - Citação de artigo sem norma ("art. 5º" solto) não é verificada.
  - O ctresb não é dividido em artigos.
  - Não dá para remover uma norma local pelo MCP, e todas as organizações locais são visíveis a quem conecta (ok enquanto for só stdio).
  - `importar_normas` lê qualquer pasta que o cliente indicar (só arquivos `.md`). O cliente MCP pede aprovação da chamada, mas é bom saber.
- Critérios de avaliação do hackathon e MCPs ou APIs de patrocinadores.
- Skill `grillme`, pedida por um colega: origem desconhecida.
- A decidir: chat com LLM (Claude com as tools do MCP) no lugar do roteador por regras. Exige a dependência `@anthropic-ai/sdk` e uma chave, e a decisão "sem frameworks" pede aprovação do time.

## Próximo passo

1. Checkpoint: plugar no Claude Desktop e rodar as perguntas de demo do README.
2. Entrega 3: revisar e mergear o front (`figueirego/web`), prints para os slides, pitch e ensaio. Ver `docs/ROADMAP.md`.

<!-- Atualizado em 2026-11-19 por Claude (sessão de João Matheus): página visual Archify. -->
