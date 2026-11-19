# Roteiro de demo (3 min)

Cliente: **Claude Desktop** com o LawMCP via stdio (config no [README](../README.md)).
Mensagem central: **"a lei com recibo"**. A IA para de inventar artigos porque cada resposta traz texto oficial, vigência, fonte e permalink por commit.

## Antes de subir ao palco

1. Rode `git pull`, `npm ci` e `npm test`. Todos os testes devem passar.
2. Rode `rm -rf data/local` para apagar as normas privadas de ensaios anteriores. A pasta é ignorada pelo git e é recriada pela pergunta 5.
3. Feche o Claude Desktop com **Cmd+Q** e abra de novo. Em **Settings › Developer**, o `lawmcp` deve aparecer conectado.
4. Abra um **chat anônimo**, para os chats da demo não ficarem no histórico da conta.
5. Na primeira chamada de cada tool, escolha **"Allow always"**. Assim a plateia não vê pedidos de permissão.
6. Deixe aberto o vídeo de plano B (ver [ROADMAP](ROADMAP.md)).

## As 5 perguntas

Cole cada pergunta exatamente como está. A coluna "Tool esperada" diz o que deve aparecer no indicador de ferramentas do Claude.

### 1. Consulta com recibo (B2C)

> O art. 49 do CDC ainda vale? Cite a fonte.

- **Tool esperada:** `ler_norma` (às vezes `buscar_normas` antes).
- **Resposta esperada:**
  - Diz que o artigo está **vigente**: é o direito de arrependimento, com prazo de 7 dias para compras fora do estabelecimento.
  - Cita o texto oficial com o parágrafo único.
  - Traz o link do Planalto e o permalink do GitHub (`Evaldoes/legislacao-br`, commit `9dbcbd3…`).
- **O que falar:** "Não é a memória do modelo. É o texto oficial, com o endereço exato de onde saiu."

### 2. Pegando a IA no flagra (diferencial)

> Verifique as citações deste parecer: "Nos termos do art. 42, parágrafo único, do CDC, a cobrança indevida gera devolução em dobro. Além disso, o art. 999 do CDC garante indenização automática, e o art. 7º, inciso XCIX, da CF assegura férias de 60 dias. Por fim, o art. 384 da CLT garante 15 minutos de descanso à mulher antes da hora extra."

- **Tool esperada:** `verificar_citacoes`.
- **Resposta esperada:** 1 citação ok, 2 inexistentes e 1 revogada.
  - **art. 42, parágrafo único, do CDC:** `ok`.
  - **art. 999 do CDC:** `inexistente`, porque o CDC vai do art. 1 ao art. 119.
  - **art. 7º, XCIX, da CF:** `inexistente`, porque o art. 7º só tem os incisos I a XXXIV.
  - **art. 384 da CLT:** `revogada`.
- **O que falar:** "Este é o parecer típico gerado por IA. Duas citações não existem e uma foi revogada. O advogado descobre antes de protocolar."

### 3. A lei tem histórico (git como linha do tempo)

> O que a Reforma Trabalhista mudou na CLT? E quem alterou o art. 59?

- **Tools esperadas:** `impacto_da_norma` e `historico_norma`.
- **Resposta esperada:**
  - A Reforma Trabalhista (Lei 13.467/2017) mexeu em **378 dispositivos** da CLT, entre redações novas, inclusões e revogações.
  - O caput do art. 59, que trata das horas extras, tem a "Redação dada pela Lei nº 13.467, de 2017".
- **O que falar:** "Quem mudou cada artigo, e quando, sai do histórico versionado da lei."

### 4. Qualquer jurisdição (visão global)

> Compare as regras de horas extras no Brasil e na Espanha.

- **Tool esperada:** `comparar_jurisdicoes` (ou `buscar_normas` por país).
- **Resposta esperada:**
  - **Brasil:** CLT arts. 59 e 59-B.
  - **Espanha:** Estatuto de los Trabajadores, art. 35 ("horas extraordinarias"), e art. 36.
  - Tudo com fonte (Planalto e BOE).
- **O que falar:** "O mesmo servidor responde por qualquer país. Adicionar um país é escrever um adaptador."
- "Igualdade perante a lei" também funciona agora: o erro da busca que escondia o art. 5º da CF foi corrigido (ver ROADMAP, Dev 1).

### 5. A norma do seu escritório (B2B)

> Adicione a política interna do escritorio-silva, chamada "Política de Home Office", com o apelido PHO e a fonte interno://escritorio-silva/rh. Texto: "Art. 1º O trabalho remoto é permitido até três dias por semana. Art. 2º O escritório reembolsa até R$ 150,00 por mês de internet." Depois verifique: "Conforme o art. 2º da PHO, o reembolso de internet é de até R$ 150,00, e o art. 5º da PHO libera o trabalho remoto integral."

- **Tools esperadas:** `adicionar_norma`, depois `verificar_citacoes`.
- **Resposta esperada:**
  - A norma é criada em `law://local/escritorio-silva/politica-de-home-office`, com 2 artigos e um commit no git local.
  - Na verificação, o art. 2º da PHO vem `ok`.
  - O art. 5º da PHO vem `inexistente`, porque a política só vai até o art. 2º.
- **O que falar:** "O escritório pluga as próprias normas e elas ganham o mesmo verificador e o mesmo histórico, sem sair da máquina."

**Fechamento (10 s):** "Qualquer agente que fala MCP pluga o LawMCP: Claude, OpenBot ou a plataforma do seu escritório."

## Perguntas de reserva

- *"Que leis de Birigui falam de IPTU?"*: `buscar_normas` em `br/sp/birigui`, primeiro resultado Lei Ordinária nº 7.462/2024. A situação vem "desconhecida", porque a fonte não informa a vigência.
- *"Compare o direito de arrependimento do consumidor no Brasil e na Espanha"*: CDC art. 49 e LGDCU arts. 68 e 106. Atenção: o primeiro resultado brasileiro é o art. 420 do Código Civil (arras), não o CDC.

## Verificação

Em 2026-11-19 (commit `27bd02d`), as tools de cada pergunta foram chamadas no MCP Inspector (`--cli`) com os mesmos argumentos que a IA deve usar. Todas voltaram com o resultado descrito acima. A pergunta 5 rodou com `LAWMCP_LOCAL` numa pasta temporária.

**Ainda não verificado:** se o Claude Desktop escolhe essas tools sozinho, a partir das frases exatas. Ensaie as 5 perguntas no Claude Desktop e anote aqui cada tool que ele escolher errado.
