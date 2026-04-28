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
  ingredientInventoryEl,
  alchemySlotsEl,
  alchemyPhaseEl,
  alchemyQualityPreviewEl,
  alchemyRefineBtnEl,
  alchemyRecipeListEl,
  alchemyFilterTypeEl,
  alchemyFilterTierEl,
  alchemyFilterAvailableEl,
  celestialCalendarWidgetEl,
  sectPanelBodyEl,
  saveGameBtnEl,
  loadGameBtnEl,
  exportSaveBtnEl,
  importSaveInputEl
} from "./state.ts";
import { ENEMY_ARCHETYPES } from "../../src/data/enemies/archetypes.ts";
import { ALCHEMY_RECIPES } from "../../src/data/alchemy/recipes.ts";
import type { Recipe } from "../../src/core/alchemy/types.ts";
import { makeMeridianId } from "../../src/core/meridians/meridianId";
import {
  advanceCoreBridgeTick,
  advanceCoreAlchemyToRefiningFromUi,
  beginCoreAlchemyFromUi,
  refineCoreAlchemyFromUi,
  startCoreCombatFromUi,
  joinCoreSectFromUi,
  exportCoreStateAsJson,
  importCoreStateFromJson,
  isCoreBridgeInitialized,
  loadCoreStateFromLocalStorage,
  saveCoreStateToLocalStorage
} from "./core-bridge.ts";
import { getBodyIdForNodeId, CELESTIAL_YEAR_DAYS, CELESTIAL_PEAK_DURATION_DAYS } from "../../src/core/celestial/calendar";
import { T2_NODE_DEFS } from "../../src/data/t2NodeDefs";
import { SECTS } from "../../src/data/sects/sects";

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

const RECIPE_TYPE_LABELS: Record<string, string> = {
  condensed_essence_pill: "Condensed Essence Pill",
  refining_stone: "Refining Stone",
  meridian_salve: "Meridian Salve",
  meridian_restoration: "Meridian Restoration",
  jing_deposit: "Jing Deposit",
  dao_fragment: "Dao Fragment",
  recovery_elixir: "Recovery Elixir",
  formation_array: "Formation Array",
  cultivation_manual: "Cultivation Manual"
};
const ALCHEMY_REFINE_COST = 5;
const NODE_NAME_BY_ID = new Map(T2_NODE_DEFS.map((node) => [node.id, node.displayName]));
let phase29PanelUiBound = false;

function routeMetrics(nodeIds: string[]) {
  if (nodeIds.length < 2) {
    return { efficiency: 0, bottleneck: "n/a", heat: 0 };
  }
  let bottleneck = Number.POSITIVE_INFINITY;
  let bottleneckId = "n/a";
  let heat = 0;
  for (let i = 0; i < nodeIds.length - 1; i += 1) {
    const id = makeMeridianId(nodeIds[i], nodeIds[i + 1]);
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
  startCoreCombatFromUi(st.combatEnemyId);
  st.combatEncountered = true;
  st.combatPhase = "active";
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
    .map((item) => {
      const activeRecipe = ALCHEMY_RECIPES.find((recipe) => recipe.id === st.alchemySelectedRecipeId) ?? null;
      const highlighted = activeRecipe?.ingredients.includes(item.id);
      return `<div class="phase29-row ${highlighted ? "phase31-ingredient-highlight" : ""}"><span>${item.name}</span><strong>x${item.quantity}</strong></div>`;
    })
    .join("");
}

function ingredientCountById(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of st.ingredientItems) {
    counts.set(item.id, item.quantity);
  }
  return counts;
}

function recipeIngredientNeeds(recipe: Recipe): Map<string, number> {
  const needs = new Map<string, number>();
  for (const ingredientId of recipe.ingredients) {
    needs.set(ingredientId, (needs.get(ingredientId) ?? 0) + 1);
  }
  return needs;
}

function craftCountForRecipe(recipe: Recipe): number {
  const counts = ingredientCountById();
  const needs = recipeIngredientNeeds(recipe);
  let craftCount = Number.POSITIVE_INFINITY;
  for (const [ingredientId, needed] of needs) {
    const stock = counts.get(ingredientId) ?? 0;
    craftCount = Math.min(craftCount, Math.floor(stock / needed));
  }
  return Number.isFinite(craftCount) ? craftCount : 0;
}

function recipeAvailable(recipe: Recipe): boolean {
  return craftCountForRecipe(recipe) > 0;
}

function computeAlchemyQualityPreview(recipe: Recipe): number {
  const bodyScore = Math.min(1.2, 0.5 + st.temperingLevel / 10);
  const daoScore = Math.min(1.1, 0.6 + st.daoComprehensionLevel * 0.06);
  const harmonyPenalty = Math.max(0.7, 1 - st.bodyHeat / Math.max(1, st.maxBodyHeat) * 0.18);
  return Math.max(1, Math.min(200, recipe.baseQuality * bodyScore * daoScore * harmonyPenalty));
}

function selectedRecipe(): Recipe | null {
  return ALCHEMY_RECIPES.find((recipe) => recipe.id === st.alchemySelectedRecipeId) ?? null;
}

function resetWorkbench() {
  st.alchemyWorkbenchSlots = [];
  st.alchemyPhase = "IDLE";
  st.alchemyQualityPreview = 0;
}

function startAlchemyMixing() {
  const recipe = selectedRecipe();
  if (!recipe) return;
  if (!beginCoreAlchemyFromUi(recipe.id)) {
    return;
  }
  st.alchemyWorkbenchSlots = recipe.ingredients.slice(0, 4);
  st.alchemyPhase = "MIXING";
  st.alchemyQualityPreview = computeAlchemyQualityPreview(recipe);
}

function advanceToRefining() {
  if (st.alchemyPhase !== "MIXING") return;
  if (!advanceCoreAlchemyToRefiningFromUi()) return;
  st.alchemyPhase = "REFINING";
}

function refineSelectedAlchemy() {
  if (st.alchemyPhase !== "REFINING") return;
  if (!refineCoreAlchemyFromUi(ALCHEMY_REFINE_COST)) return;
  if (st.combatEnergyPool.yangQi < ALCHEMY_REFINE_COST) return;
  st.combatEnergyPool.yangQi -= ALCHEMY_REFINE_COST;
  st.alchemyQualityPreview = Math.min(200, st.alchemyQualityPreview + ALCHEMY_REFINE_COST);
}

function filteredRecipes(): Recipe[] {
  return ALCHEMY_RECIPES.filter((recipe) => {
    if (st.alchemyFilterType !== "all" && recipe.resultType !== st.alchemyFilterType) return false;
    if (st.alchemyFilterTier !== "all" && recipe.tier !== st.alchemyFilterTier) return false;
    if (st.alchemyFilterAvailableOnly && !recipeAvailable(recipe)) return false;
    return true;
  });
}

function renderAlchemyPanel() {
  if (!alchemySlotsEl || !alchemyPhaseEl || !alchemyQualityPreviewEl || !alchemyRefineBtnEl || !alchemyRecipeListEl) return;
  const recipe = selectedRecipe();
  const slots = Array.from({ length: 4 }, (_, idx) => st.alchemyWorkbenchSlots[idx] ?? "Empty");
  alchemySlotsEl.innerHTML = slots
    .map((slot) => `<div class="phase31-slot ${slot === "Empty" ? "empty" : ""}">${slot}</div>`)
    .join("");
  alchemyPhaseEl.textContent = st.alchemyPhase;
  if (recipe) {
    const current = st.alchemyPhase === "IDLE" ? computeAlchemyQualityPreview(recipe) : st.alchemyQualityPreview;
    const craftCount = craftCountForRecipe(recipe);
    alchemyQualityPreviewEl.innerHTML = `
      <div class="phase29-row"><span>Recipe</span><strong>${recipe.name}</strong></div>
      <div class="phase29-row"><span>Expected quality</span><strong>${current.toFixed(1)}</strong></div>
      <div class="phase29-row"><span>Craft count</span><strong>${craftCount}</strong></div>
      <div class="phase29-row"><span>Required</span><strong>${recipe.ingredients.join(", ")}</strong></div>
      <div class="phase31-controls">
        <button type="button" id="alchemyStartMixingBtn" class="btn ghost" ${craftCount <= 0 ? "disabled" : ""}>Start Mixing</button>
        <button type="button" id="alchemyAdvanceRefiningBtn" class="btn ghost" ${st.alchemyPhase !== "MIXING" ? "disabled" : ""}>Advance to Refining</button>
      </div>
    `;
  } else {
    alchemyQualityPreviewEl.innerHTML = `<div class="muted">Select a recipe to preview quality and craft count.</div>`;
  }
  const canRefine = st.alchemyPhase === "REFINING" && st.combatEnergyPool.yangQi >= ALCHEMY_REFINE_COST;
  alchemyRefineBtnEl.toggleAttribute("disabled", !canRefine);
  alchemyRefineBtnEl.textContent = `Refine (+${ALCHEMY_REFINE_COST} quality, costs ${ALCHEMY_REFINE_COST} YangQi)`;
  const list = filteredRecipes();
  alchemyRecipeListEl.innerHTML = list.map((recipeEntry) => {
    const available = recipeAvailable(recipeEntry);
    const selected = recipeEntry.id === st.alchemySelectedRecipeId;
    const label = RECIPE_TYPE_LABELS[recipeEntry.resultType] ?? recipeEntry.resultType;
    return `
      <button type="button" class="phase29-item-btn ${selected ? "active" : ""}" data-recipe-id="${recipeEntry.id}">
        <div><strong>${recipeEntry.name}</strong></div>
        <div class="muted">Type: ${label} | Tier: ${recipeEntry.tier}</div>
        <div class="${available ? "good" : "warning"}">${available ? "Available" : "Locked"} | craft x${craftCountForRecipe(recipeEntry)}</div>
      </button>
    `;
  }).join("");
}

function getDaysUntilPeak(nodeId: string): number {
  const bodyId = getBodyIdForNodeId(nodeId);
  if (!bodyId) {
    return 0;
  }
  const bodyIndex = st.celestialBodies.findIndex((body) => body.id === bodyId);
  if (bodyIndex < 0 || st.celestialBodies.length <= 0) {
    return 0;
  }
  const peakStartDay = Math.floor((bodyIndex * CELESTIAL_YEAR_DAYS) / st.celestialBodies.length);
  const day = st.celestialDayOfYear % CELESTIAL_YEAR_DAYS;
  for (let offset = 0; offset < CELESTIAL_YEAR_DAYS; offset += 1) {
    const checkDay = (day + offset) % CELESTIAL_YEAR_DAYS;
    const inPeakWindow = ((checkDay - peakStartDay + CELESTIAL_YEAR_DAYS) % CELESTIAL_YEAR_DAYS) < CELESTIAL_PEAK_DURATION_DAYS;
    if (inPeakWindow) {
      return offset;
    }
  }
  return 0;
}

function renderCelestialCalendarWidget() {
  if (!celestialCalendarWidgetEl) return;
  const seasonGlyph: Record<string, string> = {
    Spring: "SPRING",
    Summer: "SUMMER",
    Autumn: "AUTUMN",
    Winter: "WINTER"
  };
  const conjunctionNodes = st.celestialActiveConjunctions
    .map((bodyId) => st.celestialBodies.find((body) => body.id === bodyId)?.linkedT2NodeId ?? null)
    .filter((nodeId): nodeId is string => nodeId !== null)
    .map((nodeId) => NODE_NAME_BY_ID.get(nodeId) ?? nodeId);
  const peakRows = Object.entries(st.t2NodeRanks)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([nodeId]) => {
      const name = NODE_NAME_BY_ID.get(nodeId) ?? nodeId;
      const days = getDaysUntilPeak(nodeId);
      const label = days === 0 ? "Peak active" : `${days}d`;
      return `<div class="phase29-row"><span>${name}</span><strong>${label}</strong></div>`;
    })
    .join("");
  celestialCalendarWidgetEl.innerHTML = `
    <div class="phase33-calendar-head">
      <div class="phase33-season-glyph">${seasonGlyph[st.celestialSeason] ?? st.celestialSeason}</div>
      <div class="muted">Day ${st.celestialDayOfYear + 1} / ${CELESTIAL_YEAR_DAYS}</div>
    </div>
    <div class="phase33-conjunctions">
      <div class="bonus-title">Active Conjunctions</div>
      <div class="${conjunctionNodes.length > 0 ? "good" : "muted"}">
        ${conjunctionNodes.length > 0 ? conjunctionNodes.join(" · ") : "No conjunction currently active"}
      </div>
    </div>
    <div class="bonus-title">Next Peak Countdown</div>
    <div class="bonus-grid">${peakRows || `<div class="muted">No celestial node links available.</div>`}</div>
  `;
}

function renderSectPanel() {
  if (!sectPanelBodyEl) return;
  const joinedSect = st.sectJoinedId;
  sectPanelBodyEl.innerHTML = SECTS.map((sect) => {
    const isJoined = joinedSect === sect.id;
    const blockedByMembership = Boolean(joinedSect && !isJoined);
    const favor = st.sectElderFavorLevels[sect.homeElder.id] ?? sect.homeElder.favorLevel ?? 0;
    const rankRequirement = sect.homeElder.requirement.find((condition) => condition.type === "node_rank");
    const requiredNodeRank = rankRequirement?.type === "node_rank" ? rankRequirement.minRank : 1;
    const requiredNodeId = rankRequirement?.type === "node_rank" ? rankRequirement.nodeId : "MULADHARA";
    const currentRank = st.t2NodeRanks[requiredNodeId] ?? 0;
    const requirementMet = currentRank >= requiredNodeRank;
    const manualRows = sect.homeElder.teachableManuals
      .map((manualId) => {
        const unlocked = st.unlockedTechniques.includes(manualId);
        const available = isJoined && requirementMet && !unlocked;
        return `<div class="phase29-row"><span>${manualId}</span><strong>${unlocked ? "Unlocked" : available ? "Available" : "Locked"}</strong></div>`;
      })
      .join("");
    const arrays = sect.availableFormationArrays
      .map((arr) => `${arr.name} (+${arr.perTickGeneration}/tick ${arr.energyType})`)
      .join("<br/>");
    const benefits = [
      ...Object.entries(sect.memberBenefits.cultivation).map(([k, v]) => `${k}: +${v}`),
      ...Object.entries(sect.memberBenefits.combat).map(([k, v]) => `${k}: +${v}`)
    ].join(" | ");
    return `
      <div class="phase33-sect-card ${isJoined ? "joined" : ""}">
        <div class="phase29-row"><span><strong>${sect.name}</strong></span><strong>${isJoined ? "Joined" : "Available"}</strong></div>
        <div class="muted">Elder: ${sect.homeElder.name} (${sect.homeElder.daoType}) | Favor ${favor}</div>
        <div class="muted">Requirement: ${requiredNodeId} rank ${requiredNodeRank} (${currentRank}/${requiredNodeRank})</div>
        <div class="phase29-row"><span>Join Status</span><strong>${isJoined ? "Member" : blockedByMembership ? "Locked (already joined)" : "Can join"}</strong></div>
        <button type="button" class="btn ghost phase33-join-btn" data-sect-id="${sect.id}" ${isJoined || blockedByMembership ? "disabled" : ""}>Join Sect</button>
        <div class="bonus-title">Teachable Manuals</div>
        <div class="bonus-grid">${manualRows}</div>
        <div class="bonus-title">Formation Arrays</div>
        <div class="muted">${arrays}</div>
        <div class="bonus-title">Member Benefits</div>
        <div class="muted">${benefits}</div>
      </div>
    `;
  }).join("");
}

function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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
  if (phase29PanelUiBound) {
    return;
  }
  phase29PanelUiBound = true;
  saveGameBtnEl?.addEventListener("click", () => {
    const ok = saveCoreStateToLocalStorage();
    if (statusEl) {
      statusEl.textContent = ok ? "Save complete." : "Save unavailable.";
    }
  });
  loadGameBtnEl?.addEventListener("click", () => {
    const ok = loadCoreStateFromLocalStorage();
    if (statusEl) {
      statusEl.textContent = ok ? "Loaded latest local save." : "No valid save found.";
    }
    updatePhase29Panels();
  });
  exportSaveBtnEl?.addEventListener("click", () => {
    const content = exportCoreStateAsJson();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadTextFile(`cultivation-save-${stamp}.json`, content);
    if (statusEl) {
      statusEl.textContent = "Save exported.";
    }
  });
  importSaveInputEl?.addEventListener("change", async () => {
    const input = importSaveInputEl as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const json = await file.text();
    const ok = importCoreStateFromJson(json);
    if (statusEl) {
      statusEl.textContent = ok ? "Save imported." : "Import failed: invalid save file.";
    }
    updatePhase29Panels();
    input.value = "";
  });
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
  alchemyRecipeListEl?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const btn = target?.closest("[data-recipe-id]") as HTMLElement | null;
    if (!btn) return;
    const recipeId = btn.getAttribute("data-recipe-id");
    if (!recipeId) return;
    st.alchemySelectedRecipeId = recipeId;
    resetWorkbench();
    renderAlchemyPanel();
    renderInventoryPanel();
  });
  alchemyQualityPreviewEl?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.id === "alchemyStartMixingBtn") {
      startAlchemyMixing();
      renderAlchemyPanel();
      return;
    }
    if (target.id === "alchemyAdvanceRefiningBtn") {
      advanceToRefining();
      renderAlchemyPanel();
    }
  });
  alchemyRefineBtnEl?.addEventListener("click", () => {
    refineSelectedAlchemy();
    renderAlchemyPanel();
  });
  alchemyFilterTypeEl?.addEventListener("change", () => {
    const select = alchemyFilterTypeEl as HTMLSelectElement;
    st.alchemyFilterType = select.value;
    renderAlchemyPanel();
  });
  alchemyFilterTierEl?.addEventListener("change", () => {
    const select = alchemyFilterTierEl as HTMLSelectElement;
    st.alchemyFilterTier = select.value as typeof st.alchemyFilterTier;
    renderAlchemyPanel();
  });
  alchemyFilterAvailableEl?.addEventListener("change", () => {
    const checkbox = alchemyFilterAvailableEl as HTMLInputElement;
    st.alchemyFilterAvailableOnly = checkbox.checked;
    renderAlchemyPanel();
  });
  sectPanelBodyEl?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const btn = target?.closest("[data-sect-id]") as HTMLElement | null;
    if (!btn) return;
    const sectId = btn.getAttribute("data-sect-id");
    if (!sectId) return;
    if (!joinCoreSectFromUi(sectId)) return;
    renderSectPanel();
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
  advanceCoreBridgeTick();
  if (!isCoreBridgeInitialized() && st.combatPhase === "active") {
    st.combatTick += 1;
    st.combatEnemyHp = Math.max(0, st.combatEnemyHp - 12);
    st.combatPlayerHp = Math.max(0, st.combatPlayerHp - 4);
  }
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
  if (st.combatPhase === "active" && (st.combatEnemyHp <= 0 || st.combatPlayerHp <= 0)) {
    finalizeCombatSummary();
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
  renderAlchemyPanel();
  renderCelestialCalendarWidget();
  renderSectPanel();
}
