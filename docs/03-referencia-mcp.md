# 03. Referência MCP

Tudo o que o servidor `lawmcp` (versão 0.2.0) expõe para um cliente MCP.

## Convenções

- Transporte: stdio. O cliente inicia o processo.
- Cada tool devolve um único bloco de texto com JSON. Respostas com texto legal trazem o campo `aviso`.
- Erros voltam com `isError: true` e uma mensagem que diz o que fazer, por exemplo: "Norma não encontrada: … Use buscar_normas para achar a URI correta."
- As entradas são validadas por schema. URIs precisam seguir `law://jurisdicao/id[/art-N[/inc-N]]` e ter no máximo 300 caracteres.
- Anotações: todas as tools são somente leitura (`readOnlyHint: true`), exceto `adicionar_norma` e `importar_normas`.
- `ler_norma` corta textos acima de 20 mil caracteres (`truncado: true`) e sugere ler artigo por artigo. O resource `law://` corta em 100 mil.

## Tools

| Tool | Para quê |
|---|---|
| [`listar_jurisdicoes`](#listar_jurisdicoes) | O que está carregado |
| [`buscar_normas`](#buscar_normas) | Busca por palavras-chave |
| [`ler_norma`](#ler_norma) | Texto de norma, artigo ou dispositivo |
| [`verificar_citacoes`](#verificar_citacoes) | Confere as citações de um texto |
| [`comparar_jurisdicoes`](#comparar_jurisdicoes) | Mesmo tema em várias jurisdições |
| [`historico_norma`](#historico_norma) | Quem alterou e como; versões das normas privadas |
| [`impacto_da_norma`](#impacto_da_norma) | O que uma lei mudou em outras |
| [`adicionar_norma`](#adicionar_norma) | Grava uma norma privada |
| [`importar_normas`](#importar_normas) | Importa uma pasta de normas privadas |

### listar_jurisdicoes

Lista as jurisdições carregadas, os tipos de norma, o total de documentos e o commit de cada fonte. Sem entrada.

```json
{
  "total": 15162,
  "jurisdicoes": [
    { "jurisdicao": "br/federal", "tipos": ["artigo", "código", "constituicao", "decreto-lei", "lei", "lei complementar"], "total": 11956,
      "fontes": [{ "repo": "Evaldoes/legislacao-br", "commit": "9dbcbd37dcf2" }, { "repo": "LawCodex/br", "commit": "e2a0e14bfc5c" }] },
    { "jurisdicao": "br/sp/birigui", "total": 654, "…": "…" },
    { "jurisdicao": "es", "total": 2552, "…": "…" }
  ]
}
```

### buscar_normas

Busca com ranking BM25 em qualquer jurisdição. Escreva a consulta no idioma da jurisdição.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `consulta` | string (1 a 500) | sim | Palavras-chave, ex.: "direito de arrependimento" |
| `jurisdicao` | string | não | Prefixo: `br`, `br/federal`, `br/sp/birigui`, `es`, `local` |
| `tipo` | string | não | Ex.: artigo, código, lei, artículo |
| `ano` | inteiro (1800 a 2100) | não | Ano da norma |
| `limite` | inteiro (1 a 50) | não | Padrão 10 |

Saída: `resultados[]` com `uri`, `jurisdicao`, `tipo`, `titulo`, `data`, `situacao`, `fonte` e `trecho` (recorte com os termos encontrados).

```json
{ "consulta": "direito de arrependimento", "limite": 2 }
→ law://br/federal/lei-10406-2002/art-420  (Art. 420, Código Civil)
→ law://br/federal/lei-8078-1990/art-49    (Art. 49, Código de Defesa do Consumidor)
```

### ler_norma

Lê uma norma, um artigo ou um dispositivo pela URI.

| Campo | Tipo | Obrigatório |
|---|---|---|
| `uri` | URI `law://` | sim |

Saída: a `Norma` completa (sem os apelidos), com `texto`, `situacao`, `fonte`, `alteracoes` e `origem.permalink`, mais `aviso` e, se cortado, `truncado`.

```json
{
  "uri": "law://br/federal/constituicao-1988/art-5/inc-13",
  "tipo": "dispositivo",
  "titulo": "Art. 5º, inciso XIII, Constituição da República Federativa do Brasil de 1988",
  "situacao": "vigente",
  "texto": "… é livre o exercício de qualquer trabalho, ofício ou profissão, atendidas as qualificações profissionais …",
  "origem": {
    "repo": "Evaldoes/legislacao-br",
    "caminho": "normas/constituicao-1988/art-005.md",
    "commit": "9dbcbd37dcf2cdd76479bea53eb0e41f52590cf1",
    "permalink": "https://github.com/Evaldoes/legislacao-br/blob/9dbcbd37dcf2cdd76479bea53eb0e41f52590cf1/normas/constituicao-1988/art-005.md"
  }
}
```

### verificar_citacoes

Confere as citações de lei de um texto até inciso e parágrafo. Como funciona: [06. Verificador de citações](06-verificador-de-citacoes.md).

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `texto` | string (até 50 mil) | sim | Petição, parecer, resposta de IA |
| `jurisdicao` | string | não | Padrão para nomes ambíguos como "Código Civil". Padrão: `br` |

Saída: `citacoes[]` com `citacao`, `status` (`ok`, `revogada`, `inexistente`, `divergente`, `fora_da_base`), `uri`, `detalhe` e `permalink`, mais um `resumo` com a contagem por status.

```json
{
  "citacao": "art. 7º, inciso XCIX, da CF",
  "status": "inexistente",
  "uri": "law://br/federal/constituicao-1988/art-7/inc-99",
  "detalhe": "Constituição da República Federativa do Brasil de 1988: o art. 7º tem incisos I a XXXIV; § 1º, § 2º, § 3º; não há inciso XCIX."
}
```

### comparar_jurisdicoes

Busca o mesmo tema em várias jurisdições lado a lado. Mande a consulta já traduzida para o idioma de cada uma.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `consultas` | lista de 2 a 6 `{ jurisdicao, consulta }` | sim | Ex.: `[{"jurisdicao":"br","consulta":"todos são iguais perante a lei"},{"jurisdicao":"es","consulta":"iguales ante la ley"}]` |
| `limite` | inteiro (1 a 10) | não | Resultados por jurisdição. Padrão 3 |

Saída: `comparacao[]`, uma entrada por consulta, com os `resultados` no formato de `buscar_normas`. No exemplo acima, o primeiro resultado de cada lado é o art. 5º da CF e o artículo 14 da Constitución. Com "igualdade perante a lei", o art. 5º não aparece: é uma limitação da busca ([09](09-decisoes-e-limitacoes.md)).

### historico_norma

Genealogia de uma norma, um artigo ou um dispositivo.

| Campo | Tipo | Obrigatório |
|---|---|---|
| `uri` | URI `law://` | sim |

Saída:

- `alteracoes[]` (artigo ou dispositivo): `dispositivo`, `tipo`, `nota`, `norma`, `rotuloNorma`, `uriDispositivo`.
- `alteradoras[]`: as normas que mais alteraram, com `total` e `naBase` (se a alteradora também está carregada).
- `total`.
- `versoes[]`, só em normas privadas: `commit`, `data`, `mensagem`, `incluidos`, `alterados`, `removidos`, da versão mais nova para a mais antiga.

```json
{
  "uri": "law://br/federal/decreto-lei-5452-1943/art-59",
  "alteracoes": [
    { "dispositivo": "caput", "tipo": "redacao", "nota": "Redação dada pela Lei nº 13.467, de 2017",
      "norma": "law://br/federal/lei-13467-2017", "rotuloNorma": "Lei nº 13.467/2017" }
  ],
  "alteradoras": [
    { "norma": "law://br/federal/lei-13467-2017", "rotulo": "Lei nº 13.467/2017", "total": 6, "naBase": true },
    { "norma": "law://br/federal/medida-provisoria-2164-41-2001", "rotulo": "Medida Provisória nº 2.164-41/2001", "total": 1, "naBase": false }
  ],
  "total": 7
}
```

### impacto_da_norma

Responde "o que esta lei mudou?". Lista os dispositivos da base alterados, incluídos ou revogados por ela, agrupados pela norma alterada.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `norma` | string (2 a 200) | sim | URI, número ("Lei 13.467/2017") ou nome ("Reforma Trabalhista", "LGPD") |
| `limite` | inteiro (1 a 500) | não | Máximo de dispositivos listados. Padrão 100 |

Saída: `norma` (`uri`, `rotulo`, `naBase`), `total` e `porNorma[]` (`uri`, `titulo`, `total`, `dispositivos[]`). Exemplo: "Reforma Trabalhista" → 378 dispositivos da CLT. Quando o total é zero, vem uma `observacao` lembrando que isso não prova que a lei não alterou nada fora da base.

### adicionar_norma

Adiciona ou atualiza uma norma privada em `law://local/{organizacao}/…`. Cada versão vira um commit no git local. Detalhes: [05. Jurisdições próprias](05-jurisdicoes-proprias.md).

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `organizacao` | slug | sim | Ex.: `escritorio-silva` |
| `tipo` | string (2 a 60) | sim | Ex.: política interna, regulamento, contrato-padrão |
| `titulo` | string (3 a 200) | sim | Vira o id: "Política de Home Office" → `politica-de-home-office` |
| `numero` | string | não | |
| `data` | `AAAA-MM-DD` | não | |
| `fonte` | string | sim | URL ou referência do documento original |
| `texto` | string (até 200 mil) | sim | Markdown, com "Art. 1º …" em linhas próprias |
| `apelidos` | lista de até 10 | não | Nomes usados nas citações, ex.: "PHO" |

Saída: `{ uri, commit, artigos, novaVersao }`.

### importar_normas

Importa uma pasta de Markdown do computador para `local/{organizacao}`, num único commit. Reimportar grava só o que mudou.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `organizacao` | slug | sim | Ex.: `escritorio-silva` |
| `pasta` | caminho absoluto | sim | Ex.: `/Users/ana/Documentos/politicas` (aceita `~/`) |
| `tipo` | string | não | Para arquivos sem `tipo` no frontmatter. Padrão: norma interna |
| `fonte` | string | não | Para arquivos sem `fonte` no frontmatter |

Saída: `jurisdicao`, `commit`, `total`, `novas`, `atualizadas`, `inalteradas`, `normas[]` (`uri`, `titulo`, `artigos`, até 100) e `ignorados[]` (`arquivo`, `motivo`).

## Resources

| URI | Conteúdo |
|---|---|
| `law://{+caminho}` | Texto de qualquer norma, artigo ou dispositivo em Markdown, com URI, situação, data, fonte oficial, permalink e aviso. A listagem traz as normas inteiras (cerca de 700). |
| `lawmcp://sobre` | JSON com a cobertura (`listar_jurisdicoes`), o `manifest.json` e o aviso |

## Prompts

| Prompt | Argumentos | O que faz |
|---|---|---|
| `responder_com_citacao` | `pergunta`, `jurisdicao` (opcional) | Responde só com o que foi lido na base, citando URI e permalink, e roda `verificar_citacoes` no texto final |
| `explicar_para_cidadao` | `duvida` | Linguagem simples, exemplo do dia a dia e a lei usada no fim; indica advogado ou Defensoria quando depende do caso |
| `revisar_peca` | `texto` | Tabela com citação, status, problema e correção sugerida |
| `comparar_paises` | `tema`, `jurisdicoes` (opcional, padrão `br, es`) | Traduz a consulta, compara e responde com tabela e um parágrafo de semelhanças e diferenças |

## Instruções do servidor

Enviadas ao cliente na conexão, resumidas:

- Nunca citar lei de memória: achar com `buscar_normas`, ler com `ler_norma` e citar a URI e o permalink.
- Rodar `verificar_citacoes` antes de entregar qualquer texto com citações e corrigir o que vier revogado, inexistente ou divergente.
- `fora_da_base` não quer dizer que a lei não existe: dizer que não foi possível verificar.
- Usar `historico_norma` e `impacto_da_norma` para "o que mudou"; `comparar_jurisdicoes` com a consulta traduzida.
- Normas privadas: `adicionar_norma` (uma) ou `importar_normas` (uma pasta).
- Conteúdo informativo: não substitui a publicação oficial nem um advogado.

## Evidências

`src/server.ts` (registro das tools, schemas zod, `INSTRUCOES`, `MAX_TEXTO`), `src/types.ts`, testes "MCP: 9 tools, 4 prompts, resources e instruções" e "ponta a ponta" em `src/lawmcp.test.ts`. Os exemplos são saídas reais sobre o snapshot atual, encurtadas.
