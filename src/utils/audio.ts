// Procedural Web Audio API sound generator for Zombie Survival RPG
// Dynamic Ambient Soundscape Engine (Drone, Wind in Cracks, Distant Screams, Rain, Heatwave Shimmer)
// Synchronized with 'weather' and 'dangerLevel' in real-time.
// 100% procedural, zero external audio assets, zero 404 risk.

import { WeatherType } from '../types/game';

interface AmbientLayers {
  droneGain: GainNode;
  droneFilter: BiquadFilterNode;
  droneOscs: OscillatorNode[];
  droneLfo: OscillatorNode;
  droneLfoGain: GainNode;
  detuneOsc?: OscillatorNode;

  windGain: GainNode;
  windFilter: BiquadFilterNode;
  windSource: AudioBufferSourceNode;
  windLfo: OscillatorNode;

  rainGain: GainNode;
  rainFilter: BiquadFilterNode;
  rainSource: AudioBufferSourceNode;

  heatGain: GainNode;
  heatOsc: OscillatorNode;
  heatAm: GainNode;
  heatLfo: OscillatorNode;
  heatLfoGain: GainNode;
}

export type MusicTheme = 'off' | 'map' | 'home' | 'danger' | 'despair';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private muted: boolean = false;
  private volume: number = 0.7;
  private heartbeatInterval: number | null = null;

  // Dynamic Soundscape state
  private ambientRunning: boolean = false;
  private ambientLayers: AmbientLayers | null = null;
  private currentWeather: WeatherType = 'dense_fog';
  private currentDangerLevel: number = 2;
  private screamsTimeout: number | null = null;
  private thunderTimeout: number | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Nhạc nền theo chủ đề (kiểu bản đồ / nhà / vùng nguy hiểm / tuyệt vọng), tự sáng tác bằng Web Audio
  private musicGain: GainNode | null = null;
  private musicTheme: MusicTheme = 'off';
  private musicTimer: number | null = null;
  private musicBar = 0;
  private musicToken = 0;

  private init() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
      // Bộ nén động: tránh vỡ tiếng khi súng, sấm và tiếng gió chồng lên nhau
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-20, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(24, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.004, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.muted ? 0 : 0.3 * this.volume, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(mute: boolean) {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(this.muted ? 0 : 0.3 * this.volume, this.ctx.currentTime);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    if (this.ambientGain && this.ctx && !this.muted) {
      this.ambientGain.gain.setValueAtTime(0.3 * this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  // Create procedural looping pink-noise buffer for wind/rain
  private createLoopingNoise(durationSec = 4): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not ready');
    const bufferSize = this.ctx.sampleRate * durationSec;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  // Start the full multi-layered ambient soundscape
  public startAmbientSoundscape(weather: WeatherType = 'dense_fog', dangerLevel: number = 2) {
    if (this.ambientRunning) {
      this.updateAmbientSoundscape(weather, dangerLevel);
      return;
    }

    try {
      this.init();
      if (!this.ctx || !this.ambientGain) return;
      const now = this.ctx.currentTime;
      this.currentWeather = weather;
      this.currentDangerLevel = dangerLevel;

      // ================= 1. SUB-BASS POST-APOCALYPTIC DRONE LAYER =================
      const oscRoot = this.ctx.createOscillator();
      const oscFifth = this.ctx.createOscillator();
      const oscSub = this.ctx.createOscillator();
      const oscDetune = this.ctx.createOscillator();

      oscRoot.type = 'sawtooth';
      oscRoot.frequency.setValueAtTime(45, now);

      oscFifth.type = 'triangle';
      oscFifth.frequency.setValueAtTime(67.5, now);

      oscSub.type = 'sine';
      oscSub.frequency.setValueAtTime(32.7, now);

      oscDetune.type = 'sawtooth';
      oscDetune.frequency.setValueAtTime(45.8, now); // slight dissonant beating

      const droneFilter = this.ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      const initialCutoff = 110 + dangerLevel * 25;
      droneFilter.frequency.setValueAtTime(initialCutoff, now);
      droneFilter.Q.setValueAtTime(2.5 + dangerLevel * 0.6, now);

      const droneLfo = this.ctx.createOscillator();
      const droneLfoGain = this.ctx.createGain();
      droneLfo.type = 'sine';
      droneLfo.frequency.setValueAtTime(0.06 + dangerLevel * 0.02, now);
      droneLfoGain.gain.setValueAtTime(40 + dangerLevel * 15, now);
      droneLfo.connect(droneLfoGain);
      droneLfoGain.connect(droneFilter.frequency);

      const droneGain = this.ctx.createGain();
      droneGain.gain.setValueAtTime(0.01, now);
      droneGain.gain.linearRampToValueAtTime(0.38, now + 3);

      oscRoot.connect(droneFilter);
      oscFifth.connect(droneFilter);
      oscSub.connect(droneFilter);
      oscDetune.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(this.ambientGain);

      oscRoot.start(now);
      oscFifth.start(now);
      oscSub.start(now);
      oscDetune.start(now);
      droneLfo.start(now);

      // ================= 2. WIND WHISTLING THROUGH CRACKS (TIẾNG GIÓ RÍT KHE CỬA) =================
      const noiseBuffer = this.createLoopingNoise(5);
      const windSource = this.ctx.createBufferSource();
      windSource.buffer = noiseBuffer;
      windSource.loop = true;

      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(550, now);
      windFilter.Q.setValueAtTime(7.5, now);

      const windLfo = this.ctx.createOscillator();
      const windLfoGain = this.ctx.createGain();
      windLfo.type = 'sine';
      windLfo.frequency.setValueAtTime(0.18, now);
      windLfoGain.gain.setValueAtTime(320, now);
      windLfo.connect(windLfoGain);
      windLfoGain.connect(windFilter.frequency);

      const windGain = this.ctx.createGain();
      const initialWindVol = this.getWindVolumeForWeather(weather, dangerLevel);
      windGain.gain.setValueAtTime(0.001, now);
      windGain.gain.linearRampToValueAtTime(initialWindVol, now + 3);

      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(this.ambientGain);

      windSource.start(now);
      windLfo.start(now);

      // ================= 3. RAIN PATTER / STORM LAYER =================
      const rainSource = this.ctx.createBufferSource();
      rainSource.buffer = this.createLoopingNoise(3);
      rainSource.loop = true;

      const rainFilter = this.ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.setValueAtTime(1400, now);

      const rainGain = this.ctx.createGain();
      const initialRainVol = weather === 'heavy_rain' ? 0.28 : 0.0001;
      rainGain.gain.setValueAtTime(initialRainVol, now);

      rainSource.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(this.ambientGain);
      rainSource.start(now);

      // ================= 4. HEATWAVE MIRAGE / CICADA SHIMMER =================
      const heatOsc = this.ctx.createOscillator();
      heatOsc.type = 'triangle';
      heatOsc.frequency.setValueAtTime(880, now);

      const heatGain = this.ctx.createGain();
      const initialHeatVol = weather === 'heatwave' ? 0.05 : 0.0001;
      heatGain.gain.setValueAtTime(initialHeatVol, now);

      // Tiếng ve rền theo nhịp (điều biến biên độ ~7Hz, tần số lệch nhẹ) thay vì một âm sine đều đặn
      const heatAm = this.ctx.createGain();
      heatAm.gain.setValueAtTime(0.5, now);
      const heatLfo = this.ctx.createOscillator();
      const heatLfoGain = this.ctx.createGain();
      heatLfo.type = 'square';
      heatLfo.frequency.setValueAtTime(7.3, now);
      heatLfoGain.gain.setValueAtTime(0.5, now);
      heatLfo.connect(heatLfoGain);
      heatLfoGain.connect(heatAm.gain);
      heatOsc.frequency.setValueAtTime(3100, now);
      heatOsc.connect(heatAm);
      heatAm.connect(heatGain);
      heatGain.connect(this.ambientGain);
      heatOsc.start(now);
      heatLfo.start(now);

      this.ambientLayers = {
        droneGain,
        droneFilter,
        droneOscs: [oscRoot, oscFifth, oscSub, oscDetune],
        droneLfo,
        droneLfoGain,
        detuneOsc: oscDetune,
        windGain,
        windFilter,
        windSource,
        windLfo,
        rainGain,
        rainFilter,
        rainSource,
        heatGain,
        heatOsc,
        heatAm,
        heatLfo,
        heatLfoGain,
      };

      this.ambientRunning = true;
      this.scheduleNextDistantWail();
      this.syncWeatherEvents(weather);
    } catch {
      // Audio context might await user gesture
    }
  }

  // Backward compatibility alias for TitleScreen
  public startDarkAmbientDrone() {
    this.startAmbientSoundscape(this.currentWeather, this.currentDangerLevel);
  }

  // Update dynamic layers smoothly when weather or dangerLevel shifts
  public updateAmbientSoundscape(weather: WeatherType, dangerLevel: number) {
    if (!this.ambientRunning || !this.ambientLayers || !this.ctx) {
      this.startAmbientSoundscape(weather, dangerLevel);
      return;
    }

    this.currentWeather = weather;
    this.currentDangerLevel = dangerLevel;
    const now = this.ctx.currentTime;
    const rampTime = 2.0;

    try {
      // 1. Modulate Drone cutoff & tension resonance based on danger
      const targetCutoff = 110 + dangerLevel * 35;
      const targetQ = 2.5 + dangerLevel * 0.8;
      this.ambientLayers.droneFilter.frequency.setTargetAtTime(targetCutoff, now, rampTime);
      this.ambientLayers.droneFilter.Q.setTargetAtTime(targetQ, now, rampTime);
      this.ambientLayers.droneLfo.frequency.setTargetAtTime(0.06 + dangerLevel * 0.025, now, rampTime);

      // 2. Modulate Wind whistling volume & frequency based on weather and danger
      const targetWindVol = this.getWindVolumeForWeather(weather, dangerLevel);
      this.ambientLayers.windGain.gain.setTargetAtTime(targetWindVol, now, rampTime);

      // 2b. Giọng gió đổi theo thời tiết: rét thì rít cao, sương mù thì trầm
      const windPitch = weather === 'freezing_cold' ? 950 : weather === 'dense_fog' ? 380 : weather === 'heavy_rain' ? 700 : 550;
      this.ambientLayers.windFilter.frequency.setTargetAtTime(windPitch, now, rampTime);
      this.syncWeatherEvents(weather);

      // 3. Rain layer volume
      const targetRainVol = weather === 'heavy_rain' ? 0.28 : 0.0001;
      this.ambientLayers.rainGain.gain.setTargetAtTime(targetRainVol, now, rampTime);

      // 4. Heatwave shimmer volume
      const targetHeatVol = weather === 'heatwave' ? 0.05 : 0.0001;
      this.ambientLayers.heatGain.gain.setTargetAtTime(targetHeatVol, now, rampTime);

      // 5. If dangerLevel is critical (4-5), trigger distant howl or heartbeat tension
      if (dangerLevel >= 4) {
        this.scheduleNextDistantWail(true);
      }
    } catch {
      // ignore
    }
  }

  // Sự kiện âm thanh ngẫu nhiên theo thời tiết: mưa bão thì thỉnh thoảng có sấm rền.
  private syncWeatherEvents(weather: WeatherType) {
    if (this.thunderTimeout !== null) {
      clearTimeout(this.thunderTimeout);
      this.thunderTimeout = null;
    }
    // Sấm do AtmosphereCanvas kích hoạt để chớp sáng và tiếng sấm luôn đồng bộ (chớp trước, sấm rền sau).
    void weather;
  }

  // Dò sóng radio: tạp âm băng hẹp, hai nốt dò tần và vài cụm nhiễu ngắt quãng.
  public playRadioStatic() {
    try {
      this.init();
      if (!this.ctx || !this.masterGain || this.muted) return;
      const now = this.ctx.currentTime;
      const dur = 1.6;
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / this.ctx.sampleRate;
        // Tín hiệu bị nuốt theo từng cụm (gating) để tạo cảm giác đứt quãng
        const gate = Math.sin(t * 17) > -0.2 ? 1 : 0.15;
        d[i] = (Math.random() * 2 - 1) * gate;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2200, now);
      bp.frequency.linearRampToValueAtTime(1500, now + dur);
      bp.Q.setValueAtTime(0.9, now);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.14, now + 0.08);
      g.gain.setValueAtTime(0.14, now + dur - 0.4);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      src.start(now);

      [620, 940].forEach((f, i) => {
        const o = this.ctx!.createOscillator();
        const og = this.ctx!.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, now + 0.1 + i * 0.12);
        og.gain.setValueAtTime(0.0001, now + 0.1 + i * 0.12);
        og.gain.linearRampToValueAtTime(0.05, now + 0.12 + i * 0.12);
        og.gain.exponentialRampToValueAtTime(0.0005, now + 0.22 + i * 0.12);
        o.connect(og);
        og.connect(this.masterGain!);
        o.start(now + 0.1 + i * 0.12);
        o.stop(now + 0.3 + i * 0.12);
      });
    } catch {
      // ignore
    }
  }

  // Tiếng giấy loạt xoạt khi mở bản đồ
  public playMapOpen() {
    try {
      this.init();
      if (!this.ctx || !this.masterGain || this.muted) return;
      const now = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * 0.35);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(1800, now);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.12, now);
      src.connect(hp);
      hp.connect(g);
      g.connect(this.masterGain);
      src.start(now);
    } catch {
      // ignore
    }
  }

  // Âm báo cho cột mốc cốt truyện: hai nốt trầm đi xuống, báo hiệu một bước ngoặt
  public playStinger() {
    try {
      this.init();
      if (!this.ctx || !this.masterGain || this.muted) return;
      const now = this.ctx.currentTime;
      [196, 146.8].forEach((f, i) => {
        const o = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, now + i * 0.45);
        g.gain.setValueAtTime(0.0001, now + i * 0.45);
        g.gain.linearRampToValueAtTime(0.22, now + i * 0.45 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.45 + 1.1);
        o.connect(g);
        g.connect(this.masterGain!);
        o.start(now + i * 0.45);
        o.stop(now + i * 0.45 + 1.2);
      });
    } catch {
      // ignore
    }
  }

  private getWindVolumeForWeather(weather: WeatherType, dangerLevel: number): number {
    const dangerBoost = dangerLevel * 0.025;
    switch (weather) {
      case 'freezing_cold':
        return 0.32 + dangerBoost;
      case 'heavy_rain':
        return 0.26 + dangerBoost;
      case 'dense_fog':
        return 0.22 + dangerBoost;
      case 'night_dark':
        return 0.20 + dangerBoost;
      case 'heatwave':
        return 0.08 + dangerBoost;
      case 'clear':
      default:
        return 0.10 + dangerBoost;
    }
  }

  // Schedule intermittent procedural distant scream/wail
  private scheduleNextDistantWail(immediate: boolean = false) {
    if (this.screamsTimeout !== null) {
      clearTimeout(this.screamsTimeout);
      this.screamsTimeout = null;
    }

    if (!this.ambientRunning) return;

    // Danger level determines frequency of distant horrific screams
    let delayMs: number;
    if (this.currentDangerLevel >= 4) {
      delayMs = immediate ? 3000 : 14000 + Math.random() * 14000; // 14-28s: thưa, để khoảng lặng đáng sợ hơn
    } else if (this.currentDangerLevel === 3) {
      delayMs = 24000 + Math.random() * 18000; // 24-42s
    } else {
      delayMs = 40000 + Math.random() * 30000; // 40-70s
    }

    this.screamsTimeout = window.setTimeout(() => {
      this.synthesizeDistantWail(this.currentDangerLevel);
      this.scheduleNextDistantWail();
    }, delayMs);
  }

  // Procedural synthesis of a chilling distant scream / mutant wail echoing through abandoned alleys
  public synthesizeDistantWail(dangerLevel: number = 2) {
    if (!this.ctx || !this.ambientGain || this.muted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const vibrato = this.ctx.createOscillator();
      const vibratoGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      // Pitch glide: starts at 480-550Hz, slowly falls to 180-240Hz
      const startPitch = 440 + Math.random() * 90;
      const endPitch = 190 + Math.random() * 60;
      const duration = 2.4 + Math.random() * 0.8;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(startPitch, now);
      osc.frequency.exponentialRampToValueAtTime(endPitch, now + duration);

      // Unsettling human vocal vibrato
      vibrato.type = 'sine';
      vibrato.frequency.setValueAtTime(5.8, now);
      vibratoGain.gain.setValueAtTime(14, now);
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);

      // Lowpass filter simulating heavy distance through concrete walls & fog
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550 + dangerLevel * 60, now);
      filter.Q.setValueAtTime(3.0, now);

      // Volume envelope: gentle fade-in, long tail
      const maxVol = (0.12 + dangerLevel * 0.04) * this.volume;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(maxVol, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientGain);

      vibrato.start(now);
      osc.start(now);
      vibrato.stop(now + duration + 0.1);
      osc.stop(now + duration + 0.1);
    } catch {
      // ignore
    }
  }

  // Stop the ambient soundscape
  public stopAmbientSoundscape() {
    if (this.thunderTimeout !== null) {
      clearTimeout(this.thunderTimeout);
      this.thunderTimeout = null;
    }
    if (this.screamsTimeout !== null) {
      clearTimeout(this.screamsTimeout);
      this.screamsTimeout = null;
    }
    if (!this.ambientRunning || !this.ambientLayers || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      this.ambientLayers.droneGain.gain.linearRampToValueAtTime(0.001, now + 1.5);
      this.ambientLayers.windGain.gain.linearRampToValueAtTime(0.001, now + 1.5);
      this.ambientLayers.rainGain.gain.linearRampToValueAtTime(0.001, now + 1.5);
      this.ambientLayers.heatGain.gain.linearRampToValueAtTime(0.001, now + 1.5);

      setTimeout(() => {
        try {
          this.ambientLayers?.droneOscs.forEach((o) => {
            try { o.stop(); } catch {}
          });
          this.ambientLayers?.droneLfo.stop();
          this.ambientLayers?.windSource.stop();
          this.ambientLayers?.windLfo.stop();
          this.ambientLayers?.rainSource.stop();
          this.ambientLayers?.heatOsc.stop();
          this.ambientLayers?.heatLfo.stop();
        } catch {}
        this.ambientLayers = null;
        this.ambientRunning = false;
      }, 1600);
    } catch {
      this.ambientRunning = false;
    }
  }

  public stopDarkAmbientDrone() {
    this.stopAmbientSoundscape();
  }


  // ================= NHẠC NỀN THEO CHỦ ĐỀ =================
  private midi(m: number) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  private tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number, attack = 0.02, cutoff = 0, vibrato = 0) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(vol, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    let node: AudioNode = osc;
    if (cutoff > 0) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(cutoff, start);
      osc.connect(f);
      node = f;
    }
    if (vibrato > 0) {
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      lfo.frequency.setValueAtTime(5, start);
      lg.gain.setValueAtTime(vibrato, start);
      lfo.connect(lg);
      lg.connect(osc.frequency);
      lfo.start(start);
      lfo.stop(start + dur + 0.1);
    }
    node.connect(g);
    g.connect(this.musicGain);
    osc.start(start);
    osc.stop(start + dur + 0.1);
  }

  private noiseHit(start: number, dur: number, vol: number, hp = 6000) {
    if (!this.ctx || !this.musicGain) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.setValueAtTime(hp, start);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, start);
    src.connect(f);
    f.connect(g);
    g.connect(this.musicGain);
    src.start(start);
  }

  private kick(start: number, vol: number) {
    if (!this.ctx || !this.musicGain) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, start);
    o.frequency.exponentialRampToValueAtTime(40, start + 0.14);
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    o.connect(g);
    g.connect(this.musicGain);
    o.start(start);
    o.stop(start + 0.25);
  }

  // Tiếng gió/khí lạnh trườn lên rồi tắt: nhiễu lọc thấp, nổi chậm, giống hơi thở của thành phố chết.
  private swell(start: number, dur: number, vol: number, cutoff = 500) {
    if (!this.ctx || !this.musicGain) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff * 0.5, start);
    f.frequency.linearRampToValueAtTime(cutoff, start + dur * 0.6);
    f.frequency.linearRampToValueAtTime(cutoff * 0.4, start + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(vol, start + dur * 0.55);
    g.gain.linearRampToValueAtTime(0.0001, start + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.musicGain);
    src.start(start);
  }

  // Nốt "chập chờn": ngân lên rồi đứt quãng như đèn hỏng, mỗi lần chập là một nhịp ngắt.
  private flicker(freq: number, start: number, dur: number, vol: number, cutoff = 900) {
    const gaps = [0, 0.5, 0.62, 1.1];
    gaps.forEach((g, i) => {
      if (g * dur >= dur) return;
      this.tone(freq, start + g * dur, dur * (i % 2 ? 0.08 : 0.3), 'triangle', vol * (i % 2 ? 0.6 : 1), 0.01, cutoff);
    });
  }

  // Mỗi chủ đề: rất chậm, thưa, nhiều khoảng lặng. Nền là drone trầm và hợp âm lệch (nốt thứ 2, nửa cung), giai điệu chỉ vài nốt lẻ loi.
  private scheduleBar(theme: MusicTheme, t0: number, bar: number) {
    const rnd = (arr: number[]) => arr[Math.floor(Math.random() * arr.length)];
    const chance = (p: number) => Math.random() < p;
    // Drone trầm hai nốt hơi lệch tông tạo cảm giác bất an
    const drone = (root: number, dur: number, vol: number) => {
      this.tone(this.midi(root), t0, dur, 'sine', vol, dur * 0.35, 220);
      this.tone(this.midi(root) * 1.012, t0, dur, 'sine', vol * 0.7, dur * 0.4, 260);
      this.tone(this.midi(root + 7), t0, dur, 'sine', vol * 0.35, dur * 0.5, 300);
    };

    if (theme === 'home') {
      // Chỗ trú: một ngọn nến sắp tắt. E thứ, hộp nhạc cũ vỡ giọng, nốt thưa, nền ấm nhưng buồn
      const spb = 60 / 46;
      const roots = [40, 36, 38, 35];
      drone(roots[bar % 4], spb * 4, 0.07);
      [64, 67, 71].forEach((n, i) => this.tone(this.midi(n - 12), t0 + i * 0.05, spb * 4, 'triangle', 0.022, spb * 1.8, 700));
      if (chance(0.7)) this.tone(this.midi(rnd([71, 72, 74, 76, 79])), t0 + spb * rnd([0.5, 1.5, 2.5]), spb * 2.4, 'sine', 0.04, 0.01, 2000);
      if (chance(0.25)) this.tone(this.midi(rnd([59, 60, 63])), t0 + spb * 3, spb * 2, 'sine', 0.03, 0.02, 1500);
      if (chance(0.2)) this.swell(t0 + spb, spb * 3, 0.012, 400);
      return spb * 4;
    }
    if (theme === 'map') {
      // Bản đồ: đường phố hoang. Gió hú xa, drone D thấp, một nốt sáo lạnh rồi im lặng rất lâu
      const spb = 60 / 50;
      const roots = [38, 38, 36, 34];
      drone(roots[bar % 4], spb * 4, 0.065);
      this.swell(t0, spb * 4, 0.02, 650);
      if (chance(0.55)) this.tone(this.midi(rnd([62, 65, 67, 69, 70])), t0 + spb * rnd([0, 1, 2]), spb * 3.2, 'sine', 0.045, spb * 0.8, 1400, 3);
      if (chance(0.2)) this.tone(this.midi(rnd([50, 53, 55])), t0 + spb * 3, spb * 1.4, 'triangle', 0.04, 0.2, 500);
      return spb * 4;
    }
    if (theme === 'danger') {
      // Nguy hiểm: không dồn dập mà ngạt thở. Nhịp tim rất chậm dưới nền, nốt lệch tritone, khí lạnh trườn lên và những lần chập điện
      const spb = 60 / 58;
      const root = bar % 8 < 4 ? 31 : 30;
      drone(root, spb * 4, 0.085);
      this.tone(this.midi(root + 6), t0 + spb * 0.5, spb * 3.2, 'sine', 0.03, spb * 1.4, 400); // tritone: căng thẳng không giải quyết
      this.kick(t0, 0.07);
      this.kick(t0 + spb * 0.42, 0.045);
      if (bar % 2 === 1) { this.kick(t0 + spb * 2, 0.06); this.kick(t0 + spb * 2.42, 0.04); }
      this.swell(t0 + spb * rnd([0, 1]), spb * 3, 0.022, 800);
      if (chance(0.45)) this.flicker(this.midi(root + 24 + rnd([0, 1, 6])), t0 + spb * rnd([1, 2]), spb * 1.6, 0.03, 1100);
      if (chance(0.18)) this.noiseHit(t0 + spb * rnd([1, 2, 3]), 0.5, 0.02, 3500);
      if (bar % 4 === 3 && chance(0.5)) this.synthesizeDistantWail(2);
      return spb * 4;
    }
    if (theme === 'despair') {
      // Tuyệt vọng: gần như im lặng. Một nốt trầm kéo dài, nốt lệch nửa cung, tiếng vọng xa
      const spb = 60 / 40;
      this.tone(this.midi(38), t0, spb * 4, 'sine', 0.085, spb * 1.4, 260);
      this.tone(this.midi(38) * 1.01, t0, spb * 4, 'sine', 0.05, spb * 1.5, 260);
      if (bar % 2 === 0) {
        [50, 53, 57].forEach((n) => this.tone(this.midi(n), t0, spb * 4, 'triangle', 0.02, spb * 1.8, 600));
        this.tone(this.midi(51), t0 + spb, spb * 3, 'sine', 0.016, spb, 800);
      } else {
        [48, 51, 55].forEach((n) => this.tone(this.midi(n), t0, spb * 4, 'triangle', 0.02, spb * 1.8, 600));
      }
      if (chance(0.5)) this.tone(this.midi(rnd([62, 65, 67, 69])), t0 + spb * rnd([0.5, 1.5, 2.5]), spb * 3.2, 'triangle', 0.045, 0.02, 1300);
      if (chance(0.3)) this.swell(t0 + spb, spb * 3, 0.016, 350);
      if (chance(0.12)) this.synthesizeDistantWail(3);
      return spb * 4;
    }
    return 4;
  }

  public setMusicTheme(theme: MusicTheme) {
    if (theme === this.musicTheme) return;
    try {
      if (theme === 'off') {
        this.stopMusic();
        return;
      }
      this.init();
      if (!this.ctx || !this.masterGain) return;
      if (!this.musicGain) {
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);
      }
      const now = this.ctx.currentTime;
      // chuyển cảnh mượt: giảm nhạc cũ rồi vào nhạc mới
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setTargetAtTime(0, now, 0.4);
      const token = ++this.musicToken;
      this.musicTheme = theme;
      this.musicBar = 0;
      if (this.musicTimer !== null) clearTimeout(this.musicTimer);
      const startNew = () => {
        if (token !== this.musicToken || !this.ctx || !this.musicGain) return;
        const t = this.ctx.currentTime;
        this.musicGain.gain.cancelScheduledValues(t);
        this.musicGain.gain.setTargetAtTime(0.9, t, 1.2);
        const loop = () => {
          if (token !== this.musicToken || !this.ctx) return;
          const when = this.ctx.currentTime + 0.1;
          const len = this.scheduleBar(theme, when, this.musicBar++);
          this.musicTimer = window.setTimeout(loop, Math.max(500, len * 1000 - 150));
        };
        loop();
      };
      this.musicTimer = window.setTimeout(startNew, 700);
    } catch {
      // ignore
    }
  }

  public stopMusic() {
    this.musicToken++;
    this.musicTheme = 'off';
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
  }

  // Tiếng động cơ nổ máy rồi chạy xa (xe máy / ô tô)
  public playEngine() {
    try {
      this.init();
      if (!this.ctx || !this.masterGain || this.muted) return;
      const now = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(38, now);
      o.frequency.linearRampToValueAtTime(70, now + 0.6);
      o.frequency.linearRampToValueAtTime(52, now + 1.6);
      o.frequency.exponentialRampToValueAtTime(30, now + 2.4);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(380, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.22, now + 0.15);
      g.gain.setValueAtTime(0.18, now + 1.6);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 2.4);
      o.connect(f);
      f.connect(g);
      g.connect(this.masterGain);
      o.start(now);
      o.stop(now + 2.5);
    } catch {
      // ignore
    }
  }

  // Tactical click
  public playClick() {
    try {
      this.init();
      if (!this.ctx || !this.masterGain || this.muted) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // ignore
    }
  }

  // Zombie growl procedural synthesis
  public playZombieGrowl() {
    try {
      this.init();
      if (!this.ctx || !this.masterGain || this.muted) return;
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(65, now);
      osc1.frequency.linearRampToValueAtTime(45, now + 0.7);
      osc2.frequency.setValueAtTime(70, now);
      osc2.frequency.linearRampToValueAtTime(40, now + 0.7);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, now);
      filter.frequency.linearRampToValueAtTime(140, now + 0.7);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.8);
      osc2.stop(now + 0.8);
    } catch {
      // ignore
    }
  }

  // Gunshot procedural synthesis
  public playGunshot() {
    try {
      this.init();
      if (!this.ctx || !this.masterGain || this.muted) return;
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.06));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

      const kick = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kick.type = 'triangle';
      kick.frequency.setValueAtTime(160, now);
      kick.frequency.exponentialRampToValueAtTime(30, now + 0.2);
      kickGain.gain.setValueAtTime(0.5, now);
      kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      kick.connect(kickGain);
      kickGain.connect(this.masterGain);

      noise.start(now);
      kick.start(now);
      kick.stop(now + 0.25);
    } catch {
      // ignore
    }
  }

  // Melee slash / swing sound
  public playSlash() {
    try {
      this.init();
      if (!this.ctx || !this.masterGain || this.muted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.16);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.linearRampToValueAtTime(200, now + 0.16);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // ignore
    }
  }

  // Loot pickup chime
  public playLoot() {
    try {
      this.init();
      if (!this.ctx || !this.masterGain || this.muted) return;
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, index) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.08);

        gain.gain.setValueAtTime(0.001, now + index * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + index * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + index * 0.08);
        osc.stop(now + index * 0.08 + 0.3);
      });
    } catch {
      // ignore
    }
  }

  // Emergency alarm siren
  public playAlarm() {
    try {
      this.init();
      if (!this.ctx || !this.masterGain || this.muted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(950, now + 0.25);
      osc.frequency.linearRampToValueAtTime(600, now + 0.5);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.75);
    } catch {
      // ignore
    }
  }

  // Distant thunder / explosion
  public playThunder() {
    try {
      this.init();
      if (!this.ctx || !this.masterGain || this.muted) return;
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.4));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, now);
      filter.frequency.linearRampToValueAtTime(70, now + 1.4);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 1.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(now);
    } catch {
      // ignore
    }
  }

  // Tense Heartbeat for Real-Time Quick-Time Events
  public startHeartbeat(bpm: number = 110) {
    this.stopHeartbeat();
    const intervalMs = (60 / bpm) * 1000;
    const playThump = () => {
      try {
        this.init();
        if (!this.ctx || !this.masterGain || this.muted) return;
        const now = this.ctx.currentTime;

        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(80, now);
        osc1.frequency.exponentialRampToValueAtTime(35, now + 0.12);
        gain1.gain.setValueAtTime(0.4, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc1.connect(gain1);
        gain1.connect(this.masterGain);
        osc1.start(now);
        osc1.stop(now + 0.15);

        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(95, now + 0.16);
        osc2.frequency.exponentialRampToValueAtTime(40, now + 0.28);
        gain2.gain.setValueAtTime(0.25, now + 0.16);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start(now + 0.16);
        osc2.stop(now + 0.32);
      } catch {
        // ignore
      }
    };

    playThump();
    this.heartbeatInterval = window.setInterval(playThump, intervalMs);
  }

  public stopHeartbeat() {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public playCue(cueName: string) {
    switch (cueName) {
      case 'zombie_growl':
        this.playZombieGrowl();
        break;
      case 'gunshot':
        this.playGunshot();
        break;
      case 'slash':
        this.playSlash();
        break;
      case 'alarm':
        this.playAlarm();
        break;
      case 'thunder':
        this.playThunder();
        break;
      case 'loot':
      case 'craft':
        this.playLoot();
        break;
      case 'radio':
        this.playRadioStatic();
        break;
      case 'stinger':
        this.playStinger();
        break;
      case 'heartbeat':
        this.startHeartbeat(125);
        setTimeout(() => this.stopHeartbeat(), 4000);
        break;
      default:
        this.playClick();
    }
  }
}

export const sound = new SoundEngine();
