# Guia de instalação do LawMCP

Do zero até o LawMCP respondendo no seu cliente de IA, em cerca de 10 minutos. Não precisa saber programar: é copiar e colar comandos e editar um arquivo de configuração.

## Resumo

1. Instalar Node.js 24 e git.
2. Baixar o projeto e instalar as dependências.
3. Conferir se o servidor sobe.
4. Ligar no cliente (Claude Desktop, Claude Code ou Cursor).
5. Testar com uma pergunta.

## 1. Pré-requisitos

| Programa | Versão | Para quê | Como conferir |
|---|---|---|---|
| Node.js | 24 ou superior | Roda o servidor (executa TypeScript direto, sem build) | `node -v` → `v24…` |
| git | qualquer recente | Baixar o projeto; versionar as normas privadas | `git --version` |
| Um cliente MCP | — | Claude Desktop, Claude Code, Cursor ou outro que aceite servidor via stdio | — |

**Instalar o Node 24**

- Com nvm (recomendado no macOS e Linux): `nvm install 24`. O projeto tem `.nvmrc`, então dentro da pasta basta `nvm use`.
- Sem nvm: baixe a versão 24 (LTS) em [nodejs.org](https://nodejs.org/).

**Instalar o git:** no macOS, `xcode-select --install`; no Windows, [git-scm.com](https://git-scm.com/); no Linux, pelo gerenciador de pacotes.

## 2. Baixar e instalar

```sh
git clone https://github.com/MTHias0/FibonacciHackathon.git
cd FibonacciHackathon
nvm use        # se usar nvm
npm ci
```

As leis da demo (cerca de 15 mil normas e artigos, 21 MB) já vêm no repositório, em `data/snapshot/`. Não há download extra.

Opcional, para ter certeza de que está tudo certo:

```sh
npm test       # 18 testes; deve terminar com "fail 0"
```

## 3. Conferir se o servidor sobe

```sh
npm run mcp
```

Em alguns segundos deve aparecer:

```
LawMCP: 15162 normas carregadas em 3500 ms (…/data/snapshot)
```

O servidor fica parado esperando um cliente. Isso é normal: ele conversa pelo stdin e stdout, e quem o inicia de verdade é o cliente MCP. Saia com **Ctrl+C**.

## 4. Anotar dois caminhos

O cliente precisa de caminhos **absolutos**. Rode dentro da pasta do projeto:

```sh
which node                      # caminho do Node 24, ex.: /Users/ana/.nvm/versions/node/v24.12.0/bin/node
echo "$PWD/src/server.ts"       # caminho do servidor, ex.: /Users/ana/FibonacciHackathon/src/server.ts
```

No Windows (PowerShell): `(Get-Command node).Source` e `"$PWD\src\server.ts"`.

Use o caminho completo do Node 24 em vez de só `node`: o cliente pode achar um Node antigo no sistema e falhar sem mensagem clara.

## 5. Ligar no cliente

### Claude Desktop

1. Abra **Settings › Developer › Edit Config**. Isso abre o `claude_desktop_config.json`:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
2. Cole o bloco abaixo com os seus caminhos do passo 4. Se já houver outros servidores em `mcpServers`, só acrescente o `lawmcp`.

```json
{
  "mcpServers": {
    "lawmcp": {
      "command": "/Users/ana/.nvm/versions/node/v24.12.0/bin/node",
      "args": ["/Users/ana/FibonacciHackathon/src/server.ts"]
    }
  }
}
```

No Windows, escreva as barras dobradas: `"C:\\Users\\ana\\FibonacciHackathon\\src\\server.ts"`.

3. Feche o Claude Desktop por completo (no macOS, **Cmd+Q**) e abra de novo.
4. Em **Settings › Developer**, o `lawmcp` deve aparecer como conectado.

### Claude Code

Dentro da pasta do projeto:

```sh
claude mcp add lawmcp -- "$(which node)" "$PWD/src/server.ts"
```

Para usar em todos os projetos, acrescente `--scope user` depois de `add`. Confira com `claude mcp list`.

### Cursor

Crie ou edite `~/.cursor/mcp.json` (vale para todos os projetos) com o mesmo bloco `mcpServers` do Claude Desktop. Depois, confira em **Settings › MCP**.

### Outros clientes

Qualquer cliente que aceite servidor MCP via **stdio** serve: o comando é o caminho do Node 24 e o argumento é o caminho de `src/server.ts`. O LawMCP ainda não tem modo HTTP.

## 6. Testar

Abra uma conversa nova e pergunte:

> Quais jurisdições você tem?

O cliente deve chamar `listar_jurisdicoes` (na primeira vez, ele pede permissão; escolha permitir) e responder com `br/federal`, `br/sp/birigui` e `es`. Depois tente:

> O art. 49 do CDC ainda vale? Cite a fonte.

A resposta deve trazer o texto oficial, "vigente", o link do Planalto e um permalink do GitHub.

A primeira chamada pode levar alguns segundos: o servidor está carregando as leis na memória.

Para testar sem cliente de IA, use o MCP Inspector, que abre as tools no navegador:

```sh
npx @modelcontextprotocol/inspector node src/server.ts
```

## Configurações opcionais

| Variável | Padrão | Para quê |
|---|---|---|
| `LAWMCP_DATA` | `data/snapshot` | Usar outra pasta de leis |
| `LAWMCP_LOCAL` | `data/local` | Onde `adicionar_norma` e `importar_normas` gravam as normas privadas (um repositório git próprio) |

No Claude Desktop e no Cursor, as variáveis vão num campo `env` dentro do bloco do servidor:

```json
"lawmcp": {
  "command": "/caminho/do/node24",
  "args": ["/caminho/do/FibonacciHackathon/src/server.ts"],
  "env": { "LAWMCP_LOCAL": "/Users/ana/Documentos/lawmcp-normas" }
}
```

As normas privadas ficam só no seu computador e nunca vão para o repositório do LawMCP.

## Atualizar

```sh
cd FibonacciHackathon
git pull
npm ci
```

Depois, reinicie o cliente (no Claude Desktop, Cmd+Q e abrir de novo). Para baixar versões mais novas das próprias leis, veja [04. Dados e fontes](04-dados-e-fontes.md).

## Desinstalar

1. Tire o bloco `lawmcp` da configuração do cliente (ou `claude mcp remove lawmcp` no Claude Code) e reinicie o cliente.
2. Apague a pasta do projeto. As normas privadas estão em `data/local/` dentro dela (ou em `LAWMCP_LOCAL`): faça backup antes, se quiser guardá-las.

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| O `lawmcp` não aparece ou aparece com erro no cliente | Caminho relativo, errado ou Node antigo | Caminhos absolutos do passo 4; `node -v` precisa ser 24 ou superior |
| `ERR_UNKNOWN_FILE_EXTENSION ".ts"` ao subir | Node abaixo do 24 | Use o caminho completo do Node 24 no `command` |
| `Cannot find package '@modelcontextprotocol/sdk'` | Faltou instalar as dependências | `npm ci` na pasta do projeto |
| JSON inválido no Claude Desktop | Vírgula sobrando ou faltando; barras simples no Windows | Valide o JSON; no Windows use `\\` |
| As tools não aparecem depois de editar a config | O cliente não foi reiniciado de verdade | Feche por completo (Cmd+Q) e abra de novo |
| A primeira resposta demora | O índice ainda está carregando (4 a 14 s a frio) | Espere; as próximas são imediatas |
| `adicionar_norma` ou `importar_normas` dão erro de git | git não instalado | Instale o git (passo 1) |
| O servidor não sobe depois de mexer em `data/snapshot/fontes.json` | Configuração inválida | Rode `npm run mcp` no terminal: a mensagem diz o campo errado |

**Onde ver os logs:** o servidor escreve só no stderr, e o cliente guarda isso.

- Claude Desktop, macOS: `~/Library/Logs/Claude/mcp-server-lawmcp.log` (acompanhe com `tail -f`).
- Claude Desktop, Windows: `%APPDATA%\Claude\logs\`.
- Ou rode `npm run mcp` direto no terminal e veja a mensagem.

## O que já foi testado

| Ambiente | Situação |
|---|---|
| macOS, Node 24.12, testes automáticos (incluindo um cliente MCP real via stdio) | Testado |
| MCP Inspector (interface web e CLI) | Testado em 19/11/2026 |
| Claude Desktop no macOS | Testado com o MCP v1; **a confirmar** com a versão atual ([DEMO.md](DEMO.md)) |
| Claude Code, Cursor, Windows, Linux | **A confirmar** |

## Próximos passos

- Ver o que cada tool faz: [03. Referência MCP](03-referencia-mcp.md).
- Fazer a demo: [DEMO.md](DEMO.md).
- Adicionar leis de outro município ou as normas do seu escritório: [05. Jurisdições próprias](05-jurisdicoes-proprias.md).
