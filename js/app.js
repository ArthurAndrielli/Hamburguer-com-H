/*
 * Hamburguer com H — cardápio digital
 * Lê os dados de data/config.js (window.CONFIG) e data/menu.js (window.MENU).
 * Todos os valores em dinheiro são tratados em centavos (inteiros).
 */
(function () {
  "use strict";

  const CONFIG = window.CONFIG || {};
  const MENU = window.MENU || { categorias: [] };

  const CHAVE_CARRINHO = "hcomh:carrinho:v1";
  const CHAVE_CLIENTE = "hcomh:cliente:v1";
  const CHAVE_ENVIADO = "hcomh:enviado";
  const MAX_QTD = 99;
  const MAX_ADICIONAL = 10;

  /* ==========================================================
     Utilidades
     ========================================================== */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const centavos = (valor) => Math.round(Number(valor || 0) * 100);

  function brl(c) {
    c = Math.round(c);
    const sinal = c < 0 ? "-" : "";
    c = Math.abs(c);
    const reais = String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return sinal + "R$ " + reais + "," + String(c % 100).padStart(2, "0");
  }

  // "100" | "100,50" | "R$ 1.000,00" | "100.5" -> centavos (ou null se inválido)
  function lerDinheiro(texto) {
    let s = String(texto || "").replace(/[^\d.,]/g, "");
    if (!s) return null;
    if (s.includes(",")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (/\.\d{3}$/.test(s) || (s.match(/\./g) || []).length > 1) {
      s = s.replace(/\./g, "");
    }
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const normalizar = (s) =>
    String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const slug = (s) => normalizar(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const inteiro = (v, min, max) => Math.min(max, Math.max(min, Math.floor(Number(v) || 0)));

  const novoUid = () => Math.random().toString(36).slice(2, 10);

  function formatarTelefone(valor) {
    let d = String(valor || "").replace(/\D/g, "");
    if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
    d = d.slice(0, 11);
    if (d.length <= 2) return d ? "(" + d : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  // Destaca a última letra do nome se for "H" (ex.: Hamburguer com <em>H</em>)
  function nomeMarcado(nome) {
    nome = String(nome || "");
    return /\sH$/.test(nome) ? esc(nome.slice(0, -1)) + "<em>H</em>" : esc(nome);
  }

  const svg = (d) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICONE = {
    mais: svg('<path d="M12 5v14M5 12h14"/>'),
    menos: svg('<path d="M5 12h14"/>'),
    fechar: svg('<path d="M18 6 6 18M6 6l12 12"/>')
  };

  /* ==========================================================
     Horário de funcionamento (fuso America/Sao_Paulo)
     ========================================================== */

  const DIAS_CHAVE = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  const DIAS_NOME = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const DIAS_TITULO = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  // Dia da semana e minutos do dia no fuso da loja. Nunca cria Date a partir
  // de texto (o Safari devolve Invalid Date para vários formatos): monta os
  // números a partir de formatToParts e, se algo falhar, usa a hora local.
  function agoraLoja() {
    const data = new Date();
    const local = { dia: data.getDay(), minutos: data.getHours() * 60 + data.getMinutes() };
    try {
      const partes = new Intl.DateTimeFormat("pt-BR", {
        timeZone: CONFIG.fusoHorario || "America/Sao_Paulo",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: false
      }).formatToParts(data);
      const parte = (t) => {
        const p = partes.filter((x) => x.type === t)[0];
        return p ? parseInt(p.value, 10) : NaN;
      };
      const ano = parte("year"), mes = parte("month"), diaMes = parte("day");
      const hora = parte("hour") % 24, minuto = parte("minute");
      if ([ano, mes, diaMes, hora, minuto].some((n) => isNaN(n))) return local;
      const dia = new Date(Date.UTC(ano, mes - 1, diaMes)).getUTCDay();
      return { dia: dia, minutos: hora * 60 + minuto };
    } catch (e) {
      return local;
    }
  }

  function paraMinutos(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "").trim());
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }

  function formatarHora(min) {
    min = min % 1440;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h + "h" + (m ? String(m).padStart(2, "0") : "");
  }

  // Janela de funcionamento do dia (0–6) em minutos, ou null se fechado.
  // Se fechar depois da meia-noite, "fecha" passa de 1440.
  function janela(dia) {
    const horario = CONFIG.horario || {};
    const cfg = horario[DIAS_CHAVE[dia]] || horario[DIAS_NOME[dia]];
    if (!cfg || cfg.fechado) return null;
    const abre = paraMinutos(cfg.abre);
    let fecha = paraMinutos(cfg.fecha);
    if (abre == null || fecha == null) return null;
    if (fecha <= abre) fecha += 1440;
    return { abre, fecha };
  }

  function statusLoja() {
    const { dia, minutos } = agoraLoja();
    const hoje = janela(dia);
    if (hoje && minutos >= hoje.abre && minutos < hoje.fecha) {
      return { aberto: true, texto: "Aberto agora · até " + formatarHora(hoje.fecha) };
    }
    const ontem = janela((dia + 6) % 7);
    if (ontem && ontem.fecha > 1440 && minutos < ontem.fecha - 1440) {
      return { aberto: true, texto: "Aberto agora · até " + formatarHora(ontem.fecha) };
    }
    for (let k = 0; k < 7; k++) {
      const d = (dia + k) % 7;
      const j = janela(d);
      if (!j || (k === 0 && minutos >= j.abre)) continue;
      const quando = k === 0 ? "" : k === 1 ? "amanhã " : DIAS_NOME[d] + " ";
      return { aberto: false, texto: "Fechado — abre " + quando + "às " + formatarHora(j.abre) };
    }
    return { aberto: false, texto: "Fechado no momento" };
  }

  function textoJanela(dia) {
    const j = janela(dia);
    return j ? `das ${formatarHora(j.abre)} às ${formatarHora(j.fecha)}` : "fechado";
  }

  // Agrupa dias seguidos com o mesmo horário: "Terça a domingo, das 19h às 23h30"
  function resumoHorario() {
    const ordem = [1, 2, 3, 4, 5, 6, 0];
    const textos = ordem.map(textoJanela);
    if (textos.every((t) => t === textos[0])) {
      return [textos[0] === "fechado" ? "Fechado" : "Todos os dias, " + textos[0]];
    }
    const grupos = [];
    ordem.forEach((dia, i) => {
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.texto === textos[i]) ultimo.fim = dia;
      else grupos.push({ inicio: dia, fim: dia, texto: textos[i] });
    });
    return grupos.map((g) => {
      const dias = g.inicio === g.fim
        ? DIAS_TITULO[g.inicio]
        : DIAS_TITULO[g.inicio] + " a " + DIAS_NOME[g.fim];
      return g.texto === "fechado" ? dias + ": fechado" : dias + ", " + g.texto;
    });
  }

  function descreverDias(dias) {
    const nomes = dias.map((d) => DIAS_NOME[d]);
    return nomes.length > 1 ? nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1] : nomes[0];
  }

  /* ==========================================================
     Catálogo (dados normalizados de menu.js)
     ========================================================== */

  const paes = (MENU.paes || []).map((p) => ({
    id: slug(p.nome),
    nome: p.nome,
    resumo: p.resumo || p.nome,
    precoC: centavos(p.preco)
  }));
  const paesPorId = new Map(paes.map((p) => [p.id, p]));

  const adicionais = (MENU.adicionais || []).map((a) => ({
    id: slug(a.nome),
    nome: a.nome,
    precoC: centavos(a.preco)
  }));
  const adicionaisPorId = new Map(adicionais.map((a) => [a.id, a]));

  const itens = new Map();
  const categorias = (MENU.categorias || []).map((cat) => {
    const c = {
      id: cat.id || slug(cat.nome),
      nome: cat.nome,
      descricao: cat.descricao || "",
      tipo: cat.tipo || "",
      dias: Array.isArray(cat.dias) ? cat.dias : null,
      selo: cat.selo || "",
      avisoIndisponivel: cat.avisoIndisponivel || "",
      itens: []
    };
    (cat.itens || []).forEach((it) => {
      let id = c.id + "--" + slug(it.nome);
      while (itens.has(id)) id += "-2";
      const opcoes = Array.isArray(it.opcoes) && it.opcoes.length ? it.opcoes.map(String) : null;
      const item = {
        id,
        categoria: c,
        nome: it.nome,
        descricao: it.descricao || "",
        precoC: centavos(it.preco),
        imagem: it.imagem || "",
        opcoes,
        rotulo: it.rotulo || "",
        consultar: it.consultar ? (typeof it.consultar === "string" ? it.consultar : "Sabor desejado") : "",
        exemplo: it.exemplo || "",
        esgotado: !!it.esgotado,
        dias: Array.isArray(it.dias) ? it.dias : c.dias
      };
      item.tipo = c.tipo === "hamburguer" || it.tipo === "hamburguer" ? "hamburguer"
        : opcoes ? "opcoes"
        : item.consultar ? "consultar"
        : "simples";
      itens.set(id, item);
      c.itens.push(item);
    });
    return c;
  });

  function disponibilidade(item) {
    if (item.esgotado) return { ok: false, motivo: "Esgotado no momento" };
    if (item.dias && !item.dias.includes(agoraLoja().dia)) {
      return { ok: false, motivo: item.categoria.avisoIndisponivel || "Disponível " + descreverDias(item.dias) };
    }
    return { ok: true, motivo: "" };
  }

  /* ==========================================================
     Carrinho
     Cada linha guarda só referências (id do item, pão, adicionais),
     então os preços sempre vêm do menu.js atual.
     ========================================================== */

  function sanitizarLinha(l) {
    const item = l && itens.get(l.itemId);
    if (!item) return null;
    const linha = { uid: typeof l.uid === "string" ? l.uid : novoUid(), itemId: item.id, qtd: inteiro(l.qtd, 1, MAX_QTD) };
    if (item.tipo === "hamburguer") {
      if (!paesPorId.has(l.pao)) return null;
      linha.pao = l.pao;
      linha.adicionais = {};
      Object.entries(l.adicionais || {}).forEach(([id, q]) => {
        if (adicionaisPorId.has(id) && q > 0) linha.adicionais[id] = inteiro(q, 1, MAX_ADICIONAL);
      });
      linha.obs = String(l.obs || "").trim().slice(0, 300);
    } else if (item.tipo === "opcoes") {
      if (!item.opcoes.includes(l.opcao)) return null;
      linha.opcao = l.opcao;
    } else if (item.tipo === "consultar") {
      linha.sabor = String(l.sabor || "").trim().slice(0, 120);
    }
    return linha;
  }

  function carregarCarrinho() {
    try {
      const dados = JSON.parse(localStorage.getItem(CHAVE_CARRINHO) || "[]");
      return Array.isArray(dados) ? dados.map(sanitizarLinha).filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  }

  function salvarCarrinho() {
    try { localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho)); } catch (e) { /* armazenamento indisponível */ }
  }

  let carrinho = carregarCarrinho();

  function chaveLinha(l) {
    const extras = Object.entries(l.adicionais || {}).filter(([, q]) => q > 0).sort();
    return JSON.stringify([l.itemId, l.pao || "", l.opcao || "", normalizar(l.sabor || ""), extras, (l.obs || "").trim()]);
  }

  function precoUnitario(l) {
    const item = itens.get(l.itemId);
    let c = item.precoC;
    if (l.pao) c += paesPorId.get(l.pao).precoC;
    Object.entries(l.adicionais || {}).forEach(([id, q]) => { c += adicionaisPorId.get(id).precoC * q; });
    return c;
  }

  const totalLinha = (l) => precoUnitario(l) * l.qtd;
  const subtotal = () => carrinho.reduce((s, l) => s + totalLinha(l), 0);
  const quantidadeTotal = () => carrinho.reduce((s, l) => s + l.qtd, 0);
  const quantidadeDoItem = (id) => carrinho.reduce((s, l) => s + (l.itemId === id ? l.qtd : 0), 0);

  function nomeLinha(l) {
    const item = itens.get(l.itemId);
    if (l.opcao) return item.rotulo ? `${l.opcao} (${item.rotulo})` : l.opcao;
    return item.nome;
  }

  function detalhesLinha(l) {
    const item = itens.get(l.itemId);
    const d = [];
    if (l.pao) d.push("Pão: " + paesPorId.get(l.pao).resumo);
    if (item.tipo === "consultar") d.push(item.consultar + ": " + (l.sabor || "a consultar"));
    Object.entries(l.adicionais || {}).forEach(([id, q]) => d.push(`+ ${q}x ${adicionaisPorId.get(id).nome}`));
    if (l.obs) d.push("Obs: " + l.obs);
    return d;
  }

  function adicionarLinha(nova) {
    const linha = sanitizarLinha(nova);
    if (!linha) return;
    const chave = chaveLinha(linha);
    const existente = carrinho.find((l) => chaveLinha(l) === chave);
    if (existente) existente.qtd = Math.min(MAX_QTD, existente.qtd + linha.qtd);
    else carrinho.push(linha);
  }

  function alterarQtd(uid, delta) {
    const linha = carrinho.find((l) => l.uid === uid);
    if (!linha) return;
    linha.qtd = Math.min(MAX_QTD, linha.qtd + delta);
    if (linha.qtd <= 0) carrinho = carrinho.filter((l) => l !== linha);
  }

  /* ==========================================================
     Dados do cliente e opções de entrega
     ========================================================== */

  const aceitaEntrega = CONFIG.aceitaEntrega !== false;
  const aceitaRetirada = CONFIG.aceitaRetirada !== false || !aceitaEntrega;
  const taxaEntregaC = centavos(CONFIG.taxaEntrega);
  const pedidoMinimoC = centavos(CONFIG.pedidoMinimo);
  const formasPagamento = Array.isArray(CONFIG.formasPagamento) ? CONFIG.formasPagamento : [];
  const ehDinheiro = (forma) => normalizar(forma).startsWith("dinheiro");

  function carregarCliente() {
    try { return JSON.parse(localStorage.getItem(CHAVE_CLIENTE) || "{}") || {}; } catch (e) { return {}; }
  }

  let cliente = carregarCliente();
  if (cliente.tipo !== "entrega" && cliente.tipo !== "retirada") cliente.tipo = aceitaEntrega ? "entrega" : "retirada";
  if (cliente.tipo === "entrega" && !aceitaEntrega) cliente.tipo = "retirada";
  if (cliente.tipo === "retirada" && !aceitaRetirada) cliente.tipo = "entrega";

  function salvarCliente() {
    try { localStorage.setItem(CHAVE_CLIENTE, JSON.stringify(cliente)); } catch (e) { /* armazenamento indisponível */ }
  }

  const taxaAtual = () => (cliente.tipo === "entrega" ? taxaEntregaC : 0);
  const totalPedido = () => subtotal() + taxaAtual();

  function bloqueiosPedido() {
    const motivos = [];
    if (!carrinho.length) motivos.push("Seu pedido está vazio.");
    const sub = subtotal();
    if (carrinho.length && pedidoMinimoC > 0 && sub < pedidoMinimoC) {
      motivos.push(`O pedido mínimo é de ${brl(pedidoMinimoC)} (sem a entrega). Faltam ${brl(pedidoMinimoC - sub)}.`);
    }
    carrinho.forEach((l) => {
      const disp = disponibilidade(itens.get(l.itemId));
      if (!disp.ok) motivos.push(`${nomeLinha(l)}: ${disp.motivo.toLowerCase()}. Remova o item para continuar.`);
    });
    return motivos;
  }

  /* ==========================================================
     Elementos
     ========================================================== */

  const el = {
    status: $("#status"),
    statusTexto: $("#status-text"),
    menuLista: $("#menu-list"),
    navLista: $("#cat-nav-list"),
    nav: $("#cat-nav"),
    busca: $("#search-input"),
    buscaVazia: $("#search-empty"),
    carrinhoAside: $("#cart-aside-body"),
    carrinhoAsideTitulo: $("#cart-aside-title"),
    carrinhoDialogCorpo: $("#cart-dialog-body"),
    barra: $("#cart-bar"),
    barraQtd: $("#cart-bar-count"),
    barraTotal: $("#cart-bar-total"),
    itemDialog: $("#item-dialog"),
    carrinhoDialog: $("#cart-dialog"),
    checkoutDialog: $("#checkout-dialog"),
    checkoutForm: $("#checkout-form"),
    checkoutEnviado: $("#checkout-enviado"),
    toast: $("#toast")
  };

  /* ==========================================================
     Foco: preserva o foco do teclado quando um trecho é redesenhado
     ========================================================== */

  function capturarFoco() {
    const ativo = document.activeElement;
    if (!ativo || !ativo.dataset || !ativo.dataset.foco) return null;
    return { chave: ativo.dataset.foco, raiz: ativo.closest("[data-foco-raiz]") };
  }

  function restaurarFoco(f) {
    if (!f) return;
    const ativo = document.activeElement;
    if (ativo && ativo !== document.body && ativo.isConnected && !ativo.disabled) return;
    const [ns, id, acao] = f.chave.split(":");
    const alternativas = { add: ["inc"], inc: ["add", "dec"], dec: ["inc", "add"] }[acao] || [];
    const raiz = f.raiz && f.raiz.isConnected ? f.raiz : document;
    for (const a of [acao, ...alternativas]) {
      const alvo = raiz.querySelector(`[data-foco="${ns}:${id}:${a}"]`);
      if (alvo && !alvo.disabled) { alvo.focus({ preventScroll: true }); return; }
    }
    if (raiz !== document && raiz.focus) raiz.focus({ preventScroll: true });
  }

  /* ==========================================================
     Componentes
     ========================================================== */

  function htmlStepper({ qtd, min, max, ns, id, rotulo, acao, removivel }) {
    const rotuloMenos = removivel && qtd <= 1 ? "Remover " + rotulo : "Diminuir quantidade de " + rotulo;
    return `<div class="stepper" role="group" aria-label="Quantidade de ${esc(rotulo)}">` +
      `<button type="button" data-acao="${acao}" data-delta="-1" data-id="${esc(id)}" data-foco="${ns}:${esc(id)}:dec" aria-label="${esc(rotuloMenos)}"${qtd <= min ? " disabled" : ""}>${ICONE.menos}</button>` +
      `<span class="stepper-value" aria-live="polite" aria-atomic="true">${qtd}</span>` +
      `<button type="button" data-acao="${acao}" data-delta="1" data-id="${esc(id)}" data-foco="${ns}:${esc(id)}:inc" aria-label="Aumentar quantidade de ${esc(rotulo)}"${qtd >= max ? " disabled" : ""}>${ICONE.mais}</button>` +
      `</div>`;
  }

  // Só troca o HTML se mudou, para não perder foco nem reiniciar animações.
  function definirHTML(alvo, html) {
    if (alvo._html === html) return false;
    alvo.innerHTML = html;
    alvo._html = html;
    return true;
  }

  let toastTimer = 0;
  function mostrarToast(texto) {
    clearTimeout(toastTimer);
    el.toast.textContent = texto;
    requestAnimationFrame(() => el.toast.classList.add("is-visible"));
    toastTimer = setTimeout(() => {
      el.toast.classList.remove("is-visible");
      toastTimer = setTimeout(() => { el.toast.textContent = ""; }, 300);
    }, 2200);
  }

  function animar(alvo, classe) {
    if (!alvo) return;
    alvo.classList.remove(classe);
    void alvo.offsetWidth;
    alvo.classList.add(classe);
  }

  /* ==========================================================
     Cardápio
     ========================================================== */

  function renderCardapio() {
    el.navLista.innerHTML = categorias
      .map((c) => `<li data-cat="${esc(c.id)}"><a href="#cat-${esc(c.id)}">${esc(c.nome)}</a></li>`)
      .join("");

    el.menuLista.innerHTML = categorias.map((c) => `
      <section class="cat-section" id="cat-${esc(c.id)}" aria-labelledby="titulo-${esc(c.id)}">
        <header class="cat-header">
          <h2 class="cat-title" id="titulo-${esc(c.id)}">${esc(c.nome)}</h2>
          ${c.descricao ? `<p class="cat-desc">${esc(c.descricao)}</p>` : ""}
        </header>
        <div class="cat-items">${c.itens.map(htmlItem).join("")}</div>
      </section>`).join("");

    $$(".item", el.menuLista).forEach(atualizarItem);
  }

  function htmlItem(item) {
    const busca = normalizar([item.nome, item.descricao].concat(item.opcoes || []).join(" "));
    return `
      <article class="item${item.imagem ? " has-image" : ""}" id="item-${esc(item.id)}" data-item="${esc(item.id)}" data-busca="${esc(busca)}">
        ${item.imagem ? `<img class="item-image" src="${esc(item.imagem)}" alt="" loading="lazy" width="96" height="96">` : ""}
        <div class="item-body">
          <div class="item-head">
            <h3 class="item-name">${esc(item.nome)}</h3>
            <span class="item-leader" aria-hidden="true"></span>
            <span class="item-price">${brl(item.precoC)}</span>
          </div>
          ${item.descricao ? `<p class="item-desc">${esc(item.descricao)}</p>` : ""}
          <div class="item-meta"></div>
        </div>
        <div class="item-action"></div>
      </article>`;
  }

  function atualizarItem(artigo) {
    const item = itens.get(artigo.dataset.item);
    const disp = disponibilidade(item);
    const qtdNoCarrinho = quantidadeDoItem(item.id);

    const meta = [];
    if (item.categoria.selo) meta.push(`<span class="badge">${esc(item.categoria.selo)}</span>`);
    if (!disp.ok) meta.push(`<span class="item-note">${esc(disp.motivo)}</span>`);
    else if (item.tipo !== "simples" && qtdNoCarrinho > 0) meta.push(`<span class="item-note in-cart">${qtdNoCarrinho} no pedido</span>`);
    definirHTML($(".item-meta", artigo), meta.join(""));
    artigo.classList.toggle("is-unavailable", !disp.ok);

    let acao;
    if (!disp.ok) {
      acao = `<button class="add-btn" type="button" disabled aria-label="${esc(item.nome)}: ${esc(disp.motivo)}">${ICONE.mais}</button>`;
    } else if (item.tipo === "simples") {
      const linha = carrinho.find((l) => l.itemId === item.id);
      acao = linha
        ? htmlStepper({ qtd: linha.qtd, min: 0, max: MAX_QTD, ns: "lista", id: item.id, rotulo: item.nome, acao: "lista-qtd", removivel: true })
        : `<button class="add-btn" type="button" data-acao="adicionar" data-id="${esc(item.id)}" data-foco="lista:${esc(item.id)}:add" aria-label="Adicionar ${esc(item.nome)} ao pedido">${ICONE.mais}</button>`;
    } else {
      acao = `<button class="add-btn" type="button" data-acao="abrir-item" data-id="${esc(item.id)}" data-foco="lista:${esc(item.id)}:abrir" aria-haspopup="dialog" aria-label="Escolher opções de ${esc(item.nome)}">${ICONE.mais}</button>`;
    }
    definirHTML($(".item-action", artigo), acao);
  }

  function destacarItem(item) {
    animar(document.getElementById("item-" + item.id), "is-added");
  }

  /* ==========================================================
     Carrinho: lista, totais e barra
     ========================================================== */

  function htmlTotais() {
    const linhas = [`<div class="totals-row"><span>Subtotal</span><span>${brl(subtotal())}</span></div>`];
    if (cliente.tipo === "entrega") {
      linhas.push(`<div class="totals-row"><span>Taxa de entrega</span><span>${taxaEntregaC ? brl(taxaEntregaC) : "Grátis"}</span></div>`);
    } else {
      linhas.push(`<div class="totals-row"><span>Retirada no local</span><span>Sem taxa</span></div>`);
    }
    linhas.push(`<div class="totals-row total"><span>Total</span><span>${brl(totalPedido())}</span></div>`);
    return linhas.join("");
  }

  function htmlCarrinho() {
    if (!carrinho.length) {
      return `<p class="cart-empty">Seu pedido está vazio. Escolha um item do cardápio para começar.</p>`;
    }
    const linhas = carrinho.map((l) => {
      const item = itens.get(l.itemId);
      const disp = disponibilidade(item);
      const nome = nomeLinha(l);
      const detalhes = detalhesLinha(l);
      if (l.qtd > 1) detalhes.push(brl(precoUnitario(l)) + " cada");
      return `
        <li class="cart-line">
          <div class="cart-line-head">
            <span class="cart-line-name">${esc(nome)}</span>
            <span class="cart-line-price">${brl(totalLinha(l))}</span>
          </div>
          ${detalhes.length ? `<ul class="cart-line-details">${detalhes.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
          ${disp.ok ? "" : `<p class="cart-line-warning">${esc(disp.motivo)}</p>`}
          <div class="cart-line-controls">
            ${htmlStepper({ qtd: l.qtd, min: 1, max: MAX_QTD, ns: "cart", id: l.uid, rotulo: nome, acao: "cart-qtd" })}
            <button class="link-btn" type="button" data-acao="cart-remover" data-id="${esc(l.uid)}" aria-label="Remover ${esc(nome)} do pedido">Remover</button>
          </div>
        </li>`;
    }).join("");

    const bloqueios = bloqueiosPedido();
    return `
      <ul class="cart-lines">${linhas}</ul>
      <div class="cart-summary">
        <div class="totals">${htmlTotais()}</div>
        <div class="cart-footer">
          ${bloqueios.length ? `<p class="notice" role="status">${bloqueios.map(esc).join("<br>")}</p>` : ""}
          <button class="btn btn-primary btn-block" type="button" data-acao="finalizar" aria-haspopup="dialog"${bloqueios.length ? " disabled" : ""}>Finalizar pedido</button>
          ${cliente.tipo === "entrega" && aceitaRetirada ? `<p class="cart-note">Prefere retirar? Você escolhe na próxima etapa.</p>` : ""}
        </div>
      </div>`;
  }

  let qtdAnterior = null;

  function renderCarrinho() {
    const html = htmlCarrinho();
    definirHTML(el.carrinhoAside, html);
    definirHTML(el.carrinhoDialogCorpo, html);

    const n = quantidadeTotal();
    el.carrinhoAsideTitulo.innerHTML = n
      ? `Seu pedido <span class="cart-count" aria-hidden="true">${n}</span><span class="visually-hidden">, ${n} ${n === 1 ? "item" : "itens"}</span>`
      : "Seu pedido";

    el.barra.hidden = n === 0;
    document.body.classList.toggle("has-cart-bar", n > 0);
    el.barraQtd.textContent = n;
    el.barraTotal.textContent = brl(subtotal());
    el.barra.setAttribute("aria-label", `Ver pedido: ${n} ${n === 1 ? "item" : "itens"}, ${brl(subtotal())}`);

    if (qtdAnterior !== null && n !== qtdAnterior) {
      animar(el.barraQtd, "is-bumped");
      animar($(".cart-count", el.carrinhoAsideTitulo), "is-bumped");
    }
    qtdAnterior = n;
  }

  // Redesenha tudo que depende do carrinho.
  function atualizar() {
    const foco = capturarFoco();
    salvarCarrinho();
    $$(".item", el.menuLista).forEach(atualizarItem);
    renderCarrinho();
    if (estaAberto(el.checkoutDialog)) renderResumoCheckout();
    restaurarFoco(foco);
  }

  /* ==========================================================
     Diálogos (modal no desktop, bottom sheet no celular)
     ========================================================== */

  // Modal feito à mão (sem <dialog>/showModal): no Safari do iPhone o diálogo
  // nativo chegou a mostrar só o fundo escuro, sem o painel, travando a tela.
  // Aqui o painel fica visível assim que o container aparece; a animação de
  // entrada é só enfeite e, se falhar, o painel continua na tela.
  const pilhaDialogs = [];

  const modalDe = (dialog) => dialog.parentElement;
  const estaAberto = (dialog) => !modalDe(dialog).hidden;

  function terminarEntrada(dialog) {
    modalDe(dialog).classList.remove("is-entrando");
  }

  function mostrarDialog(dialog) {
    if (estaAberto(dialog)) return;
    const modal = modalDe(dialog);
    modal.classList.add("is-entrando");
    modal.hidden = false;
    pilhaDialogs.push(dialog);
    void modal.offsetHeight; // aplica o estado inicial antes de animar
    requestAnimationFrame(() => terminarEntrada(dialog));
    // Segurança: mesmo sem requestAnimationFrame/transição, o painel aparece.
    setTimeout(() => {
      terminarEntrada(dialog);
      if (estaAberto(dialog) && dialog.getBoundingClientRect().height < 20) fecharTodos();
    }, 400);
    try { dialog.focus({ preventScroll: true }); } catch (e) { dialog.focus(); }
  }

  function fecharDialog(dialog) {
    if (!estaAberto(dialog)) return;
    const modal = modalDe(dialog);
    modal.hidden = true;
    modal.classList.remove("is-entrando");
    const i = pilhaDialogs.indexOf(dialog);
    if (i > -1) pilhaDialogs.splice(i, 1);
    let evento;
    try { evento = new Event("close"); } catch (e) { evento = document.createEvent("Event"); evento.initEvent("close", false, false); }
    dialog.dispatchEvent(evento);
  }

  function fecharTodos() {
    pilhaDialogs.slice().reverse().forEach(fecharDialog);
    document.body.classList.remove("is-locked");
  }

  const focaveis = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  document.addEventListener("keydown", (e) => {
    const topo = pilhaDialogs[pilhaDialogs.length - 1];
    if (!topo) return;
    if (e.key === "Escape" || e.key === "Esc") { e.preventDefault(); fecharDialog(topo); return; }
    if (e.key !== "Tab") return;
    // Mantém o Tab dentro do painel aberto
    const lista = $$(focaveis, topo).filter((n) => n.getClientRects().length);
    if (!lista.length) { e.preventDefault(); return; }
    const primeiro = lista[0];
    const ultimo = lista[lista.length - 1];
    if (!topo.contains(document.activeElement)) { e.preventDefault(); primeiro.focus(); }
    else if (e.shiftKey && (document.activeElement === primeiro || document.activeElement === topo)) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  });

  function abrirDialog(dialog, gatilho) {
    dialog._gatilho = gatilho || document.activeElement;
    dialog._focoGatilho = dialog._gatilho && dialog._gatilho.dataset ? dialog._gatilho.dataset.foco : null;
    mostrarDialog(dialog);
    document.body.classList.add("is-locked");
  }

  function prepararDialog(dialog) {
    // O fundo escuro e os botões "X" têm data-close
    modalDe(dialog).addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) fecharDialog(dialog);
    });
    dialog.addEventListener("close", () => {
      if (!pilhaDialogs.length) document.body.classList.remove("is-locked");
      if (dialog._semDevolverFoco) { dialog._semDevolverFoco = false; return; }
      let alvo = dialog._gatilho;
      if ((!alvo || !alvo.isConnected) && dialog._focoGatilho) {
        alvo = document.querySelector(`[data-foco="${dialog._focoGatilho}"]`);
      }
      if (!alvo || !alvo.isConnected || alvo.disabled || !alvo.getClientRects().length) alvo = $("#cardapio");
      alvo.focus({ preventScroll: true });
    });
  }

  // No iPhone o teclado cobre a parte de baixo da tela sem redimensioná-la.
  // Mede a área realmente visível para o CSS encaixar o bottom sheet nela
  // e esconder a barra do carrinho enquanto o teclado está aberto.
  function medirAreaVisivel() {
    const vv = window.visualViewport;
    if (!vv) return;
    const raiz = document.documentElement;
    const teclado = vv.scale < 1.05 && window.innerHeight - vv.height > 120;
    raiz.style.setProperty("--vv-altura", vv.height + "px");
    raiz.style.setProperty("--vv-topo", vv.offsetTop + "px");
    raiz.classList.toggle("teclado-aberto", teclado);
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", medirAreaVisivel);
    window.visualViewport.addEventListener("scroll", medirAreaVisivel);
    medirAreaVisivel();
  }

  /* ---------- Detalhes do item ---------- */

  function abrirItem(item, gatilho) {
    if (!disponibilidade(item).ok) return;

    const estado = {
      qtd: 1,
      pao: paes.length === 1 ? paes[0].id : null,
      opcao: item.opcoes && item.opcoes.length === 1 ? item.opcoes[0] : null,
      sabor: "",
      obs: "",
      adicionais: {}
    };
    const ehHamburguer = item.tipo === "hamburguer";

    let corpo = "";
    if (ehHamburguer) {
      corpo += `
        <fieldset class="group" aria-describedby="erro-pao">
          <legend class="group-title">Escolha o pão <span class="group-tag required">Obrigatório</span></legend>
          <div class="choice-list">
            ${paes.map((p) => `
              <label class="choice">
                <input type="radio" name="pao" value="${esc(p.id)}"${estado.pao === p.id ? " checked" : ""}>
                <span class="choice-label">${esc(p.nome)}</span>
                <span class="choice-price">${p.precoC ? "+ " + brl(p.precoC) : "Sem custo"}</span>
              </label>`).join("")}
          </div>
          <p class="field-error" id="erro-pao" hidden>Escolha o tipo de pão para continuar.</p>
        </fieldset>`;

      if (adicionais.length) {
        corpo += `
          <fieldset class="group">
            <legend class="group-title">Adicionais <span class="group-tag">Opcional</span></legend>
            <div class="extras">
              ${adicionais.map((a) => `
                <div class="extra-row" data-extra="${esc(a.id)}">
                  <div>
                    <span class="extra-name">${esc(a.nome)}</span>
                    <span class="extra-price">+ ${brl(a.precoC)}</span>
                  </div>
                  <div class="extra-stepper"></div>
                </div>`).join("")}
            </div>
          </fieldset>`;
      }

      corpo += `
        <div class="group">
          <div class="field">
            <label for="item-obs">Observação <span class="optional">(opcional)</span></label>
            <textarea id="item-obs" maxlength="300" rows="3" placeholder="Ex.: sem cebola roxa" aria-describedby="item-obs-aviso"></textarea>
            <p class="field-hint" id="item-obs-aviso">${esc(MENU.avisoHamburguer || "Não substituímos ingredientes. Todos os lanches recebem molho.")}</p>
          </div>
        </div>`;
    }

    if (item.tipo === "opcoes") {
      corpo += `
        <fieldset class="group" aria-describedby="erro-opcao">
          <legend class="group-title">Escolha uma opção <span class="group-tag required">Obrigatório</span></legend>
          <div class="choice-list">
            ${item.opcoes.map((o) => `
              <label class="choice">
                <input type="radio" name="opcao" value="${esc(o)}"${estado.opcao === o ? " checked" : ""}>
                <span class="choice-label">${esc(o)}</span>
              </label>`).join("")}
          </div>
          <p class="field-error" id="erro-opcao" hidden>Escolha uma opção para continuar.</p>
        </fieldset>`;
    }

    if (item.tipo === "consultar") {
      corpo += `
        <div class="group">
          <div class="field">
            <label for="item-sabor">${esc(item.consultar)} <span class="optional">(opcional)</span></label>
            <input id="item-sabor" type="text" maxlength="120" autocomplete="off"${item.exemplo ? ` placeholder="${esc(item.exemplo)}"` : ""} aria-describedby="item-sabor-aviso">
          </div>
          <p class="notice" id="item-sabor-aviso">A disponibilidade será confirmada pelo WhatsApp. Se preferir, deixe em branco e consulte as opções do dia por lá.</p>
        </div>`;
    }

    const dialog = el.itemDialog;
    dialog.innerHTML = `
      <form class="sheet-inner" novalidate data-foco-raiz>
        <header class="sheet-head">
          <div>
            <p class="eyebrow">${esc(item.categoria.nome)}</p>
            <h2 class="sheet-title" id="item-dialog-title">${esc(item.nome)}</h2>
            ${item.descricao ? `<p class="sheet-desc">${esc(item.descricao)}</p>` : ""}
            <p class="sheet-price">${brl(item.precoC)}</p>
          </div>
          <button class="icon-btn" type="button" data-close aria-label="Fechar">${ICONE.fechar}</button>
        </header>
        <div class="sheet-body">${corpo || '<p class="sheet-desc">Escolha a quantidade.</p>'}</div>
        <footer class="sheet-foot sheet-foot-item">
          <div class="foot-row">
            <div class="qty-stepper"></div>
            <p class="foot-subtotal"><span>Subtotal</span> <strong data-subtotal></strong></p>
          </div>
          <button class="btn btn-primary btn-block" type="submit">Adicionar ao pedido</button>
        </footer>
      </form>`;

    const form = $("form", dialog);

    function linhaDoEstado() {
      return { itemId: item.id, qtd: estado.qtd, pao: estado.pao, opcao: estado.opcao, sabor: estado.sabor, obs: estado.obs, adicionais: estado.adicionais };
    }

    function render() {
      const foco = capturarFoco();
      $$(".extra-row", form).forEach((row) => {
        const a = adicionaisPorId.get(row.dataset.extra);
        const q = estado.adicionais[a.id] || 0;
        row.classList.toggle("has-qty", q > 0);
        definirHTML($(".extra-stepper", row), htmlStepper({ qtd: q, min: 0, max: MAX_ADICIONAL, ns: "extra", id: a.id, rotulo: a.nome, acao: "extra-qtd" }));
      });
      definirHTML($(".qty-stepper", form), htmlStepper({ qtd: estado.qtd, min: 1, max: MAX_QTD, ns: "item", id: "qtd", rotulo: item.nome, acao: "item-qtd" }));
      const unit = item.precoC
        + (estado.pao ? paesPorId.get(estado.pao).precoC : 0)
        + Object.entries(estado.adicionais).reduce((s, [id, q]) => s + adicionaisPorId.get(id).precoC * q, 0);
      $("[data-subtotal]", form).textContent = brl(unit * estado.qtd);
      restaurarFoco(foco);
    }

    form.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-acao]");
      if (!btn) return;
      const delta = Number(btn.dataset.delta);
      if (btn.dataset.acao === "extra-qtd") {
        const id = btn.dataset.id;
        const q = inteiro((estado.adicionais[id] || 0) + delta, 0, MAX_ADICIONAL);
        if (q) estado.adicionais[id] = q; else delete estado.adicionais[id];
      } else if (btn.dataset.acao === "item-qtd") {
        estado.qtd = inteiro(estado.qtd + delta, 1, MAX_QTD);
      }
      render();
      const novo = $(`[data-foco="${btn.dataset.foco}"]`, form);
      animar(novo && novo.closest(".stepper"), "is-bumped");
    });

    form.addEventListener("change", (e) => {
      if (e.target.name === "pao") { estado.pao = e.target.value; $("#erro-pao", form).hidden = true; }
      if (e.target.name === "opcao") { estado.opcao = e.target.value; $("#erro-opcao", form).hidden = true; }
      render();
    });

    form.addEventListener("input", (e) => {
      if (e.target.id === "item-obs") estado.obs = e.target.value;
      if (e.target.id === "item-sabor") estado.sabor = e.target.value;
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (ehHamburguer && !estado.pao) {
        $("#erro-pao", form).hidden = false;
        $('input[name="pao"]', form).focus();
        return;
      }
      if (item.tipo === "opcoes" && !estado.opcao) {
        $("#erro-opcao", form).hidden = false;
        $('input[name="opcao"]', form).focus();
        return;
      }
      adicionarLinha(linhaDoEstado());
      fecharDialog(dialog);
      atualizar();
      destacarItem(item);
      mostrarToast(`Adicionado ao pedido: ${estado.qtd > 1 ? estado.qtd + "x " : ""}${item.nome}`);
    });

    render();
    abrirDialog(dialog, gatilho);
    $(".sheet-body", dialog).scrollTop = 0;
  }

  /* ---------- Carrinho no celular ---------- */

  const desktop = window.matchMedia("(min-width: 1024px)");

  function abrirCarrinho() {
    abrirDialog(el.carrinhoDialog, el.barra);
  }

  function aoMudarLargura(e) {
    if (e.matches && estaAberto(el.carrinhoDialog)) fecharDialog(el.carrinhoDialog);
  }
  // Safari anterior ao 14 só conhece addListener.
  if (desktop.addEventListener) desktop.addEventListener("change", aoMudarLargura);
  else if (desktop.addListener) desktop.addListener(aoMudarLargura);

  /* ==========================================================
     Checkout
     ========================================================== */

  const form = el.checkoutForm;
  const campos = {
    nome: $("#f-nome"),
    telefone: $("#f-telefone"),
    rua: $("#f-rua"),
    numero: $("#f-numero"),
    bairro: $("#f-bairro"),
    complemento: $("#f-complemento"),
    troco: $("#f-troco")
  };

  function prepararCheckout() {
    $("#opt-entrega").hidden = !aceitaEntrega;
    $("#opt-retirada").hidden = !aceitaRetirada;
    $(".segmented", form).classList.toggle("is-single", !(aceitaEntrega && aceitaRetirada));
    $("#retirada-endereco").textContent = CONFIG.endereco || "";

    $("#pagamento-opcoes").innerHTML = formasPagamento.map((f) => `
      <label class="choice">
        <input type="radio" name="pagamento" value="${esc(f)}">
        <span class="choice-label">${esc(f)}</span>
      </label>`).join("");

    form.addEventListener("input", (e) => {
      const alvo = e.target;
      if (alvo === campos.telefone) {
        const pos = alvo.value.length === alvo.selectionStart;
        alvo.value = formatarTelefone(alvo.value);
        if (pos) alvo.selectionStart = alvo.selectionEnd = alvo.value.length;
      }
      if (alvo.name && alvo.name in campos && alvo.name !== "troco") cliente[alvo.name] = alvo.value;
      limparErro(alvo);
      salvarCliente();
    });

    form.addEventListener("change", (e) => {
      if (e.target.name === "tipo") {
        cliente.tipo = e.target.value;
        salvarCliente();
        aplicarTipo();
        renderResumoCheckout();
        renderCarrinho();
      }
      if (e.target.name === "pagamento") {
        cliente.pagamento = e.target.value;
        salvarCliente();
        $("#err-pagamento").hidden = true;
        aplicarPagamento();
      }
    });

    campos.troco.addEventListener("blur", () => {
      const v = lerDinheiro(campos.troco.value);
      if (v != null && v > 0) campos.troco.value = brl(v);
    });

    form.addEventListener("submit", enviarPedido);
    $("#btn-limpar").addEventListener("click", () => {
      carrinho = [];
      atualizar();
      el.checkoutDialog._semDevolverFoco = true;
      fecharDialog(el.checkoutDialog);
      $("#cardapio").focus({ preventScroll: true });
      mostrarToast("Carrinho limpo");
    });
    $("#btn-manter").addEventListener("click", () => fecharDialog(el.checkoutDialog));
    el.checkoutDialog.addEventListener("close", esquecerEnvio);
  }

  function aplicarTipo() {
    const entrega = cliente.tipo === "entrega";
    $("#fs-endereco").hidden = !entrega;
    $("#retirada-info").hidden = entrega;
    $$('input[name="tipo"]', form).forEach((r) => { r.checked = r.value === cliente.tipo; });
  }

  function aplicarPagamento() {
    const dinheiro = ehDinheiro(cliente.pagamento || "");
    $("#troco-wrap").hidden = !dinheiro;
    if (!dinheiro) limparErro(campos.troco);
  }

  function renderResumoCheckout() {
    const n = quantidadeTotal();
    $("#checkout-totais").innerHTML =
      `<div class="totals-row"><span>${n} ${n === 1 ? "item" : "itens"}</span><span></span></div>` + htmlTotais();
  }

  function renderAvisoFechado() {
    const st = statusLoja();
    const aviso = $("#checkout-fechado");
    aviso.hidden = st.aberto;
    aviso.innerHTML = st.aberto ? "" :
      `<strong>Estamos fechados agora</strong> (${esc(st.texto.replace(/^Fechado — /, ""))}). ` +
      `Você pode enviar mesmo assim: seu pedido será atendido quando abrirmos.`;
  }

  function abrirCheckout() {
    const gatilho = estaAberto(el.carrinhoDialog) ? el.barra : document.activeElement;
    if (estaAberto(el.carrinhoDialog)) {
      el.carrinhoDialog._semDevolverFoco = true;
      fecharDialog(el.carrinhoDialog);
    }

    Object.entries(campos).forEach(([nome, campo]) => {
      if (nome !== "troco") campo.value = cliente[nome] || "";
      limparErro(campo);
    });
    campos.telefone.value = formatarTelefone(campos.telefone.value);
    campos.troco.value = "";
    $$('input[name="pagamento"]', form).forEach((r) => { r.checked = r.value === cliente.pagamento; });
    if (!formasPagamento.includes(cliente.pagamento)) cliente.pagamento = "";
    $("#err-pagamento").hidden = true;
    $("#checkout-erros").hidden = true;

    form.hidden = false;
    el.checkoutEnviado.hidden = true;
    aplicarTipo();
    aplicarPagamento();
    renderAvisoFechado();
    renderResumoCheckout();
    abrirDialog(el.checkoutDialog, gatilho);
    $(".sheet-body", form).scrollTop = 0;
  }

  function mostrarErro(campo, mensagem) {
    const erro = document.getElementById("err-" + campo.name);
    campo.setAttribute("aria-invalid", "true");
    if (erro) { erro.textContent = mensagem; erro.hidden = false; }
  }

  function limparErro(campo) {
    if (!campo || !campo.name) return;
    const erro = document.getElementById("err-" + campo.name);
    campo.removeAttribute("aria-invalid");
    if (erro) { erro.hidden = true; erro.textContent = ""; }
  }

  function validarCheckout() {
    const invalidos = [];
    const exigir = (campo, condicao, mensagem) => {
      if (!condicao) { mostrarErro(campo, mensagem); invalidos.push(campo); } else limparErro(campo);
    };

    exigir(campos.nome, campos.nome.value.trim().length >= 2, "Informe seu nome.");
    const digitos = campos.telefone.value.replace(/\D/g, "");
    exigir(campos.telefone, digitos.length === 10 || digitos.length === 11, "Informe um telefone com DDD, ex.: (19) 99999-9999.");

    if (cliente.tipo === "entrega") {
      exigir(campos.rua, campos.rua.value.trim(), "Informe a rua.");
      exigir(campos.numero, campos.numero.value.trim(), "Informe o número (ou “s/n”).");
      exigir(campos.bairro, campos.bairro.value.trim(), "Informe o bairro.");
    }

    const erroPagamento = $("#err-pagamento");
    if (!cliente.pagamento) {
      erroPagamento.textContent = "Escolha a forma de pagamento.";
      erroPagamento.hidden = false;
      invalidos.push($('input[name="pagamento"]', form));
    }

    let trocoC = null;
    if (ehDinheiro(cliente.pagamento || "") && campos.troco.value.trim()) {
      trocoC = lerDinheiro(campos.troco.value);
      if (trocoC == null || trocoC <= 0) {
        exigir(campos.troco, false, "Informe um valor válido, ex.: 100,00.");
      } else {
        exigir(campos.troco, trocoC > totalPedido(), `O valor para troco precisa ser maior que o total do pedido (${brl(totalPedido())}).`);
      }
    }

    const bloqueios = bloqueiosPedido();
    const alerta = $("#checkout-erros");
    alerta.hidden = !bloqueios.length;
    alerta.innerHTML = bloqueios.length ? `<ul>${bloqueios.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : "";

    if (invalidos.length) invalidos[0].focus();
    else if (bloqueios.length) alerta.scrollIntoView({ block: "nearest" });

    return invalidos.length || bloqueios.length ? null : { trocoC };
  }

  function montarMensagem({ trocoC }) {
    const L = [];
    L.push(`*Novo pedido — ${CONFIG.nome || "Hamburguer com H"}*`, "");

    carrinho.forEach((l) => {
      L.push(`${l.qtd}x ${nomeLinha(l)} — ${brl(totalLinha(l))}`);
      detalhesLinha(l).forEach((d) => L.push("   " + d));
    });

    L.push("", `Subtotal: ${brl(subtotal())}`);
    if (cliente.tipo === "entrega") L.push(`Taxa de entrega: ${taxaEntregaC ? brl(taxaEntregaC) : "grátis"}`);
    L.push(`*Total: ${brl(totalPedido())}*`, "");

    const nome = campos.nome.value.trim();
    const telefone = formatarTelefone(campos.telefone.value);
    if (cliente.tipo === "entrega") {
      L.push("*Entrega*", `Nome: ${nome}`, `Telefone: ${telefone}`,
        `Endereço: ${campos.rua.value.trim()}, ${campos.numero.value.trim()} — ${campos.bairro.value.trim()}`);
      if (campos.complemento.value.trim()) L.push(`Complemento: ${campos.complemento.value.trim()}`);
    } else {
      L.push("*Retirada no local*", `Nome: ${nome}`, `Telefone: ${telefone}`);
    }

    let pagamento = cliente.pagamento;
    if (ehDinheiro(pagamento)) pagamento += trocoC ? ` (troco para ${brl(trocoC)})` : " (sem troco)";
    L.push("", `Pagamento: ${pagamento}`);

    if (carrinho.some((l) => itens.get(l.itemId).tipo === "consultar")) {
      L.push("", "_Itens sob consulta: aguardo a confirmação da disponibilidade._");
    }
    if (!statusLoja().aberto) {
      L.push("", "_Pedido enviado fora do horário. Seu pedido será atendido quando abrirmos._");
    }
    return L.join("\n");
  }

  function enviarPedido(e) {
    e.preventDefault();
    const dados = validarCheckout();
    if (!dados) return;

    const url = `https://wa.me/${String(CONFIG.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(montarMensagem(dados))}`;
    mostrarEnviado(url);
    try { sessionStorage.setItem(CHAVE_ENVIADO, url); } catch (err) { /* armazenamento indisponível */ }
    abrirWhatsApp(url);
  }

  // No celular (e nos navegadores internos do Instagram/WhatsApp) window.open
  // costuma ser bloqueado como popup; lá a navegação vai direto para o wa.me.
  function ehCelular() {
    return /Android|iPhone|iPad|iPod|Mobile|FBAN|FBAV|Instagram/i.test(navigator.userAgent) ||
      !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  }

  function abrirWhatsApp(url) {
    if (!ehCelular()) {
      const janela = window.open(url, "_blank");
      if (janela) {
        try { janela.opener = null; } catch (err) { /* ignorado */ }
        return;
      }
    }
    window.location.href = url;
  }

  function mostrarEnviado(url) {
    const link = $("#enviado-link");
    link.href = url;
    if (ehCelular()) link.removeAttribute("target");
    form.hidden = true;
    el.checkoutEnviado.hidden = false;
    if (!estaAberto(el.checkoutDialog)) abrirDialog(el.checkoutDialog, $("#cardapio"));
    $("#enviado-title").focus();
  }

  // Quem volta do WhatsApp para o site (a página pode recarregar) ainda vê
  // a opção de limpar o carrinho.
  function retomarEnvio() {
    let url = null;
    try { url = sessionStorage.getItem(CHAVE_ENVIADO); } catch (err) { /* armazenamento indisponível */ }
    if (url && carrinho.length && !estaAberto(el.checkoutDialog)) mostrarEnviado(url);
  }

  function esquecerEnvio() {
    try { sessionStorage.removeItem(CHAVE_ENVIADO); } catch (err) { /* armazenamento indisponível */ }
  }

  /* ==========================================================
     Cabeçalho, rodapé e status
     ========================================================== */

  function renderLoja() {
    const nome = CONFIG.nome || "Hamburguer com H";
    const numero = String(CONFIG.whatsapp || "").replace(/\D/g, "");
    const linkWhats = "https://wa.me/" + numero;
    document.title = nome + " — Cardápio";

    $("#brand-text").innerHTML = nomeMarcado(nome);
    $("#brand").setAttribute("aria-label", nome + " — início");
    $(".footer-name").innerHTML = nomeMarcado(nome);

    const logo = new Image();
    logo.onload = () => {
      logo.alt = nome;
      const marca = $("#brand");
      marca.innerHTML = "";
      marca.appendChild(logo);
    };
    logo.src = "img/logo.png";

    const whats = $("#header-whatsapp");
    whats.href = linkWhats;
    whats.setAttribute("aria-label", "Falar pelo WhatsApp: " + formatarTelefone(numero));

    const insta = $("#header-instagram");
    if (CONFIG.instagram) insta.href = CONFIG.instagram; else insta.hidden = true;

    $("#footer-endereco").textContent = CONFIG.endereco || "";
    const tel = $("#footer-telefone");
    tel.href = linkWhats;
    tel.textContent = formatarTelefone(numero) + " (WhatsApp)";
    $("#footer-horario").innerHTML = `<span class="hours-list">${resumoHorario().map((t) => `<span>${esc(t)}</span>`).join("")}</span>`;
    const instaRodape = $("#footer-instagram");
    if (CONFIG.instagram) {
      instaRodape.href = CONFIG.instagram;
      const usuario = CONFIG.instagram.replace(/\/+$/, "").split("/").pop();
      instaRodape.textContent = "@" + usuario;
    } else {
      instaRodape.closest("div").hidden = true;
    }

    const partes = ["Peça pelo WhatsApp."];
    if (aceitaEntrega) partes.push(taxaEntregaC ? `Entrega por ${brl(taxaEntregaC)}` : "Entrega grátis");
    if (aceitaRetirada) partes.push(aceitaEntrega ? "ou retirada no local." : "Retirada no local.");
    else partes[partes.length - 1] += ".";
    if (pedidoMinimoC > 0) partes.push(`Pedido mínimo de ${brl(pedidoMinimoC)}.`);
    $("#menu-lead").textContent = partes.join(" ");
  }

  let diaAnterior = agoraLoja().dia;

  function atualizarStatus() {
    const st = statusLoja();
    el.status.classList.toggle("is-open", st.aberto);
    el.status.classList.toggle("is-closed", !st.aberto);
    el.statusTexto.textContent = st.texto;
    if (estaAberto(el.checkoutDialog)) renderAvisoFechado();

    const dia = agoraLoja().dia;
    if (dia !== diaAnterior) {
      diaAnterior = dia;
      atualizar();
    }
  }

  /* ==========================================================
     Navegação por categorias e busca
     ========================================================== */

  function medirNav() {
    document.documentElement.style.setProperty("--nav-h", el.nav.offsetHeight + "px");
  }

  let categoriaAtiva = null;

  function marcarCategoria(id) {
    if (id === categoriaAtiva) return;
    categoriaAtiva = id;
    $$("a", el.navLista).forEach((a) => {
      const ativo = a.getAttribute("href") === "#cat-" + id;
      if (ativo) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      if (ativo) {
        const lista = el.navLista;
        const destino = a.offsetLeft - (lista.clientWidth - a.offsetWidth) / 2;
        lista.scrollTo({ left: Math.max(0, destino) });
      }
    });
  }

  function verificarRolagem() {
    const limite = el.nav.offsetHeight + 24;
    const secoes = $$(".cat-section", el.menuLista).filter((s) => !s.hidden);
    if (!secoes.length) return;
    let atual = secoes[0];
    for (const s of secoes) {
      if (s.getBoundingClientRect().top <= limite) atual = s;
    }
    const noFim = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (noFim) {
      const visiveis = secoes.filter((s) => s.getBoundingClientRect().top < window.innerHeight);
      if (visiveis.length) atual = visiveis[visiveis.length - 1];
    }
    marcarCategoria(atual.id.replace(/^cat-/, ""));
  }

  let rolagemPendente = false;
  window.addEventListener("scroll", () => {
    if (rolagemPendente) return;
    rolagemPendente = true;
    requestAnimationFrame(() => { rolagemPendente = false; verificarRolagem(); });
  }, { passive: true });

  window.addEventListener("resize", () => { medirNav(); verificarRolagem(); });

  el.navLista.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    const id = link.getAttribute("href").slice(1);
    const secao = document.getElementById(id);
    if (!secao) return;
    e.preventDefault();
    secao.scrollIntoView({ block: "start" });
    history.replaceState(null, "", "#" + id);
    marcarCategoria(id.replace(/^cat-/, ""));
    const titulo = $(".cat-title", secao);
    titulo.setAttribute("tabindex", "-1");
    titulo.focus({ preventScroll: true });
  });

  function filtrar() {
    const termos = normalizar(el.busca.value.trim()).split(/\s+/).filter(Boolean);
    let total = 0;
    $$(".cat-section", el.menuLista).forEach((secao) => {
      let visiveis = 0;
      $$(".item", secao).forEach((artigo) => {
        const mostra = termos.every((t) => artigo.dataset.busca.includes(t));
        artigo.hidden = !mostra;
        if (mostra) visiveis++;
      });
      secao.hidden = visiveis === 0;
      const li = $(`li[data-cat="${secao.id.replace(/^cat-/, "")}"]`, el.navLista);
      if (li) li.hidden = visiveis === 0;
      total += visiveis;
    });
    el.buscaVazia.hidden = total > 0;
    el.buscaVazia.textContent = total ? "" : `Nenhum item encontrado para “${el.busca.value.trim()}”.`;
    categoriaAtiva = null;
    verificarRolagem();
  }

  el.busca.addEventListener("input", filtrar);
  el.busca.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && el.busca.value) { el.busca.value = ""; filtrar(); }
  });

  /* ==========================================================
     Ações (delegação de eventos)
     ========================================================== */

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-acao]");
    if (!btn || btn.closest("#item-dialog")) return;
    const id = btn.dataset.id;
    const delta = Number(btn.dataset.delta);

    switch (btn.dataset.acao) {
      case "adicionar": {
        const item = itens.get(id);
        adicionarLinha({ itemId: id, qtd: 1 });
        atualizar();
        destacarItem(item);
        mostrarToast("Adicionado ao pedido: " + item.nome);
        break;
      }
      case "lista-qtd": {
        const linha = carrinho.find((l) => l.itemId === id);
        if (linha) alterarQtd(linha.uid, delta);
        atualizar();
        break;
      }
      case "abrir-item":
        abrirItem(itens.get(id), btn);
        break;
      case "cart-qtd":
        alterarQtd(id, delta);
        atualizar();
        break;
      case "cart-remover": {
        const linha = carrinho.find((l) => l.uid === id);
        alterarQtd(id, -Infinity);
        atualizar();
        if (linha) mostrarToast("Removido do pedido: " + nomeLinha(linha));
        break;
      }
      case "finalizar":
        abrirCheckout();
        break;
    }
  });

  el.barra.addEventListener("click", abrirCarrinho);

  // Se os dados forem alterados em outra aba, mantém tudo sincronizado.
  window.addEventListener("storage", (e) => {
    if (e.key === CHAVE_CARRINHO) {
      carrinho = carregarCarrinho();
      atualizar();
    }
  });

  /* ==========================================================
     Início
     ========================================================== */

  el.carrinhoAside.setAttribute("data-foco-raiz", "");
  el.carrinhoDialogCorpo.setAttribute("data-foco-raiz", "");
  el.menuLista.setAttribute("data-foco-raiz", "");

  [el.itemDialog, el.carrinhoDialog, el.checkoutDialog].forEach(prepararDialog);
  renderLoja();
  renderCardapio();
  prepararCheckout();
  renderCarrinho();
  atualizarStatus();
  medirNav();
  verificarRolagem();
  retomarEnvio();
  setInterval(atualizarStatus, 30 * 1000);
})();
