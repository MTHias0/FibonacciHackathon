# Instruções do projeto

## Contexto e continuidade

- Antes de trabalhar, leia `CONTEXTO.md` e estas instruções.
- Atue como desenvolvedor sênior: priorize o valor do negócio e a entrega de um sistema simples e completo.
- O projeto está na preparação, com uma base TypeScript autorizada pelo usuário. Aguarde a aprovação do escopo antes de implementar funcionalidades ou escolher frameworks.
- O tema central do hackathon é integração via **MCP (Model Context Protocol)**. Pense as soluções como servidores e clientes MCP (tools, resources e prompts) desde o início.
- As ideias em discussão, o panorama e a arquitetura proposta estão em `docs/IDEIAS-MCP.md`. Trate esse documento como brainstorm: só o que estiver confirmado em `CONTEXTO.md` é decisão.
- Registre em `CONTEXTO.md` os fatos recebidos, as decisões confirmadas, as dúvidas e o próximo passo. Diferencie fatos de hipóteses.
- Atualize o contexto após decisões e alterações relevantes, para permitir a retomada sem depender do histórico da conversa.
- Não registre credenciais, tokens ou outros segredos.

## Contexto compartilhado entre Codex e Claude

- `AGENTS.md` é a fonte única das instruções principais, incluindo as regras de arquitetura. `CLAUDE.md` deve ser apenas um link simbólico relativo para `AGENTS.md`.
- `CONTEXTO.md` é o registro compartilhado do trabalho atual. Não mantenha uma cópia separada por agente.
- Use a skill local `trabalho-atual`, em `.agents/skills/trabalho-atual/SKILL.md`, para salvar, retomar ou transferir trabalho. A entrada em `.claude/skills/trabalho-atual` deve apontar para essa mesma pasta.
- Ao iniciar ou retomar uma tarefa, leia as instruções e o contexto, confira os arquivos envolvidos e o estado do Git, quando houver repositório. Documentação pode estar desatualizada; confirme o estado real antes de agir.
- Antes de encerrar, interromper ou transferir trabalho, atualize o contexto com objetivo, estado, arquivos alterados, decisões e motivos, verificações executadas, pendências e próximo passo concreto. Identifique o agente e a data da atualização.
- Registre verificações como executadas, com resultado e limitações. Não confunda trabalho planejado, implementado e verificado.
- Antes de salvar, releia o contexto e preserve contribuições de outros agentes. Não sobrescreva alterações desconhecidas. Se houver conflito de decisões, registre a divergência e esclareça antes de executar a parte dependente.
- Mantenha o contexto suficiente para outro agente continuar sem acessar a conversa anterior. Use caminhos do projeto; não dependa de memórias privadas ou ferramentas exclusivas de um agente.

## Arquitetura compartilhada

- A base usa TypeScript estrito, Node.js 24 ou superior e módulos ESM. Use `src/` para código e `dist/` apenas para saída gerada; mantenha dependências fixadas por `package-lock.json`. Frameworks, componentes e regras do domínio ainda não foram definidos.
- Ao definir arquitetura, registre as regras permanentes nesta seção e a decisão, seu motivo e seu estado em `CONTEXTO.md`.
- Mantenha cada regra na camada responsável pelo comportamento. Reutilize padrões adequados e evite duplicar lógica ou criar abstrações sem necessidade concreta.

## Comunicação e decisões

- Responda em português, com Caveman ultra. Mantenha documentação e código claros e completos.
- Após cada alteração, apresente um resumo extremamente enxuto do que mudou e da verificação realizada, quando aplicável.
- Use a skill `grillme` para investigar requisitos e apoiar decisões quando estiver disponível. Não simule que a skill foi usada.
- A skill `grillme` não foi encontrada na preparação inicial. Obtenha sua localização ou origem antes de usá-la.
- Ao receber o contexto, investigue as dúvidas de maior impacto, exponha alternativas e recomende a decisão mais adequada ao negócio.
- Não trate suposições ou recomendações como decisões aprovadas.

## Implementação e verificação

- Antes de editar código, trace o comportamento existente e as regras que precisam permanecer verdadeiras.
- Reutilize o comportamento e as abstrações existentes quando forem adequados. Corrija a causa no local responsável.
- Implemente o menor sistema completo que satisfaça os requisitos confirmados, sem funcionalidades especulativas.
- Preserve segurança, validação, autorização, acessibilidade e integridade dos dados.
- Execute a menor verificação suficiente. Registre o resultado e as limitações materiais.
- Respeite as permissões efetivas do ambiente. Não presuma que uma intenção de conceder acesso alterou as permissões.
