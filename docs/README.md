# Documentação do LawMCP

O LawMCP é um servidor MCP (Model Context Protocol) que dá a qualquer agente de IA acesso a leis de vários países, estados e municípios: texto oficial, situação (vigente ou revogada), genealogia das alterações e o permalink do texto exato num commit do GitHub.

Esta pasta explica o que ele faz, como funciona por dentro e como usar, estender e testar. Para rodar em 1 minuto, veja o [README](../README.md). O estado do projeto, as decisões aprovadas e as pendências ficam no [CONTEXTO.md](../CONTEXTO.md), e as regras para agentes e colegas no [AGENTS.md](../AGENTS.md).

## Por onde começar

| Quero… | Leia |
|---|---|
| Entender o produto, o problema e o pitch | [01. Visão geral](01-visao-geral.md) |
| Entender o código e como as peças se ligam | [02. Arquitetura](02-arquitetura.md) |
| Saber o que cada tool recebe e devolve | [03. Referência MCP](03-referencia-mcp.md) |
| Saber de onde vêm as leis e como atualizar | [04. Dados e fontes](04-dados-e-fontes.md) |
| Adicionar município, país ou normas da empresa | [05. Jurisdições próprias](05-jurisdicoes-proprias.md) |
| Entender o verificador de citações | [06. Verificador de citações](06-verificador-de-citacoes.md) |
| Plugar no Claude Desktop, Cursor ou Inspector | [07. Clientes e demo](07-clientes-e-demo.md) |
| Fazer a demo no palco (roteiro de 3 min) | [DEMO.md](DEMO.md) |
| Rodar e escrever testes | [08. Testes e qualidade](08-testes-e-qualidade.md) |
| Saber por que foi feito assim e o que ainda falta | [09. Decisões e limitações](09-decisoes-e-limitacoes.md) |
| Ver o brainstorm e o plano do time | [Ideias](IDEIAS-MCP.md) · [Roadmap por dev](ROADMAP.md) |

## Mapa do repositório

```
README.md                  como rodar e plugar (quickstart)
CONTEXTO.md                estado, decisões, pendências e próximo passo
AGENTS.md                  regras para agentes e colegas (CLAUDE.md aponta para ele)
docs/                      esta documentação
src/server.ts              servidor MCP via stdio: tools, resources, prompts e instruções
src/types.ts               contrato compartilhado (Norma, URIs, entradas e saídas das tools)
src/citacoes.ts            verificador de citações
src/dados/                 adaptadores das fontes, índice, texto jurídico, catálogo e normas locais
src/scripts/fetch-data.ts  baixa as fontes e regenera data/snapshot/
src/lawmcp.test.ts         testes (node:test)
data/snapshot/             leis da demo, manifest.json (commits) e fontes.json (fontes sem código)
data/local/                normas privadas, num git próprio (fora do git do projeto)
```

## Convenções desta documentação

- Os fatos vêm do código e dos testes. Cada página termina com a lista de arquivos de onde saiu (Evidências).
- **A confirmar** marca o que ainda não foi verificado na prática.
- Os números da base (normas, artigos, commits) mudam quando o snapshot muda. Os atuais estão em `listar_jurisdicoes` e no resource `lawmcp://sobre`.
- Ao mudar o código, atualize a página correspondente no mesmo commit.

Versão documentada: 0.2.0 (`package.json`), em 19/11/2026.
