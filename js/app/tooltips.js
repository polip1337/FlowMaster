// FlowMaster: lightweight DOM tooltip helpers reused by popup/HUD/node labels.

function showDomTooltip(event, text) {
  if (!text) return;
  markerTooltipEl.textContent = text;
  markerTooltipEl.style.left = `${Math.round(event.clientX)}px`;
  markerTooltipEl.style.top = `${Math.round(event.clientY)}px`;
  markerTooltipEl.classList.remove("hidden");
}

function attachDomTooltips(rootEl) {
  if (!rootEl) return;
  const tooltipNodes = rootEl.querySelectorAll("[data-tooltip]");
  for (const el of tooltipNodes) {
    const tip = el.dataset.tooltip;
    if (!tip) continue;
    el.classList.add("has-tooltip");
    el.addEventListener("mouseenter", (event) => showDomTooltip(event, tip));
    el.addEventListener("mousemove", (event) => showDomTooltip(event, tip));
    el.addEventListener("mouseleave", hideMarkerTooltip);
  }
}

function showMarkerTooltip(text, marker) {
  if (!app || symbolModeEnabled) return;
  const global = marker.getGlobalPosition();
  markerTooltipEl.textContent = text;
  markerTooltipEl.style.left = `${Math.round(global.x)}px`;
  markerTooltipEl.style.top = `${Math.round(global.y)}px`;
  markerTooltipEl.classList.remove("hidden");
}

function hideMarkerTooltip() {
  markerTooltipEl.classList.add("hidden");
}
