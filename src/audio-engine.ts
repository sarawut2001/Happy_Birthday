import { cueSpec, soundAssets, type AudioOptions, type SoundCue } from './audio-cues';

type Voice = { name: string; source: AudioBufferSourceNode; gain: GainNode; pan: StereoPannerNode; ending: boolean };
type Mix = { quiet: boolean; ambience: boolean; video: boolean; reduced?: boolean };

/** One context, separate buses, and animation-owned cues. No delayed scene timers. */
export class StoryAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private musicGain?: GainNode;
  private effectsGain?: GainNode;
  private ambienceGain?: GainNode;
  private musicSource?: MediaElementAudioSourceNode;
  private compressor?: DynamicsCompressorNode;
  private music: HTMLAudioElement;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private decoded = new Map<string, AudioBuffer>();
  private voices = new Set<Voice>();
  private ambient?: Voice;
  private hold?: { oscillator: OscillatorNode; gain: GainNode };
  private seen = new Set<string>();
  private last = new Map<string, number>();
  private scope = '';
  private epoch = 0;
  private disposed = false;
  private mix: Mix = { quiet: false, ambience: false, video: false };
  enabled = false;
  private hidden = document.hidden;

  constructor(private base: string, music: string, private report: (message: string) => void) {
    this.music = new Audio(music); this.music.loop = true; this.music.preload = 'none';
  }
  private debug(event: string, name = '') {
    if (import.meta.env.DEV) window.dispatchEvent(new CustomEvent('hbd:audio-debug', { detail: {
      event, name, scope: this.scope, time: performance.now(), enabled: this.enabled,
      voices: this.voices.size, ambience: !!this.ambient, video: this.mix.video, hidden: this.hidden,
    } }));
  }
  private available() { return !this.disposed && this.enabled && !this.hidden && !this.mix.video && this.context?.state === 'running'; }
  private ramp(node: GainNode | undefined, value: number, seconds: number) {
    if (!node || !this.context || this.disposed) return;
    const now = this.context.currentTime;
    node.gain.cancelAndHoldAtTime(now);
    node.gain.linearRampToValueAtTime(value, now + seconds);
  }
  private init() {
    if (this.context) return;
    this.context = new AudioContext();
    const ctx = this.context;
    this.master = ctx.createGain(); this.master.gain.value = 0;
    this.musicGain = ctx.createGain(); this.musicGain.gain.value = 0;
    this.effectsGain = ctx.createGain(); this.effectsGain.gain.value = 1;
    this.ambienceGain = ctx.createGain(); this.ambienceGain.gain.value = 0;
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -12; this.compressor.ratio.value = 3;
    this.compressor.attack.value = .008; this.compressor.release.value = .2;
    for (const bus of [this.musicGain, this.effectsGain, this.ambienceGain]) bus.connect(this.compressor);
    this.compressor.connect(this.master); this.master.connect(ctx.destination);
    this.musicSource = ctx.createMediaElementSource(this.music); this.musicSource.connect(this.musicGain);
    for (const name of Object.keys(soundAssets) as (keyof typeof soundAssets)[]) void this.load(name).catch(() => {});
  }
  private load(name: keyof typeof soundAssets) {
    const existing = this.buffers.get(name); if (existing) return existing;
    const context = this.context!;
    const promise = fetch(this.base + soundAssets[name]).then(r => {
      if (!r.ok) throw Error('Sound unavailable: ' + name); return r.arrayBuffer();
    }).then(data => context.decodeAudioData(data)).then(buffer => {
      if (!this.disposed) this.decoded.set(name, buffer);
      return buffer;
    });
    this.buffers.set(name, promise);
    return promise;
  }
  private pulse(notes: number[], duration = .24) {
    const ctx = this.context!, seconds = duration * notes.length + .35;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate), data = buffer.getChannelData(0);
    for (let k = 0; k < notes.length; k++) {
      const offset = Math.floor(k * duration * .72 * ctx.sampleRate);
      for (let i = 0; i < Math.min(data.length - offset, ctx.sampleRate * (duration + .35)); i++) {
        const t = i / ctx.sampleRate, env = Math.min(t / .014, 1) * Math.exp(-t * 9);
        data[offset + i] += env * (.4 * Math.sin(Math.PI * 2 * notes[k] * t) + .08 * Math.sin(Math.PI * 4 * notes[k] * t));
      }
    }
    return buffer;
  }
  private musicLevel() {
    const cinematic = [...this.voices].some(v => !v.ending && cueSpec(v.name as SoundCue).duck);
    return this.mix.quiet ? .095 : cinematic ? .14 : .24;
  }
  private updateMix(seconds = 1.2) {
    this.ramp(this.musicGain, this.available() ? this.musicLevel() : 0, seconds);
    this.ramp(this.ambienceGain, this.available() && this.mix.ambience ? .075 : 0, seconds);
  }
  private stopVoice(voice: Voice, fade = .1) {
    if (voice.ending) return; voice.ending = true;
    this.ramp(voice.gain, 0, fade);
    try { voice.source.stop(this.context!.currentTime + fade + .02); } catch { /* Already ended. */ }
  }
  private start(buffer: AudioBuffer, name: string, volume: number, options: AudioOptions, duration?: number, loop = false) {
    const ctx = this.context!, source = ctx.createBufferSource(), gain = ctx.createGain(), pan = ctx.createStereoPanner();
    source.buffer = buffer; source.loop = loop;
    pan.pan.value = Math.max(-.45, Math.min(.45, options.pan ?? 0));
    source.connect(gain); gain.connect(pan); pan.connect(loop ? this.ambienceGain! : this.effectsGain!);
    const voice: Voice = { name, source, gain, pan, ending: false }, now = ctx.currentTime;
    if (options.panTo !== undefined) pan.pan.linearRampToValueAtTime(options.panTo, now + (duration ?? buffer.duration) * .65);
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(volume, now + (loop ? .5 : .035));
    if (!loop) {
      const length = duration ?? buffer.duration;
      source.playbackRate.value = Math.max(.65, Math.min(2, buffer.duration / length));
      const actual = buffer.duration / source.playbackRate.value;
      gain.gain.setValueAtTime(volume, now + Math.max(.036, actual - .16));
      gain.gain.linearRampToValueAtTime(0, now + actual);
      this.voices.add(voice);
    }
    source.onended = () => {
      this.voices.delete(voice); if (this.ambient === voice) this.ambient = undefined;
      source.disconnect(); gain.disconnect(); pan.disconnect(); this.updateMix(); this.debug('ended', name);
    };
    source.start(); this.debug('play', name); this.updateMix(.25);
    return voice;
  }
  private async ambientStart() {
    if (!this.available() || !this.mix.ambience || this.ambient) return;
    const epoch = this.epoch;
    try {
      const buffer = await this.load('cosmic');
      if (epoch !== this.epoch || !this.available() || !this.mix.ambience || this.ambient) return;
      this.ambient = this.start(buffer, 'cosmic', 1, {}, undefined, true);
      this.debug('ambience-start');
    } catch { if (!this.disposed) this.report('โหลดเสียงบรรยากาศไม่ได้ แต่ยังเล่นต่อได้'); }
  }
  private async resumeMusic() {
    if (!this.available()) return;
    try { await this.music.play(); if (this.available()) { this.updateMix(); this.report(''); } else this.music.pause(); }
    catch (e) { if (this.available() && !(e instanceof DOMException && e.name === 'AbortError')) this.report('เปิดเพลงไม่ได้ ลองแตะปุ่มเสียงอีกครั้งนะ'); }
  }
  async enable(value: boolean) {
    if (this.disposed) return;
    this.enabled = value;
    if (!value) { this.clear(); this.music.pause(); this.ramp(this.master, 0, .08); this.debug('muted'); return; }
    try {
      this.init(); await this.context!.resume();
      if (!this.enabled || this.disposed) return;
      this.ramp(this.master, 1, .45); void this.resumeMusic(); void this.ambientStart();
      this.debug('enabled'); this.play('welcome');
    } catch { this.enabled = false; this.report('เปิดเสียงไม่ได้ ลองแตะปุ่มเสียงอีกครั้งนะ'); }
  }
  setScope(scope: string) { if (this.scope !== scope) { this.scope = scope; this.seen.clear(); } }
  setMix(mix: Mix) {
    const videoChanged = this.mix.video !== mix.video;
    if (mix.reduced && !this.mix.reduced) {
      this.epoch++; this.stopCharge();
      for (const voice of this.voices) this.stopVoice(voice);
    }
    this.mix = mix;
    if (videoChanged && mix.video) { this.clear(); this.music.pause(); this.ramp(this.musicGain, 0, .05); this.debug('video-enter'); }
    if (!mix.ambience && this.ambient) { const voice = this.ambient; this.ambient = undefined; this.stopVoice(voice, .7); }
    this.updateMix();
    if (!mix.video) { if (videoChanged) void this.resumeMusic(); void this.ambientStart(); }
  }
  visibility(hidden: boolean) {
    this.hidden = hidden;
    if (hidden) { this.clear(); this.music.pause(); this.debug('hidden'); }
    else if (this.enabled && this.context) {
      void this.context.resume().then(() => { void this.resumeMusic(); void this.ambientStart(); }).catch(() => {});
      this.debug('visible');
    }
  }
  play(name: SoundCue, options: AudioOptions = {}) {
    if (!this.available()) return;
    const now = performance.now(), spec = cueSpec(name);
    if (options.once && this.seen.has(name) || now - (this.last.get(name) ?? -Infinity) < (spec.cooldown ?? .1) * 1000) return;
    if (options.once) this.seen.add(name);
    this.last.set(name, now);
    if (name.startsWith('rating-')) for (const v of this.voices) if (v.name.startsWith('rating-')) this.stopVoice(v);
    const epoch = this.epoch, scope = this.scope;
    const start = (buffer: AudioBuffer) => {
      if (!this.available() || epoch !== this.epoch || scope !== this.scope || performance.now() - now > 400) return;
      const live = [...this.voices].filter(v => !v.ending);
      if (live.length >= 3) this.stopVoice(live.find(v => !cueSpec(v.name as SoundCue).duck) ?? live[0]);
      this.start(buffer, name, spec.gain, options, this.mix.reduced && spec.duck ? undefined : spec.duration);
    };
    if (this.mix.reduced && spec.duck) start(this.pulse([523, 659], .12));
    else if (spec.asset) {
      const ready = this.decoded.get(spec.asset);
      // Cached input feedback must start in this event, before React navigates.
      if (ready) start(ready);
      else void this.load(spec.asset).then(start).catch(() => { if (!this.disposed) this.report('โหลดเสียงประกอบบางเสียงไม่ได้ แต่ยังเล่นต่อได้'); });
    }
    else start(this.pulse(spec.notes ?? [440], spec.duration));
  }
  charge(progress: number) {
    if (!this.available()) return;
    const ctx = this.context!;
    if (!this.hold) {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = 'sine'; gain.gain.value = 0;
      oscillator.connect(gain); gain.connect(this.effectsGain!); oscillator.start(); this.hold = { oscillator, gain }; this.debug('hold-start');
    }
    const p = Math.max(0, Math.min(1, progress));
    this.hold.oscillator.frequency.setTargetAtTime(260 + 180 * p, ctx.currentTime, .06);
    this.hold.gain.gain.setTargetAtTime(.015 + p * .035, ctx.currentTime, .04);
  }
  stopCharge() {
    if (!this.hold) return;
    const hold = this.hold; this.hold = undefined; this.ramp(hold.gain, 0, .08);
    hold.oscillator.onended = () => { hold.oscillator.disconnect(); hold.gain.disconnect(); };
    hold.oscillator.stop(this.context!.currentTime + .1); this.debug('hold-stop');
  }
  clear() {
    this.epoch++; this.seen.clear(); this.last.clear(); this.stopCharge();
    for (const voice of this.voices) this.stopVoice(voice);
    if (this.ambient) { const voice = this.ambient; this.ambient = undefined; this.stopVoice(voice); }
    this.debug('clear');
  }
  dispose() {
    this.clear(); this.disposed = true; this.enabled = false; this.music.pause(); this.music.removeAttribute('src'); this.music.load();
    this.musicSource?.disconnect(); this.compressor?.disconnect(); void this.context?.close(); this.buffers.clear(); this.decoded.clear();
  }
}
