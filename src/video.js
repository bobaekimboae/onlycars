import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  Quality,
} from "mediabunny";

const FORMAT_SIZE = {
  "9:16": [720, 1280],
  "1:1": [1080, 1080],
  "16:9": [1280, 720],
};

const TRACKS = {
  auto: { name: "자동 선택", progression: [60, 55, 57, 53], brightness: 0.75, pulse: 0.24 },
  jazz: { name: "그랜드 재즈 라운지", progression: [60, 64, 57, 53], brightness: 0.64, pulse: 0.16 },
  midnight: { name: "미드나잇 이그제큐티브", progression: [57, 53, 60, 55], brightness: 0.46, pulse: 0.12 },
  silver: { name: "실버 블러바드", progression: [62, 57, 59, 55], brightness: 0.82, pulse: 0.22 },
  velvet: { name: "벨벳 액셀러레이션", progression: [53, 60, 55, 57], brightness: 0.72, pulse: 0.3 },
};

function midiToHz(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function addTone(context, frequency, start, duration, volume, type, pan = 0) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const panner = context.createStereoPanner();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  panner.pan.value = pan;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(volume, start + Math.min(0.28, duration / 4));
  gain.gain.setValueAtTime(volume * 0.76, Math.max(start + 0.3, start + duration - 0.25));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(panner).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

async function createMusicBuffer(settings, duration) {
  const sampleRate = 44100;
  const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
  const selected = settings.musicTrack === "auto"
    ? TRACKS.auto
    : TRACKS[settings.musicTrack] || TRACKS.auto;
  const styleOffset = {
    luxury: 0,
    sporty: 2,
    urban: -2,
    classic: -5,
  }[settings.musicStyle] ?? 0;
  const chordDuration = 2;

  for (let beat = 0, start = 0; start < duration; beat += 1, start += chordDuration) {
    const root = selected.progression[beat % selected.progression.length] + styleOffset;
    const chord = [root, root + 4, root + 7, root + (selected.brightness > 0.7 ? 11 : 12)];
    const available = Math.min(chordDuration, duration - start);
    chord.forEach((note, index) => {
      const type = selected.brightness > 0.75 ? "triangle" : "sine";
      addTone(offline, midiToHz(note), start, available, 0.025 / (index + 1), type, (index - 1.5) * 0.18);
    });
    addTone(offline, midiToHz(root - 12), start, Math.min(0.72, available), 0.032, "sine", 0);
    const pluckEvery = selected.pulse > 0.25 ? 0.42 : 0.7;
    for (let pluck = 0, at = start + 0.16; at < start + available; pluck += 1, at += pluckEvery) {
      const note = chord[(pluck + beat) % 3] + 12;
      addTone(offline, midiToHz(note), at, Math.min(0.34, start + available - at), 0.018 * selected.brightness, "triangle", pluck % 2 ? 0.42 : -0.42);
    }
  }
  return offline.startRendering();
}

function loadImage(imageRecord) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(imageRecord.blob);
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`${imageRecord.name} 사진을 읽지 못했습니다.`));
    };
    image.src = url;
  });
}

function drawCover(context, image, width, height, zoom = 1) {
  const ratio = Math.max(width / image.width, height / image.height) * zoom;
  const drawWidth = image.width * ratio;
  const drawHeight = image.height * ratio;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function drawText(context, text, x, y, maxWidth, font, color = "#ffffff") {
  context.font = font;
  context.fillStyle = color;
  let value =