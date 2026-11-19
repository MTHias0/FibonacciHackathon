# Conferência do snapshot com a fonte oficial

Feita em 19/11/2026. Comparei 10 artigos de `data/snapshot/` com as páginas compiladas do Planalto (`l8078compilado.htm`, `del5452compilado.htm`, `constituicaocompilado.htm`, além de `emendas/emc/emc141.htm`) e com o texto consolidado do BOE (`act.php?id=...`). Considerei só a redação do dispositivo: o rótulo ("Art. 83 -" virando título Markdown) e as anotações do Planalto ("Redação dada por...") não entraram na comparação.

| # | norma/artigo | texto | situação | data | observação |
|---|---|---|---|---|---|
| 1 | CDC (Lei 8.078/1990), art. 83 | igual | vigente (parágrafo único vetado) | redação original, sem anotação | — |
| 2 | CDC, art. 70 | igual | vigente | redação original | — |
| 3 | CLT (DL 5.452/1943), art. 323 | igual | vigente | redação original de 1943 | — |
| 4 | CLT, art. 796 | igual | vigente | redação original | as alíneas a/b viram títulos "Alínea a"; mantém "argüida" |
| 5 | CLT, art. 834 | igual | vigente | redação original | — |
| 6 | CLT, art. 372 | igual | caput vigente; parágrafo único revogado | parágrafo único revogado pela Lei 13.467/2017 | a nota do snapshot confere |
| 7 | CLT, art. 469 | igual | vigente | § 1º com redação da Lei 6.203/1975; § 3º incluído pela mesma lei | o espaço em "domicílio ." também está no Planalto; o art. 469-A (Lei 15.175/2025) fica em `art-469-a.md` |
| 8 | CF/1988, art. 7º | igual, com diferenças de forma | vigente | inciso XIII e § 1º com redação da EC 141, de 16/10/2026; §§ 2º e 3º incluídos por ela; o inciso XV tem a anotação "Vide EC 141 (Vigência)" | **o inciso XIII está correto**: "8 (oito) horas diárias e 40 (quarenta) horas semanais" é a redação oficial da EC 141/2026, que trata do fim da escala 6x1. Diferenças de forma: no inciso IV o Planalto traz "salário mínimo ," e o snapshot, "salário mínimo,"; o inciso XXXIV está sem o ponto final; as alíneas do inciso XXIX aparecem como "*(Revogado)*", e o Planalto traz "(Revogada)." |
| 9 | Constitución Española, art. 14 | igual | vigente | sem modificação; texto inicial publicado em 29/12/1978. A última atualização da norma é de 20/05/2026, igual ao `last_updated` do snapshot | — |
| 10 | Estatuto de los Trabajadores (RDLeg 2/2015), art. 34 | igual (25 parágrafos) | vigente | última redação do artigo publicada em 29/06/2023, em vigor desde 30/06/2023 (RDL 5/2023, apartado 8). A norma foi atualizada em 18/11/2026 | as notas de modificação vêm como blockquote `<small>` |

## Achados

1. **O snapshot não reescreve números por extenso.** Todas as 885 ocorrências do padrão "N (extenso)" nos artigos de `br-federal/` (10 no CDC, 529 na CLT e 346 na CF) aparecem literalmente no Planalto. O "8 (oito)" vem da fonte oficial. Por isso, uma citação da redação antiga ("oito horas diárias e quarenta e quatro semanais") sai como `divergente`, o que está correto.
2. **A EC 141/2026 tem vigência escalonada, e o verificador só olha o texto.**
   - O art. 6º da emenda prevê limite de 42 h semanais 2 meses depois da publicação e de 40 h um ano depois desse prazo. O inciso XIII já diz 40 h, mas esse limite só vale de fato no fim da transição.
   - Pelo art. 10, I, a nova redação do inciso XV ("repouso semanal remunerado de 2 (dois) dias, um dos quais preferencialmente aos domingos") só entra em vigor 2 meses depois da publicação. Até lá, o Planalto compilado e o snapshot mostram o XV antigo, e uma citação da redação nova sai como `divergente`.
   - Quando essa vigência começar, o snapshot precisa ser regenerado.
3. **Falhas de extração no snapshot.** Nenhuma delas está nos 10 artigos. Foram encontradas comparando, parágrafo por parágrafo, todos os artigos de CDC, CLT e CF com o Planalto. Em cada caso, uma citação correta seria marcada como `divergente`:
   - espaço antes de pontuação: CF art. 98 ("sumaríssimo ,"), arts. 102, 109 e 121 ("habeas corpus ,"), arts. 48, 155 e 177 ("b ;");
   - palavra quebrada: CF arts. 153 e 195 ("capu t");
   - texto de link perdido: CLT art. 329 ("§ 1º do deverá", sem "art. 325") e art. 442-B ("prevista no .", sem "art. 3º desta Consolidação");
   - aspas diferentes da fonte: CF art. 5º ("habeas-corpus" entre aspas).

   Resultado do teste literal: CDC com 451 de 451 parágrafos iguais, CLT com 2.571 de 2.650 e CF com 2.506 de 2.540. Boa parte das diferenças na CLT é "nº"/"1º" no snapshot contra "n<sup>o</sup>" no HTML do Planalto. Isso pode ser efeito da minha extração, mas também afeta quem copia o texto do Planalto.
4. **Espanha:** o `texto` de cada artigo é o Markdown cru, com o escape `1\.` e as notas `> <small>`. Uma citação que inclua o número do apartado ("1. La duración...") não casa.
5. **Sugestão, ainda não decidida:** fazer `normalizar()` também remover espaço antes de pontuação e tratar º, ° e "o" sobrescrito como iguais, ou corrigir esses casos na geração do snapshot.
