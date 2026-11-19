# Contexto do hackathon

## Estado atual

Base TypeScript preparada em 2026-11-19 pelo Codex, no diretório `/Users/matheusg/Developer/FibonacciHackathon`. Git local inicializado na branch `main`. Aguardando o contexto do negócio e autenticação na API do GitHub para criar o repositório público. Nenhuma funcionalidade de negócio implementada.

## Fatos confirmados

- O projeto será desenvolvido durante um hackathon.
- O assistente atuará como desenvolvedor sênior.
- O usuário fornecerá o contexto e as instruções do sistema.
- A comunicação deve usar português e Caveman ultra, com um resumo extremamente enxuto após cada alteração.
- O contexto e as decisões devem permanecer documentados no repositório.
- O usuário solicitou a skill `grillme` para perguntas e decisões de negócio.

## Negócio e escopo

A definir após receber o contexto: problema, público, proposta de valor, fluxo principal, regras de negócio, escopo mínimo, critérios de sucesso, prazo e critérios de avaliação do hackathon.

## Decisões confirmadas

- A preparação inicial foi documental. Em seguida, o usuário autorizou renomear a pasta para `FibonacciHackathon`, configurar TypeScript e iniciar um repositório público.
- Usar TypeScript estrito, Node.js 24 ou superior e ESM como base mínima, sem escolher frameworks antes do contexto do negócio. O usuário solicitou TypeScript; Node.js e ESM foram escolhas de configuração do Codex.
- Centralizar instruções e regras de arquitetura em `AGENTS.md`, com `CLAUDE.md` apontando para o mesmo arquivo.
- Usar um único `CONTEXTO.md` e uma única skill local `trabalho-atual` para continuidade entre Codex e Claude.

## Pendências

- Criar e publicar o repositório público `FibonacciHackathon` no GitHub. `gh auth status` informa ausência de autenticação. O usuário informa possuir acesso SSH; SSH permite push, mas não substitui autenticação na API para criar o repositório. Aguardar `gh auth login` ou URL de um repositório já criado.

- Receber as informações do negócio.
- Localizar a skill `grillme`: não encontrada no catálogo nem nos diretórios locais pesquisados. Sua origem ainda não foi informada.
- O ambiente desta sessão informa acesso irrestrito ao sistema de arquivos e rede habilitada. Isso não amplia o escopo autorizado do trabalho.

## Registro de alterações

- 2026-11-19 (Codex): renomeada a pasta para `FibonacciHackathon`; criados `package.json`, `package-lock.json`, `tsconfig.json`, `src/index.ts`, `.gitignore`, `.editorconfig`, `.nvmrc` e `README.md`; atualizadas as regras em `AGENTS.md`. Git local inicializado em `main`; publicação remota pendente.

- 2026-11-19: criados `AGENTS.md` e `CONTEXTO.md` para preservar instruções, fatos, decisões e pendências. Nenhum código de aplicação criado.
- 2026-11-19 (Codex): adicionada a skill `.agents/skills/trabalho-atual/SKILL.md`; configurados links relativos em `CLAUDE.md` e `.claude/skills/trabalho-atual` para compartilhar instruções e skill sem cópias. Ampliado `AGENTS.md` com protocolo de continuidade e regras de arquitetura.

## Verificação e limitações

- `npm run typecheck`, `npm run build`, `npm start` e execução direta de `src/index.ts` passaram. Instalação informou zero vulnerabilidades. Os dois links relativos continuam válidos após renomear a pasta.
- `.gitignore` exclui dependências, build e arquivos `.env`; não há testes de negócio porque nenhuma funcionalidade foi implementada.

- Skill aprovada por `quick_validate.py`, executado com PyYAML em ambiente temporário isolado. Links simbólicos resolvidos e leitura da mesma skill por ambas as entradas confirmadas.
- Ainda não houve retomada real por uma sessão Claude; a configuração local não comprova o comportamento de versões específicas dos agentes.

## Próximo passo

Após autenticação, verificar a conta ativa, criar o repositório público `FibonacciHackathon`, configurar `origin`, enviar `main` e confirmar a visibilidade pública. Depois, receber o contexto do negócio e a origem da skill `grillme`.
