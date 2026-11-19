# Guia de instalação do LawMCP

Como instalar o LawMCP e ligá-lo no **Claude Code** e no **OpenBot**. No fim, há o atalho para Claude Desktop e Cursor.

O LawMCP é um servidor MCP local via **stdio**: o cliente (Claude Code, OpenBot…) inicia o processo `node src/server.ts` no computador e conversa com ele. Não há servidor na nuvem nem conta para criar.

## Resumo

1. Instalar Node.js 24 e git.
2. Baixar o LawMCP e instalar as dependências.
3. Conferir se o servidor sobe e anotar dois caminhos.
4. Ligar no [Claude Code](#claude-code) ou no [OpenBot](#openbot).
5. Testar com uma pergunta.

## 1. Pré-requisitos

| Programa | Versão | Para quê | Como conferir |
|---|---|---|---|
| Node.js | 24 ou superior | Roda o servidor (executa TypeScript direto, sem build) | `node -v` → `v24…` |
| git | qualquer recente | Baixar o projeto; versionar as normas privadas | `git --version` |

- Node 24 com nvm (macOS e Linux): `nvm install 24`. O projeto tem `.nvmrc`, então dentro da pasta basta `nvm use`. Sem nvm, baixe a versão 24 em [nodejs.org](https://nodejs.org/).
- git: no macOS, `xcode-select --install`; no Windows, [git-scm.com](https://git-scm.com/); no Linux, pelo gerenciador de pacotes.

## 2. Baixar e instalar o LawMCP

```sh
git clone https://github.com/MTHias0/FibonacciHackathon.git
cd FibonacciHackathon
nvm use        # se usar nvm
npm ci
npm test       # opcional: 18 testes, deve terminar com "fail 0"
```

As leis da demo (cerca de 15 mil normas e artigos, 21 MB) já vêm no repositório, em `data/snapshot/`. Não há download extra.

## 3. Conferir se sobe e anotar os caminhos

```sh
npm run mcp
```

Em alguns segundos aparece `LawMCP: 15162 normas carregadas em … ms`. O servidor fica parado esperando um cliente, e isso é normal. Saia com **Ctrl+C**.

Agora anote dois caminhos **absolutos**, rodando dentro da pasta do projeto:

```sh
which node                  # Node 24, ex.: /Users/ana/.nvm/versions/node/v24.12.0/bin/node
echo "$PWD/src/server.ts"   # servidor, ex.: /Users/ana/FibonacciHackathon/src/server.ts
```

No Windows (PowerShell): `(Get-Command node).Source` e `"$PWD\src\server.ts"`.

Use sempre o caminho completo do Node 24, e não só `node`: o cliente pode achar outro Node (ou outro runtime) no sistema e falhar.

---

## Claude Code

### Instalar

Dentro da pasta do projeto, escolha onde o LawMCP vai valer:

```sh
# Em todos os seus projetos (recomendado)
claude mcp add --scope user lawmcp -- "$(which node)" "$PWD/src/server.ts"

# Só neste projeto, só para você (padrão)
claude mcp add lawmcp -- "$(which node)" "$PWD/src/server.ts"
```

| Escopo | Onde fica | Quem vê |
|---|---|---|
| `local` (padrão) | Configuração do Claude Code, ligada a este projeto | Só você, só neste projeto |
| `user` | Configuração do Claude Code | Só você, em todos os projetos |
| `project` | Arquivo `.mcp.json` na raiz do projeto | Todo mundo que abrir o projeto (gera caminhos da sua máquina: não suba esse arquivo) |

Com variáveis de ambiente (opcional; o `-e` vem depois do nome):

```sh
claude mcp add --scope user lawmcp -e LAWMCP_LOCAL="$HOME/lawmcp-normas" -- "$(which node)" "$PWD/src/server.ts"
```

### Conferir

```sh
claude mcp list          # lawmcp: … - ✓ Connected
claude mcp get lawmcp    # comando, argumentos e escopo
```

Dentro de uma sessão do Claude Code, digite `/mcp`. O `lawmcp` aparece conectado, com as 9 tools.

### Usar

Abra o `claude` (em qualquer pasta, se usou `--scope user`) e pergunte:

> Quais jurisdições você tem?

O Claude chama `mcp__lawmcp__listar_jurisdicoes` e responde com `br/federal`, `br/sp/birigui` e `es`. Na primeira chamada de cada tool, ele pede permissão.

Para não ser perguntado a cada tool, libere o servidor inteiro no `settings.json` do Claude Code (`~/.claude/settings.json` para todos os projetos):

```json
{
  "permissions": {
    "allow": ["mcp__lawmcp"]
  }
}
```

Isso libera também `adicionar_norma` e `importar_normas`, que gravam em `data/local/`. Se preferir confirmar essas duas, libere uma a uma: `"mcp__lawmcp__buscar_normas"`, `"mcp__lawmcp__ler_norma"` e assim por diante.

### Atualizar e remover

- Atualizar: `git pull && npm ci` na pasta do projeto e abra uma sessão nova do Claude Code.
- Remover: `claude mcp remove lawmcp` (acrescente `--scope user` se instalou assim).

---

## OpenBot

Vale para o [OpenBot](https://openbot.run/) (app de agentes da nightly-labs). O OpenBot cadastra servidores MCP no próprio painel e os entrega aos agentes dele (Claude, Codex e outros provedores).

> **Importante:** configurar o LawMCP no Claude Code **não** basta para o OpenBot. Ele inicia o agente Claude ignorando o `.mcp.json` e as configurações MCP do Claude Code, e só usa os servidores cadastrados no painel do OpenBot.

### Instalar

1. Faça os passos 1 a 3 deste guia **na mesma máquina onde o OpenBot roda**. No app de desktop, é o seu computador. Num OpenBot em servidor (VPS ou hospedado), o LawMCP precisa estar instalado nesse servidor, com os caminhos de lá.
2. No OpenBot, abra **Marketplace** (barra superior) › **Your apps** › **Add custom**. Abre o painel **Connect to a custom MCP**.
3. Preencha:

| Campo no OpenBot | Valor |
|---|---|
| **Name** | `lawmcp` |
| **Transport** | STDIO |
| **Command to launch** | Caminho completo do Node 24 (passo 3), ex.: `/Users/ana/.nvm/versions/node/v24.12.0/bin/node`. Só o programa, sem argumentos |
| **Arguments** › Argument 1 | Caminho completo do servidor, ex.: `/Users/ana/FibonacciHackathon/src/server.ts` |
| **Environment variables** | Opcional: `LAWMCP_LOCAL` = pasta das normas privadas |
| **Working directory** | **Deixe vazio.** Com ele vazio, o servidor vai para todos os provedores; preenchido, só Claude e Codex recebem |

4. Clique em **Test connection**. O esperado é **Connected · 9 tools**.
5. Salve e deixe o servidor **Enabled**.

### Usar

Abra uma conversa com um agente e pergunte "Quais jurisdições você tem?". Na primeira chamada, o OpenBot pode pedir consentimento para a tool. Para a demo, escolha a opção de sempre permitir.

### Por que o caminho do Node 24

Para servidores STDIO, o OpenBot baixa um runtime próprio (Bun) e o coloca por último no PATH. Se o comando for só `node`, ele pode achar um Node antigo, ou nenhum, e o LawMCP não sobe (`Did not start`). Com o caminho completo do Node 24, não há dúvida.

### Status

**A confirmar:** o time ainda não rodou o LawMCP dentro do OpenBot. Os passos acima vêm do código-fonte e dos textos da interface do OpenBot ([nightly-labs/openbot](https://github.com/nightly-labs/openbot)), versão de novembro de 2026. Existem outros projetos chamados "OpenBot". Se o do hackathon for outro, avise o time (ROADMAP, Dev 1).

---

## Testar

Em qualquer cliente, faça duas perguntas:

> Quais jurisdições você tem?

> O art. 49 do CDC ainda vale? Cite a fonte.

A segunda deve trazer o texto oficial, "vigente", o link do Planalto e um permalink do GitHub. A primeira chamada pode levar alguns segundos, enquanto o servidor carrega as leis na memória.

Para testar sem cliente de IA, use o MCP Inspector, que abre as tools no navegador:

```sh
npx @modelcontextprotocol/inspector node src/server.ts
```

O roteiro completo da demo está no [DEMO.md](DEMO.md).

## Outros clientes: Claude Desktop e Cursor

O bloco de configuração é o mesmo para os dois:

```json
{
  "mcpServers": {
    "lawmcp": {
      "command": "/Users/ana/.nvm/versions/node/v24.12.0/bin/node",
      "args": ["/Users/ana/FibonacciHackathon/src/server.ts"],
      "env": { "LAWMCP_LOCAL": "/Users/ana/lawmcp-normas" }
    }
  }
}
```

- **Claude Desktop:** Settings › Developer › Edit Config (`~/Library/Application Support/Claude/claude_desktop_config.json` no macOS; `%APPDATA%\Claude\claude_desktop_config.json` no Windows). Feche o app por completo (Cmd+Q) e abra de novo.
- **Cursor:** `~/.cursor/mcp.json`. Confira em Settings › MCP.
- O `env` é opcional. No Windows, escreva os caminhos com barras dobradas (`C:\\Users\\ana\\…`).

## Configurações opcionais

| Variável | Padrão | Para quê |
|---|---|---|
| `LAWMCP_DATA` | `data/snapshot` | Usar outra pasta de leis |
| `LAWMCP_LOCAL` | `data/local` | Onde `adicionar_norma` e `importar_normas` gravam as normas privadas (um repositório git próprio) |

As normas privadas ficam só na máquina e nunca vão para o repositório do LawMCP.

## Atualizar e desinstalar

- **Atualizar:** `git pull && npm ci` na pasta do projeto e reinicie o cliente (sessão nova no Claude Code; no OpenBot, desligue e ligue o servidor ou reabra o app).
- **Desinstalar:** remova o servidor do cliente (`claude mcp remove lawmcp`; no OpenBot, Your apps › lawmcp › Remove server) e apague a pasta do projeto. Antes, faça backup de `data/local/` (ou de `LAWMCP_LOCAL`) se quiser guardar as normas privadas.

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `claude mcp list` mostra o lawmcp com falha | Caminho relativo, errado ou Node antigo | Refaça o `claude mcp add` com os caminhos absolutos do passo 3 |
| OpenBot mostra **Did not start** ou **Failed** no Test connection | O comando não é o Node 24, ou o caminho do servidor está errado | Command = caminho completo do Node 24; Argument 1 = caminho completo de `src/server.ts` |
| O lawmcp funciona no Claude Code mas não aparece no OpenBot | O OpenBot ignora a configuração MCP do Claude Code | Cadastre no painel do OpenBot (Marketplace › Your apps › Add custom) |
| No OpenBot, só os agentes Claude e Codex veem o lawmcp | O campo Working directory foi preenchido | Deixe Working directory vazio |
| `ERR_UNKNOWN_FILE_EXTENSION ".ts"` | Node abaixo do 24 | Use o caminho completo do Node 24 |
| `Cannot find package '@modelcontextprotocol/sdk'` | Faltou instalar as dependências | `npm ci` na pasta do projeto |
| A primeira resposta demora | O índice ainda está carregando (4 a 14 s a frio) | Espere; as próximas são imediatas |
| `adicionar_norma` ou `importar_normas` dão erro de git | git não instalado | Instale o git (passo 1) |
| O servidor não sobe depois de mexer em `data/snapshot/fontes.json` | Configuração inválida | Rode `npm run mcp` no terminal: a mensagem diz o campo errado |

Para ver o erro com calma, rode `npm run mcp` no terminal: tudo o que o servidor tem a dizer sai ali (ele escreve só no stderr).

## O que já foi testado

| Ambiente | Situação |
|---|---|
| macOS, Node 24.12, testes automáticos (incluindo um cliente MCP real via stdio) | Testado |
| MCP Inspector (interface web e CLI) | Testado em 19/11/2026 |
| Claude Desktop no macOS | Testado com o MCP v1; **a confirmar** com a versão atual ([DEMO.md](DEMO.md)) |
| Claude Code | **A confirmar** |
| OpenBot | **A confirmar** (passos tirados do código-fonte do OpenBot) |
| Cursor, Windows, Linux | **A confirmar** |

## Próximos passos

- O que cada tool faz: [03. Referência MCP](03-referencia-mcp.md).
- Fazer a demo: [DEMO.md](DEMO.md).
- Adicionar leis de outro município ou as normas do seu escritório: [05. Jurisdições próprias](05-jurisdicoes-proprias.md).
