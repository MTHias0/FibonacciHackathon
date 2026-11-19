# 07. Clientes e demo

## Instalação

O passo a passo completo (pré-requisitos, Claude Desktop, Claude Code, Cursor, variáveis de ambiente, atualização e problemas comuns) está no [Guia de instalação](INSTALACAO.md).

## Demo

O roteiro oficial de palco está em [DEMO.md](DEMO.md): 5 perguntas, a tool esperada, a resposta esperada, o que falar e o checklist antes de subir. Siga ele.

Perguntas extras para mostrar as jurisdições próprias, fora do roteiro de 3 minutos:

| Pergunta | O que deve acontecer |
|---|---|
| "Quais jurisdições você tem?" | `listar_jurisdicoes` com `br/federal`, `br/sp/birigui`, `es` e as `local/…` |
| "Importe a pasta /Users/…/politicas como escritorio-silva." | `importar_normas` cria `local/escritorio-silva`, uma norma por arquivo |
| Edite um arquivo, peça para importar de novo e pergunte "o que mudou na última versão?" | `importar_normas` com `atualizadas: 1`; `historico_norma` lista os artigos alterados |

## Status

- MCP Inspector: testado em 19/11/2026 na interface web e em modo CLI. Foram 9 tools, 704 resources e 4 prompts; todas as tools chamadas, entradas inválidas recusadas. Registro no [Roadmap](ROADMAP.md).
- Claude Desktop: testado com o MCP v1 (as perguntas do README voltaram com texto, fonte e vigência). **A confirmar:** ensaiar as 5 perguntas do [DEMO.md](DEMO.md) na versão atual.
- Cursor: **a confirmar** (não estava instalado no teste).
- OpenBot: **a confirmar** se aceita MCP via stdio.
- O teste ponta a ponta via stdio passa a cada `npm test` ([08](08-testes-e-qualidade.md)).

## Evidências

`docs/INSTALACAO.md`, `docs/DEMO.md`, `docs/ROADMAP.md` (testes no Inspector e no Claude Desktop), `src/server.ts` (`DIR_SNAPSHOT`, `DIR_LOCAL`, carga do índice), `package.json` (`engines`, scripts), `CONTEXTO.md` (pendências) e as saídas reais das tools.
