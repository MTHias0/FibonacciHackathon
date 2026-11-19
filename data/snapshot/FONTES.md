# Fontes do snapshot

Recorte da demo, versionado para o LawMCP rodar sem download. Para regenerar: `npm run data:fetch`.
O commit exato de cada fonte fica em `manifest.json`, que é a base dos permalinks. Não edite à mão.
Fontes sem adaptador próprio (municípios do ctresb, pastas de Markdown) são registradas em `fontes.json`, sem código; o `br-sp-birigui` é o exemplo.

| Pasta | Origem | Licença / uso |
|---|---|---|
| `br-federal/` | [Evaldoes/legislacao-br](https://github.com/Evaldoes/legislacao-br) `normas/`: CF, CDC, CLT, ECA e Lei do Inquilinato, um arquivo por artigo, com notas de alteração | CC0 1.0 |
| `br-federal-lawcodex/` | [LawCodex/br](https://github.com/LawCodex/br): 17 códigos (`codigos/`) e 21 leis-chave (LGPD, Marco Civil, Licitações, Maria da Penha, Reforma Trabalhista…), mantendo os caminhos do repo | Atos oficiais, sem proteção autoral (Lei 9.610/98, art. 8º, IV) |
| `br-sp-birigui/` | [ctresb/leis](https://github.com/ctresb/leis) `municipais/SP/birigui/` | Atos oficiais, sem proteção autoral (Lei 9.610/98, art. 8º, IV) |
| `es/` | [legalize-dev/legalize-es](https://github.com/legalize-dev/legalize-es), 5 normas, mantendo os caminhos do repo | Basado en datos de la Agencia Estatal Boletín Oficial del Estado (https://www.boe.es). [Condições de reuso](https://www.boe.es/informacion/aviso_legal/index.php) |

Os textos são informativos e não substituem a publicação oficial.
