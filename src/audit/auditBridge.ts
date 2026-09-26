/**
 * KINETIC Blood Orange Energy — Master Audit Bridge
 * Exposes runtime WebGL, geometry, lighting, and camera metrics via window.__KINETIC_AUDIT__
 * and syncs inspection data attributes to the canvas DOM element.
 */

export interface KineticAuditState {
  isMounted: boolean;
  webglVersion: string;
  modelLoaded: boolean;
  meshCount: number;
  triangleCount: number;
  floorSuppressed: boolean;
  floorHidden: boolean;
  materialsPreserved: boolean;
  activeBeat: number;
  scrollProgress: number;
  cameraPos: [number, number, number];
  lighting: {
    key: number;
    rim: number;
    orange: number;
    env: number;
  };
}

declare global {
  interface Window {
    __KINETIC_AUDIT__?: KineticAuditState;
  }
}

const DEFAULT_STATE: KineticAuditState = {
  isMounted: true,
  webglVersion: 'webgl2',
  modelLoaded: false,
  meshCount: 0,
  triangleCount: 0,
  floorSuppressed: true,
  floorHidden: true,
  materialsPreserved: true,
  activeBeat: 1,
  scrollProgress: 0.0,
  cameraPos: [0, 0, 24],
  lighting: {
    key: 2.0,
    rim: 2.8,
    orange: 1.5,
    env: 0.7,
  },
};

export function initAuditBridge(initial?: Partial<KineticAuditState>): KineticAuditState {
  if (typeof window === 'undefined') return DEFAULT_STATE;

  const current = window.__KINETIC_AUDIT__ || { ...DEFAULT_STATE };
  window.__KINETIC_AUDIT__ = {
    ...current,
    ...initial,
    isMounted: true,
  };

  syncCanvasAttributes(window.__KINETIC_AUDIT__);
  return window.__KINETIC_AUDIT__;
}

export function updateAuditBridge(partial: Partial<KineticAuditState>): KineticAuditState {
  if (typeof window === 'undefined') return DEFAULT_STATE;

  if (!window.__KINETIC_AUDIT__) {
    initAuditBridge(partial);
  } else {
    window.__KINETIC_AUDIT__ = {
      ...window.__KINETIC_AUDIT__,
      ...partial,
      lighting: {
        ...window.__KINETIC_AUDIT__.lighting,
        ...(partial.lighting || {}),
      },
    };
  }

  const audit = window.__KINETIC_AUDIT__!;
  syncCanvasAttributes(audit);
  return audit;
}

export function getAuditBridge(): KineticAuditState | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.__KINETIC_AUDIT__;
}

function syncCanvasAttributes(state: KineticAuditState) {
  if (typeof document === 'undefined') return;
  const canvas = document.querySelector('canvas');
  if (canvas) {
    if (state.modelLoaded) {
      canvas.setAttribute('data-kinetic-ready', 'true');
    }
    if (state.meshCount > 0) {
      canvas.setAttribute('data-mesh-count', String(state.meshCount));
    }
    if (state.triangleCount > 0) {
      canvas.setAttribute('data-triangles', String(state.triangleCount));
    }
    canvas.setAttribute('data-floor-hidden', String(Boolean(state.floorSuppressed || state.floorHidden)));
  }
}
