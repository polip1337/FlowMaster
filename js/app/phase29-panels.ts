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
  combatPrepBodyEl,
  combatActiveBodyEl,
  combatSummaryBodyEl,
  combatNodeDamageAlertEl,
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
import { ENEMY_ARCHETYPES } from "../../src/data/enemies/archetypes.ts";

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

function getSelectedEnemy() {
  return ENEMY_ARCHETYPES.find((enemy) => enemy.id === st.combatEnemyId) ?? ENEMY_ARCHETYPES[0];
}

function skillChip(skillName: string, index: number): string {
  const active = index === st.combatCurrentSkillIndex ? "active" : "";
  return `<button type="button" class="phase29-item-btn ${active}" data-rotation-index="${index}">${index + 1}. ${skillName}</button>`;
}

function renderCombatPrepPanel() {
  if (!combatPrepBodyEl) return;
  if (!st.combatEncountered || st.combatPhase !== "prep") {
    combatPrepBodyEl.innerHTML = "";
    return;
  }
  const enemy = getSelectedEnemy();
  const pattern = enemy.preferredNodeTarget ? `Targets ${enemy.preferredNodeTarget} first` : "Aggressive frontal pressure";
  combatPrepBodyEl.innerHTML = `
    <div class="phase29-row"><span>Enemy</span><strong>${enemy.name} (Tier ${enemy.tier})</strong></div>
    <div class="muted">Pattern: ${pattern}</div>
    <div class="bonus-title">Rotation Builder</div>
    <div id="combatRotationBuilder" class="phase30-rotation">${st.combatRotation.map(skillChip).join("")}</div>
    <div class="bonus-title">Energy Priority</div>
    <div class="phase29-row"><span>Qi</span><input id="combatPriorityQi" type="range" min="0" max="100" value="${st.combatEnergyPriority.qi}" /></div>
    <div class="phase29-row"><span>Jing</span><input id="combatPriorityJing" type="range" min="0" max="100" value="${st.combatEnergyPriority.jing}" /></div>
    <div class="phase29-row"><span>YangQi</span><input id="combatPriorityYangQi" type="range" min="0" max="100" value="${st.combatEnergyPriority.yangQi}" /></div>
    <div class="phase29-row"><span>Shen</span><input id="combatPriorityShen" type="range" min="0" max="100" value="${st.combatEnergyPriority.shen}" /></div>
    <button type="button" id="startCombatBtn" class="btn ghost">Start Combat</button>
  `;
}

function renderCombatActivePanel() {
  if (!combatActiveBodyEl) return;
  if (!st.combatEncountered || st.combatPhase !== "active") {
    combatActiveBodyEl.innerHTML = "";
    return;
  }
  const cooldownPct = Math.max(0, Math.min(100, ((8 - st.combatSkillCooldownTicks) / 8) * 100));
  const currentSkill = st.combatRotation[st.combatCurrentSkillIndex] ?? "None";
  combatActiveBodyEl.innerHTML = `
    <div class="phase29-row"><span>Player HP</span><strong>${st.combatPlayerHp.toFixed(0)} / ${st.combatPlayerMaxHp.toFixed(0)}</strong></div>
    <div class="phase29-row"><span>Player Soul HP</span><strong>${st.combatPlayerSoulHp.toFixed(0)} / ${st.combatPlayerMaxSoulHp.toFixed(0)}</strong></div>
    <div class="phase29-row"><span>Enemy HP</span><strong>${st.combatEnemyHp.toFixed(0)} / ${st.combatEnemyMaxHp.toFixed(0)}</strong></div>
    <div class="phase29-row"><span>Enemy Soul HP</span><strong>${st.combatEnemySoulHp.toFixed(0)} / ${st.combatEnemyMaxSoulHp.toFixed(0)}</strong></div>
    <div class="phase29-row"><span>Current Skill</span><strong>${currentSkill}</strong></div>
    <div class="phase29-row"><span>Cooldown</span><strong>${cooldownPct.toFixed(0)}%</strong></div>
    <div class="phase30-energy-grid">
      <div class="phase29-row"><span>Qi</span><strong>${st.combatEnergyPool.qi.toFixed(0)}</strong></div>
      <div class="phase29-row"><span>Jing</span><strong>${st.combatEnergyPool.jing.toFixed(0)}</strong></div>
      <div class="phase29-row"><span>YangQi</span><strong>${st.combatEnergyPool.yangQi.toFixed(0)}</strong></div>
      <div class="phase29-row"><span>Shen</span><strong>${st.combatEnergyPool.shen.toFixed(0)}</strong></div>
    </div>
    <div id="combatLogView" class="phase30-log">${st.combatLog.slice(-8).map((line) => `<div class="phase30-log-line">${line}</div>`).join("")}</div>
  `;
}

function renderCombatSummaryPanel() {
  if (!combatSummaryBodyEl) return;
  if (!st.combatEncountered || st.combatPhase !== "summary" || !st.combatSummary) {
    combatSummaryBodyEl.innerHTML = "";
    return;
  }
  const summary = st.combatSummary;
  combatSummaryBodyEl.innerHTML = `
    <div class="phase29-row"><span>Outcome</span><strong>${summary.outcome.toUpperCase()}</strong></div>
    <div class="phase29-row"><span>Damage Dealt / Received</span><strong>${summary.damageDealt} / ${summary.damageReceived}</strong></div>
    <div class="phase29-row"><span>Skills Used</span><strong>${summary.skillsUsed}</strong></div>
    <div class="phase29-row"><span>Energy Spent</span><strong>Qi ${summary.energySpent.qi}, Jing ${summary.energySpent.jing}, YangQi ${summary.energySpent.yangQi}, Shen ${summary.energySpent.shen}</strong></div>
    <div class="phase29-row"><span>Nodes Damaged</span><strong>${summary.nodesDamaged.join(", ") || "None"}</strong></div>
    <div class="phase29-row"><span>Treasures Dropped</span><strong>${summary.treasuresDropped.join(", ") || "None"}</strong></div>
    <div class="phase29-row"><span>Insights Gained</span><strong>${summary.insightsGained}</strong></div>
  `;
}

function renderNodeDamageAlert() {
  if (!combatNodeDamageAlertEl) return;
  const node = st.combatCrackFlashNodeId == null ? null : nodeData.find((entry) => entry.id === st.combatCrackFlashNodeId);
  if (!node || st.combatCrackFlashTicks <= 0) {
    combatNodeDamageAlertEl.setAttribute("hidden", "");
    return;
  }
  combatNodeDamageAlertEl.removeAttribute("hidden");
  combatNodeDamageAlertEl.textContent = `Node cracked: ${node.name}. Body map marker flashing red.`;
}

function applyCombatEnergyPriority(id: string, value: number) {
  st.combatEnergyPriority[id] = Math.max(0, Math.min(100, value));
}

function startCombatSimulation() {
  const enemy = getSelectedEnemy();
  st.combatEncountered = true;
  st.combatPhase = "active";
  st.combatEnemyMaxHp = enemy.hp;
  st.combatEnemyHp = enemy.hp;
  st.combatEnemyMaxSoulHp = enemy.soulHp;
  st.combatEnemySoulHp = enemy.soulHp;
  st.combatPlayerMaxHp = 180 + st.temperingLevel * 12;
  st.combatPlayerHp = st.combatPlayerMaxHp;
  st.combatPlayerMaxSoulHp = 110 + st.temperingLevel * 8;
  st.combatPlayerSoulHp = st.combatPlayerMaxSoulHp;
  st.combatTick = 0;
  st.combatCurrentSkillIndex = 0;
  st.combatSkillCooldownTicks = 0;
  st.combatLog = [`Encounter started with ${enemy.name}.`];
  st.combatSummary = null;
}

function finalizeCombatSummary() {
  const damaged = nodeData.filter((node) => node.damageState === "cracked" || node.damageState === "shattered").map((node) => node.name);
  st.combatSummary = {
    outcome: st.combatEnemyHp <= 0 ? "victory" : "defeat",
    damageDealt: Math.max(0, Math.round(st.combatEnemyMaxHp - st.combatEnemyHp)),
    damageReceived: Math.max(0, Math.round(st.combatPlayerMaxHp - st.combatPlayerHp)),
    skillsUsed: st.combatTick,
    energySpent: {
      qi: Math.round(100 - st.combatEnergyPool.qi),
      jing: Math.round(80 - st.combatEnergyPool.jing),
      yangQi: Math.round(55 - st.combatEnergyPool.yangQi),
      shen: Math.round(40 - st.combatEnergyPool.shen)
    },
    nodesDamaged: damaged,
    treasuresDropped: st.combatEnemyHp <= 0 ? ["Condensed Essence Pill", "Refining Stone"] : [],
    insightsGained: st.combatEnemyHp <= 0 ? 18 + st.temperingLevel : 4
  };
  st.combatPhase = "summary";
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
  combatPrepBodyEl?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.id === "startCombatBtn") {
      startCombatSimulation();
      updatePhase29Panels();
      return;
    }
    const btn = target.closest("[data-rotation-index]") as HTMLElement | null;
    if (!btn) return;
    const idx = Number(btn.getAttribute("data-rotation-index"));
    if (!Number.isFinite(idx) || idx < 0 || idx >= st.combatRotation.length) return;
    const next = idx === st.combatRotation.length - 1 ? 0 : idx + 1;
    const reordered = [...st.combatRotation];
    const swap = reordered[idx];
    reordered[idx] = reordered[next];
    reordered[next] = swap;
    st.combatRotation = reordered;
    renderCombatPrepPanel();
  });
  combatPrepBodyEl?.addEventListener("input", (event) => {
    const target = event.target as HTMLInputElement | null;
    if (!target) return;
    if (target.id === "combatPriorityQi") applyCombatEnergyPriority("qi", Number(target.value));
    if (target.id === "combatPriorityJing") applyCombatEnergyPriority("jing", Number(target.value));
    if (target.id === "combatPriorityYangQi") applyCombatEnergyPriority("yangQi", Number(target.value));
    if (target.id === "combatPriorityShen") applyCombatEnergyPriority("shen", Number(target.value));
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
    st.combatPhase = "prep";
    updatePhase29Panels();
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
  const crackedNode = nodeData.find((n) => n.damageState === "cracked");
  if (crackedNode && st.combatCrackFlashNodeId !== crackedNode.id) {
    st.combatCrackFlashNodeId = crackedNode.id;
    st.combatCrackFlashTicks = 24;
    st.combatLog.push(`[Alert] ${crackedNode.name} cracked under pressure.`);
  }
  if (st.combatCrackFlashTicks > 0) {
    st.combatCrackFlashTicks -= 1;
  }
  if (!st.combatEncountered && nodeData.some((n) => n.damageState === "cracked" || n.damageState === "shattered")) {
    st.combatEncountered = true;
  }
  if (st.combatPhase === "active") {
    st.combatTick += 1;
    st.combatSkillCooldownTicks = (st.combatSkillCooldownTicks + 1) % 8;
    if (st.combatSkillCooldownTicks === 0) {
      st.combatCurrentSkillIndex = (st.combatCurrentSkillIndex + 1) % Math.max(1, st.combatRotation.length);
      const skill = st.combatRotation[st.combatCurrentSkillIndex] ?? "Unknown";
      const damage = 9 + st.temperingLevel * 2;
      st.combatEnemyHp = Math.max(0, st.combatEnemyHp - damage);
      st.combatEnergyPool.qi = Math.max(0, st.combatEnergyPool.qi - Math.max(1, st.combatEnergyPriority.qi * 0.04));
      st.combatEnergyPool.jing = Math.max(0, st.combatEnergyPool.jing - Math.max(1, st.combatEnergyPriority.jing * 0.03));
      st.combatEnergyPool.yangQi = Math.max(0, st.combatEnergyPool.yangQi - Math.max(1, st.combatEnergyPriority.yangQi * 0.02));
      st.combatEnergyPool.shen = Math.max(0, st.combatEnergyPool.shen - Math.max(1, st.combatEnergyPriority.shen * 0.015));
      st.combatLog.push(`You cast ${skill}, dealing ${damage} HP.`);
    }
    if (st.combatTick % 9 === 0) {
      const incoming = 7 + st.temperingLevel * 0.6;
      st.combatPlayerHp = Math.max(0, st.combatPlayerHp - incoming);
      st.combatLog.push(`Enemy strike hits for ${incoming.toFixed(0)} HP.`);
    }
    if (st.combatEnemyHp <= 0 || st.combatPlayerHp <= 0 || st.combatTick >= 48) {
      finalizeCombatSummary();
    }
  }
}

export function updatePhase29Panels() {
  updateHeatHud();
  renderCultivationPanel();
  renderCombatPanel();
  renderCombatPrepPanel();
  renderCombatActivePanel();
  renderCombatSummaryPanel();
  renderNodeDamageAlert();
  renderRefiningPulse();
  renderRoutePanel();
  renderTemperingPanel();
  renderDaoPanel();
  renderInventoryPanel();
}
