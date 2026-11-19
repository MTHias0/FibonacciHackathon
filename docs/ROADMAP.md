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
  - Feito em 2026-11-19 com o MCP v1: as 4 perguntas do README responderam com texto, fonte e vigência. Na 1ª rodada, depois de marcar o "art. 999 do CDC" como inexistente, a IA citou o art. 42 de memória sem chamar `ler_norma`. Na 2ª rodada conferiu na base. Ponto para a revisão das descrições.
- [ ] Descobrir o que é exatamente o "OpenBot" que vamos usar e se ele aceita servidor MCP via **stdio**. Se só aceitar HTTP, avisar o time na hora: isso muda a infra.
- [ ] Testar o servidor no MCP Inspector (`npx @modelcontextprotocol/inspector node src/server.ts`) e no Cursor.
  - Parcial: o Inspector em modo CLI (`--cli`) listou as tools e respondeu a `ler_norma`. Faltam a interface web do Inspector e o Cursor (não instalado).
- [ ] Escrever o roteiro de demo em `docs/DEMO.md`: 5 perguntas, a tool que cada uma deve acionar e a resposta esperada.

**Depois do MCP v2**
- [ ] Repetir o roteiro de demo no Claude Desktop e no segundo cliente (OpenBot ou Cursor).
- [ ] Revisar as descrições das tools: se a IA escolhe a tool errada, a descrição está ruim.
- [ ] Gravar um vídeo curto da demo funcionando, como plano B para o palco.

## Dev 2: dados e verificador

**Agora**
- [ ] Montar `docs/CASOS-DE-TESTE.md` com 20 citações reais para o verificador: trechos de petições, respostas de IA com lei inventada, artigo revogado, inciso inexistente e trecho entre aspas alterado. Para cada uma, o status esperado (`ok`, `revogada`, `inexistente`, `divergente`, `fora_da_base`).
- [ ] Pesquisar a próxima fonte e registrar em `docs/FONTES-CANDIDATAS.md`: repo, licença, formato do Markdown, se tem histórico e se tem notas de alteração. Prioridades: um estado brasileiro (ex.: SP), outro município do ctresb e um estado dos EUA.
- [ ] Conferir 10 artigos aleatórios do snapshot contra o Planalto e o BOE (texto, situação, data).

**Depois do MCP v2**
- [ ] Transformar `CASOS-DE-TESTE.md` em testes no `src/lawmcp.test.ts` (toda tool nova precisa de teste).
- [ ] Se sobrar tempo, adicionar a fonte candidata: se for ctresb ou Markdown simples, é só uma entrada em `data/snapshot/fontes.json` e `npm run data:fetch -- <pasta>`; outro formato pede um adaptador novo em `FONTES` (`src/dados/adaptadores.ts`).

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
