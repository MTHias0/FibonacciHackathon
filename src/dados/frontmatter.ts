import { parse } from "yaml";

/** Separa o cabeçalho YAML (--- … ---) do corpo Markdown. */
export function lerFrontmatter(conteudo: string): { meta: Record<string, unknown>; corpo: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(conteudo);
  if (!m) return { meta: {}, corpo: conteudo };
  const meta: unknown = parse(m[1] ?? "");
  return {
    meta: meta && typeof meta === "object" ? (meta as Record<string, unknown>) : {},
    corpo: conteudo.slice(m[0].length),
  };
}

/** Valor do frontmatter como texto, ou undefined quando vazio. */
export function texto(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}
