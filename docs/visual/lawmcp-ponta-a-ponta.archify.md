# Como o LawMCP funciona, do servidor MCP ao chat na web {#lawmcp-ponta-a-ponta}

O LawMCP é um **servidor MCP via stdio** com 15.162 documentos de lei num índice em memória. A web não tem backend próprio: ela é **mais um cliente MCP**, atrás de uma ponte HTTP local.

- O Claude Desktop, o Claude Code e o Cursor iniciam `node src/server.ts` e trocam JSON-RPC pelo stdin e stdout.[](source:server-main)
- A ponte `web/servidor.ts` inicia o mesmo processo com o `StdioClientTransport` do SDK e expõe três rotas HTTP.[](source:web-cliente)
- Cada mensagem do chat vira uma chamada de tool por regras; o Claude da conta logada no Claude Code (`claude -p`) só reescreve buscas em linguagem leiga.[](source:web-chat)
- As duas tools que gravam em disco ficam bloqueadas na web.

@answer scope="main, commit 538d38d · MCP v0.2 · MCP e ponte locais (stdio e 127.0.0.1), tradução pelo Claude"
@meta locale=en style=product
@source server-tools title="server.ts: criarServidor e as tools" path=src/server.ts lines=63:86
@source server-main title="server.ts: partida do servidor stdio" path=src/server.ts lines=289:298
@source indice-carregar title="indice.ts: Indice.carregar" path=src/dados/indice.ts lines=128:150
@source web-cliente title="servidor.ts: cliente MCP via stdio" path=web/servidor.ts lines=26:40
@source web-chat title="servidor.ts: chat(), tradução e encadeamento" path=web/servidor.ts lines=42:58
@source web-rotas title="servidor.ts: rotas HTTP" path=web/servidor.ts lines=85:114
@source roteador title="roteador.ts: rotear()" path=web/roteador.ts lines=65:85
@source tradutor title="tradutor.ts: traduzir() com o claude -p" path=web/tradutor.ts lines=47:66
@source app-api title="app.js: api() no navegador" path=web/public/app.js lines=48:53
@source app-enviar title="app.js: enviar() do chat" path=web/public/app.js lines=304:331

## Quais peças existem e quem chama quem? {#pecas}

@architecture id=mapa-lawmcp title="LawMCP: clientes, servidor e dados"
| browser | Navegador (app.js) | frontend | source:app-enviar |
| desktop | Claude Desktop | external |
| ponte | Ponte HTTP | backend | source:web-rotas |
| claude | Claude (sua conta) | external | source:tradutor |
| server | LawMCP server.ts | backend | source:server-tools |
| citacoes | Verificador | backend |
| indice | Índice BM25 | database | source:indice-carregar |
| snapshot | data/snapshot | database |
| local | data/local (git) | database |
| browser > ponte | fetch | emphasis |
| ponte > claude | traduzir | dashed |
| ponte > server | stdio | emphasis |
| desktop > server | stdio |
| server > citacoes | verificar |
| server > indice | buscar, ler |
| server > local | git commit |
| indice > snapshot | lê .md |
| indice > local | lê .md |

@steps id=mapa-passos
| s-desktop | Claude Desktop | Um cliente MCP comum. Inicia o servidor pelo comando do arquivo de configuração. | mapa-lawmcp | desktop |
| s-browser | Navegador (app.js) | Página estática. Só chama `/api/estado`, `/api/chat` e `/api/tool`. | mapa-lawmcp | browser |
| s-ponte | Ponte HTTP | Servidor `node:http` na porta 5173 e cliente MCP: inicia `src/server.ts` como processo filho. O roteador por regras escolhe a tool, sem LLM. | mapa-lawmcp | ponte |
| s-claude | Claude (sua conta) | Opcional. `claude -p` com o login do Claude Code, sem tools nem MCP. Troca palavras do dia a dia pelo vocabulário da lei antes da busca. | mapa-lawmcp | claude |
| s-server | LawMCP server.ts | `McpServer` com 9 tools, 2 resources e 4 prompts. Valida as entradas com zod. | mapa-lawmcp | server |
| s-indice | Índice BM25 | Os adaptadores convertem cada fonte em `Norma` na partida. Responde busca, leitura, genealogia e impacto. | mapa-lawmcp | indice |
| s-local | data/local (git) | Normas privadas em `law://local/…`, cada gravação num commit próprio. Bloqueadas na web. | mapa-lawmcp | local |

## Como o servidor MCP sobe e o que ele oferece? {#servidor-mcp}

O cliente inicia o processo e conversa pelo stdin e stdout. O índice começa a carregar como promessa; o stdio conecta na hora e as tools esperam o índice ficar pronto. O stdout é do protocolo: logs só com `console.error`.

@code source=server-main language=ts

@facts
| Tools | 9: 7 de leitura e 2 que gravam em `data/local` |
| Resources | `law://{+caminho}` e `lawmcp://sobre` |
| Prompts | 4: citar, explicar ao cidadão, revisar peça, comparar países |
| Base | 15.162 documentos: br/federal 11.956, br/sp/birigui 654, es 2.552 |
| Carga do índice | Cerca de 3 s com cache de disco; 9 a 14 s a frio |

| Tool | O que faz | Na web |
| --- | --- | --- |
| `listar_jurisdicoes` | Jurisdições, totais e commit de cada fonte | Sim |
| `buscar_normas` | Busca BM25 com filtro por jurisdição, tipo e ano | Sim |
| `ler_norma` | Texto oficial por URI, com genealogia e permalink | Sim |
| `verificar_citacoes` | Confere citações de um texto contra a base | Sim |
| `comparar_jurisdicoes` | Mesmo tema em duas jurisdições | Sim |
| `historico_norma` | Alterações de um artigo ou versões de uma norma privada | Sim |
| `impacto_da_norma` | O que uma lei alterou em outras | Sim |
| `adicionar_norma` | Grava uma norma privada com commit | Não {bad:Bloqueada} |
| `importar_normas` | Importa uma pasta de Markdown | Não {bad:Bloqueada} |

Para usar no Claude Desktop, aponte o comando para o Node 24 e o caminho absoluto do servidor:

```json title="claude_desktop_config.json"
{
  "mcpServers": {
    "lawmcp": {
      "command": "/caminho/do/node24/bin/node",
      "args": ["/caminho/FibonacciHackathon/src/server.ts"]
    }
  }
}
```

## O que acontece quando alguém pergunta no chat da web? {#chamada-web}

Exemplo medido nesta máquina: “qual lei fala sobre bater carro”, modo `auto`, filtro `br`.

@sequence id=chamada-chat title="Uma pergunta no chat, ponta a ponta"
| actor navegador | Navegador | frontend |
| actor ponte | Ponte HTTP | backend |
| actor claude | Claude (sua conta) | external |
| actor lawmcp | LawMCP server.ts | backend |
| actor indice | Índice BM25 | database |
| phase | Partida da ponte, uma vez |
| ponte | lawmcp | spawn + initialize via stdio | emphasis |
| ponte | lawmcp | tools/list |
| lawmcp | ponte | 9 tools | return |
| phase | Uma pergunta |
| navegador | ponte | POST /api/chat | emphasis |
| ponte | claude | claude -p, pergunta no stdin |
| claude | ponte | acidente de trânsito reparar o dano | return |
| ponte | lawmcp | tools/call buscar_normas | emphasis |
| lawmcp | indice | buscar() |
| indice | lawmcp | resultados + permalink | return |
| lawmcp | ponte | JSON em content[0].text | return |
| ponte | navegador | passos + traducao | return |

@steps id=chamada-passos
| c-navegador | Navegador | `enviar()` manda texto, modo e jurisdição para `/api/chat` e mostra os passos que voltam. | chamada-chat | navegador |
| c-ponte | Ponte HTTP | Valida o corpo, roda `rotear()` e, se o plano for `buscar_normas`, pede a tradução antes. | chamada-chat | ponte |
| c-claude | Claude (sua conta) | `claude-haiku-5-5` devolve `{"consulta": "acidente de trânsito reparar o dano"}`. Um número que a pergunta não trouxe invalida a tradução. | chamada-chat | claude |
| c-lawmcp | LawMCP server.ts | Recebe `tools/call` igual a qualquer cliente MCP e responde JSON com o aviso legal. | chamada-chat | lawmcp |
| c-indice | Índice BM25 | Achou o Código Penal Militar (art. 281), o Código Brasileiro de Aeronáutica e o CTB. | chamada-chat | indice |

| Medida nesta máquina | Tempo |
| --- | --- |
| Tradução com o Claude (haiku) | 4 a 6 s; um pico de 17,7 s em 7 medidas |
| `buscar_normas` com tradução | 0,2 a 1 s |
| Claude sem login, com erro ou acima de 30 s | Sem tradução {caution:Volta às regras} |
| Busca sem tradução, “bater carro” | 0 resultados {bad:Sem tradução} |

## Como a ponte decide qual tool chamar? {#roteamento}

@workflow id=decisao-chat title="Decisão dentro de chat()"
| msg | Mensagem chega | frontend |
| plano | rotear() | backend |
| ebusca | É busca? | backend |
| traduz | Claude traduz | external |
| achou | Achou resultados? | backend |
| tool | Tool do plano | backend |
| cadeia | Tem citação válida? | backend |
| segue | ler ou histórico | backend |
| resposta | Devolve passos | frontend |
| msg > plano | |
| plano > ebusca | |
| ebusca > traduz | sim |
| ebusca > tool | não |
| traduz > achou | |
| achou > resposta | sim | emphasis |
| achou > tool | não |
| tool > cadeia | |
| cadeia > segue | sim |
| cadeia > resposta | não |
| segue > resposta | |

| Mensagem no modo auto | Tool | Encadeia |
| --- | --- | --- |
| Contém `law://…` | `ler_norma`, ou `historico_norma` se pedir histórico | Não |
| “o que a Lei 13.467 mudou” | `impacto_da_norma` | Não |
| “compare … no Brasil e na Espanha” | `comparar_jurisdicoes`, sempre BR × ES | Não |
| “art. 49 do CDC” | `verificar_citacoes` | `ler_norma` na 1ª URI válida |
| Citação + “histórico” | `verificar_citacoes` | `historico_norma` |
| Texto longo ou “verifique” | `verificar_citacoes` | Não |
| Qualquer outra coisa | `buscar_normas`, com tradução antes | Não |

@code source=web-chat language=ts

O filtro de jurisdição da tela vence o que o texto sugere: “birigui” no texto vira `br/sp/birigui` só quando o filtro está vazio.[](source:roteador)

## Quais rotas HTTP a ponte expõe? {#rotas-http}

| Rota | Corpo | O que faz |
| --- | --- | --- |
| `GET /api/estado` | nenhum | Lista as tools com `liberada`, as jurisdições e o modelo do tradutor |
| `POST /api/chat` | `texto`, `modo`, `jurisdicao`, `anteriores` | Roteia, traduz se for busca, chama e encadeia tools |
| `POST /api/tool` | `nome`, `args` | Chama uma tool liberada diretamente |
| `GET /*` | nenhum | Arquivos de `web/public/` |

```bash title="Testar a ponte pelo terminal"
npm run web    # http://localhost:5173

curl -s localhost:5173/api/estado

curl -s -X POST localhost:5173/api/chat \
  -H 'content-type: application/json' \
  -d '{"texto":"qual lei fala sobre bater carro","modo":"auto","jurisdicao":"br"}'

curl -s -X POST localhost:5173/api/tool \
  -H 'content-type: application/json' \
  -d '{"nome":"ler_norma","args":{"uri":"law://br/federal/lei-8078-1990/art-49"}}'
```

@code source=web-rotas language=ts

## O que protege a ponte e o que ainda falta? {#limites}

| Proteção | Onde |
| --- | --- |
| Escuta só em `127.0.0.1`, sem autenticação | `listen(PORTA, "127.0.0.1")` |
| `adicionar_norma` e `importar_normas` bloqueadas | Conjunto `BLOQUEADAS` |
| Corpo de até 100.000 caracteres; texto até 50.000 | `MAX_CORPO` e a rota de chat |
| Jurisdição validada por regex | `JURISDICAO` |
| Arquivo estático fora de `public/` recebe 403 | `estatico()` |
| Tradução com número inventado é descartada | `traduzir()` |

@callout level=warning title="Antes de publicar fora da máquina local"
A ponte não tem autenticação nem limite de taxa. Ela só é segura enquanto escuta em `127.0.0.1`.
A tradução usa a assinatura de quem está logado no Claude Code. Para atender outras pessoas, use uma chave de API.
O roteador entende palavras-chave, não perguntas livres. A troca por um modelo com tool use ainda depende de aprovação do time.

## Como rodar e conferir {#checklist}

- [ ] Rode `npm run web` e espere a linha “cliente MCP com 9 tools” no terminal.
- [ ] Abra `http://localhost:5173` e confira “MCP conectado · 15162 docs”.
- [ ] Com o Claude Code logado (`claude auth status`), confira “IA: Claude haiku (sua conta)” no estado; sem login, a busca usa só as regras.
- [ ] Pergunte “art. 49 do CDC” e confira os passos `verificar_citacoes` e `ler_norma` nos bastidores.
- [ ] Chame `adicionar_norma` por `/api/tool` e confira o erro “bloqueada na web”.
