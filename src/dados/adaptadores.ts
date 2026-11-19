import { readdir, readFile } from "node:fs/promises";
import { join, relative, basename } from "node:path";
import type { Adaptador, LawUri, Norma, Situacao } from "../types.ts";
import { lerFrontmatter, texto } from "./frontmatter.ts";

/** Lista arquivos .md recursivamente. */
async function arquivosMd(dir: string): Promise<string[]> {
  const entradas = await readdir(dir, { withFileTypes: true, recursive: true });
  return entradas
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("README"))
    .map((e) => join(e.parentPath, e.name))
    .sort();
}

/** "art-049" → "art-49", "adct-art-001" → "adct-art-1", "art-103-a" → "art-103-a". */
export function normalizarArtigo(id: string): string {
  return id.toLowerCase().replace(/(^|-)0+(\d)/g, "$1$2");
}

/**
 * Brasil federal, a partir de Evaldoes/legislacao-br (CC0): um arquivo por artigo e um _norma.md por norma.
 * Snapshot: data/snapshot/br-federal/<norma>/{_norma.md, art-NNN.md}
 */
export const legislacaoBr: Adaptador = {
  nome: "Evaldoes/legislacao-br",
  jurisdicoes: ["br/federal"],
  async carregar(dir) {
    const normas: Norma[] = [];
    for (const pasta of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory())) {
      const base = join(dir, pasta.name);
      const cab = lerFrontmatter(await readFile(join(base, "_norma.md"), "utf8"));
      const id = texto(cab.meta.norma) ?? pasta.name;
      const nome = texto(cab.meta.nome) ?? id;
      const data = texto(cab.meta.data);
      const fonte = texto(cab.meta.fonte) ?? "";
      const apelidos = [nome, ...(Array.isArray(cab.meta.apelidos) ? cab.meta.apelidos.map(String) : [])];
      const uriNorma: LawUri = `law://br/federal/${id}`;
      normas.push({
        uri: uriNorma, jurisdicao: "br/federal", tipo: texto(cab.meta.tipo) ?? "norma", titulo: nome,
        ...(data ? { data } : {}), situacao: "vigente", fonte, texto: cab.corpo, apelidos,
        origem: { repo: this.nome, caminho: `normas/${pasta.name}/_norma.md` },
      });
      for (const arquivo of await readdir(base)) {
        if (arquivo === "_norma.md" || !arquivo.endsWith(".md")) continue;
        const { meta, corpo } = lerFrontmatter(await readFile(join(base, arquivo), "utf8"));
        const rotulo = texto(meta.rotulo) ?? arquivo;
        const numero = texto(meta.artigo);
        normas.push({
          uri: `${uriNorma}/${normalizarArtigo(basename(arquivo, ".md"))}`,
          jurisdicao: "br/federal", tipo: "artigo", titulo: `${rotulo}, ${nome}`,
          ...(numero ? { numero } : {}), ...(data ? { data } : {}),
          situacao: meta.revogado === true ? "revogada" : "vigente",
          fonte: texto(meta.fonte) ?? fonte, texto: corpo,
          origem: { repo: this.nome, caminho: `normas/${pasta.name}/${arquivo}` },
        });
      }
    }
    return normas;
  },
};

/**
 * Município, a partir de ctresb/leis (textos oficiais): um arquivo por norma.
 * Snapshot: data/snapshot/<pasta>/<tipo>/<ano>/*.md. Para adicionar um município, registre outro ctresbMunicipio.
 */
export function ctresbMunicipio(pasta: string, jurisdicao: string, caminhoNoRepo: string): Adaptador & { pasta: string } {
  return {
    nome: "ctresb/leis",
    pasta,
    jurisdicoes: [jurisdicao],
    async carregar(dir) {
      const normas: Norma[] = [];
      for (const arquivo of await arquivosMd(dir)) {
        const { meta, corpo } = lerFrontmatter(await readFile(arquivo, "utf8"));
        const numero = texto(meta.numero);
        const data = texto(meta.data);
        const situacao: Situacao = meta.revogada === true ? "revogada" : meta.revogada === false ? "vigente" : "desconhecida";
        normas.push({
          uri: `law://${jurisdicao}/${basename(arquivo, ".md")}`, jurisdicao,
          tipo: (texto(meta.tipo) ?? "norma").toLowerCase(),
          titulo: texto(meta.titulo) ?? basename(arquivo, ".md"),
          ...(numero ? { numero } : {}), ...(data ? { data } : {}),
          situacao, fonte: texto(meta.fonte) ?? "", texto: corpo,
          origem: { repo: "ctresb/leis", caminho: `${caminhoNoRepo}/${relative(dir, arquivo)}` },
        });
      }
      return normas;
    },
  };
}

/** Apelidos usados em citações espanholas (o legalize-es não traz apelidos). */
const APELIDOS_ES: Record<string, string[]> = {
  "BOE-A-1978-31229": ["Constitución Española", "Constitución", "CE"],
  "BOE-A-1889-4763": ["Código Civil", "CC"],
  "BOE-A-2015-11430": ["Estatuto de los Trabajadores", "ET"],
  "BOE-A-2007-20555": ["Ley General para la Defensa de los Consumidores y Usuarios", "TRLGDCU"],
  "BOE-A-2018-16673": ["Ley Orgánica de Protección de Datos", "LOPDGDD"],
};

/**
 * Espanha, a partir de legalize-dev/legalize-es (dados do BOE): um arquivo por norma, com artigos em "###### Artículo N".
 * Gera a norma inteira e um item por artigo. Snapshot: data/snapshot/es/<BOE-id>.md
 */
export const legalizeEs: Adaptador = {
  nome: "legalize-dev/legalize-es",
  jurisdicoes: ["es"],
  async carregar(dir) {
    const normas: Norma[] = [];
    for (const arquivo of await arquivosMd(dir)) {
      const { meta, corpo } = lerFrontmatter(await readFile(arquivo, "utf8"));
      const id = texto(meta.identifier) ?? basename(arquivo, ".md");
      const titulo = texto(meta.title) ?? id;
      const data = texto(meta.publication_date);
      const numero = texto(meta.official_number);
      const fonte = texto(meta.source) ?? texto(meta.url_html) ?? "";
      const situacao: Situacao = meta.status === "in_force" ? "vigente" : meta.status ? "revogada" : "desconhecida";
      const uriNorma: LawUri = `law://es/${id}`;
      const origem = { repo: this.nome, caminho: `es/${basename(arquivo)}` };
      normas.push({
        uri: uriNorma, jurisdicao: "es", tipo: (texto(meta.rank) ?? "norma").toLowerCase(), titulo,
        ...(numero ? { numero } : {}), ...(data ? { data } : {}),
        situacao, fonte, texto: corpo, apelidos: [titulo, ...(APELIDOS_ES[id] ?? [])], origem,
      });
      // Um bloco por "Artículo N", até o próximo título Markdown.
      for (const m of corpo.matchAll(/^#{1,6}\s+Art[íi]culo\s+(\d+(?:\s*(?:bis|ter|quater))?)[^\n]*\n([\s\S]*?)(?=^#{1,6}\s|$(?![\s\S]))/gim)) {
        const n = (m[1] ?? "").toLowerCase().replace(/\s+/g, "-");
        normas.push({
          uri: `${uriNorma}/art-${n}`, jurisdicao: "es", tipo: "artículo", titulo: `Artículo ${m[1]}, ${titulo}`,
          numero: m[1] ?? n, ...(data ? { data } : {}), situacao, fonte, texto: m[0].trim(), origem,
        });
      }
    }
    return normas;
  },
};

/** Fontes carregadas pelo LawMCP: pasta do snapshot → adaptador. */
export const FONTES: { pasta: string; adaptador: Adaptador }[] = [
  { pasta: "br-federal", adaptador: legislacaoBr },
  { pasta: "br-sp-birigui", adaptador: ctresbMunicipio("br-sp-birigui", "br/sp/birigui", "municipais/SP/birigui") },
  { pasta: "es", adaptador: legalizeEs },
];
