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
    let nextCrow = Date.now() + 3000 + rnd() * 6000;
    let thunder = 0;
    let nextThunder = Date.now() + 5000 + rnd() * 8000;
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
        if (Date.now() > nextThunder) {
          thunder = 0.2;
          nextThunder = Date.now() + 7000 + rnd() * 10000;
          window.setTimeout(() => sound.playThunder(), 500 + rnd() * 1200);
        }
        if (thunder > 0) {
          ctx.fillStyle = `rgba(150,210,190,${thunder})`;
          ctx.fillRect(0, 0, width, height);
          thunder = Math.max(0, thunder - 0.012);
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

  return <canvas ref={canvasRef} style={{ filter: 'sepia(0.28) saturate(0.78) contrast(1.06) brightness(0.92)' }} className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
};
