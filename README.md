# LabelMkr QR Picker

Browser extension (Manifest V3) to pick elements on any web page, turn their content into QR codes, and print P-Touch labels (12/18/24/36 mm continuous tape).

## Setup
1) Open Chrome/Edge → `chrome://extensions` or `edge://extensions`  
2) Enable **Developer mode**  
3) **Load unpacked** → select this folder (`labelmkr`)  
4) Pin the “LabelMkr” extension for quick access

## How to use
- Pick two selectors: one for QR content, one for Title. Hover to see the live selector preview, right-click to cycle preferred selectors (id, data-role/testid, class), then left-click to capture. Collapse/expand the configuration section once set.
- Choose the content source for each selector (text content, href, src, value, data-label/id, aria-label, title, or a custom attribute).
- Click **Fetch labels** to build the list. Preview shows Title + QR text and the QR code for each match (count is based on the QR selector). Use the checkboxes to choose which labels to print.
- Choose **Tape width** (12/18/24/36 mm) then **Open print view**. The print page restores your last selection automatically and opens the print dialog immediately.
- Settings auto-save locally. Use **Export settings (JSON)** / **Import settings** to move configurations between browsers/machines.

### Printing on Brother P-Touch
- Set the printer driver to the tape width you selected (12/18/24/36 mm) and continuous length.
- In the print dialog, disable “Fit to page/scale to fit.” Use 100% scale.
- Labels flow left-to-right; each block’s minimum height equals the tape width to preserve margins.
- For best edge clarity, choose higher DPI if available (300–600 dpi).
- If QR codes look soft, increase print density in the Brother driver rather than scaling the page.

## Files
- `manifest.json` — MV3 manifest
- `popup.html/.css/.js` — UI for QR/title selectors, content source choices, preview, print launch, import/export
- `picker.js` — injected content script for element picking, selector cycling, value extraction
- `qrcode.js` — bundled QR generator (no network required)
- `print.html/.css/.js` — print-friendly layout sized for P-Touch tape widths
