/* global QRCode */

const sheetEl = document.getElementById("labelSheet");
const metaInfo = document.getElementById("metaInfo");
const printAction = document.getElementById("printAction");

function renderLabels(items, width, meta) {
  sheetEl.innerHTML = "";
  const widthClass = `label--${width}`;
  const rotation = Number(meta?.rotation || 0);
  const titlePosition = meta?.titlePosition === "above" ? "above" : "below";
  const dpi = Number(meta?.dpi || 360);
  const qrSize = Math.max(80, Math.round(120 * (dpi / 360)));

  items.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = `label ${widthClass}`;

    const inner = document.createElement("div");
    inner.className = "label__inner";
    inner.style.transform = `rotate(${rotation * -1}deg)`;

    const qrHolder = document.createElement("div");
    qrHolder.className = "label__qr";
    qrHolder.id = `print-qr-${idx}`;

    const text = document.createElement("div");
    text.className = "label__text";
    text.textContent = item.titleValue || item.qrValue || "(empty)";

    if (titlePosition === "above") {
      inner.appendChild(text);
      inner.appendChild(qrHolder);
    } else {
      inner.appendChild(qrHolder);
      inner.appendChild(text);
    }
    card.appendChild(inner);
    sheetEl.appendChild(card);

    new QRCode(qrHolder, {
      text: item.qrValue || "",
      width: qrSize,
      height: qrSize,
      correctLevel: QRCode.CorrectLevel.M,
    });
  });

  metaInfo.textContent = `${items.length} label(s) — tape ${width} — QR selector ${meta?.qrSelector || "n/a"} — Title selector ${meta?.titleSelector || "n/a"} — Rotation ${rotation}° — DPI ${dpi}`;
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
