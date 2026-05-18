/**
 * Image Composer – preset definitions
 *
 * Each preset bundles a background and an overlay.  Both are generated
 * programmatically using the Canvas API so the app has zero external-image
 * dependencies.  Presets are created lazily (on first access) and cached.
 */

export interface Preset {
  id: string;
  label: string;
  description: string;
  icon: string;
  /** Returns a PNG data URL for the background layer */
  getBackground: () => string;
  /** Returns a PNG data URL for the overlay layer */
  getOverlay: () => string;
}

// ---------------------------------------------------------------------------
// Internal canvas drawing helpers
// ---------------------------------------------------------------------------

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

// ---------------------------------------------------------------------------
// Preset 1 – Cyberpunk neon city
// ---------------------------------------------------------------------------

function buildCyberpunkBackground(): string {
  const W = 1280,
    H = 720;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext("2d")!;

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#020010");
  sky.addColorStop(0.6, "#0a0025");
  sky.addColorStop(1, "#1a003a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Perspective grid (floor)
  ctx.strokeStyle = "rgba(0, 255, 220, 0.18)";
  ctx.lineWidth = 1;
  const horizon = H * 0.62;
  const vp = { x: W / 2, y: horizon };
  for (let i = -12; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(vp.x, vp.y);
    ctx.lineTo(vp.x + i * 120, H);
    ctx.stroke();
  }
  for (let row = 0; row <= 8; row++) {
    const t = row / 8;
    const y = horizon + (H - horizon) * t;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Building silhouettes
  ctx.fillStyle = "#07001a";
  const buildings = [
    [0, 380, 90, 240],
    [80, 320, 110, 300],
    [180, 290, 70, 330],
    [240, 350, 120, 270],
    [350, 260, 80, 360],
    [900, 270, 90, 350],
    [980, 310, 130, 310],
    [1100, 340, 100, 280],
    [1190, 290, 90, 330],
  ];
  buildings.forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));

  // Neon window lights on buildings
  const windowColors = [
    "#ff00ff",
    "#00ffee",
    "#ff6600",
    "#00ff88",
    "#ff0088",
  ];
  buildings.forEach(([bx, by, bw, bh]) => {
    for (let wy = by + 10; wy < by + bh - 10; wy += 18) {
      for (let wx = bx + 6; wx < bx + bw - 6; wx += 14) {
        if (Math.random() > 0.45) {
          ctx.fillStyle =
            windowColors[Math.floor(Math.random() * windowColors.length)] +
            "cc";
          ctx.fillRect(wx, wy, 6, 8);
        }
      }
    }
  });

  // Neon glow orbs
  const orbs: [number, number, number, string][] = [
    [200, 400, 180, "#ff00ff"],
    [1050, 450, 160, "#00ffee"],
    [640, 520, 220, "#7700ff"],
  ];
  orbs.forEach(([ox, oy, r, color]) => {
    const grd = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
    grd.addColorStop(0, color + "44");
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Horizontal scan line across the sky
  ctx.strokeStyle = "rgba(0,255,220,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(W, horizon);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

function buildCyberpunkOverlay(): string {
  const W = 1280,
    H = 720;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext("2d")!;

  const c = "rgba(0, 255, 220, 0.75)";

  // Corner brackets
  const size = 48,
    thick = 3;
  const corners: [number, number, 1 | -1, 1 | -1][] = [
    [0, 0, 1, 1],
    [W, 0, -1, 1],
    [0, H, 1, -1],
    [W, H, -1, -1],
  ];
  ctx.strokeStyle = c;
  ctx.lineWidth = thick;
  corners.forEach(([cx, cy, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(cx + sx * size, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * size);
    ctx.stroke();
  });

  // Thin outer border
  ctx.strokeStyle = "rgba(0,255,220,0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, W - 20, H - 20);

  // Scan lines
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 2);
  }

  // HUD labels
  ctx.font = "bold 13px monospace";
  ctx.fillStyle = "rgba(0,255,220,0.7)";
  ctx.fillText("REC ●", 28, 42);
  ctx.fillText("AI-RENDER v2.1", W - 160, 42);
  ctx.fillText("SUBJECT DETECTED", 28, H - 24);
  ctx.fillText("FRAME: 0001", W - 130, H - 24);

  return canvas.toDataURL("image/png");
}

// ---------------------------------------------------------------------------
// Preset 2 – Football stadium
// ---------------------------------------------------------------------------

function buildStadiumBackground(): string {
  const W = 1280,
    H = 720;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext("2d")!;

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.45);
  sky.addColorStop(0, "#10203a");
  sky.addColorStop(1, "#1a3060");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.45);

  // Stands gradient
  const stands = ctx.createLinearGradient(0, H * 0.05, 0, H * 0.45);
  stands.addColorStop(0, "#2a2a3a");
  stands.addColorStop(1, "#1a1a28");
  ctx.fillStyle = stands;
  ctx.fillRect(0, H * 0.05, W, H * 0.4);

  // Stadium rows
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let row = 0; row < 14; row++) {
    ctx.fillRect(0, H * 0.07 + row * 22, W, 12);
  }

  // Floodlights
  ctx.fillStyle = "#ffffff";
  [[100, H * 0.06], [W - 100, H * 0.06]].forEach(([lx, ly]) => {
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    ctx.fill();
    const grd = ctx.createRadialGradient(lx, ly, 0, lx, ly, 250);
    grd.addColorStop(0, "rgba(255,255,200,0.25)");
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(lx, ly, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
  });

  // Pitch (green)
  const pitch = ctx.createLinearGradient(0, H * 0.44, 0, H);
  pitch.addColorStop(0, "#1a5c1a");
  pitch.addColorStop(0.5, "#1e6e1e");
  pitch.addColorStop(1, "#164e16");
  ctx.fillStyle = pitch;
  ctx.fillRect(0, H * 0.44, W, H * 0.56);

  // Pitch stripes
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) ctx.fillRect((i * W) / 10, H * 0.44, W / 10, H * 0.56);
  }

  // Pitch lines
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  // Centre line
  ctx.beginPath();
  ctx.moveTo(W / 2, H * 0.44);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  // Centre circle
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.78, 80, 0, Math.PI * 2);
  ctx.stroke();
  // Outer boundary
  ctx.strokeRect(60, H * 0.46, W - 120, H * 0.5);
  // Penalty areas
  ctx.strokeRect(60, H * 0.56, 180, H * 0.28);
  ctx.strokeRect(W - 240, H * 0.56, 180, H * 0.28);

  return canvas.toDataURL("image/png");
}

function buildStadiumOverlay(): string {
  const W = 1280,
    H = 720;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext("2d")!;

  // Bold coloured border
  ctx.strokeStyle = "#e8a020";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, W - 32, H - 32);

  // Score board at the top
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.roundRect(W / 2 - 160, 20, 320, 54, 8);
  ctx.fill();

  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText("HOME  0 – 0  AWAY", W / 2, 56);
  ctx.textAlign = "left";

  // Corner decorations
  const decorSize = 60;
  ctx.fillStyle = "#e8a020";
  [[0, 0], [W - decorSize, 0], [0, H - decorSize], [W - decorSize, H - decorSize]].forEach(
    ([dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx + decorSize, dy);
      ctx.lineTo(dx, dy + decorSize);
      ctx.closePath();
      ctx.fill();
    }
  );

  return canvas.toDataURL("image/png");
}

// ---------------------------------------------------------------------------
// Preset 3 – Luxury office / corporate gold
// ---------------------------------------------------------------------------

function buildOfficeBackground(): string {
  const W = 1280,
    H = 720;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext("2d")!;

  // Warm neutral wall
  const wall = ctx.createLinearGradient(0, 0, W, H);
  wall.addColorStop(0, "#d4c4a8");
  wall.addColorStop(0.5, "#e8dcc8");
  wall.addColorStop(1, "#c8b898");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, H);

  // Window light bloom (top-right)
  const bloom = ctx.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, 600);
  bloom.addColorStop(0, "rgba(255,240,200,0.7)");
  bloom.addColorStop(1, "transparent");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, W, H);

  // Window frame (right side)
  ctx.fillStyle = "rgba(255,245,220,0.4)";
  ctx.fillRect(W * 0.72, 0, W * 0.28, H * 0.72);
  ctx.strokeStyle = "rgba(100,80,40,0.5)";
  ctx.lineWidth = 4;
  ctx.strokeRect(W * 0.72, 0, W * 0.28, H * 0.72);
  // Pane cross
  ctx.beginPath();
  ctx.moveTo(W * 0.72 + (W * 0.28) / 2, 0);
  ctx.lineTo(W * 0.72 + (W * 0.28) / 2, H * 0.72);
  ctx.moveTo(W * 0.72, H * 0.36);
  ctx.lineTo(W, H * 0.36);
  ctx.stroke();

  // Floor
  const floor = ctx.createLinearGradient(0, H * 0.8, 0, H);
  floor.addColorStop(0, "#8a7060");
  floor.addColorStop(1, "#6a5040");
  ctx.fillStyle = floor;
  ctx.fillRect(0, H * 0.8, W, H * 0.2);

  // Desk
  ctx.fillStyle = "#7a5c38";
  ctx.fillRect(0, H * 0.74, W * 0.55, H * 0.1);
  ctx.fillStyle = "#5a3c18";
  ctx.fillRect(0, H * 0.84, W * 0.55, H * 0.02);

  // Bookshelf silhouette (left)
  ctx.fillStyle = "#5a4028";
  ctx.fillRect(0, H * 0.1, 80, H * 0.7);
  ctx.fillStyle = "#6a5038";
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(8, H * 0.15 + i * (H * 0.09), 64, H * 0.07);
  }

  // Ambient shadow at floor-wall join
  const shadow = ctx.createLinearGradient(0, H * 0.75, 0, H * 0.82);
  shadow.addColorStop(0, "rgba(0,0,0,0.3)");
  shadow.addColorStop(1, "transparent");
  ctx.fillStyle = shadow;
  ctx.fillRect(0, H * 0.75, W, H * 0.07);

  return canvas.toDataURL("image/png");
}

function buildCorporateOverlay(): string {
  const W = 1280,
    H = 720;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext("2d")!;

  // Outer gold border
  ctx.strokeStyle = "#c8a840";
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  // Inner thin border
  ctx.strokeStyle = "rgba(200,168,64,0.5)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(18, 18, W - 36, H - 36);

  // Corner ornaments
  const o = 36;
  const orn = (x: number, y: number) => {
    ctx.strokeStyle = "#c8a840";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - o, y);
    ctx.lineTo(x + o, y);
    ctx.moveTo(x, y - o);
    ctx.lineTo(x, y + o);
    ctx.stroke();
  };
  orn(36, 36);
  orn(W - 36, 36);
  orn(36, H - 36);
  orn(W - 36, H - 36);

  // Bottom nameplate
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.roundRect(W / 2 - 220, H - 68, 440, 48, 6);
  ctx.fill();

  ctx.strokeStyle = "#c8a840";
  ctx.lineWidth = 1.5;
  ctx.roundRect(W / 2 - 220, H - 68, 440, 48, 6);
  ctx.stroke();

  ctx.font = "bold 20px Georgia, serif";
  ctx.fillStyle = "#e8c860";
  ctx.textAlign = "center";
  ctx.fillText("PROFESSIONAL  ·  PORTRAIT  ·  2026", W / 2, H - 38);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}

// ---------------------------------------------------------------------------
// Cache: build each preset asset once per session
// ---------------------------------------------------------------------------

const cache: Record<string, string> = {};

function cached(key: string, factory: () => string): string {
  if (!cache[key]) cache[key] = factory();
  return cache[key];
}

// ---------------------------------------------------------------------------
// Exported presets list
// ---------------------------------------------------------------------------

export const PRESETS: Preset[] = [
  {
    id: "cyberpunk",
    label: "Cyberpunk City",
    description: "Neon grid street + sci-fi HUD",
    icon: "⚡",
    getBackground: () => cached("cyberpunk-bg", buildCyberpunkBackground),
    getOverlay: () => cached("cyberpunk-ov", buildCyberpunkOverlay),
  },
  {
    id: "stadium",
    label: "Football Stadium",
    description: "Floodlit pitch + sports frame",
    icon: "⚽",
    getBackground: () => cached("stadium-bg", buildStadiumBackground),
    getOverlay: () => cached("stadium-ov", buildStadiumOverlay),
  },
  {
    id: "corporate",
    label: "Luxury Office",
    description: "Warm interior + gold border",
    icon: "🏛",
    getBackground: () => cached("office-bg", buildOfficeBackground),
    getOverlay: () => cached("corporate-ov", buildCorporateOverlay),
  },
];
