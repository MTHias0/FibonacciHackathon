/**
 * Catálogo de nomes pelos quais as normas são citadas.
 * Normas que estão na base ganham estes apelidos. As que não estão continuam reconhecidas pelo verificador,
 * que responde "fora_da_base" com a URI certa em vez de confundir com outra norma (ex.: Código Civil BR × ES).
 */
import type { Jurisdicao } from "../types.ts";

export interface EntradaCatalogo {
  jurisdicao: Jurisdicao;
  id: string;
  nome: string;
  apelidos: string[];
}

const br = (id: string, nome: string, apelidos: string[]): EntradaCatalogo => ({ jurisdicao: "br/federal", id, nome, apelidos: [nome, ...apelidos] });
const es = (id: string, nome: string, apelidos: string[]): EntradaCatalogo => ({ jurisdicao: "es", id, nome, apelidos: [nome, ...apelidos] });

export const CATALOGO: EntradaCatalogo[] = [
  br("constituicao-1988", "Constituição Federal", ["CF", "CF/88", "CF/1988", "CRFB", "CRFB/88", "CRFB/1988", "Constituição", "Constituição da República", "Carta Magna", "Constituição Cidadã"]),
  br("lei-10406-2002", "Código Civil", ["CC", "CC/2002", "CC/02", "Código Civil de 2002", "novo Código Civil"]),
  br("lei-13105-2015", "Código de Processo Civil", ["CPC", "CPC/2015", "CPC/15", "NCPC", "novo CPC"]),
  br("decreto-lei-2848-1940", "Código Penal", ["CP"]),
  br("decreto-lei-3689-1941", "Código de Processo Penal", ["CPP"]),
  br("lei-5172-1966", "Código Tributário Nacional", ["CTN"]),
  br("lei-9503-1997", "Código de Trânsito Brasileiro", ["CTB", "Código de Trânsito"]),
  br("lei-8078-1990", "Código de Defesa do Consumidor", ["CDC"]),
  br("decreto-lei-5452-1943", "Consolidação das Leis do Trabalho", ["CLT"]),
  br("lei-8069-1990", "Estatuto da Criança e do Adolescente", ["ECA"]),
  br("lei-8245-1991", "Lei do Inquilinato", ["Lei de Locações"]),
  br("lei-13709-2018", "Lei Geral de Proteção de Dados Pessoais", ["LGPD", "Lei Geral de Proteção de Dados"]),
  br("lei-12965-2014", "Marco Civil da Internet", ["MCI"]),
  br("lei-14133-2021", "Lei de Licitações e Contratos Administrativos", ["Nova Lei de Licitações", "Lei de Licitações", "NLLC"]),
  br("lei-8666-1993", "Lei de Licitações de 1993", ["antiga Lei de Licitações"]),
  br("lei-8112-1990", "Regime Jurídico dos Servidores Públicos Civis da União", ["Estatuto dos Servidores Públicos", "RJU"]),
  br("lei-11340-2006", "Lei Maria da Penha", []),
  br("lei-11343-2006", "Lei de Drogas", ["Lei Antidrogas"]),
  br("lei-10741-2003", "Estatuto da Pessoa Idosa", ["Estatuto do Idoso"]),
  br("lei-9099-1995", "Lei dos Juizados Especiais", ["Lei dos Juizados Especiais Cíveis e Criminais"]),
  br("lei-8429-1992", "Lei de Improbidade Administrativa", ["LIA"]),
  br("lei-9307-1996", "Lei de Arbitragem", []),
  br("lei-12846-2013", "Lei Anticorrupção", ["Lei da Empresa Limpa"]),
  br("lei-12527-2011", "Lei de Acesso à Informação", ["LAI"]),
  br("lei-13146-2015", "Estatuto da Pessoa com Deficiência", ["Lei Brasileira de Inclusão", "LBI"]),
  br("lei-7210-1984", "Lei de Execução Penal", ["LEP"]),
  br("lei-12016-2009", "Lei do Mandado de Segurança", []),
  br("lei-8213-1991", "Lei de Benefícios da Previdência Social", ["Lei de Benefícios"]),
  br("lei-9613-1998", "Lei de Lavagem de Dinheiro", ["Lei de Lavagem"]),
  br("lei-complementar-123-2006", "Estatuto Nacional da Microempresa e da Empresa de Pequeno Porte", ["Lei do Simples Nacional", "Simples Nacional", "Estatuto da Microempresa"]),
  br("lei-9279-1996", "Lei de Propriedade Industrial", ["LPI"]),
  br("lei-4737-1965", "Código Eleitoral", []),
  br("lei-12651-2012", "Código Florestal", []),
  br("decreto-lei-1001-1969", "Código Penal Militar", ["CPM"]),
  br("decreto-lei-1002-1969", "Código de Processo Penal Militar", ["CPPM"]),
  br("lei-7565-1986", "Código Brasileiro de Aeronáutica", ["CBA"]),
  br("lei-556-1850", "Código Comercial", []),
  br("lei-13467-2017", "Reforma Trabalhista", []),
  br("lei-13964-2019", "Pacote Anticrime", ["Lei Anticrime"]),
  br("lei-13874-2019", "Lei da Liberdade Econômica", ["Declaração de Direitos de Liberdade Econômica"]),
  br("emenda-constitucional-103-2019", "Reforma da Previdência", []),
  es("BOE-A-1978-31229", "Constitución Española", ["CE", "Constitución"]),
  es("BOE-A-1889-4763", "Código Civil", ["CC"]),
  es("BOE-A-2015-11430", "Estatuto de los Trabajadores", ["ET"]),
  es("BOE-A-2007-20555", "Ley General para la Defensa de los Consumidores y Usuarios", ["TRLGDCU"]),
  es("BOE-A-2018-16673", "Ley Orgánica de Protección de Datos Personales y garantía de los derechos digitales", ["LOPDGDD"]),
];

export const uriCatalogo = (e: EntradaCatalogo) => `law://${e.jurisdicao}/${e.id}` as const;
