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
}

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

  private init() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

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

      heatOsc.connect(heatGain);
      heatGain.connect(this.ambientGain);
      heatOsc.start(now);

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
      };

      this.ambientRunning = true;
      this.scheduleNextDistantWail();
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
      delayMs = immediate ? 1500 : 7000 + Math.random() * 8000; // 7-15s
    } else if (this.currentDangerLevel === 3) {
      delayMs = 12000 + Math.random() * 10000; // 12-22s
    } else {
      delayMs = 20000 + Math.random() * 15000; // 20-35s
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
