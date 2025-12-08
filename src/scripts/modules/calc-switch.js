import { renderSelected } from "./select-curency.js";

function getCurrentOption(select) {
  const codeElem = select.querySelector(".cselect__code");
  const code = codeElem?.textContent.trim();
  if (!code) return null;

  const real = select.querySelector(`.cselect__option[data-code="${code}"]`);
  if (real) return real;

  // Создаём виртуальную валюту (как Binance — допускает любую)
  const imgHTML = select.querySelector(".cselect__img")?.innerHTML || "";
  const fake = document.createElement("div");
  fake.className = "cselect__option";
  fake.dataset.code = code;
  fake.innerHTML = `
    <div class="cselect__option-left">
      <span class="cselect__img">${imgHTML}</span>
      <span class="cselect__label">${code}</span>
    </div>
  `;
  return fake;
}

document.addEventListener("click", e => {
  const btn = e.target.closest(".currency-transfer__icon");
  if (!btn) return;

  const wrap = btn.closest(".currency-transfer");
  if (!wrap) return;

  const [send, receive] = wrap.querySelectorAll(".cselect-js");

  const optSend = getCurrentOption(send);
  const optReceive = getCurrentOption(receive);

  if (!optSend || !optReceive) return;

  // 1 в 1 BINANCE: просто меняем источники
  renderSelected(send, optReceive);
  renderSelected(receive, optSend);

  console.log("✔ Binance-style SWAP completed");
});
