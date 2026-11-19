# Contexto do hackathon

## Estado

- **Entrega 1 (MCP) implementada:** servidor stdio com as 4 tools P0 (`listar_jurisdicoes`, `buscar_normas`, `ler_norma`, `verificar_citacoes`) sobre 5.212 normas (2.007 br/federal, 654 br/sp/birigui e 2.551 es, contando artigos).
- Verificado: `npm test` (8 testes, incluindo um ponta a ponta com um cliente MCP real via stdio), `typecheck` e `build`. **Ainda não testado na interface do Claude Desktop, do Cursor nem do OpenBot.**
- Ideia convergida: **LawMCP**, um servidor MCP para consultar, citar e verificar leis de qualquer jurisdição. Plano completo em `docs/IDEIAS-MCP.md`.

## Fatos

- O tema central do hackathon é integração via MCP.
- O ponto de partida é o `ctresb/leis` (leis em Markdown, com o histórico git como linha do tempo legislativa) e projetos semelhantes.

## Decisões

- TypeScript estrito, Node.js 24 ou superior, ESM. Sem frameworks até o escopo ser aprovado.
- `AGENTS.md` é a fonte única de instruções. `CONTEXTO.md` é o único registro de estado.
- Produto: **LawMCP**. A integração via MCP é o foco, com front mínimo. Público B2B (advogados, empresas, plataformas) e B2C (cidadãos).
- Município da demo: Birigui/SP (o único do ctresb com leis ordinárias, complementares e decretos entre os verificados).
- Dados da demo versionados em `data/snapshot/`, porque o clone do ctresb leva cerca de 7 min. `npm run data:fetch` regenera.
- Demo: BR federal + 1 município + Espanha, com `adicionar_norma`. MCP só local (stdio).
- **Ordem de entrega: 1) o MCP (tools P0 no Claude Desktop via stdio), 2) extras do MCP, 3) front e pitch.** Detalhes em `docs/IDEIAS-MCP.md` › Ordem de entrega.
- Prazo: 3h, 3 devs com agentes (MCP, back/dados, infra/front). Divisão em `docs/IDEIAS-MCP.md` §8.

## Pendências

- Testar no Claude Desktop (config no README) e confirmar se o OpenBot suporta MCP via stdio.
- Limitações do verificador: pega só o primeiro artigo de listas ("arts. 5º e 7º") e não confere incisos e parágrafos.
- Critérios de avaliação do hackathon e MCPs ou APIs de patrocinadores.
- Skill `grillme`, pedida por um colega: origem desconhecida.

## Próximo passo

1. Plugar no Claude Desktop e rodar as perguntas de teste do README (checkpoint da entrega 1).
2. Entrega 2: `adicionar_norma`, `historico_norma`, resources `law://` e prompts. Os tipos já estão em `src/types.ts`.

<!-- Atualizado em 2026-11-19 por Claude (sessão de João Matheus). -->
