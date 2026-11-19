# LawMCP (FibonacciHackathon)

Um servidor **MCP (Model Context Protocol)** para consultar, citar e verificar leis de qualquer jurisdição.
Qualquer agente de IA (Claude Desktop, Claude Code, Cursor, OpenBot…) pluga e passa a responder com texto oficial, fonte e vigência, em vez de inventar artigos.

**Primeira entrega: o MCP (tools P0 via stdio). Front e pitch vêm depois.**
Plano completo: [docs/IDEIAS-MCP.md](docs/IDEIAS-MCP.md) · Contrato: [src/types.ts](src/types.ts) · Estado: [CONTEXTO.md](CONTEXTO.md)

## Rodar

```sh
nvm use      # Node 24+
npm ci
npm test     # inclui um teste ponta a ponta com um cliente MCP real
npm run mcp  # sobe o servidor via stdio (o cliente MCP é quem inicia o processo)
```

Os dados da demo já vêm no repo, em `data/snapshot/` (ver [FONTES.md](data/snapshot/FONTES.md)).
Para atualizá-los: `npm run data:fetch` (o ctresb leva cerca de 7 min no primeiro clone).

## Tools

| Tool | Para quê |
|---|---|
| `listar_jurisdicoes` | O que está carregado: `br/federal`, `br/sp/birigui`, `es` |
| `buscar_normas` | Busca por palavras-chave com filtro de jurisdição (prefixo), tipo e ano |
| `ler_norma` | Texto oficial por URI: `law://br/federal/lei-8078-1990/art-49`, `law://es/BOE-A-1978-31229/art-14` |
| `verificar_citacoes` | Marca as citações de um texto como `ok`, `revogada`, `inexistente`, `divergente` ou `fora_da_base` |

## Plugar num cliente MCP

Use caminhos **absolutos**. Descubra o seu Node 24 com `which node` (o cliente pode usar um Node antigo do PATH).

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`), **Cursor** (`~/.cursor/mcp.json`) e outros clientes stdio:

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

**Claude Code:**

```sh
claude mcp add lawmcp -- "$(which node)" "$PWD/src/server.ts"
```

**MCP Inspector** (para testar as tools no navegador):

```sh
npx @modelcontextprotocol/inspector node src/server.ts
```

Perguntas para testar: *"O art. 49 do CDC ainda vale? Cite a fonte."* ·
*"Verifique as citações: segundo o art. 999 do CDC, o consumidor recebe em dobro."* ·
*"O que diz o artículo 14 de la Constitución Española?"* · *"Que leis de Birigui falam de via pública?"*

## Estrutura

```
src/server.ts           servidor MCP (stdio) e registro das tools
src/types.ts            contrato compartilhado (Norma, URIs, entradas e saídas)
src/dados/adaptadores.ts uma fonte por adaptador → Norma (adicionar jurisdição = novo adaptador em FONTES)
src/dados/indice.ts     índice em memória e busca
src/citacoes.ts         verificador de citações
src/scripts/fetch-data.ts regenera data/snapshot/
data/snapshot/          dados da demo (versionados)
```

## Comandos

- `npm run mcp`: servidor via stdio. `npm run dev`: o mesmo, reiniciando ao salvar.
- `npm test`: testes (node:test). `npm run typecheck` / `npm run build` / `npm start` (versão compilada).
- `npm run data:fetch [-- br-federal es br-sp-birigui]`: atualiza o snapshot.

## Para agentes e colegas

Leia [AGENTS.md](AGENTS.md) e [CONTEXTO.md](CONTEXTO.md) antes de trabalhar.
