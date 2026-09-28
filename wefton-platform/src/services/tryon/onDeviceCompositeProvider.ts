// ============================================================
// Wefton Copper — On-Device Composite Try-On Provider (free V1)
// ============================================================
// Runs entirely in the browser. Detects body landmarks with MediaPipe
// PoseLandmarker (loaded on-demand from CDN, no API key) and composites the
// garment image over the torso on a <canvas>. The user's photo NEVER leaves
// the device. Produces a few subtly-skewed frames to approximate a 360° view.

import type { TryOnProvider, TryOnInput, TryOnResult } from './types';
import { APPROXIMATE_NOTICE } from './types';
import {
  POSE_LANDMARKER_MODEL_URL,
  MEDIAPIPE_WASM_BASE,
  TRYON_FRAME_COUNT,
} from '@/config/tryon';

// MediaPipe normalized landmark indices we use.
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_HIP = 23;
const R_HIP = 24;

interface Point { x: number; y: number }

async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Loads the garment image via our same-origin proxy and returns it as an
 * HTMLImageElement backed by an object URL. This avoids cross-origin/CORS
 * failures and canvas tainting when the source is Firebase Storage.
 */
async function loadGarmentImage(garmentUrl: string): Promise<HTMLImageElement> {
  const res = await fetch(`/api/tryon/garment?url=${encodeURIComponent(garmentUrl)}`);
  if (!res.ok) {
    throw new Error('Could not load the product image for Try-On.');
  }
  const blob = await res.blob();
  return loadImageFromBlob(blob);
}

function canvasToObjectUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(URL.createObjectURL(blob));
      else reject(new Error('Failed to render frame'));
    }, 'image/png');
  });
}

export class OnDeviceCompositeProvider implements TryOnProvider {
  readonly id = 'on-device';
  readonly transmitsPhotoExternally = false;

  async isSupported(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    // Needs WebGL for MediaPipe and canvas.toBlob.
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return !!gl && typeof canvas.toBlob === 'function';
    } catch {
      return false;
    }
  }

  async generate(input: TryOnInput, signal?: AbortSignal): Promise<TryOnResult> {
    const throwIfAborted = () => {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    };

    // 1. Load the user's photo (in-memory) and the garment image.
    //    The garment loads via a same-origin proxy to avoid CORS/tainting.
    const [personImg, garmentImg] = await Promise.all([
      loadImageFromBlob(input.photo),
      loadGarmentImage(input.garmentImageUrl),
    ]);
    throwIfAborted();

    // 2. Detect pose landmarks on-device.
    const landmarks = await this.detectPose(personImg, signal);
    throwIfAborted();

    // 3. Build the base composite canvas.
    const width = personImg.naturalWidth || personImg.width;
    const height = personImg.naturalHeight || personImg.height;

    if (!landmarks) {
      // No body detected — return the plain photo as the single frame so the
      // modal can show guidance rather than failing hard.
      const base = document.createElement('canvas');
      base.width = width;
      base.height = height;
      base.getContext('2d')!.drawImage(personImg, 0, 0, width, height);
      const url = await canvasToObjectUrl(base);
      return { frames: [url], primaryFrame: url, landmarksFound: false, note: APPROXIMATE_NOTICE };
    }

    // Torso anchor points (denormalized to pixels).
    const ls: Point = { x: landmarks[L_SHOULDER].x * width, y: landmarks[L_SHOULDER].y * height };
    const rs: Point = { x: landmarks[R_SHOULDER].x * width, y: landmarks[R_SHOULDER].y * height };
    const lh: Point = { x: landmarks[L_HIP].x * width, y: landmarks[L_HIP].y * height };
    const rh: Point = { x: landmarks[R_HIP].x * width, y: landmarks[R_HIP].y * height };

    const shoulderMidX = (ls.x + rs.x) / 2;
    const shoulderMidY = (ls.y + rs.y) / 2;
    const hipMidY = (lh.y + rh.y) / 2;
    const shoulderWidth = Math.hypot(rs.x - ls.x, rs.y - ls.y);

    // Garment sizing: width ~ 1.7x shoulder span; height spans shoulders→hips
    // with a little overshoot, adjusted slightly by height/size when provided.
    const sizeScale = this.sizeScaleFactor(input.size);
    const garmentW = shoulderWidth * 1.7 * sizeScale;
    const torsoLen = Math.max(hipMidY - shoulderMidY, shoulderWidth * 1.4);
    const garmentH = torsoLen * 1.25;
    const garmentX = shoulderMidX - garmentW / 2;
    const garmentY = shoulderMidY - garmentH * 0.12;

    // 4. Render each frame (subtle horizontal skew to fake rotation).
    const frames: string[] = [];
    const maxSkew = 0.18; // radians-ish visual shear range
    for (let i = 0; i < TRYON_FRAME_COUNT; i++) {
      throwIfAborted();
      const t = i / (TRYON_FRAME_COUNT - 1); // 0..1
      const skew = Math.sin(t * Math.PI * 2) * maxSkew; // sway left↔right↔left

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // Draw the person.
      ctx.drawImage(personImg, 0, 0, width, height);

      // Draw the garment with a horizontal shear around the torso centre to
      // approximate turning. This is an approximation, not true 3D.
      ctx.save();
      ctx.translate(shoulderMidX, shoulderMidY);
      ctx.transform(1, 0, skew, 1, 0, 0);
      ctx.translate(-shoulderMidX, -shoulderMidY);
      ctx.globalAlpha = 0.92;
      ctx.drawImage(garmentImg, garmentX, garmentY, garmentW, garmentH);
      ctx.restore();

      frames.push(await canvasToObjectUrl(canvas));
    }

    return {
      frames,
      primaryFrame: frames[0],
      landmarksFound: true,
      note: APPROXIMATE_NOTICE,
    };
  }

  /** Maps a size label to a mild scale factor for the garment overlay. */
  private sizeScaleFactor(size?: string): number {
    switch ((size || '').toUpperCase()) {
      case 'XS': return 0.9;
      case 'S': return 0.95;
      case 'M': return 1.0;
      case 'L': return 1.06;
      case 'XL': return 1.12;
      case 'XXL': return 1.18;
      case '3XL': return 1.24;
      default: return 1.0;
    }
  }

  /** Loads PoseLandmarker on-demand and returns normalized landmarks or null. */
  private async detectPose(
    img: HTMLImageElement,
    signal?: AbortSignal
  ): Promise<{ x: number; y: number }[] | null> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE);
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: POSE_LANDMARKER_MODEL_URL },
      runningMode: 'IMAGE',
      numPoses: 1,
    });
    try {
      const result = landmarker.detect(img);
      const first = result.landmarks?.[0];
      return first && first.length > R_HIP ? first : null;
    } finally {
      landmarker.close();
    }
  }
}
