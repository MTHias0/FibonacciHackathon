# FibonacciHackathon

Base TypeScript com Node.js 24 ou superior, módulos ESM e verificação estrita de tipos.
O tema central do hackathon é **integração via MCP (Model Context Protocol)**.
A ideia em discussão é expor a legislação brasileira versionada em git
(ex.: [ctresb/leis](https://github.com/ctresb/leis)) como servidor MCP.
O escopo final ainda será decidido pelo time.

**Primeira entrega: o MCP (LawMCP via stdio, tools P0). Front e pitch vêm depois.**
Contrato compartilhado: [src/types.ts](src/types.ts).

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

## Para agentes e colegas

Leia [AGENTS.md](AGENTS.md) e [CONTEXTO.md](CONTEXTO.md) antes de trabalhar.
