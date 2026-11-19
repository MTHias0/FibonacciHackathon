# FibonacciHackathon

Base TypeScript com Node.js 24 ou superior, módulos ESM e verificação estrita de tipos.
O tema central do hackathon é **integração via MCP (Model Context Protocol)**.
A ideia em discussão é expor a legislação brasileira versionada em git
(ex.: [ctresb/leis](https://github.com/ctresb/leis)) como servidor MCP.
O escopo final ainda será decidido pelo time.

**Comece por [docs/IDEIAS-MCP.md](docs/IDEIAS-MCP.md):** o panorama, as ideias de produto,
a arquitetura MCP proposta, o MVP recomendado e as perguntas em aberto.

## Preparação

```sh
nvm use
npm ci
```

## Comandos

- `npm run dev`: executa o TypeScript e reinicia ao alterar os arquivos.
- `npm run typecheck`: verifica os tipos sem gerar arquivos.
- `npm run build`: compila para `dist/`.
- `npm start`: executa a versão compilada; requer build prévio.

## Continuidade entre agentes

Leia [AGENTS.md](AGENTS.md) e [CONTEXTO.md](CONTEXTO.md) antes de trabalhar.
`CLAUDE.md` aponta para `AGENTS.md`. A skill compartilhada fica em
[.agents/skills/trabalho-atual/SKILL.md](.agents/skills/trabalho-atual/SKILL.md),
com uma entrada simbólica em `.claude/skills/trabalho-atual`.

O pacote está marcado como `private` para impedir publicação acidental no npm.
Isso não define a visibilidade do repositório GitHub.
