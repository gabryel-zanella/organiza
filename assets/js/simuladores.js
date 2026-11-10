// Liga os formulários dos simuladores aos cálculos (calc.js).
// Tudo roda no navegador: nenhum valor é enviado ou salvo.
(function () {
  "use strict";
  const C = window.OrganizaCalc;
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const pct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });
  const $ = (id) => document.getElementById(id);

  // Aceita "1.234,56", "1234,56" e "1234.56"
  function num(id) {
    let v = String($(id).value || "").trim().replace(/\s|R\$/g, "");
    if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  const set = (id, txt) => { $(id).textContent = txt; };

  function textoMeses(m) {
    if (m === 0) return "Meta já atingida";
    const anos = Math.floor(m / 12), resto = m % 12;
    const partes = [];
    if (anos) partes.push(anos + (anos === 1 ? " ano" : " anos"));
    if (resto) partes.push(resto + (resto === 1 ? " mês" : " meses"));
    return partes.join(" e ");
  }

  // ---------- Gráfico em SVG (sem bibliotecas externas) ----------
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, texto) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (texto !== undefined) e.textContent = texto;
    return e;
  }
  const compacto = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

  // Caixa de informação que aparece ao passar o mouse (ou tocar) numa barra
  function caixaInfo(svg) {
    const area = svg.parentElement;
    let caixa = area.querySelector(".grafico-info");
    if (!caixa) {
      caixa = document.createElement("div");
      caixa.className = "grafico-info";
      caixa.hidden = true;
      caixa.setAttribute("role", "status");
      area.append(caixa);
      svg.addEventListener("pointerleave", () => esconder(svg));
    }
    return caixa;
  }
  function esconder(svg) {
    const caixa = svg.parentElement.querySelector(".grafico-info");
    if (caixa) caixa.hidden = true;
    svg.querySelectorAll(".barra-ativa").forEach((b) => b.classList.remove("barra-ativa"));
  }
  function mostrar(svg, coluna, linhas, xCentro, yTopo, W) {
    const caixa = caixaInfo(svg);
    caixa.replaceChildren(...linhas.map(([rotulo, valor], k) => {
      const p = document.createElement("div");
      if (k === 0) { p.className = "grafico-info-titulo"; p.textContent = rotulo; }
      else { const b = document.createElement("strong"); b.textContent = valor; p.append(rotulo + ": ", b); }
      return p;
    }));
    svg.querySelectorAll(".barra-ativa").forEach((b) => b.classList.remove("barra-ativa"));
    svg.querySelectorAll(`[data-coluna="${coluna}"]`).forEach((b) => b.classList.add("barra-ativa"));
    caixa.hidden = false;
    // converte coordenadas do desenho para pixels da tela
    const escala = svg.clientWidth / W;
    const x = xCentro * escala, y = yTopo * escala;
    const largCaixa = caixa.offsetWidth, areaLarg = svg.parentElement.clientWidth;
    caixa.style.left = Math.min(Math.max(0, x - largCaixa / 2), areaLarg - largCaixa) + "px";
    caixa.style.top = Math.max(0, y - caixa.offsetHeight - 10) + "px";
  }

  /**
   * Barras empilhadas ou simples.
   * series: [{ valores: number[], cor }], rotulos: string[], linhaMeta: number|null
   * info(i): [[titulo], [rotulo, valor], ...] mostrado ao passar o mouse na coluna i
   */
  function grafico(svg, rotulos, series, linhaMeta, info) {
    svg.replaceChildren();
    if (svg.parentElement.querySelector(".grafico-info")) esconder(svg);
    const W = 640, H = 300, mE = 56, mD = 12, mT = 12, mB = 36;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const n = rotulos.length;
    if (!n) return;
    const totais = rotulos.map((_, i) => series.reduce((s, se) => s + se.valores[i], 0));
    const max = Math.max(...totais, linhaMeta || 0) * 1.08 || 1;
    const y = (v) => mT + (H - mT - mB) * (1 - v / max);
    // grade
    for (let g = 0; g <= 4; g++) {
      const v = (max / 4) * g;
      svg.append(el("line", { x1: mE, x2: W - mD, y1: y(v), y2: y(v), stroke: "#e1e7f0" }));
      svg.append(el("text", { x: mE - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11, fill: "#4a5568" }, compacto.format(v)));
    }
    const larg = (W - mE - mD) / n;
    const passoRotulo = Math.ceil(n / 12);
    rotulos.forEach((r, i) => {
      let base = 0;
      series.forEach((se) => {
        const v = se.valores[i];
        svg.append(el("rect", {
          x: mE + i * larg + larg * 0.15, width: Math.max(1, larg * 0.7),
          y: y(base + v), height: Math.max(0, y(base) - y(base + v)), fill: se.cor, rx: 2,
          class: "barra-grafico", "data-coluna": i,
        }));
        base += v;
      });
      if (info) {
        // área invisível da altura toda: facilita acertar a barra com o mouse ou o dedo
        const linhas = info(i);
        const alvo = el("rect", {
          x: mE + i * larg, width: larg, y: mT, height: H - mT - mB, fill: "transparent",
          tabindex: 0, role: "button",
          "aria-label": linhas.map(([a, b]) => (b ? `${a}: ${b}` : a)).join(", "),
        });
        const abrir = () => mostrar(svg, i, linhas, mE + i * larg + larg / 2, y(totais[i]), W);
        alvo.addEventListener("pointerenter", abrir);
        alvo.addEventListener("pointerdown", abrir);
        alvo.addEventListener("focus", abrir);
        alvo.addEventListener("blur", () => esconder(svg));
        svg.append(alvo);
      }
      if (i % passoRotulo === 0 || i === n - 1) {
        svg.append(el("text", { x: mE + i * larg + larg / 2, y: H - 12, "text-anchor": "middle", "font-size": 11, fill: "#4a5568" }, r));
      }
    });
    if (linhaMeta) {
      svg.append(el("line", { x1: mE, x2: W - mD, y1: y(linhaMeta), y2: y(linhaMeta), stroke: "#a12a2a", "stroke-width": 2, "stroke-dasharray": "6 4" }));
      svg.append(el("text", { x: W - mD, y: y(linhaMeta) - 6, "text-anchor": "end", "font-size": 12, fill: "#a12a2a", "font-weight": 700 }, "Meta"));
    }
  }

  // ---------- Abas ----------
  const abas = document.querySelectorAll('.abas [role="tab"]');
  function abrir(aba, focar) {
    abas.forEach((a) => {
      const sel = a === aba;
      a.setAttribute("aria-selected", String(sel));
      a.tabIndex = sel ? 0 : -1;
      $(a.getAttribute("aria-controls")).hidden = !sel;
    });
    if (focar) aba.focus();
    history.replaceState(null, "", "#" + aba.id.replace("aba-", ""));
  }
  abas.forEach((a, i) => {
    a.addEventListener("click", () => abrir(a));
    a.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") abrir(abas[(i + 1) % abas.length], true);
      if (e.key === "ArrowLeft") abrir(abas[(i - 1 + abas.length) % abas.length], true);
    });
  });
  const inicial = document.getElementById("aba-" + location.hash.slice(1));
  if (inicial) abrir(inicial);

  // ---------- Reserva de emergência ----------
  function calcReserva() {
    const r = C.reservaEmergencia({
      custoMensal: num("r-custo"),
      mesesReserva: num("r-meses"),
      jaGuardado: num("r-guardado"),
      aporteMensal: num("r-aporte"),
      taxaMensal: num("r-taxa") / 100,
    });
    set("r-meta", brl.format(r.meta));
    set("r-falta", brl.format(Math.max(0, r.falta)));
    const aviso = $("r-aviso");
    if (r.meta === 0) {
      set("r-tempo", "-");
      aviso.className = "aviso"; aviso.textContent = "Preencha o custo de vida e os meses de reserva.";
    } else if (r.possivel) {
      set("r-tempo", textoMeses(r.meses));
      aviso.className = "aviso ok";
      aviso.textContent = r.meses === 0 ? "Parabéns: sua reserva já cobre a meta." :
        `Guardando ${brl.format(num("r-aporte"))} por mês, você chega à meta em ${textoMeses(r.meses)}.`;
    } else {
      set("r-tempo", "Não alcança");
      aviso.className = "aviso atencao";
      aviso.textContent = "Com esses valores a meta não é alcançada. Tente aumentar o valor guardado por mês.";
    }
    const ev = r.evolucao;
    const passo = Math.max(1, Math.ceil(ev.length / 36));
    const idx = ev.map((_, i) => i).filter((i) => i % passo === 0 || i === ev.length - 1);
    grafico($("r-grafico"), idx.map((i) => "m" + i), [{ valores: idx.map((i) => ev[i]), cor: "#1e6b4a" }], r.meta || null,
      (k) => {
        const mes = idx[k], valor = ev[mes];
        const linhas = [[mes === 0 ? "Hoje" : `Mês ${mes}`], ["Valor guardado", brl.format(valor)]];
        if (r.meta) linhas.push(["Da meta", pct.format(Math.min(1, valor / r.meta))]);
        return linhas;
      });
  }

  // ---------- Juros compostos ----------
  function calcJuros() {
    const anos = Math.min(50, Math.max(1, Math.round(num("j-anos")) || 1));
    const i = C.taxaMensal(num("j-taxa") / 100);
    const linhas = C.investimentoPorAno({ inicial: num("j-inicial"), aporteMensal: num("j-aporte"), taxaMensal: i, anos });
    const fim = linhas[linhas.length - 1];
    set("j-total", brl.format(fim.saldo));
    set("j-investido", brl.format(fim.investido));
    set("j-juros", brl.format(fim.juros));
    set("j-mensal", pct.format(i));
    grafico($("j-grafico"), linhas.map((l) => String(l.ano)), [
      { valores: linhas.map((l) => l.investido), cor: "#1f3864" },
      { valores: linhas.map((l) => Math.max(0, l.juros)), cor: "#3fa37a" },
    ], null, (k) => {
      const l = linhas[k];
      return [[l.ano === 1 ? "Ano 1" : `Ano ${l.ano}`], ["Investido", brl.format(l.investido)],
        ["Juros", brl.format(l.juros)], ["Total", brl.format(l.saldo)]];
    });
    const tbody = $("j-tabela");
    tbody.replaceChildren();
    linhas.forEach((l) => {
      const tr = document.createElement("tr");
      [String(l.ano), brl.format(l.investido), brl.format(l.juros), brl.format(l.saldo)].forEach((t, k) => {
        const td = document.createElement("td");
        td.textContent = t;
        if (k > 0) td.className = "num";
        tr.append(td);
      });
      tbody.append(tr);
    });
  }

  // ---------- 50-30-20 ----------
  function calcOrcamento() {
    const o = C.orcamento503020(num("o-renda"));
    set("o-nec", brl.format(o.necessidades));
    set("o-des", brl.format(o.desejos));
    set("o-pou", brl.format(o.poupanca));
  }

  // ---------- Limite do MEI ----------
  function calcMei() {
    const abriuEsteAno = $("m-abertura").value;
    const r = C.limiteMei(num("m-faturamento"), abriuEsteAno ? Number(abriuEsteAno) : null);
    set("m-limite", brl.format(r.limite));
    set("m-usado", pct.format(r.percentual));
    set("m-disponivel", brl.format(r.disponivel));
    const barra = $("m-barra");
    barra.className = "barra" + (r.situacao === "alerta" ? " atencao" : r.situacao === "ok" ? "" : " perigo");
    barra.firstElementChild.style.width = Math.min(100, r.percentual * 100) + "%";
    const aviso = $("m-aviso");
    const msgs = {
      ok: ["aviso ok", "Você está dentro do limite. Continue registrando o faturamento todo mês."],
      alerta: ["aviso atencao", "Atenção: você já usou 80% ou mais do limite. Planeje os próximos meses para não ultrapassar."],
      ate20: ["aviso perigo", "Você passou do limite, mas em até 20%. Continua MEI até o fim do ano, paga um DAS complementar sobre o excesso e passa a ser Microempresa em janeiro. Procure um contador."],
      acima20: ["aviso perigo", "Você passou mais de 20% do limite. O desenquadramento pode valer desde o mês do excesso, com recálculo de impostos. Procure um contador o quanto antes."],
    };
    aviso.className = msgs[r.situacao][0];
    aviso.textContent = msgs[r.situacao][1];
  }

  const liga = (ids, fn) => { ids.forEach((id) => $(id).addEventListener("input", fn)); fn(); };
  liga(["r-custo", "r-meses", "r-guardado", "r-aporte", "r-taxa"], calcReserva);
  liga(["j-inicial", "j-aporte", "j-taxa", "j-anos"], calcJuros);
  liga(["o-renda"], calcOrcamento);
  liga(["m-faturamento", "m-abertura"], calcMei);
  $("r-tipo").addEventListener("change", (e) => { $("r-meses").value = e.target.value; calcReserva(); });
})();
