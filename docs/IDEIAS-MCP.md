# LawMCP: brainstorm e plano do hackathon

> Estado: ideia **convergida** no brainstorm de 2026-11-19 (João Matheus + Claude).
> O que está em **Decidido** foi confirmado pelo time. O resto é recomendação.

## 1. A ideia em uma frase

**Um único servidor MCP para consultar, citar e verificar a lei de qualquer jurisdição** (país, estado, município, distrito; lei, decreto, portaria…), com fonte, vigência e histórico em cada resposta. Qualquer agente de IA (Claude, Cursor, OpenBot, plataformas jurídicas) pluga e para de alucinar lei.

## Ordem de entrega

> **A entrega 1 é o MCP.** Nada de front, landing ou pitch antes de o LawMCP responder às tools P0 no Claude Desktop via stdio.

1. **Entrega 1, o MCP (obrigatória):** servidor stdio com as tools **P0** sobre as 3 jurisdições da demo, contrato em `src/types.ts`, `data:fetch` e config pronta para o Claude Desktop. Pronto = funciona ponta a ponta no Claude Desktop.
2. **Entrega 2, extras do MCP:** tools **P1** (`adicionar_norma`, `historico_norma`), resources, prompts e testes em outros clientes (Cursor, OpenBot).
3. **Entrega 3, o resto:** página mínima, chat ou painel básico, pitch e polimento.

> **Status em 2026-11-19:** a entrega 1 está implementada e verificada por testes (incluindo um ponta a ponta via stdio). Falta o checkpoint no Claude Desktop. Como rodar: [README](../README.md).

## 2. Decidido

| Tema | Decisão |
|---|---|
| Nome | **LawMCP** |
| Foco | A integração via MCP é o produto. Front e painéis são mínimos |
| Público | Advogados e escritórios (nicho principal), cidadãos, empresas e compliance, devs e plataformas que integram o MCP. B2B e B2C |
| Visão | Global: qualquer país e esfera, qualquer tipo de norma |
| Demo | **BR federal + 1 município + Espanha**, com a possibilidade de **adicionar normas** |
| Transporte | **Só local (stdio)** |
| Tempo e time | **3 horas**, 3 devs com agentes de IA, divididos em MCP, back/dados e infra/front |

## 3. Por que MCP

- Um LLM sozinho inventa artigos e cita redação revogada. O LawMCP devolve **texto oficial com URI, fonte e data**.
- **B2C:** o cidadão pergunta no assistente que já usa, e o assistente consulta o LawMCP.
- **B2B:** escritórios e plataformas plugam o LawMCP no próprio agente e **adicionam normas próprias** (convenções coletivas, regimentos, normas internas).
- O git como linha do tempo vira um diferencial: "qual lei mudou este artigo e quando" sai de `git log` e `git blame`.

## 4. Fontes de dados (levantadas em 2026-11-19 via API do GitHub)

| Jurisdição | Repo | Formato | Observação |
|---|---|---|---|
| 🇧🇷 Federal | [Evaldoes/legislacao-br](https://github.com/Evaldoes/legislacao-br) | **1 arquivo por artigo**, frontmatter (`id`, `norma`, `artigo`, `hierarquia`, `fonte`, `revogado`) | 1,5 MB, CC0. CF/88, CLT, CDC, ECA e Inquilinato. **Ideal para a demo** |
| 🇧🇷 Federal (amplo) | [ctresb/leis](https://github.com/ctresb/leis) `federal/` | 1 arquivo por norma | 8,6 GB no GitHub. Só com sparse-checkout |
| 🇧🇷 Município | [ctresb/leis](https://github.com/ctresb/leis) `municipais/SP/birigui/` | 1 arquivo por norma | **Birigui** tem leis ordinárias, complementares, decretos e resoluções. A capital paulista só tem a lei orgânica e decretos de 2026 |
| 🇪🇸 Espanha | [legalize-dev/legalize-es](https://github.com/legalize-dev/legalize-es) `es/` e `es-an`… | 1 arquivo por norma, frontmatter rico (`title`, `identifier`, `rank`, `status`, `source` ELI, `publication_date`) | 3,8 GB, atualizado diariamente. Tem também as 17 comunidades autônomas |
| 🇺🇸 EUA (futuro) | [lexifina](https://github.com/lexifina) | 1 arquivo por dispositivo, commit = lei | **Atenção: um repositório por estado** (`united-states-california-law`, `-texas-law`, `-florida-law`…), além do federal `united-states-law` e de repositórios de jurisprudência |
| 🌍 Outros | lexifina (Reino Unido, Quênia, Gana…), [legalize-br](https://github.com/danalec/legalize-br) (mesmo formato do legalize-es) | — | Para o pitch "global" |

**Regra:** nunca clonar repositório inteiro. Usar `git clone --filter=blob:none --sparse` e puxar só as pastas da demo.

## 5. Modelo unificado (o coração do "global")

Cada adaptador converte a sua fonte para o mesmo formato:

```ts
type Norma = {
  uri: string;            // law://br/federal/lei-8078-1990/art-49 · law://br/sp/birigui/lei/1234 · law://es/BOE-A-1978-31229
  jurisdicao: string;     // "br" | "br/sp/birigui" | "es" | "es/an" | "us/ca" …
  tipo: string;           // lei, decreto, portaria, resolução, decreto…
  titulo: string;
  numero?: string;
  data?: string;          // ISO; data real (pré-1970 vem do frontmatter, não do commit)
  situacao?: "vigente" | "revogada" | "desconhecida";
  fonte: string;          // URL oficial
  texto: string;          // Markdown
  origem: { repo: string; caminho: string; commit?: string };
};
```

Adicionar um país ou município = escrever **um adaptador** (frontmatter da fonte → `Norma`).

## 6. Superfície MCP (proposta)

**Tools**
| Tool | O que faz | Prioridade |
|---|---|---|
| `listar_jurisdicoes` | Árvore de jurisdições e tipos disponíveis | P0 |
| `buscar_normas` | Busca textual com filtros (jurisdição, tipo, ano) | P0 |
| `ler_norma` | Texto por URI (norma ou artigo), com fonte e vigência | P0 |
| `verificar_citacoes` | Recebe um texto e marca cada citação como ok, revogada, inexistente ou divergente | P0 (diferencial) |
| `adicionar_norma` | Salva uma norma nova (Markdown + frontmatter) e cria um commit, para normas próprias de escritórios e empresas | P1 |
| `historico_norma` | `git log` da norma ou artigo (quem mudou e quando) | P1 |

**Resources:** `law://{jurisdicao}/{id}[/art-N]`
**Prompts:** `responder_com_citacao` (B2B/advogado) e `explicar_para_cidadao` (B2C, linguagem simples + aviso)

**Regras:** somente leitura, exceto `adicionar_norma`. Validar a URI (sem path traversal). Limitar o tamanho das respostas. Todo retorno leva `fonte` e o aviso "não substitui o diário oficial nem aconselhamento jurídico".

## 7. Arquitetura (3h, stdio)

```
Claude Desktop · Cursor · OpenBot ──stdio──▶ LawMCP (TS, @modelcontextprotocol/sdk)
                                               ├─ tools / resources / prompts
                                               ├─ índice em memória (busca)
                                               └─ adaptadores ─▶ data/ (sparse clones + normas adicionadas)
```

- **Busca:** índice em memória na carga (simples e suficiente para a demo). SQLite FTS5 fica para depois.
- **Setup:** `npm run data:fetch` faz os sparse clones. `npm run mcp` sobe o stdio.
- **Integração:** um snippet `mcpServers` pronto no README para Claude Desktop, Cursor e OpenBot. Testar com o MCP Inspector.

## 8. Divisão de tarefas (3 devs + agentes)

Checklist do que cada dev faz agora: [ROADMAP.md](ROADMAP.md).

| Quem | Entrega |
|---|---|
| **Dev 1: MCP** | Entrega 1: servidor stdio e tools P0 com schemas. Depois: resources, prompts e tools P1 |
| **Dev 2: Back/dados** | Adaptadores (legislacao-br, ctresb Birigui, legalize-es), índice de busca, `verificar_citacoes`, `adicionar_norma` |
| **Dev 3: Infra → front/pitch** | Entrega 1: `data:fetch` (sparse clone), scripts npm, config do Claude Desktop e testes no MCP Inspector. **Só depois da entrega 1:** página mínima, roteiro e ensaio da demo |

**Cronograma**
- 0:00–0:15: ler o contrato em `src/types.ts` (já criado) e dividir as tarefas.
- 0:15–1:45: **entrega 1**. Todos no MCP: tools P0, adaptadores e `data:fetch`.
- 1:45: **checkpoint**. O LawMCP responde no Claude Desktop? Se não, todos param o resto e fecham a entrega 1.
- 1:45–2:30: entrega 2 (tools P1, outros clientes MCP).
- 2:30–3:00: entrega 3 (página mínima, ensaio e pitch).

## 9. Roteiro de demo (3 min)

1. O problema: o assistente sem MCP inventa um artigo de lei.
2. Plugamos o LawMCP e repetimos a pergunta: a resposta vem com o artigo, a fonte e a vigência.
3. Uma mesma pergunta em **três jurisdições** (federal, Birigui e Espanha) prova que funciona para qualquer lugar.
4. `verificar_citacoes` pega uma citação falsa num parecer gerado por IA.
5. `adicionar_norma`: o escritório adiciona uma norma interna e ela já aparece na busca, com commit.
6. Fechamento: "plugue em qualquer agente". Mostrar o mesmo servidor no Cursor ou no OpenBot.

## 10. Em aberto

- Município da demo: **Birigui (recomendado)** ou outro com leis ordinárias no ctresb.
- OpenBot: confirmar qual cliente é e se ele suporta MCP via stdio.
- Critérios de avaliação do hackathon e MCPs ou APIs de patrocinadores.
- Modelo de negócio (pitch): B2C gratuito; B2B por assinatura com normas privadas, SLA e jurisdições extras.
