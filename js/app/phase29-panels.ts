import { TICKS_PER_SECOND } from "./constants.ts";
import { nodeData } from "./config.ts";
import { getAttributeState } from "./mechanics.ts";
import {
  st,
  statusEl,
  bodyHeatGaugeEl,
  bodyHeatLabelEl,
  bodyHeatWarningEl,
  cultivationPanelBodyEl,
  combatPanelBodyEl,
  refiningPulseBtnEl,
  refiningPulseInfoEl,
  activeRouteDisplayEl,
  stopRouteBtnEl,
  temperingLevelEl,
  temperingXpEl,
  temperingActionEl,
  temperingBonusesEl,
  daoSummaryEl,
  daoSelectEl,
  daoNodesEl,
  daoSkillsEl,
  inventoryGridEl,
  inventoryDetailEl,
  ingredientInventoryEl
} from "./state.ts";

type HeatZone = "green" | "yellow" | "orange" | "red";

const CULTIVATION_ATTRS = [
  "Meridian Efficiency",
  "Projection Throughput",
  "Projection Echo",
  "Body Tempering",
  "Dual Harmony",
  "Core Generation Bonus",
  "Core Generation (Flat)",
  "Resonance Readiness",
  "Max Projection Bridges",
  "Resonance Pattern"
] as const;

const COMBAT_ATTRS = [
  "Physical Power",
  "Technique Power",
  "Soul Power",
  "Physical Durability",
  "Soul Durability",
  "Mobility",
  "Grounding",
  "Attack Speed",
  "Energy Recovery",
  "Critical Insight"
] as const;

function routeMetrics(nodeIds: string[]) {
  if (nodeIds.length < 2) {
    return { efficiency: 0, bottleneck: "n/a", heat: 0 };
  }
  let bottleneck = Number.POSITIVE_INFINITY;
  let bottleneckId = "n/a";
  let heat = 0;
  for (let i = 0; i < nodeIds.length - 1; i += 1) {
    const id = `${nodeIds[i]}->${nodeIds[i + 1]}`;
    const m = st.bodyMapMeridians?.get(id);
    if (!m || !m.isEstablished) continue;
    const score = Math.max(0, m.width) * Math.max(0, Math.min(1, m.purity));
    if (score < bottleneck) {
      bottleneck = score;
      bottleneckId = id;
    }
    heat += Math.max(0, m.width) * (1 - Math.max(0, Math.min(1, m.purity))) * 0.2;
  }
  const efficiency = Math.min(1.2, 0.6 + 0.06 * Math.max(0, nodeIds.length - 2));
  return { efficiency, bottleneck: bottleneckId, heat };
}

function attrBreakdownEntries() {
  return nodeData
    .filter((n) => n.unlocked)
    .map((n) => ({
      node: n.name,
      resonance: n.si > n.unlockCost * 1.8 ? 1 : 0.55,
      rank: 1,
      level: Math.min(9, Math.max(1, Number(n.quality) || 1)),
      contribution: (n.unlockCost > 0 ? n.si / n.unlockCost : 1) * 0.12
    }))
    .sort((a, b) => b.contribution - a.contribution);
}

export function heatZoneFor(bodyHeat: number, maxBodyHeat: number): HeatZone {
  const ratio = maxBodyHeat <= 0 ? 0 : bodyHeat / maxBodyHeat;
  if (ratio < 0.4) return "green";
  if (ratio < 0.65) return "yellow";
  if (ratio < 0.85) return "orange";
  return "red";
}

function updateHeatHud() {
  if (!bodyHeatGaugeEl || !bodyHeatLabelEl || !bodyHeatWarningEl) return;
  const ratio = Math.max(0, Math.min(1, st.bodyHeat / Math.max(1, st.maxBodyHeat)));
  const zone = heatZoneFor(st.bodyHeat, st.maxBodyHeat);
  const colorByZone: Record<HeatZone, string> = {
    green: "#2a6a4a",
    yellow: "#b28b1a",
    orange: "#cf6b1a",
    red: "#a01f1f"
  };
  bodyHeatGaugeEl.setAttribute("data-zone", zone);
  bodyHeatGaugeEl.style.setProperty("--heat-fill", `${(ratio * 100).toFixed(1)}%`);
  bodyHeatGaugeEl.style.setProperty("--heat-color", colorByZone[zone]);
  bodyHeatLabelEl.textContent = `${st.bodyHeat.toFixed(1)} / ${st.maxBodyHeat.toFixed(0)} (${(ratio * 100).toFixed(1)}%)`;
  bodyHeatWarningEl.textContent = zone === "red" ? "CRITICAL — Node Damage Risk" : "Heat stable";
  bodyHeatWarningEl.classList.toggle("warning", zone === "red");
}

function tooltipTextFor(attribute: string): string {
  const lines = attrBreakdownEntries()
    .slice(0, 4)
    .map((row) => `${row.node}: +${(row.contribution * 100).toFixed(1)}% (res ${row.resonance.toFixed(2)} · r${row.rank} l${row.level})`);
  return `${attribute}\n${lines.join("\n")}`;
}

function renderCultivationPanel() {
  if (!cultivationPanelBodyEl) return;
  const attr = getAttributeState();
  const valueByKey: Record<string, string> = {
    "Meridian Efficiency": `${(attr.flowEfficiency * 100).toFixed(2)}%`,
    "Projection Throughput": `${(attr.projectionRatePercent * 100).toFixed(2)}%`,
    "Projection Echo": `${(attr.projectionEcho * 100).toFixed(2)}%`,
    "Body Tempering": `${(attr.fortitude * 100).toFixed(2)}%`,
    "Dual Harmony": `${(attr.harmonyPower * 100).toFixed(2)}%`,
    "Core Generation Bonus": `${(attr.generationPercent * 100).toFixed(2)}%`,
    "Core Generation (Flat)": `${(attr.generationFlatPerTick * TICKS_PER_SECOND).toFixed(2)} SI/s`,
    "Resonance Readiness": attr.resonanceReady ? "Ready" : "Building",
    "Max Projection Bridges": `${attr.maxActiveBridges}`,
    "Resonance Pattern": attr.resonancePatternReady ? "Aligned" : "Not aligned"
  };
  cultivationPanelBodyEl.innerHTML = CULTIVATION_ATTRS
    .map((name) => `<div class="phase29-row" data-tooltip="${tooltipTextFor(name)}"><span>${name}</span><strong>${valueByKey[name]}</strong></div>`)
    .join("");
}

function renderCombatPanel() {
  if (!combatPanelBodyEl) return;
  const locked = !st.combatEncountered;
  if (locked) {
    combatPanelBodyEl.innerHTML = `<div class="muted">Locked until first combat encounter.</div>`;
    return;
  }
  const t = st.temperingLevel;
  const values = [
    (25 + t * 2.6).toFixed(1),
    (22 + t * 2.4).toFixed(1),
    (18 + t * 2.0).toFixed(1),
    (100 + t * 10).toFixed(1),
    (50 + t * 4).toFixed(1),
    (12 + t * 0.8).toFixed(1),
    (10 + t * 0.6).toFixed(1),
    (1 + t * 0.03).toFixed(2),
    (4 + t * 0.45).toFixed(1),
    (8 + t * 0.75).toFixed(1)
  ];
  combatPanelBodyEl.innerHTML = COMBAT_ATTRS
    .map((name, i) => `<div class="phase29-row"><span>${name}</span><strong>${values[i]}</strong></div>`)
    .join("");
}

function isManipuraActive(): boolean {
  return nodeData.filter((n) => n.unlocked).length >= 6;
}

function renderRefiningPulse() {
  if (!refiningPulseBtnEl || !refiningPulseInfoEl) return;
  const canUse = isManipuraActive() && st.bodyHeat <= st.maxBodyHeat * 0.8;
  refiningPulseBtnEl.toggleAttribute("disabled", !canUse);
  refiningPulseBtnEl.classList.toggle("active", st.refiningPulseActive);
  const efficiency = Math.min(95, 30 + st.temperingLevel * 6);
  const heatCost = (0.35 + st.temperingLevel * 0.02).toFixed(2);
  refiningPulseInfoEl.textContent = `Qi→YangQi 3:1 | eff ${efficiency.toFixed(0)}% | heat ${heatCost}/tick`;
}

function renderRoutePanel() {
  if (!activeRouteDisplayEl) return;
  if (st.activeBodyRouteNodeIds.length < 2) {
    activeRouteDisplayEl.textContent = "No active circulation route.";
    return;
  }
  const metrics = routeMetrics(st.activeBodyRouteNodeIds);
  activeRouteDisplayEl.innerHTML = `
    <div><strong>${st.activeBodyRouteNodeIds.join(" -> ")}</strong></div>
    <div>Loop efficiency: <strong>${(metrics.efficiency * 100).toFixed(1)}%</strong></div>
    <div>Bottleneck: <strong>${metrics.bottleneck}</strong></div>
    <div>Heat/tick: <strong>${metrics.heat.toFixed(3)}</strong></div>
  `;
}

function renderTemperingPanel() {
  if (!temperingLevelEl || !temperingXpEl || !temperingBonusesEl) return;
  const req = st.temperingLevel * 120;
  const prog = Math.min(1, st.temperingXp / req);
  temperingLevelEl.textContent = String(st.temperingLevel);
  temperingXpEl.textContent = `${st.temperingXp.toFixed(1)} / ${req.toFixed(0)} (${(prog * 100).toFixed(0)}%)`;
  if (temperingActionEl) temperingActionEl.setAttribute("value", st.temperingAction);
  temperingBonusesEl.textContent = `HP +${st.temperingLevel * 10} | Jing gen +${(st.temperingLevel * 0.01).toFixed(2)}/tick`;
}

function renderDaoPanel() {
  if (!daoSummaryEl || !daoNodesEl || !daoSkillsEl) return;
  const selected = st.daoSelected;
  daoSummaryEl.textContent = selected
    ? `${selected} Dao | insights ${st.daoInsights.toFixed(0)} | comprehension ${st.daoComprehensionLevel}`
    : "No Dao selected. Choose one below.";
  daoNodesEl.innerHTML = st.daoNodes.length > 0
    ? st.daoNodes.map((n) => `<div class="phase29-row"><span>${n.name}</span><strong>${n.state}</strong></div>`).join("")
    : `<div class="muted">No Dao nodes yet.</div>`;
  daoSkillsEl.innerHTML = st.daoSkills.length > 0
    ? st.daoSkills.map((skill) => `<span class="phase29-chip">${skill}</span>`).join("")
    : `<span class="muted">No unlocked skills.</span>`;
}

function renderInventoryPanel() {
  if (!inventoryGridEl || !inventoryDetailEl || !ingredientInventoryEl) return;
  inventoryGridEl.innerHTML = st.inventoryItems
    .map((item) => `
      <button type="button" class="phase29-item-btn ${st.selectedInventoryItemId === item.id ? "active" : ""}" data-item-id="${item.id}">
        ${item.name} x${item.quantity}
      </button>
    `).join("");
  const selected = st.inventoryItems.find((item) => item.id === st.selectedInventoryItemId) ?? null;
  if (!selected) {
    inventoryDetailEl.textContent = "Select a treasure to preview and apply.";
  } else {
    inventoryDetailEl.innerHTML = `
      <div><strong>${selected.name}</strong></div>
      <div>${selected.effect}</div>
      <div class="muted">${st.inventoryTargetingActive ? "Targeting active: click a body-map node." : "Click Apply to target on body map."}</div>
      <button type="button" id="applyInventoryItemBtn" class="btn ghost" ${selected.quantity <= 0 ? "disabled" : ""}>Apply to Body Map Target</button>
    `;
    document.getElementById("applyInventoryItemBtn")?.addEventListener("click", () => {
      st.inventoryTargetingActive = true;
      if (statusEl) statusEl.textContent = `Select body-map target for ${selected.name}.`;
      renderInventoryPanel();
    });
  }
  ingredientInventoryEl.innerHTML = st.ingredientItems
    .map((item) => `<div class="phase29-row"><span>${item.name}</span><strong>x${item.quantity}</strong></div>`)
    .join("");
}

function initializeDaoForSelection(daoName: string) {
  st.daoSelected = daoName;
  st.daoNodes = [
    { id: `${daoName}-seed`, name: `${daoName} Seed`, state: "ACTIVE" },
    { id: `${daoName}-path`, name: `${daoName} Path`, state: "SEALING" },
    { id: `${daoName}-crown`, name: `${daoName} Crown`, state: "LOCKED" }
  ];
  st.daoSkills = [`${daoName} Strike`, `${daoName} Pulse`];
  st.daoInsights = Math.max(st.daoInsights, 120);
}

export function applyInventoryToTier2Target(tier2Id: string): boolean {
  if (!st.inventoryTargetingActive || !st.selectedInventoryItemId) return false;
  const item = st.inventoryItems.find((entry) => entry.id === st.selectedInventoryItemId && entry.quantity > 0);
  if (!item) return false;
  item.quantity -= 1;
  st.inventoryTargetingActive = false;
  if (statusEl) statusEl.textContent = `${item.name} applied to ${tier2Id}.`;
  renderInventoryPanel();
  return true;
}

export function bindPhase29PanelUi() {
  refiningPulseBtnEl?.addEventListener("click", () => {
    if ((refiningPulseBtnEl as HTMLButtonElement).disabled) return;
    st.refiningPulseActive = !st.refiningPulseActive;
    renderRefiningPulse();
  });
  stopRouteBtnEl?.addEventListener("click", () => {
    st.activeBodyRouteNodeIds = [];
    renderRoutePanel();
  });
  temperingActionEl?.addEventListener("change", () => {
    const select = temperingActionEl as HTMLSelectElement;
    st.temperingAction = select.value;
    renderTemperingPanel();
  });
  daoSelectEl?.addEventListener("change", () => {
    const select = daoSelectEl as HTMLSelectElement;
    if (select.value) initializeDaoForSelection(select.value);
    renderDaoPanel();
  });
  inventoryGridEl?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const btn = target?.closest("[data-item-id]") as HTMLElement | null;
    if (!btn) return;
    st.selectedInventoryItemId = btn.getAttribute("data-item-id");
    renderInventoryPanel();
  });
  document.addEventListener("keydown", onPhase29KeyDown);
}

export function onPhase29KeyDown(event: KeyboardEvent): void {
  if (event.repeat) return;
  if (event.key.toLowerCase() === "r") {
    if (refiningPulseBtnEl && !(refiningPulseBtnEl as HTMLButtonElement).disabled) {
      st.refiningPulseActive = !st.refiningPulseActive;
      renderRefiningPulse();
    }
  }
  if (event.key.toLowerCase() === "c") {
    st.combatEncountered = true;
    renderCombatPanel();
  }
}

export function stepPhase29UiSystems() {
  const passiveDecay = st.refiningPulseActive ? 0.08 : 0.24;
  st.bodyHeat = Math.max(0, st.bodyHeat - passiveDecay);
  if (st.refiningPulseActive) {
    st.bodyHeat = Math.min(st.maxBodyHeat, st.bodyHeat + 0.48 + st.temperingLevel * 0.02);
  }
  const actionGain = st.temperingAction === "Sprint Training" ? 0.5 : st.temperingAction === "Stone Lifting" ? 0.45 : 0.3;
  st.temperingXp += actionGain;
  const req = st.temperingLevel * 120;
  while (st.temperingXp >= req && st.temperingLevel < 9) {
    st.temperingXp -= req;
    st.temperingLevel += 1;
  }
  st.daoInsights += 0.12 + st.temperingLevel * 0.01;
  st.daoComprehensionLevel = st.daoSelected ? Math.min(9, Math.floor(st.daoInsights / 500)) : 0;
  if (!st.combatEncountered && nodeData.some((n) => n.damageState === "cracked" || n.damageState === "shattered")) {
    st.combatEncountered = true;
  }
}

export function updatePhase29Panels() {
  updateHeatHud();
  renderCultivationPanel();
  renderCombatPanel();
  renderRefiningPulse();
  renderRoutePanel();
  renderTemperingPanel();
  renderDaoPanel();
  renderInventoryPanel();
}
