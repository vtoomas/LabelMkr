(() => {
  const FLAG = "__labelmkr_picker_ready";
  if (window[FLAG]) return;
  window[FLAG] = true;

  const HIGHLIGHT_CLASS = "__labelmkr_highlight";
  const STYLE_ID = "__labelmkr_style";
  const PREVIEW_ID = "__labelmkr_preview";

  let cleanupFns = [];

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .${HIGHLIGHT_CLASS} {
        outline: 2px solid #22c55e !important;
        outline-offset: 2px !important;
        cursor: crosshair !important;
        transition: outline-color 0.2s ease;
      }
      body.__labelmkr_picking * {
        cursor: crosshair !important;
      }
      #${PREVIEW_ID} {
        position: fixed;
        z-index: 2147483647;
        top: 12px;
        right: 12px;
        background: rgba(15, 23, 42, 0.92);
        color: #e2e8f0;
        font-family: "Cascadia Code", Consolas, monospace;
        font-size: 12px;
        line-height: 1.4;
        padding: 8px 10px;
        border-radius: 8px;
        max-width: 360px;
        word-break: break-word;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        pointer-events: none;
      }
      #${PREVIEW_ID} .labelmkr_hint {
        color: #a5b4fc;
        display: block;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 11px;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function getPreviewEl() {
    let el = document.getElementById(PREVIEW_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = PREVIEW_ID;
      document.body.appendChild(el);
    }
    return el;
  }

  function cssEscape(str) {
    if (window.CSS?.escape) return window.CSS.escape(str);
    return str.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
  }

  function buildSelector(el) {
    if (!el || el.nodeType !== 1) return "";
    if (el.id) return `${el.tagName.toLowerCase()}#${cssEscape(el.id)}`;

    const segments = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      let selector = node.tagName.toLowerCase();
      if (node.classList.length) {
        selector += "." + Array.from(node.classList).map(cssEscape).join(".");
      }
      const siblings = Array.from(node.parentNode?.children || []).filter(
        (n) => n.tagName === node.tagName
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(node) + 1;
        selector += `:nth-of-type(${idx})`;
      }
      segments.unshift(selector);
      node = node.parentElement;
    }
    return segments.join(" > ");
  }

  function candidateSelectors(el) {
    if (!el || el.nodeType !== 1) return [];
    const list = [];
    const tag = el.tagName.toLowerCase();

    if (el.id) list.push(`${tag}#${cssEscape(el.id)}`);

    const dataRole = el.getAttribute("data-role");
    if (dataRole) list.push(`${tag}[data-role="${cssEscape(dataRole)}"]`);
    const dataTest = el.getAttribute("data-testid");
    if (dataTest) list.push(`${tag}[data-testid="${cssEscape(dataTest)}"]`);

    if (el.classList.length) {
      const first = cssEscape(el.classList[0]);
      list.push(`${tag}.${first}`);
    }
    if (el.classList.length >= 2) {
      const a = cssEscape(el.classList[0]);
      const b = cssEscape(el.classList[1]);
      list.push(`${tag}.${a}.${b}`);
    }

    list.push(buildSelector(el));

    const seen = new Set();
    return list.filter((sel) => {
      if (seen.has(sel)) return false;
      seen.add(sel);
      return true;
    });
  }

  function valueFromElement(el, source = "text", attrName = "") {
    if (!el) return "";
    const chooseAttr = (name) => el.getAttribute?.(name) || "";
    switch (source) {
      case "href":
        return chooseAttr("href").trim();
      case "src":
        return chooseAttr("src").trim();
      case "value":
        return chooseAttr("value").trim();
      case "data-label":
        return chooseAttr("data-label").trim();
      case "data-id":
        return chooseAttr("data-id").trim();
      case "aria-label":
        return chooseAttr("aria-label").trim();
      case "title":
        return chooseAttr("title").trim();
      case "attr":
        return attrName ? chooseAttr(attrName).trim() : "";
      case "text":
      default:
        return (el.textContent || "").trim();
    }
  }

  function gather(selector, opts = {}) {
    const { source = "text", attr } = opts;
    const nodes = Array.from(document.querySelectorAll(selector));
    return nodes.map((node, idx) => ({
      value: valueFromElement(node, source, attr),
      source: `#${idx + 1}`,
    }));
  }

  function stopPicking() {
    cleanupFns.forEach((fn) => fn());
    cleanupFns = [];
    document.body.classList.remove("__labelmkr_picking");
    const preview = document.getElementById(PREVIEW_ID);
    if (preview) preview.remove();
  }

  function startPicking(startOpts = {}) {
    ensureStyles();
    stopPicking();
    document.body.classList.add("__labelmkr_picking");

    let lastHover;
    let selectors = [];
    let selectorIdx = 0;
    const preview = getPreviewEl();
    const source = startOpts.source || "text";
    const attr = startOpts.attr || "";
    const role = startOpts.role || "qr";

    function showSelector() {
      if (!selectors.length) {
        preview.innerHTML = `<span class="labelmkr_hint">Picker</span>Hover an element to see selectors`;
        return;
      }
      const sel = selectors[selectorIdx % selectors.length];
      const label = role === "title" ? "Title selector" : "QR selector";
      preview.innerHTML = `<span class="labelmkr_hint">${label} (right-click to cycle)</span>${sel}`;
    }

    showSelector();

    const onHover = (ev) => {
      if (lastHover) lastHover.classList.remove(HIGHLIGHT_CLASS);
      lastHover = ev.target;
      lastHover.classList.add(HIGHLIGHT_CLASS);
      selectors = candidateSelectors(lastHover);
      selectorIdx = 0;
      showSelector();
    };

    const onOut = () => {
      if (lastHover) lastHover.classList.remove(HIGHLIGHT_CLASS);
      lastHover = undefined;
      selectors = [];
      selectorIdx = 0;
      showSelector();
    };

    const onKey = (ev) => {
      if (ev.key === "Escape") {
        stopPicking();
      }
    };

    const onClick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const target = ev.target;
      selectors = candidateSelectors(target);
      const selector = selectors[selectorIdx % selectors.length] || buildSelector(target);
      const items = gather(selector, { source, attr });
      const payload = {
        type: "LMKR_RESULT",
        selector,
        items,
        role,
        source,
        attr,
      };
      chrome.storage?.local.set({ labelmkr_last_pick: payload });
      stopPicking();
      chrome.runtime.sendMessage(payload);
    };

    const onContextMenu = (ev) => {
      if (!lastHover) return;
      ev.preventDefault();
      ev.stopPropagation();
      selectorIdx = (selectorIdx + 1) % Math.max(1, selectors.length || 1);
      showSelector();
    };

    document.addEventListener("mouseover", onHover, true);
    document.addEventListener("mouseout", onOut, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("contextmenu", onContextMenu, true);

    cleanupFns.push(() => document.removeEventListener("mouseover", onHover, true));
    cleanupFns.push(() => document.removeEventListener("mouseout", onOut, true));
    cleanupFns.push(() => document.removeEventListener("click", onClick, true));
    cleanupFns.push(() => document.removeEventListener("keydown", onKey, true));
    cleanupFns.push(() => document.removeEventListener("contextmenu", onContextMenu, true));
    cleanupFns.push(() => {
      if (lastHover) lastHover.classList.remove(HIGHLIGHT_CLASS);
    });
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "LMKR_START_PICK") {
      startPicking(msg);
    }
    if (msg?.type === "LMKR_QUERY_SELECTOR" && msg.selector) {
      const items = gather(msg.selector, { source: msg.source, attr: msg.attr });
      const payload = {
        type: "LMKR_RESULT",
        selector: msg.selector,
        items,
        role: msg.role,
      };
      chrome.storage?.local.set({ labelmkr_last_pick: payload });
      chrome.runtime.sendMessage(payload);
      sendResponse?.({ ok: true });
    }
    if (msg?.type === "LMKR_QUERY_DUAL" && msg.qrSelector && msg.titleSelector) {
      const qrItems = gather(msg.qrSelector, { source: msg.qrSource, attr: msg.qrAttr });
      const titleItems = gather(msg.titleSelector, { source: msg.titleSource, attr: msg.titleAttr });
      const items = qrItems.map((qrItem, idx) => ({
        qrValue: qrItem.value,
        titleValue: titleItems[idx]?.value || "",
        idx: idx + 1,
      }));
      const payload = {
        type: "LMKR_RESULT_DUAL",
        items,
        qrSelector: msg.qrSelector,
        titleSelector: msg.titleSelector,
        qrSource: msg.qrSource,
        titleSource: msg.titleSource,
      };
      chrome.storage?.local.set({ labelmkr_last: payload });
      chrome.runtime.sendMessage(payload);
      sendResponse?.({ ok: true, count: items.length });
    }
  });
})();
