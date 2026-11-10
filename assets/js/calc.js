/* Cálculos dos simuladores do Projeto Organiza.
 * Funções puras: não acessam a página nem guardam dados.
 * Funcionam no navegador (window.OrganizaCalc) e no Node (testes).
 */
(function (global) {
  "use strict";

  const TETO_MEI_ANUAL = 81000;      // LC 123/2006, valor vigente em 2026
  const TETO_MEI_MENSAL = 6750;      // 81.000 / 12, usado no ano de abertura
  const LIMITE_MAXIMO_MESES = 600;   // 50 anos: evita laço infinito

  /** Converte taxa anual (ex.: 0.12 para 12%) em taxa mensal equivalente. */
  function taxaMensal(taxaAnual) {
    return Math.pow(1 + taxaAnual, 1 / 12) - 1;
  }

  /**
   * Reserva de emergência.
   * Simulação mês a mês: rende juros sobre o saldo e soma o aporte no fim do mês.
   * @returns {{meta, falta, meses, possivel, evolucao: number[]}}
   */
  function reservaEmergencia({ custoMensal, mesesReserva, jaGuardado = 0, aporteMensal = 0, taxaMensal: i = 0 }) {
    const meta = custoMensal * mesesReserva;
    const evolucao = [jaGuardado];
    if (jaGuardado >= meta) {
      return { meta, falta: 0, meses: 0, possivel: true, evolucao };
    }
    let saldo = jaGuardado;
    let meses = 0;
    while (saldo < meta && meses < LIMITE_MAXIMO_MESES) {
      saldo = saldo * (1 + i) + aporteMensal;
      meses++;
      evolucao.push(saldo);
      if (aporteMensal <= 0 && i <= 0) break; // sem aporte e sem rendimento nunca chega
    }
    const possivel = saldo >= meta;
    return { meta, falta: meta - jaGuardado, meses: possivel ? meses : null, possivel, evolucao };
  }

  /**
   * Juros compostos com aportes mensais (aporte no fim de cada mês).
   * VF = P(1+i)^n + A[((1+i)^n - 1)/i]
   */
  function valorFuturo({ inicial = 0, aporteMensal = 0, taxaMensal: i = 0, meses }) {
    if (i === 0) return inicial + aporteMensal * meses;
    const f = Math.pow(1 + i, meses);
    return inicial * f + aporteMensal * ((f - 1) / i);
  }

  /** Tabela ano a ano: total investido, juros acumulados e saldo. */
  function investimentoPorAno({ inicial = 0, aporteMensal = 0, taxaMensal: i = 0, anos }) {
    const linhas = [];
    let saldo = inicial;
    for (let m = 1; m <= anos * 12; m++) {
      saldo = saldo * (1 + i) + aporteMensal;
      if (m % 12 === 0) {
        const investido = inicial + aporteMensal * m;
        linhas.push({ ano: m / 12, investido, juros: saldo - investido, saldo });
      }
    }
    return linhas;
  }

  /** Orçamento 50-30-20 sobre a renda líquida. */
  function orcamento503020(renda) {
    return { necessidades: renda * 0.5, desejos: renda * 0.3, poupanca: renda * 0.2 };
  }

  /**
   * Limite de faturamento do MEI.
   * @param {number} faturamento acumulado no ano
   * @param {number|null} mesAbertura 1 a 12 se a empresa abriu neste ano; null se abriu antes
   * @returns {{limite, mesesAtividade, percentual, disponivel, situacao}}
   *   situacao: "ok" | "alerta" (80% ou mais) | "ate20" (até 20% acima) | "acima20"
   */
  function limiteMei(faturamento, mesAbertura = null) {
    const mesesAtividade = mesAbertura ? 12 - mesAbertura + 1 : 12;
    const limite = mesAbertura ? TETO_MEI_MENSAL * mesesAtividade : TETO_MEI_ANUAL;
    const percentual = limite > 0 ? faturamento / limite : 0;
    let situacao = "ok";
    if (faturamento > limite * 1.2) situacao = "acima20";
    else if (faturamento > limite) situacao = "ate20";
    else if (percentual >= 0.8) situacao = "alerta";
    return { limite, mesesAtividade, percentual, disponivel: Math.max(0, limite - faturamento), situacao };
  }

  const api = { TETO_MEI_ANUAL, TETO_MEI_MENSAL, taxaMensal, reservaEmergencia, valorFuturo, investimentoPorAno, orcamento503020, limiteMei };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.OrganizaCalc = api;
})(typeof window !== "undefined" ? window : globalThis);
