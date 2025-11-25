/* global QRCode */

const pickQrBtn = document.getElementById("pickQrBtn");
const pickTitleBtn = document.getElementById("pickTitleBtn");
const qrSelectorInput = document.getElementById("qrSelectorInput");
const titleSelectorInput = document.getElementById("titleSelectorInput");
const qrSourceSelect = document.getElementById("qrSourceSelect");
const titleSourceSelect = document.getElementById("titleSourceSelect");
const qrAttrInput = document.getElementById("qrAttrInput");
const titleAttrInput = document.getElementById("titleAttrInput");
const qrSelectorDisplay = document.getElementById("qrSelectorDisplay");
const titleSelectorDisplay = document.getElementById("titleSelectorDisplay");
const fetchBtn = document.getElementById("fetchBtn");
const statusText = document.getElementById("statusText");
const resultList = document.getElementById("resultList");
const printBtn = document.getElementById("printBtn");
const widthSelect = document.getElementById("widthSelect");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");
const selectAll = document.getElementById("selectAll");

let lastItems = [];
let selected = new Set();

const state = {
  qrSelector: "",
  titleSelector: "",
  qrSource: "text",
  qrAttr: "",
  titleSource: "text",
  titleAttr: "",
  width: "24mm",
};

function setStatus(text) {
  statusText.textContent = text;
}

function toggleAttrInput(selectEl, inputEl) {
  const isAttr = selectEl.value === "attr";
  inputEl.classList.toggle("hidden", !isAttr);
}

async function persistSettings() {
  await chrome.storage.local.set({ labelmkr_settings: { ...state } });
}

function applyStateToUI() {
  qrSelectorInput.value = state.qrSelector;
  titleSelectorInput.value = state.titleSelector;
  qrSourceSelect.value = state.qrSource;
  titleSourceSelect.value = state.titleSource;
  qrAttrInput.value = state.qrAttr;
  titleAttrInput.value = state.titleAttr;
  widthSelect.value = state.width;
  toggleAttrInput(qrSourceSelect, qrAttrInput);
  toggleAttrInput(titleSourceSelect, titleAttrInput);
}

async function loadSettings() {
  const stored = (await chrome.storage.local.get(["labelmkr_settings", "labelmkr_last"]));
  if (stored.labelmkr_settings) {
    Object.assign(state, stored.labelmkr_settings);
  }
  applyStateToUI();
  const last = stored.labelmkr_last;
  if (last?.items?.length && (last.type === "LMKR_RESULT_DUAL" || last.items?.[0]?.qrValue !== undefined)) {
    renderItems(last);
    setStatus("Restored last result from storage.");
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function ensureContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["picker.js"],
  });
}

async function startPicker(role) {
  const tab = await getActiveTab();
  await ensureContentScript(tab.id);
  const source = role === "qr" ? state.qrSource : state.titleSource;
  const attr = role === "qr" ? state.qrAttr : state.titleAttr;
  setStatus(`Hover and ${role === "qr" ? "click to capture QR selector" : "click to capture title selector"}…`);
  chrome.tabs.sendMessage(tab.id, {
    type: "LMKR_START_PICK",
    role,
    source,
    attr,
  });
}

async function fetchLabels() {
  const qrSelector = qrSelectorInput.value.trim();
  const titleSelector = titleSelectorInput.value.trim();
  if (!qrSelector) {
    setStatus("Set the QR selector first.");
    return;
  }
  if (!titleSelector) {
    setStatus("Set the title selector first.");
    return;
  }
  Object.assign(state, {
    qrSelector,
    titleSelector,
    qrSource: qrSourceSelect.value,
    titleSource: titleSourceSelect.value,
    qrAttr: qrAttrInput.value.trim(),
    titleAttr: titleAttrInput.value.trim(),
    width: widthSelect.value,
  });
  await persistSettings();

  const tab = await getActiveTab();
  await ensureContentScript(tab.id);
  setStatus("Fetching elements for both selectors…");
  chrome.tabs.sendMessage(tab.id, {
    type: "LMKR_QUERY_DUAL",
    qrSelector: state.qrSelector,
    titleSelector: state.titleSelector,
    qrSource: state.qrSource,
    titleSource: state.titleSource,
    qrAttr: state.qrAttr,
    titleAttr: state.titleAttr,
  });
}

function renderItems(payload) {
  const { items = [], qrSelector, titleSelector } = payload || {};
  lastItems = items;
  selected = new Set(items.map((_it, idx) => idx));
  qrSelectorDisplay.textContent = qrSelector || "—";
  titleSelectorDisplay.textContent = titleSelector || "—";
  resultList.innerHTML = "";
  selectAll.checked = items.length > 0;
  printBtn.disabled = items.length === 0;

  if (!items.length) {
    setStatus("No matches found for these selectors.");
    return;
  }

  setStatus(`Matched ${items.length} element(s). QR codes ready.`);
  items.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "result-card";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.dataset.idx = idx;
    checkbox.className = "result-card__check";

    const meta = document.createElement("div");
    meta.className = "result-card__meta";
    meta.innerHTML = `<span>#${idx + 1}</span>`;

    const titleText = document.createElement("div");
    titleText.className = "result-card__text";
    titleText.innerHTML = `<strong>Title:</strong> ${item.titleValue || "(empty)"}`;

    const qrText = document.createElement("div");
    qrText.className = "result-card__text";
    qrText.innerHTML = `<strong>QR:</strong> ${item.qrValue || "(empty)"}`;

    const qrHolder = document.createElement("div");
    qrHolder.className = "qr";
    qrHolder.id = `qr-${idx}`;

    card.appendChild(checkbox);
    card.appendChild(meta);
    card.appendChild(titleText);
    card.appendChild(qrText);
    card.appendChild(qrHolder);
    resultList.appendChild(card);

    new QRCode(qrHolder, {
      text: item.qrValue || "",
      width: 96,
      height: 96,
      correctLevel: QRCode.CorrectLevel.M,
    });
  });
  updateSelectionState();
}

function updateSourceVisibility() {
  toggleAttrInput(qrSourceSelect, qrAttrInput);
  toggleAttrInput(titleSourceSelect, titleAttrInput);
}

function updateSelectionState() {
  printBtn.disabled = selected.size === 0;
  selectAll.checked = lastItems.length > 0 && selected.size === lastItems.length;
}

pickQrBtn.addEventListener("click", () => {
  startPicker("qr").catch((err) => {
    console.error(err);
    setStatus("Failed to start picker for QR.");
  });
});

pickTitleBtn.addEventListener("click", () => {
  startPicker("title").catch((err) => {
    console.error(err);
    setStatus("Failed to start picker for title.");
  });
});

fetchBtn.addEventListener("click", () => {
  fetchLabels().catch((err) => {
    console.error(err);
    setStatus("Could not fetch elements. Try again.");
  });
});

qrSourceSelect.addEventListener("change", () => {
  state.qrSource = qrSourceSelect.value;
  updateSourceVisibility();
  persistSettings();
});
titleSourceSelect.addEventListener("change", () => {
  state.titleSource = titleSourceSelect.value;
  updateSourceVisibility();
  persistSettings();
});
qrAttrInput.addEventListener("input", () => {
  state.qrAttr = qrAttrInput.value.trim();
  persistSettings();
});
titleAttrInput.addEventListener("input", () => {
  state.titleAttr = titleAttrInput.value.trim();
  persistSettings();
});
widthSelect.addEventListener("change", () => {
  state.width = widthSelect.value;
  persistSettings();
});

selectAll.addEventListener("change", (e) => {
  if (e.target.checked) {
    selected = new Set(lastItems.map((_it, idx) => idx));
  } else {
    selected.clear();
  }
  document.querySelectorAll(".result-card__check").forEach((cb) => {
    cb.checked = e.target.checked;
  });
  updateSelectionState();
});

resultList.addEventListener("change", (e) => {
  if (e.target.classList.contains("result-card__check")) {
    const idx = Number(e.target.dataset.idx);
    if (e.target.checked) selected.add(idx);
    else selected.delete(idx);
    updateSelectionState();
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "LMKR_RESULT_DUAL") {
    renderItems(msg);
    chrome.storage.local.set({ labelmkr_last: msg });
  }
  if (msg?.type === "LMKR_RESULT") {
    if (msg.role === "qr") {
      state.qrSelector = msg.selector || "";
      qrSelectorInput.value = state.qrSelector;
      setStatus(`Captured QR selector (${msg.items?.length || 0} match(es)).`);
    } else if (msg.role === "title") {
      state.titleSelector = msg.selector || "";
      titleSelectorInput.value = state.titleSelector;
      setStatus(`Captured title selector (${msg.items?.length || 0} match(es)).`);
    }
    persistSettings();
  }
});

printBtn.addEventListener("click", async () => {
  if (!lastItems.length || selected.size === 0) return;
  const chosen = lastItems.filter((_it, idx) => selected.has(idx));
  const payload = {
    items: chosen,
    qrSelector: state.qrSelector,
    titleSelector: state.titleSelector,
    width: state.width,
    type: "LMKR_RESULT_DUAL",
    savedAt: Date.now(),
  };
  await chrome.storage.local.set({ labelmkr_print: payload, labelmkr_last: payload });
  chrome.tabs.create({ url: chrome.runtime.getURL("print.html") });
});

exportBtn.addEventListener("click", async () => {
  const data = {
    qrSelector: state.qrSelector,
    titleSelector: state.titleSelector,
    qrSource: state.qrSource,
    qrAttr: state.qrAttr,
    titleSource: state.titleSource,
    titleAttr: state.titleAttr,
    width: state.width,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "labelmkr-settings.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Exported settings to JSON.");
});

importBtn.addEventListener("click", () => importFile.click());

importFile.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      Object.assign(state, {
        qrSelector: data.qrSelector || "",
        titleSelector: data.titleSelector || "",
        qrSource: data.qrSource || "text",
        qrAttr: data.qrAttr || "",
        titleSource: data.titleSource || "text",
        titleAttr: data.titleAttr || "",
        width: data.width || "24mm",
      });
      applyStateToUI();
      await persistSettings();
      setStatus("Imported settings. Click Fetch labels to refresh.");
    } catch (err) {
      console.error(err);
      setStatus("Invalid JSON file for import.");
    }
  };
  reader.readAsText(file);
});

updateSourceVisibility();
setStatus("Idle — pick selectors or type them manually, then fetch.");
loadSettings();
