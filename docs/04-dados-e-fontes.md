# 04. Dados e fontes

## Fontes da demo

| Pasta em `data/snapshot/` | Repositório | Jurisdição | O que entra | Documentos |
|---|---|---|---|---|
| `br-federal/` | [Evaldoes/legislacao-br](https://github.com/Evaldoes/legislacao-br) | `br/federal` | CF, CDC, CLT, ECA e Lei do Inquilinato: um arquivo por artigo, com âncoras de inciso e parágrafo e notas de alteração | parte de 11.956 |
| `br-federal-lawcodex/` | [LawCodex/br](https://github.com/LawCodex/br) | `br/federal` | 17 códigos e 21 leis-chave (texto compilado do Planalto), divididos em artigos na carga | parte de 11.956 |
| `br-sp-birigui/` | [ctresb/leis](https://github.com/ctresb/leis) `municipais/SP/birigui` | `br/sp/birigui` | 654 atos municipais, um arquivo por norma | 654 |
| `es/` | [legalize-dev/legalize-es](https://github.com/legalize-dev/legalize-es) | `es` | 5 normas do BOE, divididas em artículos | 2.552 |

Licenças e condições de reuso: [data/snapshot/FONTES.md](../data/snapshot/FONTES.md). Em resumo: CC0 no legislacao-br; atos oficiais sem proteção autoral (Lei 9.610/98, art. 8º, IV) no LawCodex e no ctresb; dados do BOE com as condições de reuso do próprio BOE.

### Por que essas fontes

- **legislacao-br** tem âncoras por dispositivo e notas estruturadas. É daí que sai a genealogia mais precisa, por isso CF, CDC, CLT, ECA e Inquilinato vêm dele.
- **LawCodex/br** cobre os códigos e as leis mais usadas por advogados. As normas que já vêm do legislacao-br, ou que foram revogadas, são ignoradas no download.
- **ctresb/leis** é o ponto de partida do hackathon: leis municipais em Markdown. Birigui foi escolhido por ter leis ordinárias, complementares e decretos.
- **legalize-es** prova a parte multi-país e permite comparar Brasil e Espanha.

## Snapshot, manifest e permalink

O snapshot fica versionado no repo (cerca de 21 MB), para a demo rodar sem download. Ele mantém os caminhos dos repositórios de origem.

O `data/snapshot/manifest.json` guarda, por pasta, o repositório, o commit exato e a data da cópia. É gerado pelo `npm run data:fetch` e nunca editado à mão.

O permalink de cada documento é montado assim:

```
https://github.com/<repo>/blob/<commit do manifest>/<caminho no repo>
```

Exemplo: `https://github.com/Evaldoes/legislacao-br/blob/9dbcbd37dcf2cdd76479bea53eb0e41f52590cf1/normas/lei-8078-1990/art-049.md`. Como aponta para um commit, o link continua mostrando o mesmo texto mesmo depois de a fonte mudar.

## Atualizar os dados

```sh
npm run data:fetch                         # todas as fontes
npm run data:fetch -- es br-sp-birigui     # só algumas pastas
```

O script:

1. Faz um clone parcial (`--depth 1 --filter=tree:0 --sparse`) de cada repositório em `data/cache/`, que não é versionado.
2. Faz o sparse checkout só dos caminhos necessários.
3. Copia para `data/snapshot/<pasta>/`, sem `.git`, README, LICENSE e arquivos ignorados por fonte.
4. Atualiza o `manifest.json` com o commit.

O primeiro clone do ctresb leva cerca de 7 minutos e ocupa cerca de 250 MB. Depois, o cache resolve em segundos. Reinicie o servidor MCP para carregar os dados novos.

Fontes registradas em `data/snapshot/fontes.json` também são baixadas por esse comando ([05. Jurisdições próprias](05-jurisdicoes-proprias.md)).

## Adaptadores

Cada formato de fonte tem um adaptador em `src/dados/adaptadores.ts` que devolve `Norma[]`:

| Adaptador | Formato lido |
|---|---|
| `legislacaoBr` | `normas/<norma>/_norma.md` + `art-NNN.md`, frontmatter com `notas` por dispositivo |
| `lawCodexBr` | Um arquivo por norma, artigos em linhas `**Art. N.**`, notas entre parênteses no texto, identificador URN LexML |
| `ctresbMunicipio` | Um arquivo por norma com `titulo`, `tipo`, `numero`, `data`, `revogada`, `fonte`. Sem divisão em artigos |
| `legalizeEs` | Um arquivo por norma do BOE, artículos em títulos `###### Artículo N` |
| `pastaMarkdown` | Markdown genérico, um arquivo por norma, frontmatter opcional, dividido em artigos |
| `normasLocais` | Normas privadas em `data/local/<org>/` |

Os adaptadores com formato próprio ficam na lista `FONTES` do código. Os formatos `ctresb` e `markdown` são registrados sem código, no `fontes.json`.

## Catálogo de apelidos

`src/dados/catalogo.ts` tem 46 entradas (41 do Brasil e 5 da Espanha) com os nomes pelos quais as leis são citadas: "CF", "CF/88", "Carta Magna", "CC", "CDC", "CLT", "LGPD", "Marco Civil", "Reforma Trabalhista", "Pacote Anticrime", "CE", "ET" e outros.

- Normas carregadas ganham esses apelidos, além dos títulos.
- Normas do catálogo que não estão carregadas (como a Lei 8.666/93) continuam reconhecidas. O verificador responde `fora_da_base` com a URI certa em vez de confundir com outra norma.
- Siglas (só maiúsculas, como "CC" ou "ET") só casam em maiúsculas, para "cc" ou "et" soltos no texto não virarem citação.

## Genealogia

As notas de alteração das fontes viram `Alteracao`. O reconhecimento de atos aceita os formatos que aparecem nas notas:

| Nota | Norma reconhecida |
|---|---|
| Redação dada pela Lei nº 13.467, de 2017 | `lei-13467-2017` |
| Redação dada pela Lei nº 7.209, de 11.7.1984 | `lei-7209-1984` |
| Incluído pela Lcp nº 123, de 2006 | `lei-complementar-123-2006` |
| Redação dada pelo Decreto-lei nº 229, de 28.2.1967 | `decreto-lei-229-1967` |
| Lei 8.078/90 | `lei-8078-1990` |
| Emenda Constitucional nº 103, de 2019 | `emenda-constitucional-103-2019` |

Os repositórios de origem não reconstroem versões antigas pelo `git log`, por isso a genealogia sai das notas e não do histórico do git.

## Evidências

`data/snapshot/FONTES.md`, `data/snapshot/manifest.json`, `data/snapshot/fontes.json`, `src/scripts/fetch-data.ts`, `src/dados/adaptadores.ts`, `src/dados/catalogo.ts`, `src/dados/texto.ts` (`ATO`, `referenciaAto`) e o teste "texto: reconhece atos em todos os formatos de nota".
