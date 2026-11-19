// LawMCP chat: cliente da ponte web/servidor.ts, que fala MCP com o LawMCP. Sem framework, sem build.
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const seguro = (url) => (/^https?:\/\//.test(url ?? "") ? esc(url) : "#");
const calmo = matchMedia("(prefers-reduced-motion: reduce)");
const fmt = new Intl.NumberFormat("pt-BR");

const ICONES = {
  auto: '<path d="M5 18.5V7a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 19 7v6a2.5 2.5 0 0 1-2.5 2.5H9z"/>',
  buscar: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  verificar: '<path d="M12 3 4.5 6v5.5c0 4.3 3.1 7.6 7.5 9 4.4-1.4 7.5-4.7 7.5-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  impacto: '<path d="M5 20v-8M11 20V5M17 20v-5"/>',
  historico: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5M12 8v4l3 2"/>',
  comparar: '<path d="M8 4v16M16 4v16M4 9h8M12 15h8"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  seta: '<path d="m6 9 6 6 6-6"/>',
  copiar: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  lixo: '<path d="M5 7h14M10 11v6M14 11v6M6.5 7l.8 11.2A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.8L17.5 7M9.5 7V5h5v2"/>',
};
const icone = (nome) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome]}</svg>`;
const EXTERNO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
const SELO = '<svg class="selo" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18.5"/><circle cx="20" cy="20" r="14" class="tracejado"/><text x="20" y="26" text-anchor="middle">§</text></svg>';

const MODOS = [
  { id: "auto", nome: "Perguntar", dica: "Pergunte sobre uma lei ou cole um texto com citações…" },
  { id: "buscar", nome: "Buscar", dica: "Palavras-chave: direito de arrependimento, IPTU, teletrabalho…" },
  { id: "verificar", nome: "Verificar citações", dica: "Cole uma petição, parecer ou resposta de IA com citações de lei…" },
  { id: "impacto", nome: "O que mudou", dica: "Nome ou número da lei: Reforma Trabalhista, Lei 13.467/2017, LGPD…" },
  { id: "historico", nome: "Histórico", dica: "Cite o artigo (art. 59 da CLT) ou cole uma URI law://…" },
  { id: "comparar", nome: "Brasil × Espanha", dica: "Tema em português | tema em espanhol" },
];
const SUGESTOES = [
  { modo: "auto", rotulo: "O art. 49 do CDC ainda vale?", texto: "O art. 49 do CDC ainda vale? Cite a fonte." },
  { modo: "verificar", rotulo: "Pegar lei inventada", texto: "Segundo o art. 999 do CDC e o art. 7º, inciso XCIX, da CF, o consumidor recebe em dobro. Ver também o art. 5º, XIII, da CF." },
  { modo: "impacto", rotulo: "O que a Reforma Trabalhista mudou?", texto: "O que a Reforma Trabalhista mudou na CLT?" },
  { modo: "historico", rotulo: "Quem alterou o art. 59 da CLT?", texto: "Quem alterou o art. 59 da CLT?" },
  { modo: "comparar", rotulo: "Igualdade no Brasil e na Espanha", texto: "todos são iguais perante a lei | los españoles son iguales ante la ley" },
  { modo: "buscar", rotulo: "Leis de Birigui sobre IPTU", texto: "Que leis de Birigui falam de IPTU?" },
];
const STATUS = {
  ok: ["OK", "ok"], vigente: ["Vigente"], revogada: ["Revogada"], inexistente: ["Inexistente"],
  divergente: ["Divergente"], fora_da_base: ["Fora da base"], desconhecida: ["Situação na fonte"],
};
const TIPOS = { redacao: "redação dada", inclusao: "incluído", revogacao: "revogado", renumeracao: "renumerado", vigencia: "vigência", vide: "vide", outro: "outro" };
const carimbo = (s, i = 0) => `<span class="status carimbo" data-s="${esc(s)}" style="--i:${i}">${esc(STATUS[s]?.[0] ?? s)}</span>`;

// ---------- Ponte ----------
async function api(caminho, corpo) {
  const r = await fetch(caminho, corpo ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) } : undefined);
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro ?? `Erro ${r.status}`);
  return dados;
}

// ---------- Formatação ----------
function romano(n) {
  let s = "";
  for (const [v, r] of [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]) while (n >= v) { s += r; n -= v; }
  return s;
}
/** "par-2-inc-1" → "§ 2º, inciso I"; "art-4/par-unico" → "art. 4º, parágrafo único". */
function dispositivo(d) {
  return d.split(/[/-](?=art|par|inc|ali)/).map((p) => {
    const [tipo, num] = p.split("-");
    if (tipo === "caput") return "caput";
    if (tipo === "art") return `art. ${num}${Number(num) < 10 ? "º" : ""}`;
    if (tipo === "par") return num === "unico" ? "parágrafo único" : `§ ${num}º`;
    if (tipo === "inc") return `inciso ${romano(Number(num))}`;
    return p;
  }).join(", ");
}
const limparTrecho = (t) => String(t ?? "").replace(/<a id="[^"]*"><\/a>/g, "").replace(/#{1,6}\s*/g, "").replace(/\*\*/g, "");
function destacar(texto, consulta) {
  const termos = String(consulta ?? "").split(/\s+/).filter((t) => t.length > 3).map((t) => t.slice(0, 6).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!termos.length) return esc(texto);
  const re = new RegExp(`((?:${termos.join("|")})[\\p{L}\\d]*)`, "giu");
  return String(texto).split(re).map((p, i) => (i % 2 ? `<mark>${esc(p)}</mark>` : esc(p))).join("");
}
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
function markdown(t) {
  return String(t ?? "").replace(/<a id="[^"]*"><\/a>/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((b) => {
    const h = b.match(/^(#{1,6})\s+([\s\S]*)$/);
    if (h) return h[1].length <= 2 ? `<h3>${inline(h[2])}</h3>` : `<h4>${inline(h[2])}</h4>`;
    if (b.startsWith(">")) return `<blockquote>${inline(b.replace(/^>\s?/gm, ""))}</blockquote>`;
    return `<p>${inline(b).replace(/\n/g, "<br>")}</p>`;
  }).join("");
}
const data = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "");
const commit = (url) => url?.match(/\/(?:blob|tree)\/([0-9a-f]{7,40})\//)?.[1]?.slice(0, 7);
const plural = (n, um, varios) => `${fmt.format(n)} ${n === 1 ? um : varios}`;

function contar(el, alvo, ms = 1100) {
  if (calmo.matches) { el.textContent = fmt.format(alvo); return; }
  const inicio = performance.now();
  const passo = (t) => {
    const k = Math.min(1, (t - inicio) / ms);
    el.textContent = fmt.format(Math.round(alvo * (1 - (1 - k) ** 3)));
    if (k < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

// ---------- Blocos por tool ----------
const BANDEIRAS = {
  br: '<svg class="bandeira" viewBox="0 0 22 15" aria-hidden="true"><rect width="22" height="15" fill="#009B3A"/><path d="M11 2 20 7.5 11 13 2 7.5z" fill="#FEDF00"/><circle cx="11" cy="7.5" r="3.2" fill="#002776"/></svg>',
  es: '<svg class="bandeira" viewBox="0 0 22 15" aria-hidden="true"><rect width="22" height="15" fill="#AA151B"/><rect y="3.75" width="22" height="7.5" fill="#F1BF00"/></svg>',
};
const NOME_JURIS = { br: "Brasil", es: "Espanha" };
const ROTULO_JURIS = { ...NOME_JURIS, "br/federal": "Brasil · Federal", "br/sp/birigui": "Brasil · Birigui (SP)" };
const rotuloJuris = (j) => ROTULO_JURIS[j] ?? j;
const textoUsuario = (texto, jurisdicao) => esc(texto) + (jurisdicao ? `<br><span class="marca-filtro">Só ${esc(rotuloJuris(jurisdicao))}</span>` : "");
const meta = (n, i = 0) => `<div class="meta">${carimbo(n.situacao, i)}<span class="etiqueta">${esc(n.jurisdicao)}</span><span>${esc(n.tipo)}</span>${n.data ? `<span>${data(n.data)}</span>` : ""}</div>`;

function cartaoNorma(n, i, consulta) {
  return `<button class="cartao" type="button" data-ler="${esc(n.uri)}" style="--i:${i}">
    ${meta(n, i)}<h4>${esc(n.titulo)}</h4>
    ${n.trecho ? `<p class="trecho">${destacar(limparTrecho(n.trecho), consulta)}</p>` : ""}
    <span class="uri">${esc(n.uri)}</span>
  </button>`;
}

function recibo(n) {
  const o = n.origem ?? {};
  const linhas = [["URI", n.uri], ["Fonte", o.repo], ["Arquivo", o.caminho], ["Commit", commit(o.permalink) ?? o.commit?.slice(0, 7)], ["Alterações", n.alteracoes?.length || null]]
    .filter(([, v]) => v).map(([k, v]) => `<div class="linha"><span>${k}</span><span>${esc(v)}</span></div>`).join("");
  return `<div class="recibo" role="group" aria-label="Recibo da fonte">
    <div class="linha"><span>Recibo · LawMCP</span><span>${esc(n.jurisdicao)}</span></div><hr>${linhas}<hr>
    <div class="linha"><span>Texto no commit exato</span><span>${o.permalink ? `<a class="link" href="${seguro(o.permalink)}" target="_blank" rel="noopener">Abrir permalink ${EXTERNO}</a>` : "sem permalink"}</span></div>
  </div>`;
}

const blocoLeitura = (n) => `<article class="cartao norma">${meta(n)}<h4>${esc(n.titulo)}</h4>
    <div class="texto">${markdown(n.texto)}</div>
    <div class="acoes">
      <button class="botao-mini" type="button" data-ler="${esc(n.uri)}">Ler completo</button>
      <button class="botao-mini" type="button" data-hist="${esc(n.uri)}">Quem alterou?</button>
      <a class="link" href="${seguro(n.fonte)}" target="_blank" rel="noopener">Fonte oficial ${EXTERNO}</a>
    </div>
  </article>${recibo(n)}`;

function blocoVerificacao(r, compacto) {
  if (compacto) return "";
  const placar = Object.entries(r.resumo).filter(([, n]) => n).map(([s, n], i) => `<span class="status carimbo" data-s="${s}" style="--i:${i}"><b>${n}</b> ${esc(STATUS[s][0])}</span>`).join("");
  const itens = r.citacoes.map((c, i) => `<article class="cartao citacao" style="--i:${i}">
      <span class="texto-citacao">${esc(c.citacao)}</span>${carimbo(c.status, i)}
      ${c.detalhe ? `<p class="detalhe">${esc(c.detalhe)}</p>` : ""}
      <div class="acoes">
        ${c.uri && c.status !== "inexistente" ? `<button class="botao-mini" type="button" data-ler="${esc(c.uri)}">Ler dispositivo</button>` : ""}
        ${c.permalink ? `<a class="link" href="${seguro(c.permalink)}" target="_blank" rel="noopener">Permalink ${EXTERNO}</a>` : ""}
        ${c.uri ? `<span class="uri">${esc(c.uri)}</span>` : ""}
      </div>
    </article>`).join("");
  return `${placar ? `<div class="placar">${placar}</div>` : ""}<div class="cartoes">${itens}</div>`;
}

const barra = (rotulo, total, max, i, extra = "") => `<div class="barra-item" style="--i:${i}">
    <div class="topo-barra"><span>${esc(rotulo)}</span><b>${fmt.format(total)}</b></div>
    <div class="trilho"><i style="--w:${(total / max) * 100}%;--i:${i}"></i></div>${extra}</div>`;

function blocoHistorico(r) {
  if (r.alteracoes.length) {
    return `<ol class="tempo">${r.alteracoes.map((a, i) => `<li style="--i:${i}">
        <span class="disp">${esc(dispositivo(a.dispositivo))}</span> <span class="etiqueta">${esc(TIPOS[a.tipo] ?? a.tipo)}</span>
        <p class="nota">${esc(a.nota)}</p>
        ${a.norma ? `<button class="botao-mini" type="button" data-impacto="${esc(a.norma)}">O que a ${esc(a.rotuloNorma ?? "norma")} mudou?</button>` : ""}
      </li>`).join("")}</ol>`;
  }
  const max = Math.max(1, ...r.alteradoras.map((a) => a.total));
  return `<div class="barras">${r.alteradoras.slice(0, 12).map((a, i) => barra(a.rotulo, a.total, max, i)).join("")}</div>`;
}

function blocoImpacto(r) {
  if (!r.total) return `<div class="cartao">${esc(r.observacao ?? "Nenhuma alteração registrada na base.")}</div>`;
  const max = Math.max(1, ...r.porNorma.map((p) => p.total));
  const grupos = r.porNorma.map((p, i) => barra(p.titulo, p.total, max, i, `<div class="dispositivos">${p.dispositivos.map((d) => `<button type="button" data-ler="${esc(d.uri)}" data-t="${esc(d.tipo)}" title="${esc(d.nota)}">${esc(dispositivo(d.uri.slice(p.uri.length + 1)))}</button>`).join("")}
      ${p.total > p.dispositivos.length ? `<span class="etiqueta">+${p.total - p.dispositivos.length}</span>` : ""}</div>`)).join("");
  return `<div class="legenda"><span>▭ redação dada</span><span>┄ incluído</span><span><s>revogado</s></span></div><div class="barras">${grupos}</div>`;
}

const blocoComparar = (r) => `<div class="lado-a-lado">${r.comparacao.map((c) => `<div class="coluna">
      <h4>${BANDEIRAS[c.jurisdicao] ?? ""}${esc(NOME_JURIS[c.jurisdicao] ?? c.jurisdicao)}</h4>
      ${c.resultados.length ? c.resultados.map((n, i) => cartaoNorma(n, i, c.consulta)).join("") : `<div class="cartao">Nada encontrado para “${esc(c.consulta)}”.</div>`}
    </div>`).join("")}</div>`;

const blocoBusca = (r, args) => (r.resultados.length ? `<div class="cartoes">${r.resultados.map((n, i) => cartaoNorma(n, i, args.consulta)).join("")}</div>` : "");

function resumo(p) {
  const r = p.resultado;
  if (p.erro) return "Não consegui responder com o LawMCP.";
  switch (p.tool) {
    case "buscar_normas": return r.resultados.length
      ? `Encontrei <strong>${plural(r.resultados.length, "norma", "normas")}</strong> para “${esc(p.args.consulta)}”${p.args.jurisdicao ? ` (${esc(rotuloJuris(p.args.jurisdicao))})` : ""}. Abra uma para ler o texto oficial.`
      : `Não encontrei nada para “${esc(p.args.consulta)}”. A busca usa o vocabulário da lei: tente termos como “acidente de trânsito” ou “reparar o dano”.`;
    case "ler_norma": return r.situacao === "desconhecida" ? `Aqui está <strong>${esc(r.titulo)}</strong>, com o recibo da fonte.` : `<strong>${esc(r.titulo)}</strong> está ${esc(r.situacao)}. Segue o texto oficial com o recibo da fonte.`;
    case "verificar_citacoes": {
      const n = r.citacoes.length;
      const ruins = n - r.resumo.ok;
      if (!n) return "Não encontrei citações de lei nesse texto.";
      return ruins ? `Conferi ${plural(n, "citação", "citações")}: <strong>${ruins} ${ruins === 1 ? "tem" : "têm"} problema</strong>.` : `${n === 1 ? "A citação confere" : `As <strong>${n}</strong> citações conferem`} com o texto oficial.`;
    }
    case "historico_norma": return r.total ? `<strong>${esc(r.titulo)}</strong> tem ${plural(r.total, "alteração registrada", "alterações registradas")}.` : `Não há alterações registradas para ${esc(r.titulo)}.`;
    case "impacto_da_norma": return `A ${esc(r.norma.rotulo)} alterou, incluiu ou revogou <strong>${plural(r.total, "dispositivo", "dispositivos")}</strong>${r.porNorma.length ? ` em ${plural(r.porNorma.length, "norma", "normas")} da base` : ""}.`;
    case "comparar_jurisdicoes": return "O mesmo tema no Brasil e na Espanha, lado a lado.";
    default: return "Pronto.";
  }
}

function bloco(p, compacto) {
  if (p.erro) return `<div class="cartao erro-cartao">${esc(p.erro)}</div>`;
  const r = p.resultado;
  switch (p.tool) {
    case "buscar_normas": return blocoBusca(r, p.args);
    case "ler_norma": return blocoLeitura(r);
    case "verificar_citacoes": return blocoVerificacao(r, compacto);
    case "historico_norma": return blocoHistorico(r);
    case "impacto_da_norma": return blocoImpacto(r);
    case "comparar_jurisdicoes": return blocoComparar(r);
    default: return `<pre>${esc(JSON.stringify(r, null, 2))}</pre>`;
  }
}

/** Linha "Usou X → Y · N ms" que abre os argumentos de cada chamada. */
const nomeModelo = (m) => String(m).split(":")[0];

function passosHtml(passos, traducao) {
  const ms = passos.reduce((s, p) => s + p.ms, traducao?.ms ?? 0);
  const nomes = [...(traducao ? [`<code>${esc(nomeModelo(traducao.modelo))}</code>`] : []), ...passos.map((p) => `<code>${esc(p.tool)}</code>`)].join(" → ");
  const lista = (traducao ? `<li><b>${esc(traducao.modelo)}</b> (Ollama, local) “${esc(traducao.de)}” → “${esc(traducao.para)}” · ${traducao.ms} ms</li>` : "") + passos.map((p) => `<li><b>${esc(p.tool)}</b> ${esc(JSON.stringify(p.args))} · ${p.ms} ms${p.tool === "verificar_citacoes" && passos.length > 1 ? ` · ${esc(p.resultado?.citacoes?.[0]?.citacao ?? "")} → ${esc(p.resultado?.citacoes?.[0]?.status ?? "")}` : ""}</li>`).join("");
  return `<button class="passos" type="button" aria-expanded="false">${icone("check")}Usou ${nomes} · ${ms} ms${icone("seta")}</button><ol class="passos-lista" hidden>${lista}</ol>`;
}

// ---------- Histórico de conversas (só neste navegador) ----------
const CHAVE = "lawmcp.conversas.v1";
const MAX_CONVERSAS = 20;
let conversas = [];
try { conversas = JSON.parse(localStorage.getItem(CHAVE) ?? "[]"); } catch { conversas = []; }
let atual = null;

function salvar() {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try { localStorage.setItem(CHAVE, JSON.stringify(conversas.slice(0, MAX_CONVERSAS))); return; } catch { conversas = conversas.slice(0, Math.max(1, conversas.length - 5)); }
  }
}
const conversaAtual = () => conversas.find((c) => c.id === atual);

function listarConversas() {
  const lista = $("#conversas");
  lista.innerHTML = conversas.length
    ? conversas.map((c) => `<li><button class="conversa-item" type="button" data-conversa="${esc(c.id)}" aria-current="${c.id === atual}">${esc(c.titulo)}</button>
        <button class="apagar" type="button" data-apagar="${esc(c.id)}" aria-label="Apagar conversa ${esc(c.titulo)}">${icone("lixo")}</button></li>`).join("")
    : '<li class="vazia">Suas conversas aparecem aqui.</li>';
  $("#titulo-conversa").textContent = conversaAtual()?.titulo ?? "Nova conversa";
}

// ---------- Conversa ----------
const mensagens = $("#mensagens");
const rolagem = $("#rolagem");
const fluxo = $("#fluxo");
const entrada = $("#entrada");
let modo = "auto";
let ocupado = false;

/** Troca entre a tela inicial e a conversa; a caixa de mensagem desliza com View Transition. */
function mudarTela(vazio) {
  if (String(vazio) === document.body.dataset.vazio) return;
  const trocar = () => { document.body.dataset.vazio = String(vazio); };
  if (document.startViewTransition && !calmo.matches) document.startViewTransition(trocar);
  else trocar();
}

function adicionar(classe, html, animar = true) {
  const li = document.createElement("li");
  li.className = `msg ${classe}${animar ? " nova-msg" : ""}`;
  li.innerHTML = html;
  mensagens.append(li);
  return li;
}

function renderResposta(passos, traducao) {
  const final = passos.at(-1);
  const blocos = passos.map((p, i) => bloco(p, i < passos.length - 1)).join("");
  const traduzido = traducao ? "Traduzi sua pergunta para a linguagem da lei. " : "";
  return `${SELO}<div class="corpo">${passosHtml(passos, traducao)}<p class="resumo">${traduzido}${resumo(final)}</p>${blocos}
    <div class="acoes-msg"><button class="acao-msg" type="button" data-copiar-msg>${icone("copiar")}<span>Copiar</span></button></div></div>`;
}

function renderItem(item, animar) {
  if (item.usuario !== undefined) return adicionar("msg-usuario", textoUsuario(item.usuario, item.jurisdicao), animar);
  if (item.erro) return adicionar("msg-resposta", `${SELO}<div class="corpo"><div class="cartao erro-cartao">${esc(item.erro)}</div></div>`, animar);
  return adicionar("msg-resposta", renderResposta(item.passos, item.traducao), animar);
}

function abrirConversa(id) {
  atual = id;
  mensagens.replaceChildren();
  const c = conversaAtual();
  c?.itens.forEach((item) => renderItem(item, false));
  mudarTela(!c);
  listarConversas();
  fecharLateral();
  requestAnimationFrame(() => rolagem.scrollTo({ top: rolagem.scrollHeight, behavior: "auto" }));
}

async function enviar(texto, modoEnvio = modo) {
  texto = texto.trim();
  if (!texto || ocupado) return;
  ocupado = true;
  atualizarEnviar();
  if (!conversaAtual()) {
    atual = crypto.randomUUID();
    conversas.unshift({ id: atual, titulo: texto.replace(/\s+/g, " ").slice(0, 60), itens: [] });
  }
  const conversa = conversaAtual();
  const jurisdicao = FILTRA.has(modoEnvio) ? filtro.value : "";
  conversa.itens.push({ usuario: texto, modo: modoEnvio, ...(jurisdicao ? { jurisdicao } : {}) });
  listarConversas();
  mudarTela(false);
  const pergunta = adicionar("msg-usuario", textoUsuario(texto, jurisdicao));
  const resposta = adicionar("msg-resposta", `${SELO}<div class="corpo"><div class="pensando" role="status"><span class="pontos" aria-hidden="true"><i></i><i></i><i></i></span><span class="texto-brilho">Consultando o LawMCP · ${esc(MODOS.find((m) => m.id === modoEnvio)?.nome)}</span></div></div>`);
  rolagem.scrollTo({ top: rolagem.scrollHeight });
  fluxo.classList.remove("feito");
  fluxo.classList.add("ativo");
  try {
    const { passos, traducao } = await api("/api/chat", { texto, modo: modoEnvio, jurisdicao });
    conversa.itens.push({ passos, traducao });
    resposta.innerHTML = renderResposta(passos, traducao);
    if (traducao) registrar({ tool: `ollama · ${nomeModelo(traducao.modelo)}`, args: { pergunta: traducao.de }, resultado: { consulta: traducao.para, modelo: traducao.modelo }, ms: traducao.ms });
    passos.forEach(registrar);
  } catch (err) {
    conversa.itens.push({ erro: err.message });
    resposta.querySelector(".corpo").innerHTML = `<div class="cartao erro-cartao">${esc(err.message)}</div>`;
  } finally {
    salvar();
    fluxo.classList.remove("ativo");
    void fluxo.offsetWidth;
    fluxo.classList.add("feito");
    ocupado = false;
    atualizarEnviar();
    pergunta.scrollIntoView({ behavior: calmo.matches ? "auto" : "smooth", block: "start" });
  }
}

// ---------- Bastidores ----------
let totalChamadas = 0;
function registrar(p) {
  const lista = $("#chamadas");
  lista.querySelector(".nenhuma")?.remove();
  const li = document.createElement("li");
  li.className = `chamada${p.erro ? " falhou" : ""}`;
  const saida = JSON.stringify(p.erro ?? p.resultado, null, 2);
  li.innerHTML = `<details><summary><span class="ponto" aria-hidden="true"></span>${esc(p.tool)}<span class="ms">${p.ms} ms</span></summary>
    <pre>→ tools/call ${esc(JSON.stringify(p.args))}\n\n← ${esc(saida.length > 2500 ? `${saida.slice(0, 2500)}\n…` : saida)}</pre></details>`;
  lista.prepend(li);
  totalChamadas++;
  const botao = $("#abrir-bastidores");
  (botao.querySelector(".contador") ?? botao.appendChild(Object.assign(document.createElement("span"), { className: "contador" }))).textContent = totalChamadas;
}

const bastidores = $("#bastidores");
function alternarBastidores(abrir) {
  bastidores.hidden = !abrir;
  $("#abrir-bastidores").setAttribute("aria-expanded", abrir);
  try { localStorage.setItem("lawmcp.bastidores", abrir ? "1" : "0"); } catch { /* preferência opcional */ }
}
$("#abrir-bastidores").addEventListener("click", () => alternarBastidores(bastidores.hidden));
$("#fechar-bastidores").addEventListener("click", () => alternarBastidores(false));
try { if (localStorage.getItem("lawmcp.bastidores") !== "0" && innerWidth > 1180) alternarBastidores(true); } catch { /* preferência opcional */ }

// ---------- Barra lateral no celular ----------
const lateral = $("#lateral");
const veu = $("#veu");
function abrirLateral() { lateral.classList.add("aberta"); veu.hidden = false; $("#abrir-lateral").setAttribute("aria-expanded", "true"); }
function fecharLateral() { lateral.classList.remove("aberta"); veu.hidden = true; $("#abrir-lateral").setAttribute("aria-expanded", "false"); }
$("#abrir-lateral").addEventListener("click", abrirLateral);
veu.addEventListener("click", fecharLateral);

// ---------- Leitor ----------
const leitor = $("#leitor");
const corpoLeitor = $("#leitor-corpo");

async function abrirLeitor(uri) {
  corpoLeitor.innerHTML = `<div class="barra-leitor"><span class="uri">${esc(uri)}</span><button class="botao-mini" type="button" data-fechar>Fechar</button></div>
    <h2 id="leitor-titulo">Carregando…</h2>${'<div class="esqueleto"></div>'.repeat(6)}`;
  if (!leitor.open) leitor.showModal();
  try {
    const p = await api("/api/tool", { nome: "ler_norma", args: { uri } });
    registrar(p);
    if (p.erro) throw new Error(p.erro);
    const n = p.resultado;
    corpoLeitor.innerHTML = `<div class="barra-leitor"><span>${carimbo(n.situacao)}</span><button class="botao-mini" type="button" data-fechar>Fechar</button></div>
      <h2 id="leitor-titulo">${esc(n.titulo)}</h2>
      <div class="meta"><span class="etiqueta">${esc(n.jurisdicao)}</span><span>${esc(n.tipo)}</span>${n.data ? `<span>${data(n.data)}</span>` : ""}<a class="link" href="${seguro(n.fonte)}" target="_blank" rel="noopener">Fonte oficial ${EXTERNO}</a></div>
      ${recibo(n)}
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="botao-mini" type="button" data-hist="${esc(n.uri)}">Quem alterou?</button><button class="botao-mini" type="button" data-copiar="${esc(n.uri)}">Copiar URI</button></div>
      <div class="texto">${markdown(n.texto)}</div>
      <p class="aviso" style="text-align:left">${esc(n.aviso)}</p>`;
  } catch (err) {
    $("#leitor-titulo").textContent = err.message;
    corpoLeitor.querySelectorAll(".esqueleto").forEach((e) => e.remove());
  }
}

async function fecharLeitor() {
  if (!leitor.open) return;
  if (!calmo.matches) await leitor.animate([{ transform: "none" }, { transform: "translateX(100%)" }], { duration: 220, easing: "cubic-bezier(.4,0,1,1)" }).finished;
  leitor.close();
}

async function copiar(texto, botao) {
  try { await navigator.clipboard.writeText(texto); } catch { return; }
  const rotulo = botao.querySelector("span") ?? botao;
  const antes = rotulo.textContent;
  rotulo.textContent = "Copiado";
  setTimeout(() => { rotulo.textContent = antes; }, 1500);
}

// ---------- Eventos ----------
document.addEventListener("click", async (e) => {
  if (e.target === leitor) return fecharLeitor();
  const alvo = e.target.closest("[data-ler],[data-hist],[data-impacto],[data-fechar],[data-copiar],[data-copiar-msg],[data-conversa],[data-apagar],[data-fechar-lateral],.passos");
  if (!alvo) return;
  const d = alvo.dataset;
  if (alvo.classList.contains("passos")) {
    const aberto = alvo.getAttribute("aria-expanded") === "true";
    alvo.setAttribute("aria-expanded", !aberto);
    alvo.nextElementSibling.hidden = aberto;
    return;
  }
  if (d.fecharLateral !== undefined) return fecharLateral();
  if (d.conversa) return abrirConversa(d.conversa);
  if (d.apagar) {
    conversas = conversas.filter((c) => c.id !== d.apagar);
    salvar();
    return d.apagar === atual ? abrirConversa(null) : listarConversas();
  }
  if (d.fechar !== undefined) return fecharLeitor();
  if (d.copiar) return copiar(d.copiar, alvo);
  if (d.copiarMsg !== undefined) {
    const corpo = alvo.closest(".corpo");
    const uris = [...corpo.querySelectorAll(".uri")].map((u) => u.textContent.trim()).filter(Boolean);
    return copiar([corpo.querySelector(".resumo")?.textContent, ...new Set(uris)].join("\n"), alvo);
  }
  if (d.ler) return abrirLeitor(d.ler);
  await fecharLeitor();
  if (d.hist) return enviar(d.hist, "historico");
  if (d.impacto) return enviar(d.impacto, "impacto");
});
leitor.addEventListener("cancel", (e) => { e.preventDefault(); fecharLeitor(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharLateral(); });

$("#nova").addEventListener("click", () => { abrirConversa(null); entrada.focus(); });

const atualizarEnviar = () => { $(".enviar").disabled = ocupado || !entrada.value.trim(); };
const ajustar = () => { entrada.style.height = "auto"; entrada.style.height = `${Math.min(entrada.scrollHeight, 220)}px`; atualizarEnviar(); };
entrada.addEventListener("input", ajustar);
entrada.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); $("#compositor").requestSubmit(); }
});
$("#compositor").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!entrada.value.trim() || ocupado) return;
  const texto = entrada.value;
  entrada.value = "";
  ajustar();
  enviar(texto);
});

// Modos dentro da caixa de mensagem
const modos = $("#modos");
modos.innerHTML = MODOS.map((m) => `<button type="button" role="radio" aria-checked="${m.id === modo}" data-modo="${m.id}" tabindex="${m.id === modo ? 0 : -1}">${icone(m.id)}${m.nome}</button>`).join("");
function escolherModo(id, foco = false) {
  modo = id;
  modos.querySelectorAll("[data-modo]").forEach((b) => {
    const sim = b.dataset.modo === id;
    b.setAttribute("aria-checked", sim);
    b.tabIndex = sim ? 0 : -1;
    if (sim) { b.scrollIntoView({ block: "nearest", inline: "nearest" }); if (foco) b.focus(); }
  });
  entrada.placeholder = MODOS.find((m) => m.id === id).dica;
  filtro.disabled = !FILTRA.has(id);
}

// Filtro de jurisdição: vale para busca e verificação (comparar é sempre BR × ES; impacto parte de uma norma)
const FILTRA = new Set(["auto", "buscar", "verificar", "historico"]);
const filtro = $("#jurisdicao");
const marcarFiltro = () => filtro.closest(".filtro").classList.toggle("ativo", !!filtro.value);
filtro.addEventListener("change", () => {
  marcarFiltro();
  try { localStorage.setItem("lawmcp.jurisdicao", filtro.value); } catch { /* preferência opcional */ }
});
function preencherFiltro(jurisdicoes) {
  const opcoes = [...new Set(jurisdicoes.flatMap((j) => [j.split("/")[0], j]))].sort();
  filtro.innerHTML = `<option value="">Todas</option>` + opcoes.map((j) => `<option value="${esc(j)}">${esc(rotuloJuris(j))}</option>`).join("");
  try { filtro.value = localStorage.getItem("lawmcp.jurisdicao") ?? ""; } catch { /* preferência opcional */ }
  if (filtro.selectedIndex < 0) filtro.value = "";
  marcarFiltro();
}
modos.addEventListener("click", (e) => {
  const b = e.target.closest("[data-modo]");
  if (b) { escolherModo(b.dataset.modo); entrada.focus(); }
});
modos.addEventListener("keydown", (e) => {
  const passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (!passo) return;
  e.preventDefault();
  const i = MODOS.findIndex((m) => m.id === modo);
  escolherModo(MODOS[(i + passo + MODOS.length) % MODOS.length].id, true);
});

// Sugestões da tela inicial
$("#sugestoes").innerHTML = SUGESTOES.map((s, i) => `<button class="sugestao" type="button" data-sugestao="${i}">${icone(s.modo)}${esc(s.rotulo)}</button>`).join("");
$("#sugestoes").addEventListener("click", (e) => {
  const b = e.target.closest("[data-sugestao]");
  if (!b) return;
  const s = SUGESTOES[Number(b.dataset.sugestao)];
  escolherModo(s.modo);
  enviar(s.texto, s.modo);
});

fluxo.querySelectorAll("li").forEach((li, n) => li.style.setProperty("--n", n));
listarConversas();
atualizarEnviar();

// Estado do servidor MCP
(async () => {
  const estado = $("#estado");
  try {
    const { tools, jurisdicoes, tradutor } = await api("/api/estado");
    estado.classList.add("on");
    $("#estado-texto").innerHTML = `MCP conectado · <b data-n="${jurisdicoes.total}">0</b> docs${tradutor ? `<br>IA local: ${esc(nomeModelo(tradutor))}` : ""}`;
    estado.querySelectorAll("[data-n]").forEach((b) => contar(b, Number(b.dataset.n), 1200));
    preencherFiltro(jurisdicoes.jurisdicoes.map((j) => j.jurisdicao));
    $("#tools").innerHTML = tools.map((t) => `<li class="${t.liberada ? "" : "bloqueada"}" title="${esc(t.liberada ? t.description : "Bloqueada na web: grava em disco")}">${esc(t.name)}</li>`).join("");
  } catch {
    estado.classList.add("erro");
    $("#estado-texto").textContent = "MCP fora do ar. Rode npm run web.";
  }
})();
