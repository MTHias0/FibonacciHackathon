# LawMCP (FibonacciHackathon)

Um servidor **MCP (Model Context Protocol)** para consultar, citar e verificar leis de qualquer jurisdição.
Qualquer agente de IA (Claude Desktop, Claude Code, Cursor, OpenBot…) pluga e passa a responder com texto oficial, fonte e vigência, em vez de inventar artigos.

**Lei com recibo:** toda resposta traz o permalink do texto exato num commit do GitHub. Dá para auditar de onde saiu cada artigo, e o link não muda quando a fonte é atualizada.

Plano: [docs/IDEIAS-MCP.md](docs/IDEIAS-MCP.md) · Roadmap do time: [docs/ROADMAP.md](docs/ROADMAP.md) · Contrato: [src/types.ts](src/types.ts) · Estado: [CONTEXTO.md](CONTEXTO.md)

## Rodar

```sh
nvm use      # Node 24+
npm ci
npm test     # 16 testes, incluindo um ponta a ponta com um cliente MCP real via stdio
npm run mcp  # sobe o servidor via stdio (o cliente MCP é quem inicia o processo)
```

Os dados da demo já vêm no repo, em `data/snapshot/`: cerca de 15 mil normas e artigos de 4 fontes (ver [FONTES.md](data/snapshot/FONTES.md)).
O `manifest.json` guarda o commit de cada fonte, e é dele que saem os permalinks. Para atualizar: `npm run data:fetch` (o primeiro clone do ctresb leva cerca de 7 min).

## O que tem dentro

| Tool | Para quê |
|---|---|
| `listar_jurisdicoes` | O que está carregado (`br/federal`, `br/sp/birigui`, `es`, `local/…`), com o commit de cada fonte |
| `buscar_normas` | Busca com ranking BM25, filtro de jurisdição (prefixo), tipo e ano |
| `ler_norma` | Norma, artigo **ou dispositivo**: `law://br/federal/constituicao-1988/art-5/inc-13`, `…/art-59/par-1` |
| `verificar_citacoes` | Confere citações até inciso e parágrafo ("arts. 5º a 7º", "§ 1º do art. 59 da CLT", "CF, art. 5º, LXXVIII"): `ok`, `revogada`, `inexistente`, `divergente` ou `fora_da_base` |
| `historico_norma` | Genealogia: quem alterou cada dispositivo e como ("Redação dada pela Lei nº 13.467/2017") |
| `impacto_da_norma` | O que uma lei mudou: "Reforma Trabalhista" → 378 dispositivos da CLT |
| `comparar_jurisdicoes` | O mesmo tema em vários países, lado a lado |
| `adicionar_norma` | Norma privada de escritório ou empresa em `law://local/{org}/…`, versionada em git local (B2B) |

- **Resources:** cada norma é um documento `law://…` que o cliente pode anexar ao contexto, mais o `lawmcp://sobre`, com a cobertura e os commits.
- **Prompts:** `responder_com_citacao`, `explicar_para_cidadao`, `revisar_peca`, `comparar_paises`.
- **Instruções do servidor:** dizem ao agente para nunca citar lei de memória e para verificar as citações antes de responder.

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

Variáveis opcionais: `LAWMCP_DATA` (pasta do snapshot) e `LAWMCP_LOCAL` (onde `adicionar_norma` grava; padrão `data/local/`, fora do git do projeto).

### Perguntas para a demo

- *"O art. 49 do CDC ainda vale? Cite a fonte."*
- *"Verifique as citações: segundo o art. 999 do CDC e o art. 7º, inciso XCIX, da CF, o consumidor recebe em dobro."*
- *"O que a Reforma Trabalhista mudou na CLT?"*
- *"Quem alterou o art. 59 da CLT?"*
- *"Compare igualdade perante a lei no Brasil e na Espanha."*
- *"Que leis de Birigui falam de IPTU?"*
- *"Adicione a política interna de home office do escritório-silva: Art. 1º …"*

## Estrutura

```
src/server.ts              servidor MCP (stdio): tools, resources, prompts e instruções
src/types.ts               contrato compartilhado (Norma, URIs, Alteracao, entradas e saídas)
src/citacoes.ts            verificador de citações (listas, faixas, incisos, parágrafos, aspas)
src/dados/adaptadores.ts   uma fonte por adaptador → Norma (adicionar jurisdição = novo adaptador em FONTES)
src/dados/indice.ts        índice BM25 em memória, dispositivos, genealogia reversa e permalinks
src/dados/texto.ts         normalização, artigos, dispositivos e atos citados ("Lei nº 13.467, de 2017")
src/dados/catalogo.ts      apelidos de citação (CF, CC, CDC, LGPD, "Reforma Trabalhista", CE…)
src/dados/locais.ts        normas privadas em git local (adicionar_norma)
src/scripts/fetch-data.ts  regenera data/snapshot/ e o manifest.json
data/snapshot/             dados da demo (versionados)
```

## Comandos

- `npm run mcp`: servidor via stdio. `npm run dev`: o mesmo, reiniciando ao salvar.
- `npm test`: testes (node:test). `npm run typecheck` / `npm run build` / `npm start` (versão compilada).
- `npm run data:fetch [-- br-federal br-federal-lawcodex es br-sp-birigui]`: atualiza o snapshot.

## Para agentes e colegas

Leia [AGENTS.md](AGENTS.md) e [CONTEXTO.md](CONTEXTO.md) antes de trabalhar.
