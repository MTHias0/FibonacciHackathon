# Contexto do hackathon

## Estado atual

Base TypeScript preparada em 2026-11-19 pelo Codex, no diretório `/Users/matheusg/Developer/FibonacciHackathon`. Repositório público criado em https://github.com/MTHias0/FibonacciHackathon, com branch `main` publicada. Em 2026-11-19 o usuário informou o foco do hackathon (integração via MCP) e a ideia de partida (legislação versionada em git). O brainstorm está em `docs/IDEIAS-MCP.md`. Escopo final ainda não decidido. Nenhuma funcionalidade de negócio implementada.

## Fatos confirmados

- O projeto será desenvolvido durante um hackathon.
- O assistente atuará como desenvolvedor sênior.
- O usuário fornecerá o contexto e as instruções do sistema.
- A comunicação deve usar português e Caveman ultra, com um resumo extremamente enxuto após cada alteração.
- O contexto e as decisões devem permanecer documentados no repositório.
- O usuário solicitou a skill `grillme` para perguntas e decisões de negócio.
- O hackathon tem como tema central a **integração via MCP (Model Context Protocol)**. O projeto deve ser pensado em servidores e clientes MCP desde o início. (Informado por João Matheus em 2026-11-19.)
- A ideia de partida é o repositório `ctresb/leis` (legislação brasileira em Markdown com histórico git como linha do tempo legislativa) e projetos semelhantes. Panorama em `docs/IDEIAS-MCP.md`.

## Negócio e escopo

Hipóteses e alternativas em `docs/IDEIAS-MCP.md`. Recomendação ainda **não aprovada**: servidor MCP de legislação ("LexMCP") com verificador de citações jurídicas e integração com outro MCP na demo.

A definir: problema final, público, proposta de valor, fluxo principal, regras de negócio, escopo mínimo, critérios de sucesso, prazo e critérios de avaliação do hackathon.

## Decisões confirmadas

- A preparação inicial foi documental. Em seguida, o usuário autorizou renomear a pasta para `FibonacciHackathon`, configurar TypeScript e iniciar um repositório público.
- Usar TypeScript estrito, Node.js 24 ou superior e ESM como base mínima, sem escolher frameworks antes do contexto do negócio. O usuário solicitou TypeScript; Node.js e ESM foram escolhas de configuração do Codex.
- Centralizar instruções e regras de arquitetura em `AGENTS.md`, com `CLAUDE.md` apontando para o mesmo arquivo.
- Usar um único `CONTEXTO.md` e uma única skill local `trabalho-atual` para continuidade entre Codex e Claude.

## Pendências

- Time decidir a ideia e o MVP a partir de `docs/IDEIAS-MCP.md` (seção 7).
- Responder às perguntas da seção 8 de `docs/IDEIAS-MCP.md`: regras e critérios do hackathon, prazo, tamanho do time, MCPs de patrocinadores, demo local ou hospedada, fonte de dados.
- Localizar a skill `grillme`: não encontrada no catálogo nem nos diretórios locais pesquisados. Sua origem ainda não foi informada.
- O ambiente desta sessão informa acesso irrestrito ao sistema de arquivos e rede habilitada. Isso não amplia o escopo autorizado do trabalho.

## Registro de alterações

- 2026-11-19 (Claude, sessão de João Matheus): criado `docs/IDEIAS-MCP.md` com pesquisa de repositórios "lei como git", comparação ctresb/leis × legalize-br × legislacao-br, ideias de produto, arquitetura MCP proposta e MVP recomendado. Atualizados `README.md`, `CONTEXTO.md` e `AGENTS.md` para registrar o foco em MCP. A skill de brainstorm citada pelo usuário não estava disponível na sessão e não foi usada.

- 2026-11-19 (Codex): criado e confirmado como público o repositório `MTHias0/FibonacciHackathon`; `main` enviada e configurada para acompanhar `origin/main`. SSH retornou `Permission denied (publickey)`; configurados origin HTTPS e helper de credenciais do `gh` apenas neste repositório, sem salvar tokens nos arquivos do projeto.

- 2026-11-19 (Codex): renomeada a pasta para `FibonacciHackathon`; criados `package.json`, `package-lock.json`, `tsconfig.json`, `src/index.ts`, `.gitignore`, `.editorconfig`, `.nvmrc` e `README.md`; atualizadas as regras em `AGENTS.md`. Git local inicializado em `main`; publicação remota pendente.

- 2026-11-19: criados `AGENTS.md` e `CONTEXTO.md` para preservar instruções, fatos, decisões e pendências. Nenhum código de aplicação criado.
- 2026-11-19 (Codex): adicionada a skill `.agents/skills/trabalho-atual/SKILL.md`; configurados links relativos em `CLAUDE.md` e `.claude/skills/trabalho-atual` para compartilhar instruções e skill sem cópias. Ampliado `AGENTS.md` com protocolo de continuidade e regras de arquitetura.

## Verificação e limitações

- `docs/IDEIAS-MCP.md` se baseia em READMEs e páginas do GitHub lidos em 2026-11-19. Nenhum repositório de leis foi clonado ou auditado. A API do Querido Diário e o SDK MCP não foram testados.

- GitHub confirmou visibilidade `PUBLIC` e branch padrão `main`; push inicial concluído via HTTPS.

- `npm run typecheck`, `npm run build`, `npm start` e execução direta de `src/index.ts` passaram. Instalação informou zero vulnerabilidades. Os dois links relativos continuam válidos após renomear a pasta.
- `.gitignore` exclui dependências, build e arquivos `.env`; não há testes de negócio porque nenhuma funcionalidade foi implementada.

- Skill aprovada por `quick_validate.py`, executado com PyYAML em ambiente temporário isolado. Links simbólicos resolvidos e leitura da mesma skill por ambas as entradas confirmadas.
- Ainda não houve retomada real por uma sessão Claude; a configuração local não comprova o comportamento de versões específicas dos agentes.

## Próximo passo

Time ler `docs/IDEIAS-MCP.md`, responder às perguntas em aberto (seção 8) e aprovar a ideia e o MVP. Só então iniciar o servidor MCP (sugestão: `@modelcontextprotocol/sdk` em TypeScript, recorte pequeno de leis). Origem da skill `grillme` segue pendente.
