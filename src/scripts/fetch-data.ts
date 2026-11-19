/**
 * Regenera data/snapshot/ a partir das fontes no GitHub (clones parciais em data/cache/, fora do git).
 * Uso: npm run data:fetch [-- br-federal es br-sp-birigui]. Sem argumentos, atualiza todas.
 * Atenção: br-sp-birigui (ctresb/leis) leva ~7 min e ~250 MB, porque o histórico do repo é enorme.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("../../data", import.meta.url));
const CACHE = join(RAIZ, "cache");
const SNAPSHOT = join(RAIZ, "snapshot");

type Fonte = { pasta: string; repo: string; sparse: string[]; cone: boolean; origem: string; achatar?: boolean };
const FONTES: Fonte[] = [
  { pasta: "br-federal", repo: "Evaldoes/legislacao-br", sparse: ["normas"], cone: true, origem: "normas" },
  { pasta: "br-sp-birigui", repo: "ctresb/leis", sparse: ["municipais/SP/birigui"], cone: true, origem: "municipais/SP/birigui" },
  {
    pasta: "es", repo: "legalize-dev/legalize-es", cone: false, origem: "es", achatar: true,
    // Constituição, Código Civil, consumidores, Estatuto dos Trabalhadores, proteção de dados.
    sparse: ["BOE-A-1978-31229", "BOE-A-1889-4763", "BOE-A-2007-20555", "BOE-A-2015-11430", "BOE-A-2018-16673"].map((id) => `/es/*/${id}.md`),
  },
];

const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, stdio: ["ignore", "inherit", "inherit"] });

const pedidas = process.argv.slice(2);
for (const f of FONTES.filter((f) => pedidas.length === 0 || pedidas.includes(f.pasta))) {
  const cache = join(CACHE, f.repo.replace("/", "__"));
  console.log(`→ ${f.pasta} (${f.repo})`);
  if (!existsSync(cache)) {
    mkdirSync(CACHE, { recursive: true });
    git(CACHE, "clone", "--depth", "1", "--filter=tree:0", "--sparse", `https://github.com/${f.repo}.git`, basename(cache));
  } else {
    git(cache, "fetch", "--depth", "1", "origin", "HEAD");
    git(cache, "reset", "--hard", "FETCH_HEAD");
  }
  git(cache, "sparse-checkout", "set", ...(f.cone ? [] : ["--no-cone"]), ...f.sparse);

  const destino = join(SNAPSHOT, f.pasta);
  rmSync(destino, { recursive: true, force: true });
  const origem = join(cache, f.origem);
  if (f.achatar) {
    mkdirSync(destino, { recursive: true });
    for (const e of readdirSync(origem, { withFileTypes: true, recursive: true })) {
      if (e.isFile() && e.name.endsWith(".md")) cpSync(join(e.parentPath, e.name), join(destino, e.name));
    }
  } else {
    cpSync(origem, destino, { recursive: true, filter: (src) => !basename(src).startsWith("_auditoria") });
  }
  const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: cache }).toString().trim();
  console.log(`  ok: ${destino} (commit ${commit})`);
}
