// FlowMaster: lightweight DOM tooltip helpers reused by popup/HUD/node labels.

import { st } from './state.ts';
import { markerTooltipEl } from './state.ts';

export function showDomTooltip(event: MouseEvent, text: string) {
  if (!text) return;
  markerTooltipEl.textContent = text;
  markerTooltipEl.style.left = `${Math.round(event.clientX)}px`;
  markerTooltipEl.style.top = `${Math.round(event.clientY)}px`;
  markerTooltipEl.classList.remove("hidden");
}

export function attachDomTooltips(rootEl: HTMLElement | null) {
  if (!rootEl) return;
  const tooltipNodes = rootEl.querySelectorAll("[data-tooltip]");
  for (const el of tooltipNodes) {
    const tip = (el as HTMLElement).dataset.tooltip;
    if (!tip) continue;
    el.classList.add("has-tooltip");
    el.addEventListener("mouseenter", (event) => showDomTooltip(event as MouseEvent, tip));
    el.addEventListener("mousemove", (event) => showDomTooltip(event as MouseEvent, tip));
    el.addEventListener("mouseleave", hideMarkerTooltip);
  }
}

export function showMarkerTooltip(text: string, marker: any) {
  if (!st.app || st.symbolModeEnabled) return;
  const global = marker.getGlobalPosition();
  markerTooltipEl.textContent = text;
  markerTooltipEl.style.left = `${Math.round(global.x)}px`;
  markerTooltipEl.style.top = `${Math.round(global.y)}px`;
  markerTooltipEl.classList.remove("hidden");
}

export function hideMarkerTooltip() {
  markerTooltipEl.classList.add("hidden");
}
