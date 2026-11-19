# 07. Clientes e demo

## Requisitos

- Node.js 24 ou superior (roda TypeScript direto). Confira com `node -v`. O repo tem `.nvmrc` (use `nvm use`) e `engines` no `package.json`.
- `npm ci` na raiz do projeto.
- Os dados já vêm no repo. Não precisa baixar nada para a demo.

## Plugar num cliente

Use caminhos **absolutos**. Descubra o caminho do seu Node 24 com `which node`: o cliente pode usar um Node antigo do PATH e falhar sem mensagem clara.

### Claude Desktop

Arquivo: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS).

```json
{
  "mcpServers": {
    "lawmcp": {
      "command": "/caminho/do/node24",
      "args": ["/caminho/do/FibonacciHackathon/src/server.ts"]
    }
  }
}
```

Reinicie o app. O LawMCP aparece na lista de ferramentas.

### Cursor

Mesmo bloco, em `~/.cursor/mcp.json`.

### Claude Code

```sh
claude mcp add lawmcp -- "$(which node)" "$PWD/src/server.ts"
```

### MCP Inspector (testar as tools no navegador)

```sh
npx @modelcontextprotocol/inspector node src/server.ts
```

### Variáveis de ambiente

| Variável | Padrão | Para quê |
|---|---|---|
| `LAWMCP_DATA` | `data/snapshot` | Outra pasta de snapshot |
| `LAWMCP_LOCAL` | `data/local` | Onde `adicionar_norma` e `importar_normas` gravam (git próprio) |

No Claude Desktop e no Cursor, passe as variáveis em `"env": { "LAWMCP_LOCAL": "/caminho" }` dentro do bloco do servidor.

## Demo

O roteiro oficial de palco está em [DEMO.md](DEMO.md): 5 perguntas, a tool esperada, a resposta esperada, o que falar e o checklist antes de subir. Siga ele.

Perguntas extras para mostrar as jurisdições próprias, fora do roteiro de 3 minutos:

| Pergunta | O que deve acontecer |
|---|---|
| "Quais jurisdições você tem?" | `listar_jurisdicoes` com `br/federal`, `br/sp/birigui`, `es` e as `local/…` |
| "Importe a pasta /Users/…/politicas como escritorio-silva." | `importar_normas` cria `local/escritorio-silva`, uma norma por arquivo |
| Edite um arquivo, peça para importar de novo e pergunte "o que mudou na última versão?" | `importar_normas` com `atualizadas: 1`; `historico_norma` lista os artigos alterados |

Evite "igualdade perante a lei" em comparações: com essa frase, a busca não traz o art. 5º da CF ([09](09-decisoes-e-limitacoes.md)). "Todos são iguais perante a lei" funciona.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| O servidor não aparece no cliente | Caminho relativo ou Node antigo | Caminhos absolutos e o Node 24 de `which node` |
| As tools demoram na primeira chamada | O índice ainda está carregando (4 a 14 s) | Espere; as tools respondem quando a carga termina |
| `adicionar_norma está desligada` | Servidor iniciado sem pasta local | Rode pelo `src/server.ts` (usa `data/local`) ou defina `LAWMCP_LOCAL` |
| O servidor não sobe depois de mexer no `fontes.json` | Configuração inválida | Leia o log do cliente: a mensagem diz o campo errado |
| Jurisdição nova não aparece | Faltou baixar ou reiniciar | `npm run data:fetch -- <pasta>` e reinicie o cliente |

Os logs do servidor vão para o stderr, que o cliente MCP grava no log dele.

## Status

- MCP Inspector: testado em 19/11/2026 na interface web e em modo CLI. Foram 9 tools, 704 resources e 4 prompts; todas as tools chamadas, entradas inválidas recusadas. Registro no [Roadmap](ROADMAP.md).
- Claude Desktop: testado com o MCP v1 (as perguntas do README voltaram com texto, fonte e vigência). **A confirmar:** ensaiar as 5 perguntas do [DEMO.md](DEMO.md) na versão atual.
- Cursor: **a confirmar** (não estava instalado no teste).
- OpenBot: **a confirmar** se aceita MCP via stdio.
- O teste ponta a ponta via stdio passa a cada `npm test` ([08](08-testes-e-qualidade.md)).

## Evidências

`README.md` (seção Plugar num cliente MCP), `docs/DEMO.md`, `docs/ROADMAP.md` (testes no Inspector e no Claude Desktop), `src/server.ts` (`DIR_SNAPSHOT`, `DIR_LOCAL`, carga do índice), `package.json` (`engines`, scripts), `CONTEXTO.md` (pendências) e as saídas reais das tools.
