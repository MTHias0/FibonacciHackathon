# Ideias: legislação versionada em git + MCP

> **Estado:** brainstorm. Nada aqui é decisão aprovada, exceto o que está marcado como **fato** no item 1.
> Pesquisa e redação: Claude, a pedido de João Matheus, em 2026-11-19.
> Objetivo: dar ao time o contexto inicial para escolher o projeto do hackathon.

## Sumário

1. [Fatos confirmados](#1-fatos-confirmados)
2. [A ideia de origem: lei como código](#2-a-ideia-de-origem-lei-como-código)
3. [Por que isso combina com MCP](#3-por-que-isso-combina-com-mcp)
4. [Panorama: o que já existe](#4-panorama-o-que-já-existe)
5. [Ideias de produto](#5-ideias-de-produto)
6. [Arquitetura MCP proposta](#6-arquitetura-mcp-proposta)
7. [Recomendação de MVP para o hackathon](#7-recomendação-de-mvp-para-o-hackathon)
8. [Riscos e perguntas em aberto](#8-riscos-e-perguntas-em-aberto)
9. [Fontes](#9-fontes)

---

## 1. Fatos confirmados

- O tema central do hackathon é **integração via MCP (Model Context Protocol)**. Desde o início, o projeto deve ser pensado como servidores e clientes MCP.
- O ponto de partida das ideias é o repositório [ctresb/leis](https://github.com/ctresb/leis) e outros que seguem a mesma linha.
- A base do repositório é TypeScript estrito, Node.js 24 ou superior e ESM (ver `AGENTS.md`).

Todo o resto deste documento é proposta.

## 2. A ideia de origem: lei como código

O [ctresb/leis](https://github.com/ctresb/leis) organiza a legislação brasileira assim:

- **Um arquivo Markdown por norma**, com cabeçalho YAML (`titulo`, `tipo`, `numero`, `data`, `ementa`, `situacao`, `revogada`, `fonte`…).
- **O histórico do git funciona como linha do tempo legislativa.** São 323.851 commits, um por norma, em ordem cronológica desde 1822. Cada commit é atribuído ao signatário da norma (5.414 autores).
- **Abrange todo o ordenamento:** federal, estadual, municipal, reguladores (CONTRAN, ANVISA, RFB, CMN…), jurisprudência vinculante e tratados.
- Os textos são atos oficiais, sem proteção autoral (Lei 9.610/98, art. 8º, I). Os scripts estão sob MIT.
- Limitações declaradas: erros de OCR, lacunas em alguns estados (RJ, MG…) e cerca de 134 GB em disco.

A sacada é que **as perguntas que um advogado faz sobre uma lei viram comandos git**:

| Pergunta jurídica | Primitiva git |
|---|---|
| Qual lei escreveu esta frase? | `git blame` |
| Como era este artigo em 2015? | `git show <commit-em-2015>:arquivo` |
| O que mudou entre duas datas? | `git diff` |
| Qual é a história deste artigo? | `git log --follow` |
| Quem assinou? | autor do commit |

## 3. Por que isso combina com MCP

Um LLM sozinho **alucina legislação**: inventa artigos, cita redação revogada e não sabe o que mudou depois do corte de treino. O MCP resolve isso dando ao modelo **ferramentas** para consultar uma fonte versionada e citável no momento da pergunta.

- **Tools** (o modelo chama): buscar norma, ler artigo, texto em vigor numa data, diff, blame.
- **Resources** (o cliente anexa como contexto): `lei://federal/lei/8078/art-49`, com URI estável e citável.
- **Prompts** (fluxos prontos): "explique este artigo", "compare versões", "verifique as citações deste texto".
- **Composição:** o mesmo cliente (Claude Desktop, Claude Code, Cursor, um agente próprio) liga o nosso MCP de leis a outros MCPs (GitHub, Drive, Slack, calendário). É essa integração que o hackathon valoriza.

O diferencial é que **cada resposta sai com fonte, data de vigência e commit**. Isso é auditável.

## 4. Panorama: o que já existe

### 4.1 Brasil

| Repo | Escopo | Granularidade | Commit = | Destaque |
|---|---|---|---|---|
| [ctresb/leis](https://github.com/ctresb/leis) | Todo o ordenamento (federal, estadual, municipal, reguladores, jurisprudência) | 1 arquivo por norma | surgimento da norma, autor = signatário | O mais amplo. Pesado (cerca de 134 GB) |
| [danalec/legalize-br](https://github.com/danalec/legalize-br) | Federal, 1988–2026, cerca de 198 mil normas | 1 arquivo por norma | publicação no DOU | Formato Legalize (o mesmo da Espanha). Sem scripts publicados |
| [Evaldoes/legislacao-br](https://github.com/Evaldoes/legislacao-br) | Federal em vigor: CF, CLT, CDC, ECA e Inquilinato | **1 arquivo por artigo** | uma mudança de texto | `git blame` útil, CI, atualização semanal via PR, CC0. Só 5 leis |
| [LawCodex/br](https://github.com/LawCodex/br) | Federal compilada do Planalto | — | — | Só o texto em vigor (descarta o riscado) |

Comparação resumida:
- **ctresb**: amplitude e cronologia. Responde "o que existe e quando surgiu".
- **legalize-br**: dataset federal leve e padronizado internacionalmente.
- **legislacao-br**: profundidade por artigo. Responde "o que mudou neste inciso e por quê".

### 4.2 Outros países (mesma ideia)

- [lexifina/global-law](https://github.com/lexifina/global-law): vários países num único histórico, cada país num submódulo ([EUA](https://github.com/lexifina/united-states-law), [Reino Unido](https://github.com/lexifina/united-kingdom-law), Quênia, Gana, Tanzânia, Líbano). Inclui **jurisprudência** com um commit por decisão ([exemplo](https://github.com/lexifina/united-states-ca1-caselaw)).
- [legalize-dev/legalize-es](https://github.com/legalize-dev/legalize-es): Espanha, a partir da API do BOE, padrão ELI, leis nacionais e autonômicas.
- [Legilibre/Archeo-Lex](https://github.com/Legilibre/Archeo-Lex): França, o pioneiro.
- [bundestag/gesetze](https://github.com/bundestag/gesetze): Alemanha (BundesGit, não oficial).
- [Kohei-Wada/houritsu](https://github.com/Kohei-Wada/houritsu): Japão, via API do e-Gov.
- [indiavotes/india-law](https://github.com/indiavotes/india-law): Índia.
- [DCCouncil](https://github.com/DCCouncil): Washington DC, onde o **GitHub é a fonte oficial** da lei.
- Constituições com uma emenda por commit: [EUA](https://github.com/anthonygarvan/theconstitution), [Índia](https://github.com/vijaya22/constitution-history), [Peru](https://github.com/Duvet05/Constitucion-Politica-del-Peru).

### 4.3 Mesma ideia em outros temas

- [Open Terms Archive](https://github.com/OpenTermsArchive/contrib-versions): termos de uso e políticas de privacidade coletados todo dia, com cada mudança virando um commit.
- **Git scraping** (técnica popularizada por Simon Willison): um GitHub Action baixa um dado público periodicamente e commita só a diferença.
- **Querido Diário** (Open Knowledge Brasil): diários oficiais municipais com API pública. *A confirmar se a API atende ao nosso uso.*

## 5. Ideias de produto

Cada ideia já vem descrita pelas suas peças MCP. As estrelas (★) indicam a aderência estimada ao tema do hackathon.

### A. LexMCP: servidor MCP da legislação brasileira ★★★
O núcleo de quase todas as outras ideias.
- **Tools:** `buscar_normas`, `ler_artigo`, `texto_em_vigor_em(norma, data)`, `historico_artigo`, `quem_alterou(trecho)` (blame), `diff_entre_datas`, `normas_relacionadas`.
- **Resources:** `lei://{esfera}/{tipo}/{numero}[/art-N]`.
- **Prompts:** `explicar_artigo`, `comparar_versoes`, `linha_do_tempo`.
- **Demo:** no Claude Desktop, "o art. 49 do CDC mudou desde 2010? Mostre o diff e a lei que alterou".

### B. Verificador de citações jurídicas (anti-alucinação) ★★★
Recebe um texto (petição, parecer, resposta de IA) e confere cada citação: o artigo existe? Está em vigor? A redação citada bate com a oficial?
- **Tool:** `verificar_citacoes(texto)`, que devolve um relatório por citação (ok, revogada, inexistente ou redação divergente).
- **Pitch:** um "linter" jurídico para textos gerados por IA.

### C. Radar de mudanças (compliance) ★★☆
Monitora normas de interesse (CLT, LGPD, resoluções do Bacen/CVM) e avisa o que mudou, com o diff.
- **Tools:** `assinar_normas`, `mudancas_desde(data)`.
- **Composição MCP:** gera uma issue no GitHub, uma mensagem no Slack ou um evento no calendário quando há vigência futura.
- **Coleta:** git scraping, com um Action semanal no estilo do legislacao-br.

### D. Explicador cidadão em linguagem simples ★★☆
Uma pessoa pergunta "posso devolver um produto comprado online?" e recebe uma resposta simples **com o artigo e o link oficial**.
- Usa o LexMCP por baixo. O canal pode ser web ou WhatsApp.
- Cuidado: precisa de um aviso claro de que não substitui um advogado.

### E. Direito comparado ★★☆
Com o formato Legalize (Brasil e Espanha) e o lexifina, comparar temas entre países, por exemplo "como cada país regula o direito de arrependimento".
- **Tool:** `comparar_paises(tema, paises[])`.

### F. Diários oficiais municipais + MCP ★★☆
O MCP consulta os diários municipais (Querido Diário) para licitações, nomeações e leis locais. Combina com o LexMCP para a parte municipal.

### G. Termos de uso brasileiros versionados ★☆☆
Um "Open Terms Archive BR" para apps brasileiros (bancos, gov.br, delivery), mais um MCP: "o que mudou na política de privacidade do app X?". Conecta com a LGPD do LexMCP.

### H. Visualizações: "git blame da Constituição" ★☆☆
Linha do tempo interativa (quem alterou o quê e quando), alimentada pelas mesmas tools. Boa para a demo visual do pitch.

### I. Copiloto regulatório setorial ★★☆
Recorte de reguladores (ANVISA, CONTRAN, Bacen) para um público específico, por exemplo fintechs: "quais resoluções do CMN afetam o Pix este ano?".

## 6. Arquitetura MCP proposta

```
┌──────────────────────┐      MCP (stdio / Streamable HTTP)      ┌──────────────────────────┐
│ Cliente MCP          │ ───────────────────────────────────────▶│ LexMCP (TypeScript)      │
│ Claude Desktop/Code, │   tools · resources · prompts           │  ├─ camada de busca      │
│ Cursor, agente nosso │                                         │  │   (SQLite FTS5)       │
└──────────┬───────────┘                                         │  ├─ camada git           │
           │ outros MCPs                                         │  │   (log/show/diff/blame)│
           ▼                                                     │  └─ normalizador de URI  │
  GitHub · Slack · Drive · Querido Diário                        └────────────┬─────────────┘
                                                                              │ leitura
                                                                 ┌────────────▼─────────────┐
                                                                 │ Dados: clone parcial de  │
                                                                 │ legislacao-br / ctresb   │
                                                                 └──────────────────────────┘
```

**Escolhas propostas (a validar com o time):**
- **SDK:** `@modelcontextprotocol/sdk` em TypeScript, que encaixa na base atual do repo.
- **Transportes:** `stdio` para rodar local no Claude Desktop e Code. `Streamable HTTP` se a demo for remota.
- **Dados:** **não** clonar o ctresb inteiro (134 GB). Usar `git clone --filter=blob:none` com sparse-checkout só das pastas da demo (ex.: `constituicao.md` e algumas leis federais), ou o legislacao-br, que é pequeno e granular por artigo.
- **Índice:** SQLite com FTS5 sobre frontmatter e corpo, para a busca. O git fica para o histórico (`log`, `show`, `diff`, `blame`).
- **Identificador:** um URI próprio (`lei://...`) mapeado para o caminho do arquivo. Avaliar usar URN LexML onde existir.
- **Segurança:** servidor **somente leitura**, validação dos parâmetros (nada de path traversal no caminho da norma), limite de tamanho nas respostas, `fonte` e aviso de "não substitui o Diário Oficial" em toda resposta.

**Esboço das tools (contratos):**

| Tool | Entrada | Saída |
|---|---|---|
| `buscar_normas` | `consulta`, `esfera?`, `tipo?`, `ano?`, `limite?` | lista de `{uri, titulo, ementa, situacao}` |
| `ler_artigo` | `uri`, `data?` | texto, vigência, fonte, commit |
| `historico_artigo` | `uri` | lista de `{data, norma_alteradora, commit}` |
| `diff_entre_datas` | `uri`, `de`, `ate` | diff unificado e normas responsáveis |
| `quem_alterou` | `uri`, `trecho` | norma e commit que introduziram o trecho |
| `verificar_citacoes` | `texto` | relatório por citação |

## 7. Recomendação de MVP para o hackathon

**Recomendação (não decidida): A + B, com uma pitada de C.**

1. **LexMCP** com 4 tools (`buscar_normas`, `ler_artigo`, `historico_artigo`, `diff_entre_datas`) sobre um recorte pequeno: CF/88, CDC, CLT e LGPD.
2. **Verificador de citações** como "killer feature" da demo: colar uma resposta de IA com um artigo inventado e mostrar o LexMCP apontando o erro.
3. **Integração com outro MCP** (ex.: GitHub ou Slack) para mostrar composição: "abra uma issue com as mudanças da CLT desde janeiro".

**Roteiro de demo (cerca de 3 min):**
1. O problema: um LLM inventando um artigo de lei.
2. O mesmo pedido com o LexMCP ligado: resposta com fonte e commit.
3. "Como era esse artigo em 2017?" seguido de um diff da Reforma Trabalhista.
4. O verificador marcando a citação falsa.
5. Composição: o radar gera uma issue ou mensagem automaticamente.

**Divisão sugerida (4 pessoas):**
- Dados: clone parcial, parser do frontmatter e índice SQLite.
- Servidor MCP: tools, resources, validação e testes.
- Verificador de citações: regex de citação, normalização e comparação.
- Demo, pitch e integração com outro MCP.

## 8. Riscos e perguntas em aberto

**Perguntas para o time / organização:**
- Quais são as regras e os critérios de avaliação do hackathon? Exige um cliente próprio ou um servidor MCP basta?
- Qual é o prazo e quantas pessoas há no time?
- Haverá MCPs ou APIs de patrocinadores que precisamos integrar?
- Demo local (stdio) ou hospedada (HTTP)?
- Qual fonte de dados usar: legislacao-br (por artigo, pequeno), ctresb (amplo, pesado) ou um mix?

**Riscos técnicos:**
- **Tamanho:** o ctresb é inviável de clonar inteiro. É preciso um recorte.
- **Qualidade:** o OCR e as conversões automáticas têm erros. É preciso exibir sempre a fonte oficial.
- **Datas antes de 1970:** o git não as representa, então a data real fica no frontmatter e na mensagem do commit. As tools devem ler a data dali, não do commit.
- **Granularidade:** sem um arquivo por artigo (ctresb, legalize-br), o "histórico de um artigo" exige parsear a norma inteira.
- **Responsabilidade:** não é aconselhamento jurídico. Mostrar o aviso sempre.
- **Licença:** os textos são atos oficiais e os scripts têm licenças variadas (MIT, BSD-3, CC0). Citar e respeitar as licenças.

## 9. Fontes

Pesquisa feita em 2026-11-19, a partir dos READMEs e páginas do GitHub. Nenhum repositório foi clonado ou auditado.

- https://github.com/ctresb/leis
- https://github.com/danalec/legalize-br
- https://github.com/Evaldoes/legislacao-br
- https://github.com/LawCodex/br
- https://github.com/lexifina/global-law
- https://github.com/legalize-dev/legalize-es
- https://github.com/Legilibre/Archeo-Lex
- https://github.com/bundestag/gesetze
- https://github.com/Kohei-Wada/houritsu
- https://github.com/indiavotes/india-law
- https://github.com/DCCouncil
- https://github.com/OpenTermsArchive/contrib-versions
- https://docs.opentermsarchive.org/navigate-history/
- https://stefanwehrmeyer.com/blog/2012/08/07/bundesgit/
- https://www.xataka.com/aplicaciones/alguien-ha-cogido-12-000-leyes-espanolas-ha-pasado-a-codigo-fuente-autentica-joya-para-buscar-legislacion
