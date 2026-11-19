# Contexto do hackathon

## Estado

- Base TypeScript pronta (`npm run typecheck`, `build` e `start` passam). Nenhuma funcionalidade implementada.
- Ideia convergida: **LawMCP**, um servidor MCP para consultar, citar e verificar leis de qualquer jurisdição. Plano completo em `docs/IDEIAS-MCP.md`.

## Fatos

- O tema central do hackathon é integração via MCP.
- O ponto de partida é o `ctresb/leis` (leis em Markdown, com o histórico git como linha do tempo legislativa) e projetos semelhantes.

## Decisões

- TypeScript estrito, Node.js 24 ou superior, ESM. Sem frameworks até o escopo ser aprovado.
- `AGENTS.md` é a fonte única de instruções. `CONTEXTO.md` é o único registro de estado.
- Produto: **LawMCP**. A integração via MCP é o foco, com front mínimo. Público B2B (advogados, empresas, plataformas) e B2C (cidadãos).
- Demo: BR federal + 1 município + Espanha, com `adicionar_norma`. MCP só local (stdio).
- Prazo: 3h, 3 devs com agentes (MCP, back/dados, infra/front). Divisão em `docs/IDEIAS-MCP.md` §8.

## Pendências

- Confirmar o município da demo (recomendado: Birigui/SP) e se o OpenBot suporta MCP via stdio.
- Critérios de avaliação do hackathon e MCPs ou APIs de patrocinadores.
- Skill `grillme`, pedida por um colega: origem desconhecida.

## Próximo passo

Congelar o contrato (`Norma`, URIs, schemas das tools) em `src/types.ts` e dividir as tarefas conforme `docs/IDEIAS-MCP.md` §8.

<!-- Atualizado em 2026-11-19 por Claude (sessão de João Matheus). -->
