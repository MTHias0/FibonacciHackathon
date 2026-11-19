# 08. Testes e qualidade

## Comandos

```sh
npm test            # node:test em src/**/*.test.ts
npm run typecheck   # tsc --noEmit (TypeScript estrito, exactOptionalPropertyTypes)
npm run build       # compila para dist/
npm start           # roda a versão compilada
```

## O que os 18 testes garantem

Todos ficam em `src/lawmcp.test.ts` e rodam sobre o snapshot real.

| Teste | Garante |
|---|---|
| texto: reconhece atos em todos os formatos de nota | Leitura de "Lei nº 13.467, de 2017", "Lcp nº 123", "Decreto-lei nº 229, de 28.2.1967", "Lei 8.078/90", EC… |
| texto: divide artigos e dispositivos (inclusive aninhados) | Artigos `art-1025`, `art-7-a`, `Artículo 14`; incisos de parágrafo (`par-1-inc-1`) |
| carrega as jurisdições da demo com o commit de cada fonte | `br/federal`, `br/sp/birigui` e `es` carregados, todas as fontes com commit, mais de 10 mil documentos |
| ler_norma: artigo, inciso e parágrafo, no Brasil e na Espanha | Leitura de dispositivos e `undefined` para artigo ou inciso inexistente |
| permalink aponta para o arquivo no commit do manifesto | Permalink = repo + commit do manifest + caminho de origem |
| buscar_normas: ranking BM25 põe o artigo certo no topo | "iguales ante la ley" → art. 14 da CE; "responsabilidade civil dano moral ato ilícito" → art. 186 do CC; filtro por jurisdição |
| verificar_citacoes: artigos, listas, faixas, incisos e parágrafos | 18 citações com o status esperado (tabela em [06](06-verificador-de-citacoes.md)) |
| verificar_citacoes: Código Civil é o brasileiro, salvo citação em espanhol | Desambiguação BR × ES |
| verificar_citacoes: trecho entre aspas diferente do oficial é divergente | "7 dias" ok; "30 dias" divergente |
| verificar_citacoes: resumo, permalink e detalhe útil | Contagem por status e mensagem "vai do art. 1 ao art. 119" |
| historico_norma: quem alterou o art. 59 da CLT e a CLT inteira | Lei 13.467/2017 como principal alteradora |
| impacto_da_norma: o que a Reforma Trabalhista mudou, por nome, número ou URI | Mais de 300 dispositivos, igual pelas três formas de chamar |
| fontes.json: registra uma jurisdição em Markdown sem código e recusa configuração inválida | Fonte `markdown` carregada e dividida em artigos; `local/` recusado |
| MCP: 9 tools, 4 prompts, resources e instruções | Lista exata de tools e prompts, anotações de leitura e escrita, resources e instruções |
| MCP: comparar_jurisdicoes, historico_norma e impacto_da_norma | Pelo protocolo, com erros para URI e norma desconhecidas e texto truncado no Código Civil inteiro |
| MCP: adicionar_norma grava em git local, indexa e versiona | v1 → v2 com commit novo, artigo removido some, apelido citável, versões no `historico_norma`, organização inválida recusada |
| MCP: importar_normas cria a jurisdição a partir de uma pasta e versiona só o que mudou | Importação, arquivos ignorados, reimportação com 1 atualizada, versões, caminho relativo e pasta inexistente recusados |
| ponta a ponta: cliente MCP real chama as tools via stdio | Processo real com `StdioClientTransport`: 9 tools, leitura, verificação e URI maliciosa (`../../etc/passwd`) recusada |

Os testes que gravam usam pastas temporárias (`mkdtemp`) e apagam tudo no fim. O ponta a ponta usa `LAWMCP_LOCAL` apontando para uma delas, para nunca tocar em `data/local/`.

## Escrever um teste novo

Toda tool nova precisa de teste. O padrão para testar pelo protocolo, sem subir processo:

```ts
test("MCP: minha_tool faz X", async () => {
  const { client, chamar } = await conectar(); // servidor + cliente em memória
  try {
    const r = await chamar("minha_tool", { campo: "valor" });
    assert.equal(r.erro, false);
    assert.equal(r.json().algumCampo, "esperado");
  } finally {
    await client.close();
  }
});
```

Lembre de atualizar a lista de tools nos testes "MCP: 9 tools…" e "ponta a ponta".

## Regras de qualidade do projeto

- TypeScript estrito, imports com extensão `.ts`, dependências fixadas pelo `package-lock.json`.
- O servidor stdio nunca escreve no stdout.
- Entradas das tools validadas por zod; URIs com formato e tamanho limitados; caminhos de gravação conferidos.
- Nenhum segredo no repositório. As normas privadas ficam fora do git do projeto.
- Ao fim de cada tarefa, atualizar o `CONTEXTO.md` e a página da documentação afetada.

## Evidências

`src/lawmcp.test.ts`, `package.json` (scripts), `tsconfig.json`, `AGENTS.md` (regras).
