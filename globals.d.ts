interface Window {
  [key: string]: any;
  z: any;
  Zod: any;
  Tweakpane: any;
  gsap: any;
  TIER2_NODE_SCHEMAS: any;
  NODE_DEFINITIONS: any;
  INITIAL_NODE_POSITIONS: any;
  NODE_EDGES: any;
  PROJECTION_LINKS: any;
  TIER2_LAYOUT_OVERRIDE: any;
  showSaveFilePicker?: any;
}

declare const PIXI: any;
declare const z: any;
declare const Tweakpane: any;
declare const BODY_MAP_IMAGE_DATA_URL: string;

/** Vite-style env for core package typecheck (S-007 dev validation, tick dev asserts). */
interface ImportMeta {
  readonly env?: {
    readonly DEV?: boolean;
  };
}
