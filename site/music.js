// Sound engine — the same audio as the reference site.
//
//   assets/audio/ambient.mp3      "Fhloston Paradise Arrival", Mixkit Stock Music Free License
//   assets/audio/sfx-*.mp3        Mixkit Sound Effects Free License
//
// Copied verbatim from the exact offline mirror (helloworld-rebuild/site/assets/audio/),
// so the intro, dialog buttons and the held update button sound exactly like the
// reference. Files are stock-licensed; check the Mixkit terms before publishing.
//
// Sound is ON by default, like the reference. Browsers only allow playback after a
// gesture, so the music actually starts on the first one — plugging the old PC into
// the internet (main.js). The header button turns it on/off and the choice is
// remembered on this device. Playback pauses while the tab is hidden.
//
// The rest of the engine calls window.hwMusic / hwSfx / hwRiser; those three hooks
// are the whole public surface of this module.

const btn = document.getElementById("snd");
if (btn) {
  const KEY = "rj-sound", VOL = 0.32;
  let off = false;
  try { off = localStorage.getItem(KEY) === "off"; } catch {}

  const audio = new Audio("assets/audio/ambient.mp3");
  audio.loop = true; audio.preload = "none"; audio.crossOrigin = "anonymous";
  let ctx = null, gain = null, on = false, want = false, primed = false, started = false;

  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {}   // iPhone: sound like a video, not muted by the silent switch

  // Web Audio gain: smooth fades everywhere (iPhone ignores audio.volume)
  const graph = () => {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC(); gain = ctx.createGain(); gain.gain.value = 0;
    ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination);
    if (!audio.paused) { gain.gain.value = VOL; audio.volume = 1; }   // already playing (autoplay allowed): keep the level
  };
  const fade = (to, sec) => {
    if (!gain) { audio.volume = to; return; }
    const t = ctx.currentTime; gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(to, t + sec);
  };
  const show = () => {
    btn.classList.toggle("on", on); btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", on ? "Turn the sound off" : "Turn the sound on");
  };
  const fadeIn = () => { on = true; started = true; show(); fade(VOL, 2.5); };
  const play = () => {
    if (started && !audio.paused) return;                           // really playing (not just the silent unlock)
    graph(); if (ctx && ctx.state === "suspended") ctx.resume();
    if (gain) audio.volume = 1;                                     // from here the gain node sets the level
    audio.play().then(fadeIn).catch(() => {});
  };
  const stop = () => {
    on = false; show(); fade(0, 0.6);
    setTimeout(() => { if (!on) audio.pause(); }, 650);
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (on) { stop(); off = true; } else { play(); off = false; }
    try { localStorage.setItem(KEY, off ? "off" : "on"); } catch {}
  });
  document.addEventListener("visibilitychange", () => {
    if (!on || !started) return;                                    // not started yet (before the PC is plugged in): stay quiet
    if (document.hidden) audio.pause(); else audio.play().catch(() => {});
  });

  // the entry screen's buttons (main.js)
  window.hwMusic = {
    play() { off = false; try { localStorage.setItem(KEY, "on"); } catch {} play(); },
    start() { if (!off) { want = true; play(); } },                  // plugging the PC in: on, unless the visitor muted it
    mute() { off = true; try { localStorage.setItem(KEY, "off"); } catch {} if (on) stop(); else { on = false; show(); } },
  };
  // the button reads "sound on" from the start (unless muted before); the music itself starts when the PC is connected
  on = !off; show();

  // interface sounds for the computer's buttons — on whenever the sound is on
  const SFX = ["click", "start", "next", "error", "done", "riser"], bufs = {};
  const load = (n) => fetch(`assets/audio/sfx-${n}.mp3`).then((r) => r.arrayBuffer()).then((a) => new Promise((ok) => ctx.decodeAudioData(a, ok, () => ok(null)))).then((b) => (bufs[n] = b));
  let loading = null;
  window.hwSfx = (name, vol = 0.3) => {                               // quieter than the music: a touch, not a bang
    if (off) return;
    graph(); if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    if (!loading) loading = Promise.all(SFX.map(load));
    const go = () => { const b = bufs[name]; if (!b) return; const src = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = vol; src.buffer = b; src.connect(g).connect(ctx.destination); src.start(); };
    bufs[name] ? go() : loading.then(go);
  };

  // the build-up while the update button is held: starts where the hold progress is,
  // fades out when the button is let go
  let rsrc = null, rgain = null;
  window.hwRiser = {
    start(frac = 0) {
      if (off) return; graph(); if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      if (!loading) loading = Promise.all(SFX.map(load));
      const go = () => {
        const b = bufs.riser; if (!b) return;
        this.stop(0.05);
        rsrc = ctx.createBufferSource(); rgain = ctx.createGain(); rsrc.buffer = b;
        rgain.gain.setValueAtTime(0, ctx.currentTime); rgain.gain.linearRampToValueAtTime(0.42, ctx.currentTime + 0.12);
        rsrc.connect(rgain).connect(ctx.destination); rsrc.start(0, Math.min(b.duration - 0.05, frac * b.duration));
      };
      bufs.riser ? go() : loading.then(go);
    },
    stop(sec = 0.35) {
      if (!rsrc) return;
      const s = rsrc, g = rgain, t = ctx.currentTime; rsrc = null;
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + sec);
      s.stop(t + sec + 0.02);
    },
  };

  // Phones (iPhone above all) allow sound only inside a touch / click — not in the middle of a drag, where the plug connects.
  // On every touch: wake the audio engine; if the music is wanted, start it now; else play it silently for a moment
  // (gain is 0) so the player is unlocked and can start later from anywhere.
  const unlock = () => {
    if (off) return;
    graph(); if (!ctx) return;
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    if (!loading) loading = Promise.all(SFX.map(load));
    if (want) { if (audio.paused) play(); }
    else if (!primed && audio.paused) { primed = true; audio.play().then(() => { if (want) { if (!started) fadeIn(); } else audio.pause(); }).catch(() => (primed = false)); }
  };
  ["touchstart", "pointerdown", "touchend", "pointerup", "click", "keydown"].forEach((t) => addEventListener(t, unlock, { capture: true, passive: true }));
  // decode them early (on the first gesture) so the first press sounds instantly
  addEventListener("pointerdown", () => { if (!off) { graph(); if (ctx && !loading) loading = Promise.all(SFX.map(load)); } }, { once: true, capture: true });
} else {
  // no sound button on this page (the /work/ sub-site): keep the hooks harmless
  const noop = () => {};
  window.hwMusic = { play: noop, start: noop, mute: noop };
  window.hwSfx = noop;
  window.hwRiser = { start: noop, stop: noop };
}
