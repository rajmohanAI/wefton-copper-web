// ============================================================
// Wefton Copper — Try-On Configuration
// ============================================================
// Central config for the virtual Try-On feature. The active provider is
// swappable so a future paid AI provider can replace the free on-device one
// without touching the UI or the privacy model.

export type TryOnProviderId = 'on-device';

/** Which Try-On provider is active. V1 = free, on-device composite. */
export const ACTIVE_TRYON_PROVIDER: TryOnProviderId = 'on-device';

/** Accepted upload types + size limit for the user photo. */
export const TRYON_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const TRYON_MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

/** Height bounds (cm) for the input field. */
export const TRYON_MIN_HEIGHT_CM = 120;
export const TRYON_MAX_HEIGHT_CM = 220;

/**
 * MediaPipe PoseLandmarker assets (loaded on-device, only when Try-On opens).
 * These are served from the official MediaPipe CDN — no API key, free.
 * The WASM bundle is fetched from the installed @mediapipe/tasks-vision package
 * asset path resolved at runtime.
 */
export const POSE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
export const MEDIAPIPE_WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';

/** Inactivity timeout (ms) after which the ephemeral photo is auto-cleared. */
export const TRYON_INACTIVITY_MS = 5 * 60 * 1000; // 5 minutes

/** Number of frames generated for the approximate-360 presentation. */
export const TRYON_FRAME_COUNT = 8;
