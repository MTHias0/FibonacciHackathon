/**
 * Regenera data/snapshot/ a partir das fontes no GitHub (clones parciais em data/cache/, fora do git)
 * e grava data/snapshot/manifest.json com o commit exato de cada fonte (é dele que saem os permalinks).
 * Uso: npm run data:fetch [-- br-federal br-federal-lawcodex es br-sp-birigui]. Sem argumentos, atualiza todas.
 * Atenção: o primeiro clone de br-sp-birigui (ctresb/leis) leva ~7 min e ~250 MB; depois o cache resolve em segundos.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("../../data", import.meta.url));
const CACHE = join(RAIZ, "cache");
const SNAPSHOT = join(RAIZ, "snapshot");
const MANIFESTO = join(SNAPSHOT, "manifest.json");

type Fonte = { pasta: string; repo: string; sparse: string[]; cone: boolean; origem: string; ignorar?: RegExp };

/** Códigos que já vêm do legislacao-br (com genealogia) ou que estão revogados. */
const CODIGOS_IGNORADOS = /(defesa-do-consumidor|consolidacao-das-leis-do-trabalho|estatuto-da-crianca|processo-civil-lei-5869-1973|sanitario-do-distrito-federal)/;
const LEIS_CHAVE = [
  "leis/1984/lei-7210-1984.md", "leis/1990/lei-8112-1990.md", "leis/1991/lei-8213-1991.md", "leis/1992/lei-8429-1992.md",
  "leis/1995/lei-9099-1995.md", "leis/1996/lei-9307-1996.md", "leis/1998/lei-9613-1998.md", "leis/2003/lei-10741-2003.md",
  "leis/2006/lei-11340-2006.md", "leis/2006/lei-11343-2006.md", "leis/2009/lei-12016-2009.md", "leis/2011/lei-12527-2011.md",
  "leis/2013/lei-12846-2013.md", "leis/2014/lei-12965-2014.md", "leis/2015/lei-13146-2015.md", "leis/2017/lei-13467-2017.md",
  "leis/2018/lei-13709-2018.md", "leis/2019/lei-13874-2019.md", "leis/2019/lei-13964-2019.md", "leis/2021/lei-14133-2021.md",
  "leis-complementares/2006/lcp-123-2006.md",
];

const FONTES: Fonte[] = [
  { pasta: "br-federal", repo: "Evaldoes/legislacao-br", sparse: ["normas"], cone: true, origem: "normas" },
  {
    pasta: "br-federal-lawcodex", repo: "LawCodex/br", cone: false, origem: ".", ignorar: CODIGOS_IGNORADOS,
    sparse: ["/codigos/*.md", ...LEIS_CHAVE.map((p) => `/${p}`)],
  },
  { pasta: "br-sp-birigui", repo: "ctresb/leis", sparse: ["municipais/SP/birigui"], cone: true, origem: "municipais/SP/birigui", ignorar: /^_auditoria/ },
  {
    pasta: "es", repo: "legalize-dev/legalize-es", cone: false, origem: "es",
    // Constituição, Código Civil, consumidores, Estatuto dos Trabalhadores, proteção de dados.
    sparse: ["BOE-A-1978-31229", "BOE-A-1889-4763", "BOE-A-2007-20555", "BOE-A-2015-11430", "BOE-A-2018-16673"].map((id) => `/es/*/${id}.md`),
  },
];

const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, stdio: ["ignore", "inherit", "inherit"] });

const manifesto: Record<string, { repo: string; commit: string; atualizado_em: string }> = existsSync(MANIFESTO)
  ? JSON.parse(readFileSync(MANIFESTO, "utf8"))
  : {};
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
  // Mantém os caminhos do repo de origem: é o que faz o permalink apontar para o arquivo certo.
  cpSync(join(cache, f.origem), destino, {
    recursive: true,
    filter: (src) => !basename(src).startsWith(".git") && !/^(README|LICENSE)/i.test(basename(src)) && !(f.ignorar?.test(basename(src)) ?? false) && !src.includes(`${join(cache, "scripts")}`),
  });
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: cache }).toString().trim();
  manifesto[f.pasta] = { repo: f.repo, commit, atualizado_em: new Date().toISOString().slice(0, 10) };
  console.log(`  ok: ${destino} (commit ${commit.slice(0, 12)})`);
}
writeFileSync(MANIFESTO, `${JSON.stringify(manifesto, null, 2)}\n`);
console.log(`manifesto: ${MANIFESTO}`);
