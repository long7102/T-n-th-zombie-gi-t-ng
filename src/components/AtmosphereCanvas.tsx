import React, { useEffect, useRef } from 'react';
import { BackgroundEffectType } from '../types/game';
import { sound } from '../utils/audio';

interface AtmosphereCanvasProps {
  weather: string;
  backgroundEffect?: BackgroundEffectType;
  dangerLevel: number;
  isEmergency: boolean;
  day?: number;
  cityWaterCutoff?: boolean;
  cityPowerBlackout?: boolean;
}

export const AtmosphereCanvas: React.FC<AtmosphereCanvasProps> = ({
  weather,
  backgroundEffect = 'fog_dense',
  dangerLevel,
  isEmergency,
  day = 1,
  cityWaterCutoff = false,
  cityPowerBlackout = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Weather flags
    const isHeavyRain = weather === 'heavy_rain';
    const isRain = backgroundEffect === 'rain_light' || backgroundEffect === 'thunder_soft' || weather.includes('rain');
    const isThunder = backgroundEffect === 'thunder_soft' || isHeavyRain;
    const isOvercast = backgroundEffect === 'overcast' || weather === 'clear';
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const isHeat = backgroundEffect === 'sunny_harsh' || weather.includes('heatwave');
    const isSnow = weather.includes('cold') || weather.includes('freezing') || backgroundEffect === 'frost_wind';
    const isFog = backgroundEffect === 'fog_dense' || weather.includes('fog');
    const isNight = backgroundEffect === 'night_dark' || weather.includes('night');
    const isBlackout = cityPowerBlackout || (day || 1) >= 10;

    // 1. Rain Particles
    const rainDrops: { x: number; y: number; length: number; speedY: number; speedX: number; alpha: number }[] = [];
    if (isRain) {
      const dropCount = isHeavyRain ? 110 : backgroundEffect === 'thunder_soft' ? 70 : 45;
      for (let i = 0; i < dropCount; i++) {
        rainDrops.push({
          x: Math.random() * width,
          y: Math.random() * height,
          length: 12 + Math.random() * 16,
          speedY: (isHeavyRain ? 14 : 10) + Math.random() * 6,
          speedX: (isHeavyRain ? -4 : -2) - Math.random() * 1.5,
          alpha: 0.2 + Math.random() * 0.35,
        });
      }
    }

    // 2. Splashes / Ripples for Rain
    const splashes: { x: number; y: number; radius: number; maxRadius: number; alpha: number }[] = [];

    // 3. Ambient Atmospheric Particles (Dust, Ash, Heat shimmer, Snowflakes)
    const particleCount = isHeat ? 50 : isSnow ? 60 : 35;
    const particles: {
      x: number;
      y: number;
      speedY: number;
      speedX: number;
      size: number;
      alpha: number;
      oscFreq: number;
      oscOffset: number;
    }[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speedY: isHeat
          ? -(0.4 + Math.random() * 0.8) // Upward heat shimmer
          : isSnow
          ? (0.8 + Math.random() * 1.2) // Drifting snow
          : (Math.random() - 0.4) * 0.3, // Floating dust / ash
        speedX: isSnow
          ? 1.5 + Math.random() * 2 // Wind blown snow
          : (Math.random() - 0.5) * 0.4,
        size: isSnow ? 2 + Math.random() * 2.5 : isHeat ? 1.5 + Math.random() * 2 : 1 + Math.random() * 1.5,
        alpha: 0.15 + Math.random() * 0.35,
        oscFreq: 0.02 + Math.random() * 0.04,
        oscOffset: Math.random() * Math.PI * 2,
      });
    }

    // 4. Stars for Clear Night
    const stars: { x: number; y: number; size: number; baseAlpha: number; speed: number }[] = [];
    if (isNight) {
      for (let i = 0; i < 60; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * (height * 0.6),
          size: Math.random() * 1.8 + 0.5,
          baseAlpha: Math.random() * 0.5 + 0.2,
          speed: 0.02 + Math.random() * 0.03,
        });
      }
    }

    // 5. Fog Banks
    const fogBanks = [
      { yRatio: 0.35, speed: 0.12, width: 600, alpha: 0.06 },
      { yRatio: 0.55, speed: -0.08, width: 800, alpha: 0.08 },
      { yRatio: 0.80, speed: 0.18, width: 700, alpha: 0.11 },
    ];
    let fogOffset = 0;

    // 5b. Luồng gió lạnh (vệt ngang mờ) và sóng nhiệt bốc lên mặt đất
    const windStreaks = Array.from({ length: isSnow ? 14 : 0 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      len: 80 + Math.random() * 160,
      speed: 5 + Math.random() * 5,
      alpha: 0.04 + Math.random() * 0.06,
    }));
    const cloudBanks = Array.from({ length: isOvercast ? 5 : 0 }, (_, i) => ({
      x: (i / 5) * width,
      y: height * (0.12 + Math.random() * 0.3),
      w: 320 + Math.random() * 260,
      speed: 0.12 + Math.random() * 0.12,
    }));

    // 6. Thunder Ambient Illumination
    let thunderAlpha = 0;
    let nextThunderTime = Date.now() + 5000 + Math.random() * 8000;

    let time = 0;

    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      // Thunder trigger
      if (isThunder) {
        if (Date.now() > nextThunderTime) {
          thunderAlpha = 0.22; // Gentle, non-blinding atmospheric sheet glow
          // Chớp trước, sấm rền sau 0.5-1.7 giây như ngoài đời thật
          window.setTimeout(() => sound.playThunder(), 500 + Math.random() * 1200);
          nextThunderTime = Date.now() + 6000 + Math.random() * 9000;
        }
        if (thunderAlpha > 0) {
          thunderAlpha = Math.max(0, thunderAlpha - 0.015);
        }
      }

      // Base Gradient matching weather
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);

      if (isEmergency) {
        bgGrad.addColorStop(0, '#1c0707');
        bgGrad.addColorStop(0.6, '#0f0404');
        bgGrad.addColorStop(1, '#070202');
      } else if (isHeat) {
        // Harsh blazing heat
        bgGrad.addColorStop(0, '#241407');
        bgGrad.addColorStop(0.4, '#170c04');
        bgGrad.addColorStop(1, '#090502');
      } else if (isNight) {
        // Night - Pitch black if city power blackout, dark navy otherwise
        if (isBlackout) {
          bgGrad.addColorStop(0, '#020305');
          bgGrad.addColorStop(0.6, '#010203');
          bgGrad.addColorStop(1, '#000102');
        } else {
          bgGrad.addColorStop(0, '#050914');
          bgGrad.addColorStop(0.6, '#03050a');
          bgGrad.addColorStop(1, '#010204');
        }
      } else if (isRain) {
        // Rain / Thunder overcast
        bgGrad.addColorStop(0, '#090d16');
        bgGrad.addColorStop(0.6, '#060910');
        bgGrad.addColorStop(1, '#030408');
      } else if (isOvercast) {
        // Trời râm: xám nhạt hơn sương mù, ít u ám
        bgGrad.addColorStop(0, '#12161c');
        bgGrad.addColorStop(0.6, '#0c1015');
        bgGrad.addColorStop(1, '#05070a');
      } else if (isSnow) {
        // Freezing cold cyan-slate
        bgGrad.addColorStop(0, '#081017');
        bgGrad.addColorStop(0.6, '#050a10');
        bgGrad.addColorStop(1, '#020407');
      } else {
        // Dense fog gray-slate
        bgGrad.addColorStop(0, '#0c1016');
        bgGrad.addColorStop(0.6, '#080b0f');
        bgGrad.addColorStop(1, '#040608');
      }

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Render Stars (if night and not raining heavily)
      if (isNight && stars.length > 0) {
        stars.forEach((star) => {
          const twinkle = star.baseAlpha + Math.sin(time * 3 + star.x) * 0.2;
          ctx.fillStyle = `rgba(220, 235, 255, ${Math.max(0.1, twinkle)})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Heatwave Sun Glare in Upper Corner
      if (isHeat) {
        const sunX = width * 0.85;
        const sunY = height * 0.12;
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 320);
        sunGrad.addColorStop(0, 'rgba(251, 191, 36, 0.28)');
        sunGrad.addColorStop(0.3, 'rgba(245, 158, 11, 0.12)');
        sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 320, 0, Math.PI * 2);
        ctx.fill();
      }

      // Distant Ruined City Silhouette
      const bColor = isEmergency
        ? 'rgba(25, 8, 8, 0.65)'
        : isBlackout
        ? 'rgba(4, 6, 8, 0.95)' // Pure dead black buildings after Day 10 blackout
        : 'rgba(8, 12, 18, 0.7)';

      ctx.fillStyle = bColor;
      const buildingWidth = 72;
      for (let x = 0; x < width; x += buildingWidth + 14) {
        const seed = Math.sin(x * 0.045);
        const bHeight = 110 + Math.abs(seed) * 150;
        const bY = height - bHeight;
        ctx.fillRect(x, bY, buildingWidth, bHeight);

        // Pre-blackout window lights (Day < 10)
        if (!isBlackout && (isNight || isRain)) {
          const hasLight = Math.sin(x * 3.7) > 0.45;
          if (hasLight) {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
            ctx.fillRect(x + 12, bY + 30, 4, 6);
            ctx.fillRect(x + 28, bY + 60, 4, 6);
            ctx.fillStyle = bColor; // revert
          }
        }
      }

      // Render Fog Banks (especially for fog_dense or early morning)
      if (isFog || isSnow) {
        fogOffset += 0.2;
        fogBanks.forEach((fb, idx) => {
          const cy = height * fb.yRatio;
          const cx = ((time * fb.speed * 40 + idx * 300) % (width + fb.width)) - fb.width;
          const fGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, fb.width / 2);
          fGrad.addColorStop(0, `rgba(180, 195, 210, ${fb.alpha})`);
          fGrad.addColorStop(0.7, `rgba(140, 160, 180, ${fb.alpha * 0.5})`);
          fGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = fGrad;
          ctx.beginPath();
          ctx.ellipse(cx, cy, fb.width / 2, 70, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Mây xám trôi chậm (trời râm)
      cloudBanks.forEach((cb) => {
        cb.x += cb.speed;
        if (cb.x > width + cb.w) cb.x = -cb.w;
        const cg = ctx.createRadialGradient(cb.x, cb.y, 10, cb.x, cb.y, cb.w / 2);
        cg.addColorStop(0, 'rgba(120, 130, 140, 0.07)');
        cg.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.ellipse(cb.x, cb.y, cb.w / 2, 46, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Vệt gió lạnh thổi ngang
      windStreaks.forEach((ws) => {
        ws.x += ws.speed;
        if (ws.x - ws.len > width) {
          ws.x = -ws.len;
          ws.y = Math.random() * height;
        }
        const wg = ctx.createLinearGradient(ws.x - ws.len, ws.y, ws.x, ws.y);
        wg.addColorStop(0, 'rgba(200, 230, 255, 0)');
        wg.addColorStop(1, `rgba(200, 230, 255, ${ws.alpha})`);
        ctx.strokeStyle = wg;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ws.x - ws.len, ws.y);
        ctx.lineTo(ws.x, ws.y);
        ctx.stroke();
      });

      // Sóng nhiệt bốc lên từ mặt đất khi nắng gắt
      if (isHeat) {
        ctx.lineWidth = 1;
        for (let k = 0; k < 6; k++) {
          const baseY = height - 150 - k * 22;
          ctx.strokeStyle = `rgba(251, 191, 36, ${0.035 + k * 0.004})`;
          ctx.beginPath();
          for (let x = 0; x <= width; x += 14) {
            const y = baseY + Math.sin(x * 0.02 + time * 1.6 + k) * 4;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // Render Ambient / Heat / Snow Particles
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(time * p.oscFreq + p.oscOffset) * 0.3;

        if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        if (isHeat) {
          ctx.fillStyle = `rgba(245, 158, 11, ${p.alpha * 0.45})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (isSnow) {
          ctx.fillStyle = `rgba(220, 240, 255, ${p.alpha * 0.75})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Floating ash / debris
          ctx.fillStyle = `rgba(170, 170, 170, ${p.alpha * 0.4})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Render Rain Streaks & Ground Ripples
      if (isRain) {
        ctx.lineWidth = 1.2;
        rainDrops.forEach((drop) => {
          drop.y += drop.speedY;
          drop.x += drop.speedX;

          if (drop.y > height - 15) {
            // Splash ripple upon landing
            if (Math.random() < 0.25) {
              splashes.push({
                x: drop.x,
                y: height - 12 + Math.random() * 8,
                radius: 1,
                maxRadius: 6 + Math.random() * 6,
                alpha: 0.35,
              });
            }
            drop.y = -10;
            drop.x = Math.random() * width;
          }

          ctx.strokeStyle = `rgba(180, 210, 240, ${drop.alpha * (isThunder ? 0.6 : 0.4)})`;
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x + drop.speedX * 1.5, drop.y + drop.length);
          ctx.stroke();
        });

        // Splashes
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i];
          s.radius += 0.4;
          s.alpha -= 0.025;
          if (s.alpha <= 0 || s.radius >= s.maxRadius) {
            splashes.splice(i, 1);
            continue;
          }
          ctx.strokeStyle = `rgba(180, 210, 240, ${s.alpha * 0.3})`;
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, s.radius * 2, s.radius * 0.7, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Thunder Ambient Illumination Overlay
      if (isThunder && thunderAlpha > 0) {
        ctx.fillStyle = `rgba(140, 170, 220, ${thunderAlpha})`;
        ctx.fillRect(0, 0, width, height);
      }

      // Vignette đỏ thở chậm khi mức nguy hiểm cao (không chớp nháy)
      if (dangerLevel >= 3 || isEmergency) {
        const pulse = 0.5 + 0.5 * Math.sin(time * (isEmergency ? 2.4 : 0.9));
        const vAlpha = (isEmergency ? 0.18 : 0.04 * (dangerLevel - 2)) * (0.7 + 0.3 * pulse);
        const vg = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.35, width / 2, height / 2, Math.max(width, height) * 0.75);
        vg.addColorStop(0, 'rgba(120, 10, 10, 0)');
        vg.addColorStop(1, `rgba(120, 10, 10, ${vAlpha})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, width, height);
      }

      // Viền sương giá khi trời rét
      if (isSnow) {
        const fg = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.4, width / 2, height / 2, Math.max(width, height) * 0.72);
        fg.addColorStop(0, 'rgba(190, 230, 255, 0)');
        fg.addColorStop(1, 'rgba(190, 230, 255, 0.07)');
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, width, height);
      }

      // Ground Vignette / Dark Floor
      const groundGrad = ctx.createLinearGradient(0, height - 140, 0, height);
      groundGrad.addColorStop(0, 'rgba(0,0,0,0)');
      groundGrad.addColorStop(1, isEmergency ? 'rgba(30, 8, 8, 0.7)' : 'rgba(5, 7, 10, 0.85)');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, height - 140, width, 140);

      if (!reduceMotion) animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [weather, backgroundEffect, dangerLevel, isEmergency, day, cityWaterCutoff, cityPowerBlackout]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 w-full h-full"
    />
  );
};
