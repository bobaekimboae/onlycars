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
  let value = String(text || "");
  while (value && context.measureText(value).width > maxWidth) value = `${value.slice(0, -2)}…`;
  context.fillText(value, x, y);
}

function renderFrame(context, images, project, width, height, seconds, totalSeconds, photoSeconds) {
  context.fillStyle = "#101114";
  context.fillRect(0, 0, width, height);

  const onEndCard = seconds >= photoSeconds;
  const section = onEndCard ? images.length - 1 : Math.min(images.length - 1, Math.floor(seconds / (photoSeconds / images.length)));
  const sceneDuration = photoSeconds / images.length;
  const scenePosition = onEndCard ? 1 : (seconds - section * sceneDuration) / sceneDuration;
  const motion = project.settings.motion || "smooth";
  const motionFactor = motion === "energetic" ? 0.12 : motion === "cinematic" ? 0.085 : 0.055;
  const zoom = 1.025 + scenePosition * motionFactor;
  drawCover(context, images[section].image, width, height, zoom);

  const gradient = context.createLinearGradient(0, height * 0.47, 0, height);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.38, "rgba(0,0,0,.3)");
  gradient.addColorStop(1, "rgba(0,0,0,.92)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const accent = project.settings.template === "luxury" ? "#bc2921" : project.settings.template === "dynamic" ? "#e52e25" : "#b92a23";
  const margin = width * 0.075;
  const bottom = height * 0.09;
  const vehicleTitle = `${project.vehicle.make} ${project.vehicle.model}`.trim();
  const vehicleMeta = [project.vehicle.year, project.vehicle.mileage && `${project.vehicle.mileage.toLocaleString("ko-KR")} km`, project.vehicle.internalId].filter(Boolean).join(" · ");
  const price = project.vehicle.price ? `${project.vehicle.price} ${project.vehicle.currency}` : "";
  const line = height * 0.055;

  if (project.settings.template === "clean") {
    context.fillStyle = "rgba(0,0,0,.58)";
    context.fillRect(0, height - height * 0.2, width, height * 0.2);
  }

  context.fillStyle = accent;
  context.fillRect(margin, height - bottom - line * 4.65, width * 0.09, line * 0.09);
  drawText(context, vehicleTitle || "차량 프로젝트", margin, height - bottom - line * 3.45, width - margin * 2, `700 ${Math.round(height * 0.046)}px Geist, Arial, sans-serif`);
  if (vehicleMeta) drawText(context, vehicleMeta, margin, height - bottom - line * 2.55, width - margin * 2, `500 ${Math.round(height * 0.023)}px Geist, Arial, sans-serif`, "rgba(255,255,255,.82)");
  if (price) drawText(context, price, margin, height - bottom - line * 1.4, width * 0.55, `700 ${Math.round(height * 0.039)}px Geist, Arial, sans-serif`);

  const cta = project.vehicle.callToAction;
  if (cta) {
    const pillWidth = Math.min(width * 0.44, context.measureText(cta).width + margin * 1.15);
    const pillHeight = line * 0.88;
    const x = width - margin - pillWidth;
    const y = height - bottom - line * 1.65;
    context.fillStyle = accent;
    context.beginPath();
    context.roundRect(x, y, pillWidth, pillHeight, 7);
    context.fill();
    context.textAlign = "center";
    drawText(context, cta, x + pillWidth / 2, y + pillHeight * 0.67, pillWidth - 10, `600 ${Math.round(height * 0.018)}px Geist, Arial, sans-serif`);
    context.textAlign = "left";
  }

  if (project.settings.template === "dynamic") {
    context.fillStyle = accent;
    context.fillRect(0, height - height * 0.012, width * (0.2 + 0.8 * (seconds / totalSeconds)), height * 0.012);
  }

  if (onEndCard) {
    context.fillStyle = "rgba(0,0,0,.2)";
    context.fillRect(0, 0, width, height * 0.18);
    drawText(context, "OnlyCars · 차량 숏폼", margin, height * 0.1, width - margin * 2, `600 ${Math.round(height * 0.022)}px Geist, Arial, sans-serif`, "rgba(255,255,255,.88)");
  }
}

export async function createProjectVideo(project, onProgress = () => {}) {
  if (!project.images?.length) throw new Error("영상에 넣을 사진이 없습니다.");
  if (typeof VideoEncoder === "undefined") throw new Error("이 브라우저에서는 MP4 인코딩을 지원하지 않습니다.");

  const format = project.settings.format || "9:16";
  const [width, height] = FORMAT_SIZE[format] || FORMAT_SIZE["9:16"];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  const loaded = [];
  try {
    for (const record of project.images) loaded.push(await loadImage(record));
    const seconds = Math.max(11, Math.min(31, project.images.length * 1.85 + 3));
    const photoSeconds = seconds - 2.6;
    const fps = 24;
    const frameCount = Math.ceil(seconds * fps);
    const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
    const videoSource = new CanvasSource(canvas, {
      codec: "avc",
      quality: new Quality("high"),
    });
    output.addVideoTrack(videoSource, { frameRate: fps });

    const musicEnabled = project.settings.musicStyle !== "none";
    let audioSource;
    let audioBuffer;
    if (musicEnabled) {
      audioBuffer = await createMusicBuffer(project.settings, seconds);
      audioSource = new AudioBufferSource({ codec: "aac", quality: new Quality("high") });
      output.addAudioTrack(audioSource);
    }

    await output.start();
    for (let frame = 0; frame < frameCount; frame += 1) {
      const timestamp = frame / fps;
      renderFrame(context, loaded, project, width, height, timestamp, seconds, photoSeconds);
      await videoSource.add(timestamp, 1 / fps);
      if (frame % 6 === 0) {
        onProgress(Math.min(94, Math.round((frame / frameCount) * 88) + 6));
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }
    videoSource.close();
    if (audioSource && audioBuffer) {
      await audioSource.add(audioBuffer);
      audioSource.close();
    }
    await output.finalize();
    onProgress(100);
    return new Blob([output.target.buffer], { type: "video/mp4" });
  } finally {
    loaded.forEach(({ url }) => URL.revokeObjectURL(url));
  }
}

export async function previewMusic(trackId, style = "luxury", duration = 6) {
  const settings = { musicTrack: trackId, musicStyle: style };
  const buffer = await createMusicBuffer(settings, duration);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextClass();
  await context.resume();
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start();
  return () => {
    try { source.stop(); } catch {}
    context.close();
  };
}

export const MUSIC_TRACKS = TRACKS;
