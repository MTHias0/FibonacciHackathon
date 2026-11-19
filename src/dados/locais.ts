import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { stringify } from "yaml";
import type { AdicionarNormaEntrada } from "../types.ts";
import { normalizar } from "./texto.ts";

export const SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function slug(s: string): string {
  return normalizar(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+/, "").slice(0, 60).replace(/-+$/, "") || "norma";
}

const git = (dir: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=LawMCP", "-c", "user.email=lawmcp@local", "-c", "commit.gpgsign=false", ...args], {
    cwd: dir, stdio: ["ignore", "pipe", "pipe"],
  }).toString().trim();

/**
 * Grava a norma privada em <dir>/<organizacao>/<slug>.md e faz um commit no repositório git de dir.
 * Mesma norma de novo = nova versão no histórico. Devolve o arquivo e o commit.
 */
export function salvarNormaLocal(dir: string, e: AdicionarNormaEntrada): { arquivo: string; commit: string; novaVersao: boolean } {
  if (!SLUG.test(e.organizacao)) throw new Error("organizacao deve ser um slug: letras minúsculas, números e hífen (ex.: escritorio-silva).");
  const raiz = resolve(dir);
  const arquivo = resolve(raiz, e.organizacao, `${slug(e.titulo)}.md`);
  if (!arquivo.startsWith(raiz + sep)) throw new Error("Caminho inválido.");
  mkdirSync(join(raiz, e.organizacao), { recursive: true });
  if (!existsSync(join(raiz, ".git"))) git(raiz, "init", "-q");

  const meta = {
    titulo: e.titulo, tipo: e.tipo, ...(e.numero ? { numero: e.numero } : {}), ...(e.data ? { data: e.data } : {}),
    fonte: e.fonte, ...(e.apelidos?.length ? { apelidos: e.apelidos } : {}),
  };
  const conteudo = `---\n${stringify(meta).trim()}\n---\n\n${e.texto.trim()}\n`;
  const novaVersao = existsSync(arquivo);
  if (novaVersao && readFileSync(arquivo, "utf8") === conteudo) return { arquivo, commit: git(raiz, "rev-parse", "HEAD"), novaVersao: false };
  writeFileSync(arquivo, conteudo);
  const rel = relative(raiz, arquivo).split(sep).join("/");
  git(raiz, "add", "--", rel);
  git(raiz, "commit", "-q", "-m", `${novaVersao ? "Atualiza" : "Adiciona"} ${e.titulo}`, "--", rel);
  return { arquivo, commit: git(raiz, "rev-parse", "HEAD"), novaVersao };
}
