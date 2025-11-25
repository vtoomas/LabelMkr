/* global QRCode */

const sheetEl = document.getElementById("labelSheet");
const metaInfo = document.getElementById("metaInfo");
const printAction = document.getElementById("printAction");

function renderLabels(items, width, meta) {
  sheetEl.innerHTML = "";
  const widthClass = `label--${width}`;
  items.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = `label ${widthClass}`;

    const inner = document.createElement("div");
    inner.className = "label__inner";

    const qrHolder = document.createElement("div");
    qrHolder.className = "label__qr";
    qrHolder.id = `print-qr-${idx}`;

    const text = document.createElement("div");
    text.className = "label__text";
    text.textContent = item.titleValue || item.qrValue || "(empty)";

    inner.appendChild(qrHolder);
    inner.appendChild(text);
    card.appendChild(inner);
    sheetEl.appendChild(card);

    new QRCode(qrHolder, {
      text: item.qrValue || "",
      width: 120,
      height: 120,
      correctLevel: QRCode.CorrectLevel.M,
    });
  });

  metaInfo.textContent = `${items.length} label(s) — tape ${width} — QR selector ${meta?.qrSelector || "n/a"} — Title selector ${meta?.titleSelector || "n/a"}`;
}

async function loadData() {
  const data = (await chrome.storage.local.get("labelmkr_print")).labelmkr_print;
  if (!data || !data.items?.length) {
    metaInfo.textContent = "No data to print. Go back and generate labels first.";
    sheetEl.innerHTML = "";
    return;
  }
  renderLabels(data.items, data.width || "24mm", data);
  setTimeout(() => window.print(), 300);
}

printAction.addEventListener("click", () => {
  window.print();
});

loadData();
