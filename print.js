/* global QRCode */

const sheetEl = document.getElementById("labelSheet");

function renderLabels(items, width, meta) {
  sheetEl.innerHTML = "";
  const widthClass = `label--${width}`;
  const rotation = Number(meta?.rotation || 0);
  const titlePosition = meta?.titlePosition === "above" ? "above" : "below";
  const dpi = Number(meta?.dpi || 360);
  const qrSizeMmMap = {
    "12mm": 12,
    "18mm": 18,
    "24mm": 24,
    "36mm": 36,
  };
  const qrSizeMm = qrSizeMmMap[width] || 18;
  // const qrSizePx = Math.round((qrSizeMm / 25.4) * dpi);
  const qrSizePx = Math.round((qrSizeMm / 108) * dpi);
  console.table({ qrSizeMm, qrSizePx, dpi, width });

  items.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = `label ${widthClass}`;

    const inner = document.createElement("div");
    inner.className = "label__inner";
    inner.style.transform = `rotate(${rotation * -1}deg)`;
    inner.style.transformOrigin = "center center";

    const qrHolder = document.createElement("div");
    qrHolder.className = "label__qr";
    qrHolder.id = `print-qr-${idx}`;
    qrHolder.style.width = `${qrSizeMm}mm`;
    qrHolder.style.height = `${qrSizeMm}mm`;

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
      width: qrSizePx,
      height: qrSizePx,
      correctLevel: QRCode.CorrectLevel.M,
    });
  });
}

async function loadData() {
  const data = (await chrome.storage.local.get("labelmkr_print")).labelmkr_print;
  if (!data || !data.items?.length) {
    sheetEl.innerHTML = "<div>No data to print. Go back and generate labels first.</div>";
    return;
  }
  renderLabels(data.items, data.width || "24mm", data);
  setTimeout(() => window.print(), 100);
}

// window.addEventListener("afterprint", () => {
//   self.close();
// });

loadData();
