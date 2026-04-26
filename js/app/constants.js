// FlowMaster: tunable constants, render metadata, theme tables.
// Pure values only — no runtime state, no game data.

const TICKS_PER_SECOND = 100;
const TICKS_PER_CYCLE = 1000;
const SOURCE_RATE_PER_CYCLE = 100;
const SOURCE_RATE_PER_TICK = SOURCE_RATE_PER_CYCLE / TICKS_PER_CYCLE;
const FLOW_TRANSFER_FACTOR_PER_CYCLE = 0.01; // 1% at 100% flow per 1000 ticks
const FLOW_TRANSFER_FACTOR_PER_TICK = FLOW_TRANSFER_FACTOR_PER_CYCLE / TICKS_PER_CYCLE;
const TICK_MS = 1000 / TICKS_PER_SECOND;
let projectionTransferFactorPerTick = 0.003 / TICKS_PER_CYCLE;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 20.4;
const ZOOM_STEP = 1.1;
let resonanceGainPerTick = 0.08;
let resonanceDecayPerTick = 0.035;
let resonanceBurstTicksMax = 4500;
let earthSinkInflowThreshold = 0.03;
let earthSinkHardThreshold = 0.08;
let sunSurgeIntervalTicks = 1400;
let sunSurgeDurationTicks = 280;
const SYMBOL_MODE_ENTER_ZOOM_THRESHOLD = 2.00;
const SYMBOL_MODE_EXIT_ZOOM_THRESHOLD = 0.40;
const CHAKRA_SYMBOL_URL = "file:///C:/Users/konra/.cursor/projects/c-Users-konra-Desktop-Cursor-FlowMaster/assets/c__Users_konra_Desktop_Cursor_FlowMaster_body.png";
const BODY_WORLD_BASE_WIDTH = 1500;
const BODY_MODE_DEFAULT_SCALE = 2.0;
const BODY_MODE_FOCUS_TIER2_ID = "qi";
const DEFAULT_T2_NODES = [
  { id: "crown", name: "Crown", x: 760, y: 175, radius: 16 },
  { id: "mind", name: "Mind", x: 760, y: 330, radius: 16 },
  { id: "intent", name: "Intent", x: 760, y: 510, radius: 16 },
  { id: "qi", name: "Qi", x: 760, y: 885, radius: 18 },
  { id: "heart", name: "Heart", x: 760, y: 1110, radius: 18 },
  { id: "stomach", name: "Stomach", x: 760, y: 1280, radius: 18 },
  { id: "dantian", name: "Dantian", x: 760, y: 1510, radius: 20 },
  { id: "spine", name: "Spine", x: 760, y: 1640, radius: 18 },
  { id: "kneeLeft", name: "Left Knee", x: 590, y: 1865, radius: 16 },
  { id: "kneeRight", name: "Right Knee", x: 930, y: 1865, radius: 16 },
  { id: "footLeft", name: "Left Foot", x: 565, y: 2110, radius: 17 },
  { id: "footRight", name: "Right Foot", x: 955, y: 2110, radius: 17 }
];
const t2LayoutSource = Array.isArray(window.TIER2_LAYOUT_OVERRIDE)
  ? window.TIER2_LAYOUT_OVERRIDE
  : DEFAULT_T2_NODES;
const defaultT2ById = new Map(DEFAULT_T2_NODES.map((node) => [node.id, node]));
const TIER2_NODES = t2LayoutSource.map((node) => {
  const fallback = defaultT2ById.get(node.id) ?? {};
  return {
    id: node.id,
    name: node.name ?? fallback.name ?? node.id,
    x: typeof node.x === "number" ? node.x : (fallback.x ?? 0),
    y: typeof node.y === "number" ? node.y : (fallback.y ?? 0),
    radius: typeof node.radius === "number" ? node.radius : (fallback.radius ?? 16)
  };
});

const CJK_FONT_FAMILY = '"Songti SC", "STSong", "STKaiti", "PMingLiU", "SimSun", serif';
const SERIF_FONT_FAMILY = 'Georgia, "Times New Roman", serif';

const STAT_COLOR_HEX = {
  Flow: 0x2a6a4a,
  Insight: 0x534ab7,
  Harmony: 0x8b6914,
  Fortitude: 0x993c1d,
  Essence: 0x3b6d11,
  Void: 0x3c3489
};
const STAT_COLOR_CSS = {
  Flow: "#2a6a4a",
  Insight: "#534AB7",
  Harmony: "#8b6914",
  Fortitude: "#993C1D",
  Essence: "#3B6D11",
  Void: "#3C3489"
};
const STAT_CHAR = {
  Flow: "流",
  Insight: "識",
  Harmony: "和",
  Fortitude: "固",
  Essence: "元",
  Void: "虛"
};
const STAT_ORDER = ["Flow", "Insight", "Harmony", "Fortitude", "Essence"];

const NODE_ORB_RADIUS = 38;
const NODE_ARC_RADIUS = 52;
const NODE_INNER_DASHED_RADIUS = 32;
const NODE_RADAR_MAX_RADIUS = 30;
const NODE_RIPPLE_RADII = [60, 68, 76];

const STATE_LOCKED = "locked";
const STATE_ACTIVE = "active";
const STATE_RESONANT = "resonant";

const STATE_META = {
  [STATE_LOCKED]: {
    char: "封",
    en: "LOCKED",
    orbFill: 0xe8dfc0,
    orbFillCss: "#e8dfc0",
    primaryStroke: 0x8b7a5a,
    primaryStrokeCss: "#8b7a5a",
    textColor: 0x7a6a4a,
    subTextColor: 0x5a7a6a,
    arcColor: 0x5a7a6a
  },
  [STATE_ACTIVE]: {
    char: "通",
    en: "ACTIVE",
    orbFill: 0xdff0e8,
    orbFillCss: "#dff0e8",
    primaryStroke: 0x2a6a4a,
    primaryStrokeCss: "#2a6a4a",
    textColor: 0x143a28,
    subTextColor: 0x2a6a4a,
    arcColor: 0x2a6a4a
  },
  [STATE_RESONANT]: {
    char: "鳴",
    en: "RESONANT",
    orbFill: 0xf5ead0,
    orbFillCss: "#f5ead0",
    primaryStroke: 0xc87a14,
    primaryStrokeCss: "#c87a14",
    textColor: 0x6b3d04,
    subTextColor: 0xc87a14,
    arcColor: 0xc87a14
  }
};

const ATTRIBUTE_THEME = {
  Essence: {
    name: "Jing Root",
    description: "Increases core Spirit generation through refined essence."
  },
  Flow: {
    name: "Meridian Current",
    description: "Improves transfer efficiency and keeps channels circulating."
  },
  Insight: {
    name: "Spirit Sight",
    description: "Improves projection control, duration, and echo precision."
  },
  Fortitude: {
    name: "Body Tempering",
    description: "Mitigates destabilizing penalties from heavy Earth sink routing."
  },
  Harmony: {
    name: "Dual Harmony",
    description: "Amplifies projection throughput and resonance stability."
  },
  Void: {
    name: "Void Attunement",
    description: "Strengthens resonance burst and advanced bridge capacity."
  }
};
const METRIC_TOOLTIPS = {
  "Meridian Efficiency": "Multiplier applied to edge transfer each tick.",
  "Projection Throughput": "Extra Spirit sent through active projection bridges.",
  "Projection Echo": "Portion of projection output echoed as additional transfer.",
  "Body Tempering": "Resistance against Earth Nexus sink penalties.",
  "Dual Harmony": "Harmony force that boosts projection and resonance behavior.",
  "Core Generation Bonus": "Percent increase to base Spirit generation.",
  "Core Generation (Flat)": "Flat Spirit generation added every second.",
  "Core Net Flux": "Current core inflow minus outflow per second.",
  "Max Projection Bridges": "Maximum active projection bridges allowed at once.",
  "Projection Anchors": "How many unlocked nodes can initiate projections.",
  "Resonance State": "Whether resonance thresholds are currently satisfied."
};

const UNLOCK_FADE_TICKS = 90;
