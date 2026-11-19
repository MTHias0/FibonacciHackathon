# Roadmap por dev

O que cada dev faz, antes e depois do MCP v2 (que já está na `main`).
A divisão segue a §8 de [IDEIAS-MCP.md](IDEIAS-MCP.md). Ao terminar um item, marque `[x]` aqui e anote em [CONTEXTO.md](../CONTEXTO.md).

## O MCP v2 chegou na main

Dê `git pull`, rode `npm ci && npm test` e siga a parte "Depois do MCP v2" do seu bloco. `src/` está liberado, mas `src/types.ts` (o contrato) continua sendo combinado com o time antes de mudar.
Trabalho novo segue em pastas próprias: `web/` (front) e `docs/` (pitch, casos de teste, pesquisa).

## O que o MCP v2 trouxe

| Tool | Para quê |
|---|---|
| `listar_jurisdicoes` | O que está carregado, com o commit de cada fonte |
| `buscar_normas` | Busca com ranking BM25 (o artigo certo aparece primeiro) |
| `ler_norma` | Norma, artigo **ou dispositivo**: `law://br/federal/constituicao-1988/art-5/inc-13` |
| `verificar_citacoes` | Listas ("arts. 5º e 7º"), incisos e § ("art. 7º, XIII, da CF"), "CF, art. 5º", Código Civil BR × ES |
| `historico_norma` | Genealogia: quem alterou cada dispositivo ("Redação dada pela Lei nº 13.467/2017") |
| `impacto_da_norma` | "O que a Reforma Trabalhista mudou?" em uma chamada |
| `comparar_jurisdicoes` | O mesmo tema no Brasil e na Espanha, lado a lado |
| `adicionar_norma` | Norma privada de escritório ou empresa, versionada em git local (B2B) |

Também vieram resources `law://…` e prompts prontos (`responder_com_citacao`, `explicar_para_cidadao`, `revisar_peca`, `comparar_paises`). Toda resposta traz **permalink por commit**: a "lei com recibo".
A base passou de 5 para 43 normas federais: CF, códigos (CC, CPC, CP, CPP, CTN, CTB…) e leis-chave (LGPD, Marco Civil, Licitações, Maria da Penha, Reforma Trabalhista…).

---

## Dev 1: MCP e integração com clientes

**Agora**
- [x] Instalar e configurar o Claude Desktop com o LawMCP atual (config no README) e rodar as perguntas de teste. Anotar onde a IA escolheu a tool errada.
  - Passo a passo, macOS:
    1. Instalar o app: baixar em https://claude.ai/download, ou rodar `brew install --cask claude`. Abrir e fazer login.
    2. No projeto, rodar `npm ci` e `npm test`. Depois rodar `which node` para descobrir o caminho absoluto do Node 24. O app não carrega o `nvm`, então sem caminho absoluto ele usaria um Node antigo.
    3. No app, abrir **Settings › Developer › Edit Config**. Isso abre `~/Library/Application Support/Claude/claude_desktop_config.json`.
    4. **Não colar um segundo objeto `{...}` no arquivo.** Isso gerou erro de JSON. O certo é acrescentar a chave `mcpServers` dentro do objeto que já existe, mantendo `preferences` e o resto:
       ```json
       "mcpServers": {
         "lawmcp": {
           "command": "/caminho/absoluto/do/node24",
           "args": ["/caminho/absoluto/do/FibonacciHackathon/src/server.ts"]
         }
       }
       ```
       Fizemos o merge por script, depois de um backup em `claude_desktop_config.json.bak`.
    5. Fechar o app com **Cmd+Q** e abrir de novo; fechar só a janela não basta. Conferir se o `lawmcp` aparece conectado em **Settings › Developer**.
    6. Se der erro, o log fica em `~/Library/Logs/Claude/mcp-server-lawmcp.log`.
    7. Depois de cada `git pull`, basta reiniciar o app (Cmd+Q), porque a config aponta para `src/server.ts`.
  - Resultado em 2026-11-19, com o MCP v1: as 4 perguntas do README responderam com texto, fonte e vigência.
    - Na 1ª rodada, depois de marcar o "art. 999 do CDC" como inexistente, a IA citou o art. 42 de memória, sem chamar `ler_norma`. Na 2ª rodada conferiu na base. Isso fica para a revisão das descrições.
  - Os chats normais ficam salvos na conta e aparecem em outros computadores. A config do MCP é local. Use chat anônimo nos testes.
- [x] Descobrir o que é exatamente o "OpenBot" que vamos usar e se ele aceita servidor MCP via **stdio**. Se só aceitar HTTP, avisar o time na hora: isso muda a infra.
  - Configurado em 2026-11-19, por um colega, em outro computador.
  - **A preencher por quem configurou:** o que é o OpenBot (link ou versão), o transporte usado (stdio ou HTTP), o arquivo de config com o snippet `mcpServers`, o passo a passo e as perguntas testadas.
- [x] Testar o servidor no MCP Inspector (`npx @modelcontextprotocol/inspector node src/server.ts`).
  - O que é: a ferramenta oficial de teste do MCP. Funciona como um cliente sem IA, em que você chama cada tool à mão e vê o JSON cru que a IA receberia. Não precisa instalar nem ter conta, porque o `npx` baixa na hora. Se funciona no Inspector mas a IA erra, o problema está na descrição da tool, não no código.
  - Passo a passo da interface web:
    1. Na raiz do projeto, rodar `npx @modelcontextprotocol/inspector node src/server.ts`.
    2. Abrir a URL que aparece no terminal, com o `MCP_PROXY_AUTH_TOKEN`.
    3. Conferir se o Transport é STDIO, o Command é `node` e o Argument é `src/server.ts`. Clicar em **Connect**. Se der erro de Node, use o caminho absoluto do Node 24 no Command.
    4. Ir em **Tools › List Tools** e rodar, por exemplo, `ler_norma` com `law://br/federal/lei-8078-1990/art-49`.
    5. Encerrar com **Ctrl+C**.
  - Passo a passo do modo CLI, para testes automatizáveis:
    - Listar: `npx @modelcontextprotocol/inspector --cli node src/server.ts --method tools/list`. Também vale com `resources/list` e `prompts/list`.
    - Chamar uma tool: `npx @modelcontextprotocol/inspector --cli node src/server.ts --method tools/call --tool-name ler_norma --tool-arg uri=law://br/federal/lei-8078-1990/art-49`.
    - Tools que gravam: acrescentar `-e LAWMCP_LOCAL=/pasta/temporaria` antes de `node`, para não sujar `data/local/`.
  - Resultado em 2026-11-19, depois do commit `27bd02d`:
    - Interface web: conectou, e `ler_norma` do art. 49 do CDC trouxe texto, fonte, vigência e permalink.
    - Modo CLI: 9 tools, 704 resources e 4 prompts. Rodamos 17 chamadas, cobrindo todas as tools, e todas responderam.
    - `adicionar_norma` e `importar_normas`: commits, nova versão e reimportação sem mudanças funcionaram.
    - Entradas inválidas (`../hack`, pasta inexistente, `law://../../etc/passwd`) foram recusadas.
  - Erro: `comparar_jurisdicoes` com "igualdade perante a lei" não traz o art. 5º da CF no Brasil. Vêm Licitações art. 80, Propriedade Industrial art. 4º e Liberdade Econômica art. 2º. A pergunta foi trocada no roteiro de demo.
  - Cosmético:
    - O `texto` traz âncoras HTML (`<a id="par-unico"></a>`).
    - Um arquivo importado sem frontmatter recebe como título o nome do arquivo ("reembolso").
  - A resposta em JSON cru é esperada. Quem formata é a IA no cliente ou o front.
- [x] Escrever o roteiro de demo em `docs/DEMO.md`: 5 perguntas, a tool que cada uma deve acionar e a resposta esperada.
  - Como foi feito:
    1. Partimos do §9 de `IDEIAS-MCP.md` (problema, recibo, várias jurisdições, verificador, B2B).
    2. Para cada pergunta, testamos no Inspector (`--cli`) a tool e os argumentos que a IA deve usar.
    3. Comparação BR × ES: testamos 4 temas e ficamos com "horas extras" (CLT arts. 59 e 59-B × Estatuto de los Trabajadores arts. 35 e 36), que também conversa com a pergunta da Reforma Trabalhista.
    4. Verificador: montamos um parecer com 4 citações para mostrar os status `ok`, `inexistente` (2) e `revogada` (art. 384 da CLT).
    5. B2B: a política de home office com o apelido PHO, depois a verificação do art. 2º (`ok`) e do art. 5º (`inexistente`).
  - O roteiro inclui um checklist de palco (`rm -rf data/local`, Cmd+Q, chat anônimo, "Allow always") e perguntas de reserva.
  - Falta ensaiar as 5 perguntas no Claude Desktop.

**Depois do MCP v2**
- [ ] Repetir o roteiro de demo no Claude Desktop e no OpenBot.
- [ ] Revisar as descrições das tools: se a IA escolhe a tool errada, a descrição está ruim.
- [ ] Gravar um vídeo curto da demo funcionando, como plano B para o palco.

## Dev 2: dados e verificador

**Agora**
- [x] Montar `docs/CASOS-DE-TESTE.md` com 20 citações reais para o verificador: trechos de petições, respostas de IA com lei inventada, artigo revogado, inciso inexistente e trecho entre aspas alterado. Para cada uma, o status esperado (`ok`, `revogada`, `inexistente`, `divergente`, `fora_da_base`).
- [x] Pesquisar a próxima fonte e registrar em `docs/FONTES-CANDIDATAS.md`: repo, licença, formato do Markdown, se tem histórico e se tem notas de alteração. Prioridades: um estado brasileiro (ex.: SP), outro município do ctresb e um estado dos EUA.
- [x] Conferir 10 artigos aleatórios do snapshot contra o Planalto e o BOE (texto, situação, data).

**Depois do MCP v2**
- [x] Transformar `CASOS-DE-TESTE.md` em testes no `src/lawmcp.test.ts` (toda tool nova precisa de teste).
- [x] Se sobrar tempo, adicionar a fonte candidata: se for ctresb ou Markdown simples, é só uma entrada em `data/snapshot/fontes.json` e `npm run data:fetch -- <pasta>`; outro formato pede um adaptador novo em `FONTES` (`src/dados/adaptadores.ts`).

## Dev 3: front básico e pitch

**Agora**
- [ ] Pitch em `docs/PITCH.md`:
  - problema: a IA inventa lei e o advogado não confia;
  - solução: o LawMCP, a lei com recibo;
  - demo;
  - público: advogados, cidadãos, empresas e devs;
  - modelo B2B e B2C;
  - próximos passos: mais países e estados, HTTP remoto.
- [ ] Front mínimo em `web/`: uma página com caixa de texto e dois botões, "Buscar lei" e "Verificar citações". A resposta aparece com o permalink clicável.
- [ ] Ponte do front com o MCP em `web/servidor.ts`: um servidor Node pequeno que usa o **cliente MCP** do SDK (`StdioClientTransport` iniciando `src/server.ts`) e expõe `POST /api/tool`. Isso também prova o argumento do pitch: qualquer app integra o LawMCP pelo protocolo, sem API própria.

**Depois do MCP v2**
- [ ] Ligar os botões às tools `buscar_normas`, `verificar_citacoes` e `impacto_da_norma`.
- [ ] Slides finais com prints da demo real.

---

## Checkpoints do time

1. **MCP v2 na main:** todo mundo dá `git pull` e roda `npm ci && npm test`.
2. **Demo ponta a ponta no Claude Desktop:** o Dev 1 confirma.
3. **Front e pitch prontos:** ensaio da demo de 3 minutos.
