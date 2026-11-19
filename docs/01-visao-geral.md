# 01. Visão geral

## O problema

Agentes de IA respondem perguntas jurídicas de memória. O resultado é conhecido: artigo que não existe, inciso inventado, lei revogada citada como vigente e nenhuma forma simples de conferir de onde saiu o texto. Para quem depende da resposta (um advogado assinando uma peça, um cidadão tentando entender um direito), isso é risco.

A legislação aberta existe, mas está espalhada por fontes, formatos e jurisdições diferentes, e nenhuma delas fala o protocolo que os agentes usam.

## A solução

O **LawMCP** é um servidor MCP que qualquer cliente compatível (Claude Desktop, Claude Code, Cursor e outros) liga com uma linha de configuração. A partir daí, o agente:

- busca e lê leis, artigos e até incisos e parágrafos de várias jurisdições;
- confere as citações de um texto antes de entregá-lo;
- explica quem alterou cada dispositivo e o que uma lei mudou em outras;
- compara o mesmo tema entre países;
- consulta normas privadas de um escritório ou empresa, versionadas em git.

**Lei com recibo:** toda resposta traz o permalink do texto exato num commit do GitHub. Dá para auditar de onde saiu cada artigo, e o link não muda quando a fonte é atualizada.

## Para quem

| Público | O que ganha |
|---|---|
| Advogados (principal) | Verificar as citações de uma petição ou parecer até o inciso; ver a genealogia de um artigo; saber o que uma reforma mudou |
| Cidadãos | Explicação em linguagem simples, com a lei por trás e o link para conferir |
| Empresas e escritórios (B2B) | Políticas internas, regulamentos e contratos-padrão consultáveis e citáveis pelo agente, com histórico de versões |
| Devs e agentes de IA | Uma fonte jurídica verificável, em vez de memória do modelo |

## O que já funciona (v0.2)

- 9 tools MCP: listar, buscar, ler, verificar citações, comparar jurisdições, histórico, impacto, adicionar norma e importar pasta de normas. Detalhes em [03. Referência MCP](03-referencia-mcp.md).
- Resources (`law://…` e `lawmcp://sobre`), 4 prompts prontos e instruções do servidor que mandam o agente nunca citar lei de memória.
- Jurisdições novas sem programar, por `data/snapshot/fontes.json`, e normas privadas em `law://local/{org}/…` ([05. Jurisdições próprias](05-jurisdicoes-proprias.md)).

## Cobertura da demo

| Jurisdição | Documentos (normas + artigos) | O que tem |
|---|---|---|
| `br/federal` | 11.956 | 43 normas: CF, CDC, CLT, ECA, Lei do Inquilinato, 17 códigos (Civil, Penal, Processo Civil, Tributário…) e 21 leis-chave (LGPD, Marco Civil, Licitações, Maria da Penha, Reforma Trabalhista…) |
| `br/sp/birigui` | 654 | Leis ordinárias e complementares, decretos, resoluções e emendas à Lei Orgânica de Birigui/SP |
| `es` | 2.552 | Constituição Espanhola, Código Civil, Estatuto dos Trabalhadores, lei de consumidores e lei de proteção de dados |
| `local/{org}` | conforme o uso | Normas privadas adicionadas pelo chat |

Total: 15.162 documentos. As fontes e licenças estão em [04. Dados e fontes](04-dados-e-fontes.md).

## O que o LawMCP não é

- Não é aconselhamento jurídico. Toda resposta carrega um aviso, e o texto não substitui a publicação oficial.
- Não é um servidor remoto: roda local, via stdio, iniciado pelo próprio cliente MCP. Não tem autenticação nem multiusuário.
- Ainda não tem front. O front mínimo é a entrega 3 (ver [Roadmap](ROADMAP.md)).

## Contexto do hackathon

- Evento: FibonacciHackathon, com tema central integração via MCP.
- Time: 3 devs com agentes de IA, 3 horas.
- Ordem de entrega: 1) o MCP funcionando no Claude Desktop via stdio; 2) extras do MCP; 3) front e pitch. O que cada dev faz está no [Roadmap](ROADMAP.md).

## Evidências

`README.md`, `CONTEXTO.md`, `src/server.ts` (tools, prompts e `INSTRUCOES`), `src/types.ts` (`AVISO`), `data/snapshot/FONTES.md` e a saída de `listar_jurisdicoes` sobre o snapshot atual.
