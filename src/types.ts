/**
 * Contrato do LawMCP. É a fonte única dos tipos compartilhados entre MCP, dados e infra.
 * Mudanças aqui afetam o time inteiro: combine antes de alterar e registre em CONTEXTO.md.
 */

/** Hierarquia separada por "/": "br/federal", "br/sp/birigui", "es", "local/escritorio-x". */
export type Jurisdicao = string;

export type Situacao = "vigente" | "revogada" | "desconhecida";

/**
 * URI estável e citável: law://{jurisdicao}/{id}[/art-N[/dispositivo]].
 * Ex.: law://br/federal/lei-8078-1990/art-49 · law://br/federal/constituicao-1988/art-5/inc-13 · law://es/BOE-A-1978-31229/art-14
 */
export type LawUri = `law://${string}`;

export type TipoAlteracao = "redacao" | "inclusao" | "revogacao" | "renumeracao" | "vigencia" | "vide" | "outro";

/** Uma entrada da genealogia de um dispositivo: quem o alterou e como. */
export interface Alteracao {
  /** "caput", "inc-13", "par-1", "par-unico". */
  dispositivo: string;
  tipo: TipoAlteracao;
  /** Nota original, ex.: "Redação dada pela Lei nº 13.467, de 2017". */
  nota: string;
  /** Norma alteradora, quando identificada (pode não estar na base). */
  norma?: LawUri;
  rotuloNorma?: string;
}

/** Modelo unificado: todo adaptador de fonte converte o seu formato para Norma. */
export interface Norma {
  uri: LawUri;
  jurisdicao: Jurisdicao;
  /** lei, decreto, código, artigo, artículo… */
  tipo: string;
  titulo: string;
  numero?: string;
  /** Data real em ISO 8601, lida do frontmatter (nunca da data do commit, que não representa datas antes de 1970). */
  data?: string;
  situacao: Situacao;
  /** URL oficial. */
  fonte: string;
  /** Texto em Markdown. */
  texto: string;
  origem: Origem;
  /** Nomes pelos quais a norma é citada ("CDC", "Lei nº 8.078/1990"). Usado por verificar_citacoes. */
  apelidos?: string[];
  /** Genealogia por dispositivo (artigos com histórico de alteração). */
  alteracoes?: Alteracao[];
}

export interface Origem {
  /** "Evaldoes/legislacao-br", "LawCodex/br", "ctresb/leis", "legalize-dev/legalize-es", "local". */
  repo: string;
  /** Caminho do arquivo dentro do repo. */
  caminho: string;
  /** Commit exato do texto usado. */
  commit?: string;
  /** Link imutável para o texto naquele commit: a "lei com recibo". */
  permalink?: string;
}

/** Contrato de cada fonte de dados. Para adicionar um país ou município, basta um novo adaptador em FONTES. */
export interface Adaptador {
  nome: string;
  jurisdicoes: Jurisdicao[];
  carregar(diretorio: string): Promise<Norma[]>;
}

/** Item de lista sem o texto completo, para respostas leves. */
export type ResumoNorma = Pick<Norma, "uri" | "jurisdicao" | "tipo" | "titulo" | "data" | "situacao" | "fonte">;

// ---- Tools MCP: entradas e saídas ----

export interface ListarJurisdicoesSaida {
  jurisdicoes: { jurisdicao: Jurisdicao; tipos: string[]; total: number; fontes: { repo: string; commit?: string }[] }[];
  total: number;
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
  /** Norma, artigo ou dispositivo: …/art-5/inc-13, …/art-59/par-1. */
  uri: LawUri;
}
/** truncado: o texto passou do limite da resposta. Leia por artigo (…/art-N). */
export type LerNormaSaida = Norma & { aviso: string; truncado?: boolean };

/** fora_da_base: a norma citada não está carregada, então não dá para afirmar nada sobre ela. */
export type StatusCitacao = "ok" | "revogada" | "inexistente" | "divergente" | "fora_da_base";
export interface VerificarCitacoesEntrada {
  texto: string;
  /** Jurisdição padrão para apelidos ambíguos ("Código Civil"). Padrão "br". */
  jurisdicao?: Jurisdicao;
}
export interface CitacaoVerificada {
  /** Trecho como apareceu no texto, ex.: "art. 49 do CDC". */
  citacao: string;
  status: StatusCitacao;
  uri?: LawUri;
  detalhe?: string;
  permalink?: string;
}
export interface VerificarCitacoesSaida {
  citacoes: CitacaoVerificada[];
  resumo: Record<StatusCitacao, number>;
}

export interface CompararJurisdicoesEntrada {
  /** Uma consulta por jurisdição, já no idioma dela (o modelo traduz). */
  consultas: { jurisdicao: Jurisdicao; consulta: string }[];
  limite?: number;
}
export interface CompararJurisdicoesSaida {
  comparacao: { jurisdicao: Jurisdicao; consulta: string; resultados: BuscarNormasSaida["resultados"] }[];
}

export interface HistoricoNormaEntrada {
  uri: LawUri;
}
export interface HistoricoNormaSaida {
  uri: LawUri;
  titulo: string;
  /** Para artigo ou dispositivo: cada alteração, com o dispositivo e a norma alteradora. */
  alteracoes: (Alteracao & { uriDispositivo: LawUri })[];
  /** Para norma inteira: quais normas mais a alteraram. */
  alteradoras: { norma?: LawUri; rotulo: string; total: number; naBase: boolean }[];
  total: number;
  /** Só normas privadas (law://local/…): versões no git local, da mais nova para a mais antiga. */
  versoes?: VersaoNorma[];
}

/** Um commit de uma norma privada, com os artigos que mudaram em relação à versão anterior. */
export interface VersaoNorma {
  commit: string;
  /** ISO 8601. */
  data: string;
  mensagem: string;
  incluidos: string[];
  alterados: string[];
  removidos: string[];
}

export interface ImpactoNormaEntrada {
  /** URI ou nome: "law://br/federal/lei-13467-2017", "Lei 13.467/2017", "Reforma Trabalhista". */
  norma: string;
  limite?: number;
}
export interface ImpactoNormaSaida {
  norma: { uri: LawUri; rotulo: string; naBase: boolean };
  total: number;
  porNorma: {
    uri: LawUri;
    titulo: string;
    total: number;
    dispositivos: { uri: LawUri; dispositivo: string; tipo: TipoAlteracao; nota: string }[];
  }[];
}

export interface AdicionarNormaEntrada {
  /** Slug da organização: a norma entra em law://local/{organizacao}/…, nunca numa jurisdição oficial. */
  organizacao: string;
  tipo: string;
  titulo: string;
  numero?: string;
  data?: string;
  fonte: string;
  texto: string;
  apelidos?: string[];
}
export interface AdicionarNormaSaida {
  uri: LawUri;
  commit: string;
  artigos: number;
}

export interface ImportarNormasEntrada {
  organizacao: string;
  /** Pasta com um .md por norma (frontmatter opcional: titulo, tipo, numero, data, fonte, apelidos). */
  pasta: string;
  /** Padrões para arquivos sem esses campos no frontmatter. */
  tipo?: string;
  fonte?: string;
}
export interface ImportarNormasSaida {
  jurisdicao: string;
  commit: string;
  total: number;
  novas: number;
  atualizadas: number;
  inalteradas: number;
  normas: { uri: LawUri; titulo: string; artigos: number }[];
  ignorados: { arquivo: string; motivo: string }[];
}

/** Anexado a toda resposta que devolve texto legal. */
export const AVISO =
  "Conteúdo informativo de fontes abertas. Não substitui a publicação oficial nem aconselhamento jurídico. Confira a fonte e o permalink.";
