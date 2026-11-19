/**
 * Contrato do LawMCP. É a fonte única dos tipos compartilhados entre MCP, dados e infra.
 * Mudanças aqui afetam os três devs: combine antes de alterar e registre em CONTEXTO.md.
 */

/** Hierarquia livre separada por "/": "br", "br/federal", "br/sp/birigui", "es", "es/an", "us/ca". */
export type Jurisdicao = string;

export type Situacao = "vigente" | "revogada" | "desconhecida";

/** URI estável e citável: law://{jurisdicao}/{id}[/art-N]. Ex.: law://br/federal/lei-8078-1990/art-49 */
export type LawUri = `law://${string}`;

/** Modelo unificado: todo adaptador de fonte converte o seu formato para Norma. */
export interface Norma {
  uri: LawUri;
  jurisdicao: Jurisdicao;
  /** lei, decreto, portaria, resolução, artigo… (em minúsculas, como vier da fonte normalizada) */
  tipo: string;
  titulo: string;
  numero?: string;
  /** Data real em ISO 8601 (AAAA-MM-DD), lida do frontmatter. Nunca da data do commit, que não representa datas antes de 1970. */
  data?: string;
  situacao: Situacao;
  /** URL oficial da norma. */
  fonte: string;
  /** Texto em Markdown. */
  texto: string;
  origem: Origem;
}

export interface Origem {
  /** Ex.: "Evaldoes/legislacao-br", "ctresb/leis", "legalize-dev/legalize-es", "local". */
  repo: string;
  /** Caminho do arquivo dentro do repo. */
  caminho: string;
  commit?: string;
}

/** Contrato de cada fonte de dados. Para adicionar um país ou município, basta um novo adaptador. */
export interface Adaptador {
  nome: string;
  jurisdicoes: Jurisdicao[];
  carregar(diretorio: string): Promise<Norma[]>;
}

/** Item de lista sem o texto completo, para respostas leves. */
export type ResumoNorma = Pick<Norma, "uri" | "jurisdicao" | "tipo" | "titulo" | "data" | "situacao" | "fonte">;

// ---- Tools MCP: entradas e saídas (fase 1 = P0) ----

export interface ListarJurisdicoesSaida {
  jurisdicoes: { jurisdicao: Jurisdicao; tipos: string[]; total: number }[];
}

export interface BuscarNormasEntrada {
  consulta: string;
  /** Prefixo: "br" também pega "br/sp/birigui". */
  jurisdicao?: Jurisdicao;
  tipo?: string;
  ano?: number;
  /** Padrão 10, máximo 50. */
  limite?: number;
}
export interface BuscarNormasSaida {
  resultados: (ResumoNorma & { trecho: string })[];
}

export interface LerNormaEntrada {
  uri: LawUri;
}
export type LerNormaSaida = Norma & { aviso: string };

export type StatusCitacao = "ok" | "revogada" | "inexistente" | "divergente";
export interface VerificarCitacoesEntrada {
  texto: string;
  /** Jurisdição padrão para citações sem esfera explícita. Padrão "br". */
  jurisdicao?: Jurisdicao;
}
export interface VerificarCitacoesSaida {
  citacoes: {
    /** Trecho como apareceu no texto, ex.: "art. 49 do CDC". */
    citacao: string;
    status: StatusCitacao;
    uri?: LawUri;
    detalhe?: string;
  }[];
}

// ---- Tools MCP: fase 2 (P1) ----

export interface AdicionarNormaEntrada {
  jurisdicao: Jurisdicao;
  tipo: string;
  titulo: string;
  numero?: string;
  data?: string;
  fonte: string;
  texto: string;
}
export interface AdicionarNormaSaida {
  uri: LawUri;
  commit: string;
}

export interface HistoricoNormaEntrada {
  uri: LawUri;
}
export interface HistoricoNormaSaida {
  versoes: { data: string; commit: string; mensagem: string; autor: string }[];
}

/** Anexado a toda resposta que devolve texto legal. */
export const AVISO =
  "Conteúdo informativo de fontes abertas. Não substitui a publicação oficial nem aconselhamento jurídico. Confira a fonte.";
