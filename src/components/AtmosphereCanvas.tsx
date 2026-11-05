import React, { useEffect, useRef } from 'react';
import { BackgroundEffectType } from '../types/game';
import { sound } from '../utils/audio';

// ====================================================================
// KHÔNG KHÍ TẬN THẾ: thành phố đổ nát nhiều lớp (đỉnh nhà gãy, thép lòi ra, xe cháy, cột điện đổ),
// khói đen từ các đám cháy xa, ánh lửa chân trời, tro bay, quạ bay, bầu trời đổi màu theo thời tiết
// (rỉ sét - xanh độc - tím đêm - xanh băng) thay vì một màu xám đồng nhất.
// Lớp nền tĩnh được vẽ một lần vào canvas phụ; chỉ các thứ chuyển động mới vẽ lại mỗi khung hình.
// ====================================================================

interface AtmosphereCanvasProps {
  weather: string;
  backgroundEffect?: BackgroundEffectType;
  dangerLevel: number;
  isEmergency: boolean;
  day?: number;
  cityWaterCutoff?: boolean;
  cityPowerBlackout?: boolean;
}

interface Palette {
  top: string; mid: string; horizon: string;
  far: string; midB: string; near: string; ground: string;
  glow: string; haze: string; smoke: string; sun?: string;
}

const PALETTES: Record<string, Palette> = {
  clear: { top: '#2a2630', mid: '#4a3a3a', horizon: '#8a5a3a', far: '#4a3d3e', midB: '#2e2628', near: '#171316', ground: '#0c0a0b', glow: '255,110,40', haze: '140,100,80', smoke: '30,24,24' },
  heatwave: { top: '#3b1d0e', mid: '#8a3410', horizon: '#e0762a', far: '#6b2c14', midB: '#41180c', near: '#1f0c07', ground: '#0e0604', glow: '255,140,40', haze: '230,130,60', smoke: '40,20,12', sun: '255,200,90' },
  heavy_rain: { top: '#0e1a22', mid: '#1d3a3c', horizon: '#3d6a62', far: '#26474a', midB: '#162a2d', near: '#0a1517', ground: '#050b0c', glow: '110,200,170', haze: '100,160,150', smoke: '12,22,24' },
  freezing_cold: { top: '#18273a', mid: '#3a5a72', horizon: '#8fb2c6', far: '#4a6a7d', midB: '#2a4252', near: '#121f29', ground: '#080f15', glow: '170,220,255', haze: '170,200,220', smoke: '24,32,40' },
  dense_fog: { top: '#262c25', mid: '#4b5a42', horizon: '#9aab7a', far: '#5b6a4e', midB: '#374433', near: '#1a2118', ground: '#0a0e09', glow: '190,220,120', haze: '170,190,140', smoke: '24,30,22' },
  night_dark: { top: '#04060e', mid: '#120d22', horizon: '#34173a', far: '#1a1228', midB: '#0e0a18', near: '#06050c', ground: '#020206', glow: '255,110,50', haze: '90,50,110', smoke: '8,6,12' },
};

function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pickKey(weather: string, effect?: BackgroundEffectType): string {
  if (PALETTES[weather]) return weather;
  if (effect === 'sunny_harsh') return 'heatwave';
  if (effect === 'thunder_soft' || effect === 'rain_light') return 'heavy_rain';
  if (effect === 'frost_wind') return 'freezing_cold';
  if (effect === 'fog_dense') return 'dense_fog';
  if (effect === 'night_dark') return 'night_dark';
  return 'clear';
}

// Một tòa nhà đổ nát: thân chữ nhật với đỉnh gãy lởm chởm, cửa sổ vỡ, thép lòi ra, đống gạch dưới chân.
function drawRuin(c: CanvasRenderingContext2D, rnd: () => number, x: number, base: number, w: number, h: number, fill: string, windowLit: string | null) {
  const pts: [number, number][] = [[x, base]];
  const steps = Math.max(3, Math.floor(w / 9));
  const leanDown = rnd() < 0.55;
  for (let i = 0; i <= steps; i++) {
    const px = x + (w * i) / steps;
    let top = base - h;
    top += rnd() * h * 0.18;
    if (leanDown) top += (i / steps) * h * 0.35 * rnd();
    if (rnd() < 0.18) top += h * 0.2;
    pts.push([px, top]);
  }
  pts.push([x + w, base]);
  c.fillStyle = fill;
  c.beginPath();
  pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
  c.closePath();
  c.fill();

  c.strokeStyle = 'rgba(10,8,8,0.85)';
  c.lineWidth = 1;
  for (let i = 1; i < pts.length - 1; i++) {
    if (rnd() < 0.3) {
      const [px, py] = pts[i];
      c.beginPath();
      c.moveTo(px, py + 2);
      c.lineTo(px + (rnd() - 0.5) * 5, py - 5 - rnd() * 8);
      c.stroke();
    }
  }
  const cell = 9;
  for (let wy = base - h + 14; wy < base - 8; wy += cell + 3) {
    for (let wx = x + 5; wx < x + w - 6; wx += cell + 2) {
      const idx = Math.min(pts.length - 2, Math.max(1, Math.round(((wx - x) / w) * steps) + 1));
      if (wy < pts[idx][1] + 6) continue;
      const r = rnd();
      if (r < 0.28) {
        c.fillStyle = 'rgba(0,0,0,0.55)';
        c.fillRect(wx, wy, cell, cell + 1);
      } else if (windowLit && r > 0.965) {
        c.fillStyle = windowLit;
        c.fillRect(wx, wy, cell - 2, cell - 2);
      }
    }
  }
  c.fillStyle = fill;
  for (let i = 0; i < 4; i++) {
    const rx = x + rnd() * w;
    c.beginPath();
    c.moveTo(rx - 10, base);
    c.lineTo(rx, base - 4 - rnd() * 8);
    c.lineTo(rx + 12, base);
    c.fill();
  }
}

function drawStatic(w: number, h: number, pal: Palette, weatherKey: string, blackout: boolean, seedBase: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  const rnd = seeded(seedBase);
  const horizonY = h * 0.62;

  const sky = c.createLinearGradient(0, 0, 0, horizonY + 40);
  sky.addColorStop(0, pal.top);
  sky.addColorStop(0.55, pal.mid);
  sky.addColorStop(1, pal.horizon);
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);

  if (pal.sun) {
    const sx = w * 0.78, sy = h * 0.2;
    const g = c.createRadialGradient(sx, sy, 8, sx, sy, 260);
    g.addColorStop(0, `rgba(${pal.sun},0.55)`);
    g.addColorStop(0.3, `rgba(${pal.sun},0.18)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = `rgba(${pal.sun},0.95)`;
    c.beginPath();
    c.arc(sx, sy, 22, 0, Math.PI * 2);
    c.fill();
  } else if (weatherKey === 'night_dark') {
    for (let i = 0; i < 70; i++) {
      c.fillStyle = `rgba(220,230,255,${0.2 + rnd() * 0.5})`;
      c.fillRect(rnd() * w, rnd() * horizonY * 0.8, 1 + rnd(), 1 + rnd());
    }
    c.fillStyle = 'rgba(210,150,130,0.55)';
    c.beginPath();
    c.arc(w * 0.18, h * 0.16, 16, 0, Math.PI * 2);
    c.fill();
  } else {
    const sx = w * 0.7, sy = h * 0.22;
    const g = c.createRadialGradient(sx, sy, 6, sx, sy, 200);
    g.addColorStop(0, `rgba(${pal.haze},0.35)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }

  const layers = [
    { base: horizonY + 10, fill: pal.far, minH: 60, maxH: 170, wMin: 40, wMax: 90, lit: null as string | null },
    { base: horizonY + 40, fill: pal.midB, minH: 90, maxH: 230, wMin: 50, wMax: 110, lit: blackout ? null : 'rgba(250,170,70,0.5)' },
    { base: h - 70, fill: pal.near, minH: 130, maxH: 300, wMin: 70, wMax: 150, lit: blackout ? null : 'rgba(250,170,70,0.45)' },
  ];
  layers.forEach((L, li) => {
    for (let x = -30; x < w + 30; ) {
      const bw = L.wMin + rnd() * (L.wMax - L.wMin);
      if (rnd() > 0.12) drawRuin(c, rnd, x, L.base, bw, L.minH + rnd() * (L.maxH - L.minH), L.fill, L.lit);
      x += bw * (0.6 + rnd() * 0.5);
    }
    if (li === 0) {
      const fog = c.createLinearGradient(0, horizonY - 80, 0, horizonY + 60);
      fog.addColorStop(0, 'rgba(0,0,0,0)');
      fog.addColorStop(1, `rgba(${pal.haze},0.32)`);
      c.fillStyle = fog;
      c.fillRect(0, horizonY - 80, w, 140);
    }
  });

  // cầu vượt gãy
  c.fillStyle = pal.midB;
  const bx = w * (0.2 + rnd() * 0.5);
  c.fillRect(bx, horizonY + 18, w * 0.28, 7);
  for (let i = 0; i < 3; i++) c.fillRect(bx + i * 60 + 6, horizonY + 25, 7, 46);
  c.beginPath();
  c.moveTo(bx + w * 0.28, horizonY + 18);
  c.lineTo(bx + w * 0.28 + 22, horizonY + 34);
  c.lineTo(bx + w * 0.28, horizonY + 25);
  c.fill();

  const gr = c.createLinearGradient(0, h - 150, 0, h);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(0.25, pal.ground);
  gr.addColorStop(1, '#000');
  c.fillStyle = gr;
  c.fillRect(0, h - 150, w, 150);

  // xe cháy
  for (let i = 0; i < 4; i++) {
    const cx = rnd() * w, cy = h - 40 - rnd() * 24;
    c.fillStyle = 'rgba(8,6,6,0.95)';
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(cx + 8, cy - 14);
    c.lineTo(cx + 34, cy - 16);
    c.lineTo(cx + 46, cy - 6);
    c.lineTo(cx + 56, cy);
    c.fill();
    c.fillRect(cx + 6, cy - 3, 9, 6);
    c.fillRect(cx + 38, cy - 3, 9, 6);
    c.fillStyle = `rgba(${pal.glow},0.12)`;
    c.fillRect(cx - 4, cy - 18, 64, 2);
  }
  // cột điện đổ, dây võng
  c.strokeStyle = 'rgba(6,5,5,0.9)';
  for (let i = 0; i < 3; i++) {
    const px = w * (0.1 + rnd() * 0.8), py = h - 120;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(px, h - 30);
    c.lineTo(px + (rnd() - 0.5) * 20, py - 40 - rnd() * 50);
    c.moveTo(px - 18, py - 30);
    c.lineTo(px + 22, py - 34);
    c.stroke();
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(px + 22, py - 34);
    c.quadraticCurveTo(px + 70, py + 6, px + 130, py - 30);
    c.stroke();
  }
  // cây chết
  for (let i = 0; i < 3; i++) {
    const tx = rnd() * w, ty = h - 30;
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + (rnd() - 0.5) * 8, ty - 60 - rnd() * 40); c.stroke();
    c.lineWidth = 1.4;
    for (let b = 0; b < 6; b++) {
      const by = ty - 20 - b * 10;
      c.beginPath(); c.moveTo(tx, by); c.lineTo(tx + (rnd() - 0.5) * 50, by - 10 - rnd() * 14); c.stroke();
    }
  }
  return cv;
}

export const AtmosphereCanvas: React.FC<AtmosphereCanvasProps> = ({
  weather, backgroundEffect = 'fog_dense', dangerLevel, isEmergency, day = 1, cityWaterCutoff = false, cityPowerBlackout = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const key = pickKey(weather, backgroundEffect);
    const pal = PALETTES[key];
    const isRain = key === 'heavy_rain';
    const isSnow = key === 'freezing_cold';
    const isHeat = key === 'heatwave';
    const isFog = key === 'dense_fog';
    const isNight = key === 'night_dark';
    const blackout = cityPowerBlackout || (day || 1) >= 10;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let width = (canvas.width = Math.max(1, window.innerWidth));
    let height = (canvas.height = Math.max(1, window.innerHeight));
    let rafId = 0;
    const seed = 1337 + Math.floor((day || 1) / 2);
    let stat = drawStatic(width, height, pal, key, blackout, seed);

    const onResize = () => {
      width = canvas.width = Math.max(1, window.innerWidth);
      height = canvas.height = Math.max(1, window.innerHeight);
      stat = drawStatic(width, height, pal, key, blackout, seed);
    };
    window.addEventListener('resize', onResize);

    const rnd = Math.random;
    const fires = Array.from({ length: blackout || isNight ? 4 : 2 }, () => ({ x: rnd() * width, y: height * 0.62 + rnd() * 30, r: 90 + rnd() * 120, ph: rnd() * 6 }));
    const smokes = fires.map((f) => ({ x: f.x, base: f.y, drift: (rnd() - 0.3) * 0.25, puffs: Array.from({ length: 14 }, (_, i) => ({ t: i / 14, off: (rnd() - 0.5) * 20, s: 18 + rnd() * 22 })) }));
    const ash = Array.from({ length: isSnow ? 70 : 55 }, () => ({ x: rnd() * width, y: rnd() * height, v: 0.3 + rnd() * 0.7, s: 1 + rnd() * (isSnow ? 2.6 : 1.8), ph: rnd() * 6.28, a: 0.25 + rnd() * 0.5 }));
    const embers = Array.from({ length: fires.length * 6 }, () => ({ x: 0, y: 0, v: 0.4 + rnd() * 0.9, a: rnd(), f: Math.floor(rnd() * fires.length) }));
    const drops = isRain ? Array.from({ length: 120 }, () => ({ x: rnd() * width, y: rnd() * height, l: 12 + rnd() * 16, v: 15 + rnd() * 8, a: 0.2 + rnd() * 0.35 })) : [];
    const splashes: { x: number; y: number; r: number; max: number; a: number }[] = [];
    const clouds = Array.from({ length: 6 }, () => ({ x: rnd() * width, y: height * (0.08 + rnd() * 0.3), w: 300 + rnd() * 360, v: 0.1 + rnd() * 0.2, a: 0.1 + rnd() * 0.16 }));
    const crows: { x: number; y: number; v: number; ph: number }[] = [];
    interface LightningStrike {
      start: number;
      duration: number;
      originX: number;
      originY: number;
      branches: { points: [number, number][]; width: number }[];
      intensity: number;
    }

    const createLightningBolt = (startX: number, startY: number, targetY: number) => {
      const branches: { points: [number, number][]; width: number }[] = [];
      const mainPts: [number, number][] = [[startX, startY]];
      let currX = startX;
      let currY = startY;
      const segments = 10 + Math.floor(rnd() * 6);
      const stepY = (targetY - startY) / segments;

      for (let s = 1; s <= segments; s++) {
        currX += (rnd() - 0.5) * 32;
        currY += stepY * (0.8 + rnd() * 0.4);
        mainPts.push([currX, currY]);

        if (s > 2 && s < segments - 2 && rnd() < 0.4) {
          const forkPts: [number, number][] = [[currX, currY]];
          let fx = currX;
          let fy = currY;
          const fLen = 3 + Math.floor(rnd() * 4);
          const forkDir = rnd() < 0.5 ? -1 : 1;
          for (let fs = 0; fs < fLen; fs++) {
            fx += (rnd() * 18 + 6) * forkDir;
            fy += stepY * 0.65 * (0.6 + rnd() * 0.5);
            forkPts.push([fx, fy]);
          }
          branches.push({ points: forkPts, width: 0.9 });
        }
      }
      branches.unshift({ points: mainPts, width: 1.8 });
      return branches;
    };

    const getFlickerIntensity = (elapsed: number, duration: number): number => {
      const p = elapsed / duration;
      if (p < 0 || p > 1) return 0;
      if (p < 0.12) {
        return Math.sin((p / 0.12) * Math.PI) * 0.72;
      } else if (p < 0.22) {
        return 0.15 + Math.sin(((p - 0.12) / 0.1) * Math.PI) * 0.25;
      } else if (p < 0.38) {
        const subP = (p - 0.22) / 0.16;
        return Math.sin(subP * Math.PI) * 1.0;
      } else if (p < 0.55) {
        const subP = (p - 0.38) / 0.17;
        return 0.35 * (1 - subP) + Math.sin(subP * Math.PI * 2) * 0.08;
      } else {
        const subP = (p - 0.55) / 0.45;
        return Math.max(0, 0.22 * Math.pow(1 - subP, 2));
      }
    };

    let nextCrow = Date.now() + 3000 + rnd() * 6000;
    let activeStrike: LightningStrike | null = null;
    let nextLightning = Date.now() + 3000 + rnd() * 5000;
    let time = 0;

    const render = () => {
      time += 0.016;
      if (stat.width > 0 && stat.height > 0) ctx.drawImage(stat, 0, 0);

      clouds.forEach((cl) => {
        cl.x += cl.v;
        if (cl.x > width + cl.w) cl.x = -cl.w;
        const g = ctx.createRadialGradient(cl.x, cl.y, 10, cl.x, cl.y, cl.w / 2);
        g.addColorStop(0, `rgba(${pal.smoke},${cl.a * 1.6})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(cl.x, cl.y, cl.w / 2, 46, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      fires.forEach((f) => {
        const pulse = 0.75 + 0.25 * Math.sin(time * 0.9 + f.ph) + 0.08 * Math.sin(time * 2.3 + f.ph * 2);
        const strength = blackout || isNight ? 0.6 : 0.34;
        const g = ctx.createRadialGradient(f.x, f.y, 4, f.x, f.y, f.r);
        g.addColorStop(0, `rgba(${pal.glow},${strength * pulse})`);
        g.addColorStop(0.4, `rgba(${pal.glow},${strength * 0.35 * pulse})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
      });

      smokes.forEach((sm) => {
        sm.puffs.forEach((p) => {
          p.t += 0.0014;
          if (p.t > 1) p.t = 0;
          const px = sm.x + sm.drift * p.t * 500 + p.off * p.t + Math.sin(time * 0.6 + p.off) * 6;
          const py = sm.base - p.t * height * 0.5;
          const r = p.s * (0.6 + p.t * 2.2);
          const g = ctx.createRadialGradient(px, py, 1, px, py, r);
          g.addColorStop(0, `rgba(${pal.smoke},${0.28 * (1 - p.t)})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      embers.forEach((e) => {
        const f = fires[e.f];
        e.y -= e.v;
        e.x += Math.sin(time * 2 + e.a * 9) * 0.3;
        e.a -= 0.003;
        if (e.a <= 0 || e.y < f.y - height * 0.35) {
          e.x = f.x + (rnd() - 0.5) * 40;
          e.y = f.y;
          e.a = 0.5 + rnd() * 0.5;
        }
        ctx.fillStyle = `rgba(255,${120 + Math.floor(e.a * 80)},40,${Math.max(0, e.a) * 0.8})`;
        ctx.fillRect(e.x, e.y, 1.6, 1.6);
      });

      if (!isRain && Date.now() > nextCrow) {
        const n = 1 + Math.floor(rnd() * 3);
        for (let i = 0; i < n; i++) crows.push({ x: -20 - i * 30, y: height * (0.15 + rnd() * 0.25), v: 0.8 + rnd() * 0.6, ph: rnd() * 6 });
        nextCrow = Date.now() + 14000 + rnd() * 14000;
      }
      for (let i = crows.length - 1; i >= 0; i--) {
        const b = crows[i];
        b.x += b.v;
        b.y += Math.sin(time * 1.3 + b.ph) * 0.2;
        if (b.x > width + 30) { crows.splice(i, 1); continue; }
        const flap = Math.sin(time * 9 + b.ph) * 4;
        ctx.strokeStyle = 'rgba(8,6,6,0.9)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(b.x - 8, b.y + flap);
        ctx.quadraticCurveTo(b.x - 3, b.y - 3, b.x, b.y);
        ctx.quadraticCurveTo(b.x + 3, b.y - 3, b.x + 8, b.y + flap);
        ctx.stroke();
      }

      if (isFog || isSnow || isRain) {
        for (let i = 0; i < 3; i++) {
          const cy = height * (0.52 + i * 0.14);
          const cx = ((time * (8 + i * 6) * (i % 2 ? -1 : 1) + i * 300) % (width + 900)) - 450;
          const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, 420);
          g.addColorStop(0, `rgba(${pal.haze},${isFog ? 0.2 : 0.1})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(cx, cy, 420, 80, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ash.forEach((p) => {
        p.y += p.v * (isSnow ? 1.4 : 0.8);
        p.x += Math.sin(time * 0.8 + p.ph) * 0.6 + (isSnow ? 1.6 : 0.5);
        if (p.y > height + 5) { p.y = -5; p.x = rnd() * width; }
        if (p.x > width + 5) p.x = -5;
        ctx.fillStyle = isSnow ? `rgba(225,240,255,${p.a})` : isHeat ? `rgba(255,190,100,${p.a * 0.5})` : `rgba(190,180,170,${p.a * 0.55})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
      });

      if (isRain) {
        ctx.lineWidth = 1.2;
        drops.forEach((d) => {
          d.y += d.v;
          d.x -= 4;
          if (d.y > height - 15) {
            if (rnd() < 0.25) splashes.push({ x: d.x, y: height - 12 + rnd() * 8, r: 1, max: 6 + rnd() * 6, a: 0.35 });
            d.y = -10;
            d.x = rnd() * (width + 100);
          }
          ctx.strokeStyle = `rgba(170,215,205,${d.a * 0.55})`;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - 5, d.y + d.l);
          ctx.stroke();
        });
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i];
          s.r += 0.4;
          s.a -= 0.025;
          if (s.a <= 0 || s.r >= s.max) { splashes.splice(i, 1); continue; }
          ctx.strokeStyle = `rgba(170,215,205,${s.a * 0.3})`;
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, s.r * 2, s.r * 0.7, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        const now = Date.now();
        if (now > nextLightning) {
          const strikeX = width * (0.15 + rnd() * 0.7);
          const strikeY = height * (0.02 + rnd() * 0.12);
          const targetY = height * (0.35 + rnd() * 0.25);
          activeStrike = {
            start: now,
            duration: 320 + rnd() * 160,
            originX: strikeX,
            originY: strikeY,
            branches: createLightningBolt(strikeX, strikeY, targetY),
            intensity: 0.16 + rnd() * 0.08,
          };
          nextLightning = now + 4500 + rnd() * 7000;
          const thunderDelay = 350 + rnd() * 1100;
          window.setTimeout(() => sound.playThunder(), thunderDelay);
        }

        if (activeStrike) {
          const elapsed = now - activeStrike.start;
          if (elapsed >= activeStrike.duration) {
            activeStrike = null;
          } else {
            const flicker = getFlickerIntensity(elapsed, activeStrike.duration);
            const flashAlpha = activeStrike.intensity * flicker;

            if (flashAlpha > 0.005) {
              ctx.save();
              // Subtle ambient flash wash across the atmosphere
              ctx.fillStyle = `rgba(180, 220, 235, ${flashAlpha * 0.4})`;
              ctx.fillRect(0, 0, width, height);

              // Radial glow in the upper sky/cloud deck centered near strike origin
              const glow = ctx.createRadialGradient(
                activeStrike.originX,
                activeStrike.originY,
                15,
                activeStrike.originX,
                activeStrike.originY + height * 0.12,
                Math.max(width, height) * 0.65
              );
              glow.addColorStop(0, `rgba(225, 245, 255, ${flashAlpha * 0.75})`);
              glow.addColorStop(0.35, `rgba(160, 215, 235, ${flashAlpha * 0.35})`);
              glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = glow;
              ctx.fillRect(0, 0, width, height);

              // Procedural jagged lightning bolt visible during peak pulses
              if (elapsed < activeStrike.duration * 0.48 && flicker > 0.22) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'miter';

                for (const branch of activeStrike.branches) {
                  if (branch.points.length < 2) continue;

                  // Soft outer electric corona
                  ctx.strokeStyle = `rgba(160, 225, 255, ${flashAlpha * 0.6})`;
                  ctx.lineWidth = branch.width * 2.8;
                  ctx.beginPath();
                  branch.points.forEach(([px, py], idx) => {
                    if (idx === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                  });
                  ctx.stroke();

                  // Crisp inner core
                  ctx.strokeStyle = `rgba(245, 252, 255, ${Math.min(0.9, flashAlpha * 3.5)})`;
                  ctx.lineWidth = branch.width;
                  ctx.beginPath();
                  branch.points.forEach(([px, py], idx) => {
                    if (idx === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                  });
                  ctx.stroke();
                }
              }
              ctx.restore();
            }
          }
        }
      }

      if (dangerLevel >= 3 || isEmergency) {
        const pulse = 0.5 + 0.5 * Math.sin(time * (isEmergency ? 2.2 : 0.8));
        const a = (isEmergency ? 0.2 : 0.045 * (dangerLevel - 2)) * (0.7 + 0.3 * pulse);
        const vg = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.35, width / 2, height / 2, Math.max(width, height) * 0.78);
        vg.addColorStop(0, 'rgba(120,10,10,0)');
        vg.addColorStop(1, `rgba(120,10,10,${a})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, width, height);
      }
      if (isSnow) {
        const fg = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.4, width / 2, height / 2, Math.max(width, height) * 0.72);
        fg.addColorStop(0, 'rgba(190,230,255,0)');
        fg.addColorStop(1, 'rgba(190,230,255,0.08)');
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, width, height);
      }
      const dark = ctx.createLinearGradient(0, 0, 0, height);
      dark.addColorStop(0, 'rgba(0,0,0,0.25)');
      dark.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = dark;
      ctx.fillRect(0, 0, width, height);

      if (!reduceMotion) rafId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, [weather, backgroundEffect, dangerLevel, isEmergency, day, cityWaterCutoff, cityPowerBlackout]);

  const isDenseFog = pickKey(weather, backgroundEffect) === 'dense_fog';

  return (
    <div className="AtmosphereCanvas pointer-events-none fixed inset-0 z-0 h-full w-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        style={{ filter: 'sepia(0.28) saturate(0.78) contrast(1.06) brightness(0.92)' }}
        className="AtmosphereCanvas pointer-events-none absolute inset-0 h-full w-full"
      />
      {isDenseFog && <DenseFogParticles />}
    </div>
  );
};

// ====================================================================
// SUB-LAYER: HỆ THỐNG HẠT BỤI & MẢNH VỠ TRÔI LƠ LỬNG TRONG SƯƠNG MÙ DÀY (dense_fog)
// Kết hợp SVG và CSS keyframes để tạo cảm giác không khí tù đọng, ngột ngạt và chiều sâu 3 lớp.
// ====================================================================

interface FogParticle {
  id: number;
  type: 'mote' | 'debris' | 'ash' | 'fiber';
  depth: 'far' | 'mid' | 'near';
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
  rotStart: number;
  rotEnd: number;
  opacity: number;
  blur: number;
  color: string;
  points?: string;
  pathD?: string;
  animType: 'A' | 'B';
}

const STATIC_FOG_PARTICLES: FogParticle[] = [
  // 1. Lớp xa: Bụi phát sáng mờ ảo (far depth, chuyển động rất chậm, mờ nhạt tạo chiều sâu)
  { id: 1, type: 'mote', depth: 'far', left: 7, top: 22, size: 4, duration: 25, delay: 0, driftX: 45, driftY: -30, rotStart: 0, rotEnd: 0, opacity: 0.32, blur: 1.6, color: '#bed499', animType: 'A' },
  { id: 2, type: 'mote', depth: 'far', left: 23, top: 46, size: 5, duration: 28, delay: 4, driftX: -55, driftY: 22, rotStart: 0, rotEnd: 0, opacity: 0.28, blur: 1.8, color: '#8fa072', animType: 'B' },
  { id: 3, type: 'mote', depth: 'far', left: 41, top: 14, size: 3, duration: 22, delay: 8, driftX: 38, driftY: -38, rotStart: 0, rotEnd: 0, opacity: 0.38, blur: 1.2, color: '#d2e3ad', animType: 'A' },
  { id: 4, type: 'mote', depth: 'far', left: 63, top: 62, size: 6, duration: 27, delay: 2, driftX: -42, driftY: -26, rotStart: 0, rotEnd: 0, opacity: 0.25, blur: 2.1, color: '#a2b385', animType: 'B' },
  { id: 5, type: 'mote', depth: 'far', left: 82, top: 33, size: 4, duration: 24, delay: 6, driftX: 48, driftY: 32, rotStart: 0, rotEnd: 0, opacity: 0.32, blur: 1.4, color: '#bed499', animType: 'A' },
  { id: 6, type: 'mote', depth: 'far', left: 91, top: 78, size: 5, duration: 29, delay: 10, driftX: -58, driftY: -34, rotStart: 0, rotEnd: 0, opacity: 0.26, blur: 1.7, color: '#8fa072', animType: 'B' },
  { id: 7, type: 'mote', depth: 'far', left: 14, top: 85, size: 4, duration: 23, delay: 3, driftX: 40, driftY: -18, rotStart: 0, rotEnd: 0, opacity: 0.3, blur: 1.5, color: '#aab88d', animType: 'A' },
  { id: 8, type: 'mote', depth: 'far', left: 74, top: 12, size: 3, duration: 26, delay: 7, driftX: -34, driftY: 34, rotStart: 0, rotEnd: 0, opacity: 0.35, blur: 1.3, color: '#d2e3ad', animType: 'B' },

  // 2. Lớp giữa: Hạt bụi độc, mảnh tro cháy và sợi tơ mục rã
  { id: 9, type: 'mote', depth: 'mid', left: 18, top: 37, size: 5, duration: 18, delay: 1, driftX: 65, driftY: -45, rotStart: 0, rotEnd: 0, opacity: 0.45, blur: 0.6, color: '#c4d6a1', animType: 'A' },
  { id: 10, type: 'mote', depth: 'mid', left: 35, top: 71, size: 6, duration: 21, delay: 5, driftX: -70, driftY: 26, rotStart: 0, rotEnd: 0, opacity: 0.38, blur: 0.8, color: '#9aab7a', animType: 'B' },
  { id: 11, type: 'mote', depth: 'mid', left: 52, top: 27, size: 7, duration: 17, delay: 9, driftX: 55, driftY: -50, rotStart: 0, rotEnd: 0, opacity: 0.42, blur: 0.5, color: '#dbe8bd', animType: 'A' },
  { id: 12, type: 'mote', depth: 'mid', left: 68, top: 49, size: 5, duration: 20, delay: 3, driftX: -48, driftY: 42, rotStart: 0, rotEnd: 0, opacity: 0.36, blur: 0.7, color: '#bed499', animType: 'B' },
  { id: 13, type: 'mote', depth: 'mid', left: 86, top: 67, size: 6, duration: 19, delay: 7, driftX: 62, driftY: -32, rotStart: 0, rotEnd: 0, opacity: 0.4, blur: 0.6, color: '#a2b385', animType: 'A' },

  // Mảnh vỡ đa giác & mảnh tro lơ lửng
  { id: 14, type: 'debris', depth: 'mid', left: 11, top: 54, size: 10, duration: 21, delay: 2, driftX: 72, driftY: 34, rotStart: 15, rotEnd: 195, opacity: 0.4, blur: 0.4, color: '#2a3325', points: '0,3 7,0 10,7 5,10 1,7', animType: 'A' },
  { id: 15, type: 'ash', depth: 'mid', left: 29, top: 17, size: 8, duration: 23, delay: 6, driftX: -64, driftY: -42, rotStart: 40, rotEnd: 240, opacity: 0.38, blur: 0.5, color: '#394233', points: '2,0 8,2 6,8 0,6', animType: 'B' },
  { id: 16, type: 'debris', depth: 'mid', left: 47, top: 81, size: 11, duration: 19, delay: 10, driftX: 68, driftY: -46, rotStart: -20, rotEnd: 160, opacity: 0.35, blur: 0.4, color: '#242b1f', points: '0,2 9,0 11,8 4,11', animType: 'A' },
  { id: 17, type: 'ash', depth: 'mid', left: 61, top: 31, size: 7, duration: 22, delay: 4, driftX: -78, driftY: 28, rotStart: 60, rotEnd: 290, opacity: 0.42, blur: 0.6, color: '#3f4a38', points: '3,0 7,3 4,7 0,4', animType: 'B' },
  { id: 18, type: 'debris', depth: 'mid', left: 77, top: 44, size: 9, duration: 20, delay: 8, driftX: 58, driftY: 44, rotStart: 10, rotEnd: 190, opacity: 0.37, blur: 0.5, color: '#2b3326', points: '1,0 8,1 9,8 2,9', animType: 'A' },
  { id: 19, type: 'ash', depth: 'mid', left: 93, top: 24, size: 8, duration: 24, delay: 1, driftX: -72, driftY: -36, rotStart: 5, rotEnd: 210, opacity: 0.36, blur: 0.5, color: '#353e2f', points: '2,0 7,2 8,7 1,6', animType: 'B' },

  // Sợi vải mục rữa & tơ bụi hữu cơ
  { id: 20, type: 'fiber', depth: 'mid', left: 22, top: 65, size: 14, duration: 22, delay: 3, driftX: 54, driftY: -54, rotStart: 25, rotEnd: 160, opacity: 0.38, blur: 0.3, color: '#4d5943', pathD: 'M 1 2 Q 8 8 13 1', animType: 'A' },
  { id: 21, type: 'fiber', depth: 'mid', left: 57, top: 13, size: 16, duration: 25, delay: 7, driftX: -58, driftY: 38, rotStart: -15, rotEnd: 140, opacity: 0.34, blur: 0.4, color: '#44503b', pathD: 'M 2 13 Q 9 2 15 11', animType: 'B' },
  { id: 22, type: 'fiber', depth: 'mid', left: 84, top: 85, size: 15, duration: 20, delay: 11, driftX: 68, driftY: -42, rotStart: 45, rotEnd: 225, opacity: 0.36, blur: 0.3, color: '#536148', pathD: 'M 1 1 Q 7 14 14 6', animType: 'A' },

  // 3. Lớp gần: Mảnh vụn lớn cận cảnh và hạt bụi lớn trôi dạt sát mắt nhìn (bokeh mờ nhẹ)
  { id: 23, type: 'debris', depth: 'near', left: 5, top: 39, size: 18, duration: 16, delay: 0, driftX: 92, driftY: -62, rotStart: 0, rotEnd: 180, opacity: 0.42, blur: 0.8, color: '#1a2117', points: '2,0 16,3 18,14 7,17 0,11', animType: 'A' },
  { id: 24, type: 'mote', depth: 'near', left: 27, top: 79, size: 9, duration: 15, delay: 4, driftX: -88, driftY: 42, rotStart: 0, rotEnd: 0, opacity: 0.48, blur: 1.2, color: '#d7e7b8', animType: 'B' },
  { id: 25, type: 'debris', depth: 'near', left: 44, top: 57, size: 22, duration: 18, delay: 8, driftX: 105, driftY: 48, rotStart: 30, rotEnd: 240, opacity: 0.38, blur: 1.0, color: '#222a1e', points: '4,0 20,2 22,18 8,21 1,12', animType: 'A' },
  { id: 26, type: 'mote', depth: 'near', left: 64, top: 19, size: 11, duration: 14, delay: 2, driftX: -82, driftY: -58, rotStart: 0, rotEnd: 0, opacity: 0.45, blur: 1.4, color: '#c4d79e', animType: 'B' },
  { id: 27, type: 'debris', depth: 'near', left: 87, top: 51, size: 19, duration: 17, delay: 6, driftX: 88, driftY: -52, rotStart: -45, rotEnd: 150, opacity: 0.4, blur: 0.9, color: '#1e261a', points: '1,3 17,0 19,15 5,18', animType: 'A' },
  { id: 28, type: 'mote', depth: 'near', left: 94, top: 87, size: 10, duration: 16, delay: 9, driftX: -95, driftY: 38, rotStart: 0, rotEnd: 0, opacity: 0.46, blur: 1.3, color: '#e0efc4', animType: 'B' },
];

const DenseFogParticles: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden select-none"
    >
      <style>{`
        @keyframes fogParticleA {
          0% {
            transform: translate3d(0, 0, 0) rotate(var(--rot-start, 0deg));
            opacity: 0;
          }
          18% {
            opacity: var(--target-opacity, 0.4);
          }
          50% {
            transform: translate3d(var(--drift-x, 60px), var(--drift-y, -40px), 0) rotate(calc(var(--rot-start, 0deg) + 70deg));
          }
          82% {
            opacity: var(--target-opacity, 0.4);
          }
          100% {
            transform: translate3d(calc(var(--drift-x, 60px) * 1.8), calc(var(--drift-y, -40px) * 1.9), 0) rotate(var(--rot-end, 180deg));
            opacity: 0;
          }
        }
        @keyframes fogParticleB {
          0% {
            transform: translate3d(0, 0, 0) rotate(var(--rot-start, 0deg));
            opacity: 0;
          }
          18% {
            opacity: var(--target-opacity, 0.4);
          }
          52% {
            transform: translate3d(calc(var(--drift-x, -50px) * 0.7), calc(var(--drift-y, 35px) * 0.8), 0) rotate(calc(var(--rot-start, 0deg) - 55deg));
          }
          80% {
            opacity: var(--target-opacity, 0.4);
          }
          100% {
            transform: translate3d(var(--drift-x, -50px), var(--drift-y, 35px), 0) rotate(var(--rot-end, -160deg));
            opacity: 0;
          }
        }
        @keyframes stagnantPulse {
          0%, 100% {
            filter: brightness(0.92) contrast(1);
          }
          50% {
            filter: brightness(1.12) contrast(1.04);
          }
        }
        @keyframes mistVeilDrift {
          0% {
            transform: translate3d(-6%, 0, 0) scaleY(1);
          }
          50% {
            transform: translate3d(6%, -12px, 0) scaleY(1.06);
          }
          100% {
            transform: translate3d(-6%, 0, 0) scaleY(1);
          }
        }
      `}</style>

      {/* Gradient SVG cho hạt bụi phát quang trong sương */}
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <radialGradient id="denseFogMoteGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#dcebc2" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#a3b882" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#556644" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {/* Lớp sương mù bề mặt trôi chậm ở chân trời */}
      <div className="absolute inset-x-0 bottom-0 h-48 opacity-35" style={{ animation: 'mistVeilDrift 28s ease-in-out infinite' }}>
        <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="w-full h-full">
          <path
            d="M 0 100 Q 300 40 600 90 T 1200 70 L 1200 200 L 0 200 Z"
            fill="rgba(154, 171, 122, 0.22)"
            style={{ filter: 'blur(16px)' }}
          />
          <path
            d="M 0 130 Q 350 80 700 120 T 1200 110 L 1200 200 L 0 200 Z"
            fill="rgba(110, 125, 90, 0.28)"
            style={{ filter: 'blur(10px)' }}
          />
        </svg>
      </div>

      {/* Hệ thống hạt bụi và mảnh vỡ lơ lửng */}
      {STATIC_FOG_PARTICLES.map((p) => {
        const animName = p.animType === 'A' ? 'fogParticleA' : 'fogParticleB';
        return (
          <div
            key={p.id}
            className="absolute will-change-transform"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              filter: p.blur > 0 ? `blur(${p.blur}px)` : undefined,
              animation: `${animName} ${p.duration}s cubic-bezier(0.42, 0, 0.58, 1) infinite, stagnantPulse ${p.duration * 0.7}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
              ['--rot-start' as any]: `${p.rotStart}deg`,
              ['--rot-end' as any]: `${p.rotEnd}deg`,
              ['--drift-x' as any]: `${p.driftX}px`,
              ['--drift-y' as any]: `${p.driftY}px`,
              ['--target-opacity' as any]: p.opacity,
            }}
          >
            {p.type === 'mote' ? (
              <svg viewBox="0 0 10 10" className="w-full h-full overflow-visible">
                <circle cx="5" cy="5" r="4.8" fill="url(#denseFogMoteGlow)" />
                <circle cx="5" cy="5" r="1.8" fill="#eaf5d5" opacity="0.8" />
              </svg>
            ) : p.type === 'debris' || p.type === 'ash' ? (
              <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible">
                <polygon points={p.points || '2,0 8,2 6,8 0,6'} fill={p.color} />
              </svg>
            ) : (
              <svg viewBox="0 0 18 18" className="w-full h-full overflow-visible">
                <path
                  d={p.pathD || 'M 1 2 Q 8 8 13 1'}
                  stroke={p.color}
                  strokeWidth="1.4"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
};
