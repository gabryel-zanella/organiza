// Menu do celular e marcação da página atual.
(function () {
  "use strict";
  const btn = document.querySelector(".menu-btn");
  const menu = document.getElementById("menu");
  if (btn && menu) {
    btn.addEventListener("click", () => {
      const aberto = menu.classList.toggle("aberto");
      btn.setAttribute("aria-expanded", String(aberto));
    });
  }
  const atual = document.body.dataset.pagina;
  document.querySelectorAll("#menu a").forEach((a) => {
    if (a.dataset.pagina === atual) a.setAttribute("aria-current", "page");
  });
  const ano = document.getElementById("ano");
  if (ano) ano.textContent = String(new Date().getFullYear());
})();
