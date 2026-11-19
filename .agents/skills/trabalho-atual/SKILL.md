---
name: trabalho-atual
description: Salva, retoma e transfere o trabalho deste projeto entre Codex e Claude usando AGENTS.md e CONTEXTO.md. Use ao iniciar, retomar, encerrar ou passar uma tarefa para outro agente.
---

# Trabalho atual

## Fontes compartilhadas

Encontre a raiz do projeto que contém `AGENTS.md` e `CONTEXTO.md`, independentemente do diretório de execução ou do caminho simbólico usado para carregar esta skill.

Leia `AGENTS.md` para as instruções principais e regras de arquitetura. Leia `CONTEXTO.md` para o estado do negócio e do trabalho. Siga o protocolo de contexto compartilhado definido em `AGENTS.md`; não crie instruções ou memórias paralelas por agente.

## Retomar ou receber trabalho

Confira os arquivos citados e, se existir repositório, o estado do Git. Identifique o objetivo atual, as decisões confirmadas, as hipóteses, as verificações e o próximo passo. Se o estado real divergir do registro, documente a diferença antes de continuar. Prossiga apenas com trabalho autorizado.

## Salvar ou transferir trabalho

Releia `CONTEXTO.md` antes de editar. Atualize as seções existentes com o estado real seguindo os campos exigidos por `AGENTS.md`. Preserve fatos e decisões relevantes de outros agentes, sem duplicar o documento inteiro nem apagar pendências ainda válidas.

Quando houver novas regras permanentes de arquitetura, atualize `AGENTS.md` e registre o motivo da decisão no contexto. Não duplique as regras em `CLAUDE.md` ou nesta skill.

Confira se os caminhos registrados existem e se o próximo passo é executável por outro agente sem consultar a conversa anterior. Informe um resumo breve do que foi salvo e das limitações ainda abertas.
