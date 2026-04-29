// FlowMaster: PIXI application setup and entry point.

import {
  CHAKRA_SYMBOL_URL, BODY_MODE_DEFAULT_SCALE, BODY_MODE_FOCUS_TIER2_ID, TICK_MS, TIER2_NODES
} from './constants.ts';
import { edges, nodeData } from './config.ts';
import {
  st, statusEl, resetBodyViewEl, devModeToggleEl, devSpeedToggleEl,
  showAllNodesBtnEl, editNodesBtnEl, saveShapeEl, addT2NodeEl, saveT2LayoutEl,
  speed1xEl, speed10xEl, speed100xEl
} from './state.ts';
import { createEdgeVisual } from './edge-render.ts';
import { createNodeVisual, bindNodeInteractions } from './node-render.ts';
import { animateParticles } from './particles.ts';
import { createTier2MarkerVisual, bindEnterTier1, refreshTier2MarkerVisuals } from './tier2-markers.ts';
import {
  layoutSymbolSprite, updateSymbolMode, focusBodyModeOnTier2, recenterView, resetBodyView,
  clampWorldToBodyBounds, onWheelZoom, updateZoomHud, enterTier1ForActiveTier2,
  bindRedrawNetwork, bindFlowPopupFns
} from './view.ts';
import { initializeTier2Snapshots } from './snapshots.ts';
import { redrawNetwork, updateBonusSummary } from './hud.ts';
import { startPan, onPanMove, stopPan, selectNode, toggleConnection, tryStartNodeDrag } from './input.ts';
import { renderFlowPopup, hideFlowPopup, updateFlowPopupPosition, bindToggleConnection } from './flow-popup.ts';
import { bindEdgeControlsRedraw } from './edge-controls.ts';
import {
  setDeveloperMode, setDevSpeedMode, setShowAllNodesMode, setSimSpeed,
  openNodeEditor, exportShapeConfig, addT2NodeInView, exportT2LayoutConfig, initBalancePane
} from './dev-tools.ts';
import { tick, refreshOpenTooltip } from './game-loop.ts';
import { bindClusterRepairUi } from './cluster-view.ts';
import { devSimulateT1Damage } from './dev-tools.ts';
import { bindBodyMapUi, ensureBodyMapUiState, redrawBodyMapMeridians } from './body-map.ts';
import { bindPhase29PanelUi, updatePhase29Panels } from './phase29-panels.ts';
import { initializeCoreBridgeFromUi, startCoreAutoSave } from "./core-bridge.ts";
import { applyTutorialSuppressionForReturningPlayer, bindTutorialUi, stepTutorialSystem } from "./tutorial.ts";
import { initOfflineTickBank, persistOfflineTickBankNow } from "./offline-ticks.ts";

// Wire up circular-dep bridges
bindToggleConnection(toggleConnection);
bindEnterTier1(enterTier1ForActiveTier2);
bindNodeInteractions(selectNode, tryStartNodeDrag);
bindRedrawNetwork(redrawNetwork);
bindFlowPopupFns(hideFlowPopup, updateFlowPopupPosition);
bindEdgeControlsRedraw(redrawNetwork);
bindBodyMapUi();
initOfflineTickBank();
bindPhase29PanelUi();
bindTutorialUi();
initializeCoreBridgeFromUi();
startCoreAutoSave();
applyTutorialSuppressionForReturningPlayer();

window.addEventListener("beforeunload", () => {
  persistOfflineTickBankNow();
});

async function loadBodyTexture() {
  const candidateUrls = [
    "/body.png",
    CHAKRA_SYMBOL_URL
  ];
  for (const url of candidateUrls) {
    try {
      const texture = await PIXI.Assets.load(url);
      if (texture) return texture;
    } catch {
      // try next candidate
    }
  }
  return null;
}

function createFallbackBodyMapGraphic() {
  const g = new PIXI.Graphics();
  // Parchment slab
  g.roundRect(0, 0, 1500, 2200, 28);
  g.fill({ color: 0xf0e8d0, alpha: 0.95 });
  g.stroke({ width: 3, color: 0x8b6914, alpha: 0.7 });
  // Stylized body silhouette
  g.ellipse(750, 230, 90, 110).fill({ color: 0xd7c39a, alpha: 0.72 });
  g.roundRect(655, 320, 190, 760, 96).fill({ color: 0xd7c39a, alpha: 0.66 });
  g.roundRect(548, 410, 92, 620, 46).fill({ color: 0xd7c39a, alpha: 0.62 });
  g.roundRect(860, 410, 92, 620, 46).fill({ color: 0xd7c39a, alpha: 0.62 });
  g.roundRect(670, 1040, 70, 1000, 36).fill({ color: 0xd7c39a, alpha: 0.64 });
  g.roundRect(760, 1040, 70, 1000, 36).fill({ color: 0xd7c39a, alpha: 0.64 });
  return g;
}

async function setupPixi() {
  const pixiWrap = document.getElementById("pixiWrap");
  st.app = new PIXI.Application();
  await st.app.init({
    resizeTo: pixiWrap,
    resolution: Math.max(1, window.devicePixelRatio || 1),
    autoDensity: true,
    backgroundAlpha: 0,
    antialias: true
  });
  pixiWrap!.appendChild(st.app.canvas);

  // Single PIXI.Container camera (legacy): wheel zoom + stage pan drive T1/T2 switching in view.ts.
  // pixi-viewport is not used — its plugins bypass onWheelZoom and conflict with symbol-mode bounds.
  st.world = new PIXI.Container();

  st.edgeLayer = new PIXI.Container();
  st.nodeLayer = new PIXI.Container();
  st.particleLayer = new PIXI.Container();
  st.symbolLayer = new PIXI.Container();
  st.symbolLayer.visible = false;
  st.world.addChild(st.symbolLayer);
  st.world.addChild(st.edgeLayer, st.particleLayer, st.nodeLayer);
  st.app.stage.addChild(st.world);

  try {
    const texture = await loadBodyTexture();
    if (!texture) throw new Error("No body texture source available");
    if (texture?.source) {
      texture.source.scaleMode = "linear";
      texture.source.mipmap = "on";
      texture.source.update();
    }
    st.symbolSprite = new PIXI.Sprite(texture);
    st.symbolSprite.anchor.set(0);
    st.symbolSprite.alpha = 0.94;
    st.symbolSprite.eventMode = "none";
    st.symbolLayer.addChild(st.symbolSprite);
  } catch {
    st.symbolSprite = createFallbackBodyMapGraphic();
    st.symbolSprite.eventMode = "none";
    st.symbolLayer.addChild(st.symbolSprite);
    if (statusEl) statusEl.textContent = "Body map image missing; using fallback map graphic.";
  }

  st.tier2MarkerLayer = new PIXI.Container();
  st.bodyMapMeridianLayer = new PIXI.Container();
  st.symbolLayer.addChild(st.bodyMapMeridianLayer);
  st.symbolLayer.addChild(st.tier2MarkerLayer);
  ensureBodyMapUiState();
  redrawBodyMapMeridians();
  for (const tier2 of TIER2_NODES) {
    createTier2MarkerVisual(tier2);
  }

  for (const edge of edges) {
    createEdgeVisual(edge);
  }
  st.projectionHoverGraphic = new PIXI.Graphics();
  st.edgeLayer.addChild(st.projectionHoverGraphic);

  for (const node of nodeData) {
    createNodeVisual(node);
  }

  st.app.stage.eventMode = "static";
  st.app.stage.hitArea = st.app.screen;
  st.app.stage.on("pointerdown", startPan);
  st.app.stage.on("pointermove", onPanMove);
  st.app.stage.on("pointerup", stopPan);
  st.app.stage.on("pointerupoutside", stopPan);
  st.app.stage.on("pointertap", (event: any) => {
    if (event.target !== st.app.stage && event.target !== st.world) return;
    if (st.draggedDistance > 6) return;
    if (st.selectedNodeId < 0) return;
    st.selectedNodeId = -1;
    hideFlowPopup();
    if (statusEl) statusEl.textContent = "Node deselected.";
    redrawNetwork();
  });
  st.app.renderer.on("resize", () => {
    st.app.stage.hitArea = st.app.screen;
    layoutSymbolSprite();
    if (st.symbolModeEnabled) clampWorldToBodyBounds();
    updateFlowPopupPosition();
  });

  st.app.canvas.addEventListener("wheel", onWheelZoom, { passive: false });

  st.app.ticker.add((ticker: any) => {
    animateParticles(ticker.deltaTime);
    updateZoomHud();
    if (st.symbolModeEnabled) {
      refreshTier2MarkerVisuals();
      redrawBodyMapMeridians();
    }
  });

  initBalancePane();
  layoutSymbolSprite();
  updateSymbolMode();
  updateZoomHud();
  redrawNetwork();
}

// DOM event listeners
bindClusterRepairUi();
document.getElementById("recenter")!.addEventListener("click", recenterView);
resetBodyViewEl!.addEventListener("click", resetBodyView);
devModeToggleEl!.addEventListener("click", () => setDeveloperMode(!st.developerMode));
devSpeedToggleEl!.addEventListener("click", () => setDevSpeedMode(!st.devSpeedEnabled));
showAllNodesBtnEl!.addEventListener("click", () => {
  if (!st.developerMode) { if (statusEl) statusEl.textContent = "Enable Developer Mode first."; return; }
  setShowAllNodesMode(!st.forceShowAllNodes);
});
editNodesBtnEl!.addEventListener("click", openNodeEditor);
saveShapeEl!.addEventListener("click", exportShapeConfig);
addT2NodeEl!.addEventListener("click", addT2NodeInView);
saveT2LayoutEl!.addEventListener("click", exportT2LayoutConfig);
document.getElementById("devDamageT1Btn")?.addEventListener("click", devSimulateT1Damage);
speed1xEl!.addEventListener("click", () => setSimSpeed(1));
speed10xEl!.addEventListener("click", () => setSimSpeed(10));
speed100xEl!.addEventListener("click", () => setSimSpeed(100));

setupPixi().then(() => {
  setDeveloperMode(false);
  setDevSpeedMode(false);
  initializeTier2Snapshots();
  st.world.scale.set(BODY_MODE_DEFAULT_SCALE);
  if (st.galaxyViewDefault) {
    st.galaxyViewEnabled = true;
    document.body.classList.add("galaxy-view");
  }
  updateSymbolMode();
  if (st.symbolModeEnabled) {
    focusBodyModeOnTier2(BODY_MODE_FOCUS_TIER2_ID);
  } else {
    recenterView();
  }
  st.selectedNodeId = -1;
  hideFlowPopup();
  redrawNetwork();
  updateBonusSummary();
  updatePhase29Panels();
  stepTutorialSystem();
  setInterval(tick, TICK_MS);
  setInterval(refreshOpenTooltip, 1000);
});
