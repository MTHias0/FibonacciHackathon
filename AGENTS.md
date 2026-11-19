# Instruções do projeto

Leia `CONTEXTO.md` antes de trabalhar. `CLAUDE.md` é um link para este arquivo, que é a fonte única das instruções.

## Projeto

- Hackathon com tema central **integração via MCP (Model Context Protocol)**. Pense as soluções como servidores e clientes MCP (tools, resources, prompts).
- As ideias em discussão estão em `docs/IDEIAS-MCP.md`. Só é decisão o que estiver em `CONTEXTO.md` › Decisões.
- **A primeira entrega é o MCP** (LawMCP via stdio, já implementado na v0.2). Front, landing e pitch só depois de ele funcionar no Claude Desktop. O que cada dev faz está em `docs/ROADMAP.md`.
- O contrato compartilhado fica em `src/types.ts`. Não altere sem combinar com o time.

## Arquitetura

- TypeScript estrito, Node.js 24 ou superior, ESM. Código em `src/`, build em `dist/`, dependências fixadas por `package-lock.json`.
- O Node roda `.ts` direto: imports relativos usam a extensão `.ts` (o `tsc` reescreve para `.js` no build).
- MCP: `@modelcontextprotocol/sdk` e `zod` para os schemas. Tools em `src/server.ts`. No servidor stdio, **nunca escreva no stdout**: logs só com `console.error`.
- Dados: cada fonte é um `Adaptador` em `src/dados/adaptadores.ts`, registrado em `FONTES`, que converte para `Norma`. O snapshot da demo fica em `data/snapshot/` e `data/cache/` não é versionado.
- O snapshot mantém os caminhos dos repositórios de origem, e `data/snapshot/manifest.json` (gerado por `npm run data:fetch`, nunca à mão) guarda o commit de cada fonte. Os dois juntos formam o permalink.
- Normas privadas (`adicionar_norma`) só entram em `law://local/{org}/…`, num repositório git próprio em `data/local/` (ou `LAWMCP_LOCAL`), fora do git do projeto. Nunca escreva em jurisdições oficiais.
- Testes: `node:test` em `src/**/*.test.ts`. Toda tool nova precisa de um teste.
- Registre aqui as novas regras permanentes de arquitetura e, em `CONTEXTO.md`, o motivo de cada uma.
- Implemente o menor sistema completo que cumpra os requisitos confirmados. Reutilize antes de abstrair.
- Preserve validação, segurança e integridade dos dados. Nunca registre segredos no repositório.

## Continuidade (Codex, Claude e pessoas)

- `CONTEXTO.md` é o único registro do estado. Mantenha-o curto: estado, decisões, pendências e próximo passo. O histórico detalhado fica no git.
- Antes de encerrar uma tarefa, atualize `CONTEXTO.md` e diferencie o planejado, o implementado e o verificado.
- Preserve contribuições de colegas. Em caso de conflito de decisões, registre-o e pergunte antes de seguir.
- Skill compartilhada: `.agents/skills/trabalho-atual` (com um link em `.claude/skills/`).

## Comunicação

- Português. Respostas curtas, com um resumo enxuto e a verificação feita após cada alteração.
- Não trate recomendações como decisões aprovadas.
