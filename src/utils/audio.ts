// Web Audio API Chess Piece Sound Synthesizer

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playSoftPulseSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Warm, rounded soft pulse / tap sound
    const osc = ctx.createOscillator();
    osc.type = "sine";
    // Pitch starts slightly higher and rapidly settles into a soft warm low pulse (e.g., 420Hz -> 180Hz)
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);

    // Low-pass filter to remove sharp edges and create a smooth felt-like tap
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.035);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.042);
  } catch (err) {
    console.warn("Soft pulse sound error:", err);
  }
}

export function playButtonClickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Subtle crisp transient click (highpass filtered noise, 8ms)
    const bufferSize = Math.floor(ctx.sampleRate * 0.008);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.setValueAtTime(2200, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // Soft warm body tick (sine pitch sweep 950Hz -> 350Hz, 15ms)
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.015);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.18, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    noise.start(now);
    osc.start(now);

    noise.stop(now + 0.009);
    osc.stop(now + 0.016);
  } catch (err) {
    console.warn("Button click sound error:", err);
  }
}

/**
 * Plays a bright chime/ding sound effect when connected piece chains disappear.
 */
export function playDingSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";

    // High fundamental + octave/fifth shimmer (C6 + C7)
    osc1.frequency.setValueAtTime(1046.50, now); // C6
    osc2.frequency.setValueAtTime(2093.00, now); // C7

    gain.gain.setValueAtTime(0, now);
    gain.gain.setValueAtTime(0.6, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.65);
    osc2.stop(now + 0.65);
  } catch (err) {
    console.warn("Ding sound error:", err);
  }
}

/**
 * Plays a funny high-pitched squeak sound for easter egg landings.
 */
function playSqueakSound(ctx: AudioContext, now: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  // Classic squeak chirp pitch contour
  osc.frequency.setValueAtTime(900, now);
  osc.frequency.exponentialRampToValueAtTime(2800, now + 0.04);
  osc.frequency.exponentialRampToValueAtTime(1400, now + 0.12);

  gain.gain.setValueAtTime(0, now);
  gain.gain.setValueAtTime(0.45, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.14);
}

/**
 * Plays a realistic synthesized chess piece landing sound.
 * @param pieceType The type of piece ('r', 'q', 'k', 'b', 'n', 'p', 'z')
 * @param isCapture Whether the move was a capture or swap
 */
export function playPieceSound(pieceType?: string, isCapture: boolean = false, isJumbo: boolean = false) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const type = (pieceType || "p").toLowerCase();
    const isRook = type === "r";

    // 1 in 30 chance squeak sound on landing
    if (Math.random() < (1 / 30)) {
      playSqueakSound(ctx, now);
    }

    // Master volume node
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.connect(ctx.destination);

    if (isJumbo) {
      // --- HEAVY JUMBO 2x2 PIECE LANDING SOUND ---
      // Thunderous heavy thud with deep sub-bass drop, heavy wood impact & ground rumble
      
      // 1. Heavy Impact Knock (Lowpass filtered noise burst)
      const bufferSize = Math.floor(ctx.sampleRate * 0.06);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.setValueAtTime(isCapture ? 650 : 450, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.9, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);

      // 2. Heavy Body Impact (Triangle pitch drop 160Hz -> 45Hz)
      const bodyOsc = ctx.createOscillator();
      bodyOsc.type = "triangle";
      bodyOsc.frequency.setValueAtTime(160, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(1.0, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(masterGain);

      // 3. Deep Sub-Bass Drop (Sine 120Hz -> 30Hz - Ultra heavy weighted thud)
      const subOsc = ctx.createOscillator();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(120, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(1.2, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      subOsc.connect(subGain);
      subGain.connect(masterGain);

      // 4. Ground Resonance Rumble (Sine 55Hz -> 20Hz)
      const rumbleOsc = ctx.createOscillator();
      rumbleOsc.type = "sine";
      rumbleOsc.frequency.setValueAtTime(55, now);
      rumbleOsc.frequency.exponentialRampToValueAtTime(20, now + 0.3);

      const rumbleGain = ctx.createGain();
      rumbleGain.gain.setValueAtTime(0.8, now);
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      rumbleOsc.connect(rumbleGain);
      rumbleGain.connect(masterGain);

      if (isCapture) {
        const capOsc = ctx.createOscillator();
        capOsc.type = "sawtooth";
        capOsc.frequency.setValueAtTime(220, now + 0.01);
        capOsc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

        const capGain = ctx.createGain();
        capGain.gain.setValueAtTime(0, now);
        capGain.gain.setValueAtTime(0.6, now + 0.01);
        capGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        capOsc.connect(capGain);
        capGain.connect(masterGain);
        capOsc.start(now + 0.01);
        capOsc.stop(now + 0.11);
      }

      masterGain.gain.setValueAtTime(0.95, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      noiseSource.start(now);
      bodyOsc.start(now);
      subOsc.start(now);
      rumbleOsc.start(now);

      noiseSource.stop(now + 0.06);
      bodyOsc.stop(now + 0.23);
      subOsc.stop(now + 0.36);
      rumbleOsc.stop(now + 0.39);

    } else if (isRook) {
      // --- HEAVY ROOK LANDING SOUND ---
      // Heavy wood/stone thud with deep sub-resonance and lower transient
      
      // 1. Heavy Impact Click (Noise transient filtered low for a solid dull knock)
      const bufferSize = Math.floor(ctx.sampleRate * 0.035); // 35ms noise burst
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.setValueAtTime(700, now); // Low cutoff for heavy thud

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.7, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);

      // 2. Low Frequency Wood Body Resonance
      const bodyOsc = ctx.createOscillator();
      bodyOsc.type = "triangle";
      bodyOsc.frequency.setValueAtTime(180, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.85, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(masterGain);

      // 3. Deep Sub-Thud Bass Oscillator (Gives Rook a heavy, weighted feel)
      const subOsc = ctx.createOscillator();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(90, now);
      subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.9, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      subOsc.connect(subGain);
      subGain.connect(masterGain);

      // Master gain envelope for Rook
      masterGain.gain.setValueAtTime(0.75, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      noiseSource.start(now);
      bodyOsc.start(now);
      subOsc.start(now);

      noiseSource.stop(now + 0.035);
      bodyOsc.stop(now + 0.15);
      subOsc.stop(now + 0.2);

    } else {
      // --- STANDARD CHESS PIECE LANDING SOUND ---
      // Tactile, crisp wooden tap/thud for Pawns, Knights, Bishops, Queens, Kings & Wizards
      
      // 1. Crisp Wood Tap Transient
      const bufferSize = Math.floor(ctx.sampleRate * 0.02); // 20ms noise burst
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(isCapture ? 2400 : 1800, now);
      noiseFilter.Q.setValueAtTime(1.5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);

      // 2. Wood Body Tone
      const bodyOsc = ctx.createOscillator();
      bodyOsc.type = "triangle";
      
      const startFreq = type === "q" || type === "k" ? 420 : type === "z" ? 480 : 380;
      const endFreq = type === "q" || type === "k" ? 220 : 190;
      
      bodyOsc.frequency.setValueAtTime(startFreq, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.025);

      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.55, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + (isCapture ? 0.09 : 0.075));

      bodyOsc.connect(bodyGain);
      bodyGain.connect(masterGain);

      // Extra secondary click if capture
      if (isCapture) {
        const capOsc = ctx.createOscillator();
        capOsc.type = "sine";
        capOsc.frequency.setValueAtTime(620, now + 0.008);
        capOsc.frequency.exponentialRampToValueAtTime(260, now + 0.035);

        const capGain = ctx.createGain();
        capGain.gain.setValueAtTime(0, now);
        capGain.gain.setValueAtTime(0.35, now + 0.008);
        capGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

        capOsc.connect(capGain);
        capGain.connect(masterGain);
        capOsc.start(now + 0.008);
        capOsc.stop(now + 0.05);
      }

      // Master volume envelope for standard piece
      masterGain.gain.setValueAtTime(0.55, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      noiseSource.start(now);
      bodyOsc.start(now);

      noiseSource.stop(now + 0.02);
      bodyOsc.stop(now + 0.1);
    }
  } catch (err) {
    console.warn("Audio play error:", err);
  }
}

export function playWhooshSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.18;

    // 1. Air velocity bandpass noise sweep
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.setValueAtTime(1.5, now);
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + duration * 0.45);
    filter.frequency.exponentialRampToValueAtTime(300, now + duration);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.4, now + duration * 0.35);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // 2. Pitch oscillator sweep (aerodynamic depth)
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + duration * 0.4);
    osc.frequency.exponentialRampToValueAtTime(160, now + duration);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(0.22, now + duration * 0.3);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    noise.start(now);
    osc.start(now);

    noise.stop(now + duration + 0.01);
    osc.stop(now + duration + 0.01);
  } catch (err) {
    console.warn("Whoosh sound error:", err);
  }
}

/**
 * Plays a wooden clack sound effect when an empty board is pressed or tapped.
 */
export function playWoodenClackSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Sharp wooden transient click (short bandpass noise burst)
    const bufferSize = Math.floor(ctx.sampleRate * 0.014);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(2600, now);
    noiseFilter.Q.setValueAtTime(2.2, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.75, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.014);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // 2. High wood block pitch transient (triangle, fast drop 1020Hz -> 440Hz)
    const osc1 = ctx.createOscillator();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(1020, now);
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.025);

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.8, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // 3. Hollow wooden board body resonance (sine pitch drop 380Hz -> 190Hz)
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(380, now);
    osc2.frequency.exponentialRampToValueAtTime(190, now + 0.045);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.65, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    noise.start(now);
    osc1.start(now);
    osc2.start(now);

    noise.stop(now + 0.015);
    osc1.stop(now + 0.038);
    osc2.stop(now + 0.058);
  } catch (err) {
    console.warn("Wooden clack sound error:", err);
  }
}
