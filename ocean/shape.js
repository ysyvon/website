const canvas = document.getElementById("chaosCanvas");
const ctx = canvas.getContext("2d");

const TAU = Math.PI * 2;
const DIRAC_MASS = 0.74;
const DIRAC_K = 2.85;
const marineState = {
  loaded: false,
  source: "fallback",
  updated: "",
  apiUrl: "",
  audioSeed: 0.37,
  waveHeight: 1.1,
  wavePeriod: 7.5,
  seaLevel: 0,
  currentVelocity: 0.18,
  currentDirection: 90,
  seaSurfaceTemperature: 14,
};
const palettes = {
  light: {
    paper: "#eee5c7",
    black: "#1d1b18",
    ink: "#2b2922",
    ochre: "#d4aa2c",
    yellow: "#e6c75a",
    olive: "#8e9454",
    brick: "#9c2f1f",
    blueGray: "#677f7d",
    cream: "#dccda3",
    paperGrain: "rgba(29, 27, 24, 0.06)",
    lineSoft: "rgba(43, 41, 34, 0.15)",
    lineMedium: "rgba(43, 41, 34, 0.22)",
    lineStrong: "rgba(29, 27, 24, 0.78)",
    planeOchre: "rgba(212, 170, 44, 0.11)",
    planeOlive: "rgba(142, 148, 84, 0.1)",
    planeBlue: "rgba(103, 127, 125, 0.1)",
    brickLine: "rgba(156, 47, 31, 0.28)",
    blueLine: "rgba(103, 127, 125, 0.28)",
    pairBrick: "rgba(156, 47, 31, ",
    pairBlue: "rgba(103, 127, 125, ",
    nodeStroke: "rgba(29, 27, 24, 0.46)",
    particleStroke: "rgba(43, 41, 34, 0.34)",
    pairStroke: "rgba(29, 27, 24, 0.68)",
    centerFill: "rgba(238, 229, 199, 0.36)",
    centerStroke: "rgba(29, 27, 24, 0.34)",
    centerInner: "rgba(103, 127, 125, 0.24)",
  },
  dark: {
    paper: "#101313",
    black: "#eee5c7",
    ink: "#d8d0b9",
    ochre: "#cda94d",
    yellow: "#ead171",
    olive: "#a0a867",
    brick: "#c85842",
    blueGray: "#86a8a5",
    cream: "#d8cda8",
    paperGrain: "rgba(238, 229, 199, 0.045)",
    lineSoft: "rgba(238, 229, 199, 0.13)",
    lineMedium: "rgba(238, 229, 199, 0.2)",
    lineStrong: "rgba(238, 229, 199, 0.68)",
    planeOchre: "rgba(205, 169, 77, 0.09)",
    planeOlive: "rgba(160, 168, 103, 0.08)",
    planeBlue: "rgba(134, 168, 165, 0.09)",
    brickLine: "rgba(200, 88, 66, 0.32)",
    blueLine: "rgba(134, 168, 165, 0.32)",
    pairBrick: "rgba(200, 88, 66, ",
    pairBlue: "rgba(134, 168, 165, ",
    nodeStroke: "rgba(238, 229, 199, 0.42)",
    particleStroke: "rgba(238, 229, 199, 0.28)",
    pairStroke: "rgba(238, 229, 199, 0.56)",
    centerFill: "rgba(16, 19, 19, 0.5)",
    centerStroke: "rgba(238, 229, 199, 0.32)",
    centerInner: "rgba(134, 168, 165, 0.3)",
  },
};
let palette = palettes.light;
let width = 0;
let height = 0;
let dpr = 1;
let audioState = null;
let userThemeChoice = false;

function storedTheme() {
  try {
    return localStorage.getItem("ocean-theme");
  } catch {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem("ocean-theme", theme);
  } catch {
    // Private browsing or locked storage can fail; the visual theme still changes.
  }
}

function preferredTheme() {
  const saved = storedTheme();
  if (saved === "dark" || saved === "light") return saved;
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

function setTheme(theme, persist = false) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  palette = palettes[nextTheme];
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.backgroundColor = palette.paper;
  if (themeToggle) {
    themeToggle.textContent = nextTheme === "dark" ? "light" : "dark";
    themeToggle.setAttribute("aria-pressed", String(nextTheme === "dark"));
    themeToggle.title = `Switch to ${nextTheme === "dark" ? "light" : "dark"} mode`;
  }
  if (persist) {
    userThemeChoice = true;
    saveTheme(nextTheme);
  }
}

function diagramCenter() {
  return {
    x: width * 0.5,
    y: height * 0.51,
  };
}

function diagramScale() {
  const waveLift = clamp(marineState.waveHeight / 8, 0, 0.09);
  return Math.min(width, height) * ((width < 760 ? 0.32 : 0.36) + waveLift);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function numeric(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function dataSeed(data) {
  return hashString([
    data.time,
    data.updated,
    data.latitude,
    data.longitude,
    data.waveHeight,
    data.wavePeriod,
    data.seaLevel,
    data.currentVelocity,
    data.currentDirection,
  ].join("|"));
}

function applyMarineData(data) {
  Object.assign(marineState, data, {
    loaded: true,
    waveHeight: numeric(data.waveHeight, marineState.waveHeight),
    wavePeriod: numeric(data.wavePeriod, marineState.wavePeriod),
    seaLevel: numeric(data.seaLevel, marineState.seaLevel),
    seaSurfaceTemperature: numeric(data.seaSurfaceTemperature, marineState.seaSurfaceTemperature),
    currentVelocity: numeric(data.currentVelocity, marineState.currentVelocity),
    currentDirection: numeric(data.currentDirection, marineState.currentDirection),
  });
  marineState.audioSeed = dataSeed(marineState);
}

function closestHourlyIndex(times) {
  if (!Array.isArray(times) || times.length === 0) return 0;
  const now = Date.now();
  let bestIndex = 0;
  let bestDistance = Infinity;
  times.forEach((time, index) => {
    const distance = Math.abs(new Date(`${time}Z`).getTime() - now);
    if (distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  });
  return bestIndex;
}

function valueFromMarinePayload(payload, key) {
  if (payload.current && payload.current[key] !== undefined) return payload.current[key];
  if (!payload.hourly || !Array.isArray(payload.hourly[key])) return undefined;
  return payload.hourly[key][closestHourlyIndex(payload.hourly.time)];
}

function marineDataFromApiPayload(payload, apiUrl) {
  return {
    loaded: true,
    source: "Open-Meteo Marine API",
    apiUrl,
    updated: new Date().toISOString(),
    time: payload.current?.time || payload.hourly?.time?.[closestHourlyIndex(payload.hourly?.time)] || "",
    latitude: payload.latitude,
    longitude: payload.longitude,
    waveHeight: valueFromMarinePayload(payload, "wave_height"),
    wavePeriod: valueFromMarinePayload(payload, "wave_period"),
    seaLevel: valueFromMarinePayload(payload, "sea_level_height_msl"),
    seaSurfaceTemperature: valueFromMarinePayload(payload, "sea_surface_temperature"),
    currentVelocity: valueFromMarinePayload(payload, "ocean_current_velocity"),
    currentDirection: valueFromMarinePayload(payload, "ocean_current_direction"),
  };
}

async function refreshMarineDataFromApi(apiUrl) {
  if (!apiUrl) return;
  try {
    const response = await fetch(apiUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`live marine data ${response.status}`);
    const payload = await response.json();
    applyMarineData(marineDataFromApiPayload(payload, apiUrl));
  } catch (error) {
    console.info("Using saved marine data:", error.message);
  }
}

async function loadMarineData() {
  try {
    const response = await fetch(`marine-data.json?visit=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`marine data ${response.status}`);
    const data = await response.json();
    applyMarineData(data);
    await refreshMarineDataFromApi(data.apiUrl);
  } catch (error) {
    console.info("Using fallback marine values:", error.message);
  }
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function wrap(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function gaussianBump(x, sigma) {
  return Math.exp(-(x * x) / (2 * sigma * sigma));
}

function gaussianComb(theta, t) {
  const modes = [
    { count: 2, phase: t * 0.09, sigma: 0.18, weight: 0.22 },
    { count: 3, phase: -t * 0.07 + 0.4, sigma: 0.13, weight: 0.18 },
    { count: 5, phase: t * 0.045 + 0.9, sigma: 0.1, weight: 0.12 },
    { count: 8, phase: -t * 0.035, sigma: 0.075, weight: 0.08 },
  ];

  let sum = 0;
  let weight = 0;
  modes.forEach((mode) => {
    for (let i = 0; i < mode.count; i += 1) {
      const center = mode.phase + (i / mode.count) * TAU;
      sum += mode.weight * gaussianBump(wrap(theta - center), mode.sigma);
    }
    weight += mode.weight;
  });
  return sum / weight;
}

function spinorInspiredField(theta, t) {
  const oceanK = DIRAC_K + clamp(marineState.wavePeriod / 18, 0, 0.8);
  const oceanMass = DIRAC_MASS + clamp(Math.abs(marineState.seaLevel) * 0.35, 0, 0.5);
  const energy = Math.sqrt(oceanK * oceanK + oceanMass * oceanMass);
  const spinRatio = oceanK / (energy + oceanMass);
  const halfPhase = 0.5 * (theta - energy * t);
  const carrier = oceanK * Math.cos(theta) - energy * t;
  const upper = Math.cos(halfPhase) * (0.72 + 0.28 * Math.cos(carrier));
  const lower = spinRatio * Math.sin(halfPhase + carrier * 0.25) * (0.68 + 0.32 * Math.sin(theta + t * 0.17));
  return upper * upper + lower * lower;
}

function tidePhaseFromTime(t) {
  const semidiurnalPeriodSeconds = 12.42 * 60 * 60;
  return (t / semidiurnalPeriodSeconds) * TAU;
}

function diracRadius(theta, t, drift) {
  const comb = gaussianComb(theta, t);
  const componentField = spinorInspiredField(theta, t);
  const tidePhase = tidePhaseFromTime(t);
  const seaLevelAmplitude = 1 + clamp(Math.abs(marineState.seaLevel) * 0.18, 0, 0.22);
  const waveEnergy = clamp(marineState.waveHeight / 4, 0, 0.45);
  const interference = Math.cos(2 * theta - t * 0.18 + tidePhase) * Math.sin(DIRAC_K * Math.sin(theta) + t * 0.22);
  return 0.66 + seaLevelAmplitude * drift * ((0.34 + waveEnergy) * comb + 0.08 * componentField + 0.06 * interference);
}

function shapePoint(theta, t, scale, drift) {
  const r = diracRadius(theta, t, drift);
  const squeeze = 0.94 + 0.03 * Math.sin(t * 0.7);
  return {
    x: Math.cos(theta) * r * scale,
    y: Math.sin(theta) * r * scale * squeeze,
  };
}

function drawPaper(t) {
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.fillStyle = palette.paperGrain;
  for (let i = 0; i < 900; i += 1) {
    const x = (Math.sin(i * 91.7 + t) * 0.5 + 0.5) * width;
    const y = (Math.sin(i * 41.3 - t * 0.3) * 0.5 + 0.5) * height;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();

  drawPaletteGrid(t);
  drawCircleField(t);
}

function drawPaletteGrid(t) {
  const center = diagramCenter();
  const base = diagramScale();
  const colors = [palette.black, palette.ochre, palette.yellow, palette.olive, palette.brick, palette.blueGray, palette.cream];
  const cell = Math.max(10, Math.min(18, base * 0.04));
  const left = center.x - base * 0.58;
  const top = center.y - base * 0.62;

  ctx.save();
  ctx.globalAlpha = 0.16;
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const index = (row * 3 + col * 5) % colors.length;
      if ((row + col) % 3 === 0 || row === col) {
        ctx.fillStyle = colors[index];
        ctx.fillRect(left + col * cell, top + row * cell, cell * 0.82, cell * 0.82);
      }
    }
  }
  ctx.restore();
}

function drawCircleField(t) {
  const { x: cx, y: cy } = diagramCenter();
  const base = diagramScale();

  ctx.save();
  ctx.strokeStyle = palette.lineSoft;
  ctx.lineWidth = 1;

  const tideOffset = marineState.seaLevel * base * 0.04;
  for (let i = 0; i < 10; i += 1) {
    const radius = base * (0.16 + i * 0.085) + tideOffset + Math.sin(t * 0.18 + i) * 4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.stroke();
  }

  for (let i = 0; i < 28; i += 1) {
    const currentAngle = (marineState.currentDirection / 360) * TAU;
    const angle = (i / 28) * TAU + currentAngle * 0.08 + Math.sin(t * 0.12) * 0.05;
    const inner = base * 0.1;
    const outer = base * (0.96 + 0.04 * Math.sin(i));
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.stroke();
  }

  const fieldColors = [palette.ochre, palette.olive, palette.blueGray, palette.brick, palette.black];
  for (let i = 0; i < 26; i += 1) {
    const angle = i * 2.399963 + t * 0.04;
    const radius = base * (0.28 + 0.62 * ((Math.sin(i * 5.2) + 1) / 2));
    ctx.fillStyle = fieldColors[i % fieldColors.length];
    ctx.globalAlpha = 0.18 + 0.1 * ((Math.sin(i + t) + 1) / 2);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, 2.5 + 1.4 * Math.sin(i + t), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawShape(t) {
  const vertices = 42;
  const wavePulse = clamp(marineState.waveHeight / 4, 0, 0.3);
  const drift = 0.58 + wavePulse + 0.12 * Math.sin(t * 0.24);
  const scale = diagramScale() * 0.52;
  const { x: cx, y: cy } = diagramCenter();
  const points = [];

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.018);

  for (let i = 0; i < vertices; i += 1) {
    const theta = (i / vertices) * TAU;
    const point = shapePoint(theta, t, scale, drift);
    points.push(point);
  }

  drawDiracPlanes(points);
  drawDiracChords(points, t);
  drawDiracShell(points);
  drawDiracNodes(t, scale, drift);
  drawOrbitingParticles(t, scale);
  drawEntangledPairs(t, scale);
  drawStillCenterCircle(scale);
  ctx.restore();
}

function drawDiracPlanes(points) {
  ctx.save();
  const planeColors = [palette.planeOchre, palette.planeOlive, palette.planeBlue];
  ctx.strokeStyle = palette.lineSoft;
  ctx.lineWidth = 1;

  for (let offset = 0; offset < 3; offset += 1) {
    ctx.fillStyle = planeColors[offset];
    ctx.beginPath();
    for (let i = offset; i < points.length; i += 3) {
      const point = points[i];
      if (i === offset) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawDiracShell(points) {
  ctx.save();
  ctx.strokeStyle = palette.lineStrong;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.stroke();

  [0.72, 0.48].forEach((ratio, index) => {
    ctx.strokeStyle = index === 0 ? palette.brickLine : palette.blueLine;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x * ratio, point.y * ratio);
      else ctx.lineTo(point.x * ratio, point.y * ratio);
    });
    ctx.closePath();
    ctx.stroke();
  });
  ctx.restore();
}

function drawDiracChords(points, t) {
  ctx.save();
  ctx.strokeStyle = palette.lineMedium;
  ctx.lineWidth = 0.9;
  for (let i = 0; i < points.length; i += 1) {
    const jump = 5 + ((i + Math.floor(t * 0.6)) % 7);
    const a = points[i];
    const b = points[(i + jump) % points.length];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDiracNodes(t, scale, drift) {
  ctx.save();
  const nodeColors = [palette.cream, palette.yellow, palette.blueGray];
  ctx.strokeStyle = palette.nodeStroke;
  ctx.lineWidth = 1;
  const slowT = t * 0.32;
  for (let i = 0; i < 28; i += 1) {
    const theta = (i / 28) * TAU + slowT * 0.018;
    const density = spinorInspiredField(theta, slowT);
    const r = scale * (0.18 + 0.58 * (density % 1));
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r * 0.94;
    ctx.fillStyle = nodeColors[i % nodeColors.length];
    ctx.globalAlpha = 0.62;
    ctx.beginPath();
    ctx.arc(x, y, scale * (0.009 + 0.006 * drift * Math.sqrt(density)), 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawOrbitingParticles(t, scale) {
  ctx.save();
  const orbitColors = [palette.ochre, palette.olive, palette.brick, palette.blueGray];
  ctx.strokeStyle = palette.particleStroke;
  ctx.lineWidth = 1;

  for (let orbit = 0; orbit < 4; orbit += 1) {
    const radius = scale * (0.34 + orbit * 0.16);
    const speed = 0.13 + orbit * 0.045 + clamp(marineState.currentVelocity / 12, 0, 0.08);
    for (let i = 0; i < 5; i += 1) {
      const theta = t * speed + (i / 5) * TAU + orbit * 0.38;
      const x = Math.cos(theta) * radius;
      const y = Math.sin(theta) * radius * 0.94;
      const tx = Math.cos(theta + 0.08) * radius;
      const ty = Math.sin(theta + 0.08) * radius * 0.94;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.fillStyle = orbitColors[orbit % orbitColors.length];
      ctx.beginPath();
      ctx.arc(x, y, 2.2 + orbit * 0.45, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function bellCorrelation(a, b) {
  return -Math.cos(a - b);
}

function drawEntangledPairs(t, scale) {
  ctx.save();
  const pairCount = 7;
  const slowT = t * (0.11 + clamp(marineState.wavePeriod / 80, 0, 0.09));
  const currentAngle = (marineState.currentDirection / 360) * TAU;
  const currentGain = clamp(marineState.currentVelocity / 3, 0, 1);
  ctx.lineWidth = 0.9;

  for (let i = 0; i < pairCount; i += 1) {
    const axis = (i / pairCount) * TAU + currentAngle * 0.35 + slowT * (0.32 + i * 0.015);
    const analyzerA = axis + Math.sin(slowT + i) * 0.45;
    const analyzerB = axis + Math.PI + Math.cos(slowT * 0.8 + i) * 0.45;
    const correlation = bellCorrelation(analyzerA, analyzerB);
    const strength = clamp(Math.abs(correlation) * (0.72 + currentGain * 0.28), 0, 1);
    const radiusA = scale * (0.78 + 0.08 * Math.sin(i + slowT));
    const radiusB = scale * (1.08 + 0.09 * Math.cos(i * 1.3 - slowT));
    const ax = Math.cos(analyzerA) * radiusA;
    const ay = Math.sin(analyzerA) * radiusA * 0.94;
    const bx = Math.cos(analyzerB) * radiusB;
    const by = Math.sin(analyzerB) * radiusB * 0.94;

    ctx.strokeStyle = `${i % 2 === 0 ? palette.pairBrick : palette.pairBlue}${0.1 + strength * 0.22})`;
    ctx.setLineDash([2 + strength * 5, 8 - strength * 3]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = palette.cream;
    ctx.strokeStyle = palette.pairStroke;
    ctx.beginPath();
    ctx.arc(ax, ay, 3.6 + strength * 3.2, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = i % 2 === 0 ? palette.black : palette.brick;
    ctx.beginPath();
    ctx.arc(bx, by, 3.6 + strength * 2.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawStillCenterCircle(scale) {
  ctx.save();
  ctx.fillStyle = palette.centerFill;
  ctx.strokeStyle = palette.centerStroke;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, 0, scale * 0.105, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = palette.centerInner;
  ctx.beginPath();
  ctx.arc(0, 0, scale * 0.072, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function createAudioState() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;

  const context = new AudioContext();
  const master = context.createGain();
  const filter = context.createBiquadFilter();
  const shimmerFilter = context.createBiquadFilter();
  const delay = context.createDelay(4);
  const delayFeedback = context.createGain();
  const shimmerGain = context.createGain();
  const airFilter = context.createBiquadFilter();
  const airGain = context.createGain();
  const airSource = context.createBufferSource();
  const compressor = context.createDynamicsCompressor();
  const oscillators = [];
  const gains = [];
  const bellOscillators = [];
  const bellGains = [];
  const seed = marineState.audioSeed || 0.37;
  const harmonicJitter = (index, depth) => 1 + (hashString(`${seed}:${index}`) - 0.5) * depth;
  const ratios = [1, 1.25, 1.333, 1.498, 2.002, 2.667, 2.996, 4.01, 5.02].map((ratio, index) => ratio * harmonicJitter(index, 0.012));
  const waveforms = ["sine", "sine", "sine", "sine", "triangle", "sine", "triangle", "sine", "sine"];
  const bellRatios = [5.01, 6.01, 7.52, 8.98, 10.05, 12.04].map((ratio, index) => ratio * harmonicJitter(index + 20, 0.02));

  filter.type = "lowpass";
  filter.frequency.value = 920;
  filter.Q.value = 0.22;
  shimmerFilter.type = "highpass";
  shimmerFilter.frequency.value = 900;
  shimmerFilter.Q.value = 0.35;
  airFilter.type = "bandpass";
  airFilter.frequency.value = 1180;
  airFilter.Q.value = 0.75;
  delay.delayTime.value = 1.8;
  delayFeedback.gain.value = 0.28;
  shimmerGain.gain.value = 0.16;
  airGain.gain.value = 0;
  master.gain.value = 0;

  ratios.forEach((ratio, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = waveforms[index];
    oscillator.frequency.value = 54 * ratio;
    gain.gain.value = index === 0 ? 0.2 : 0.045;
    oscillator.connect(gain);
    gain.connect(filter);
    if (index > 2) gain.connect(shimmerFilter);
    oscillator.start();
    oscillators.push({ oscillator, ratio });
    gains.push(gain);
  });

  bellRatios.forEach((ratio, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 54 * ratio;
    gain.gain.value = 0;
    oscillator.connect(gain).connect(shimmerFilter);
    oscillator.start();
    bellOscillators.push({ oscillator, ratio });
    bellGains.push(gain);
  });

  const noiseLength = Math.floor(context.sampleRate * 2.4);
  const noiseBuffer = context.createBuffer(1, noiseLength, context.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  let breath = 0;
  for (let i = 0; i < noiseLength; i += 1) {
    const noise = hashString(`${seed}:air:${i}`) * 2 - 1;
    breath = breath * 0.985 + noise * 0.015;
    noiseData[i] = breath;
  }
  airSource.buffer = noiseBuffer;
  airSource.loop = true;
  airSource.connect(airFilter).connect(airGain).connect(delay);
  airSource.start();

  shimmerFilter.connect(delay);
  delay.connect(delayFeedback).connect(delay);
  delay.connect(shimmerGain);
  filter.connect(compressor);
  airGain.connect(compressor);
  shimmerGain.connect(compressor);
  compressor.connect(master).connect(context.destination);

  return {
    context,
    master,
    filter,
    shimmerFilter,
    delay,
    delayFeedback,
    shimmerGain,
    airFilter,
    airGain,
    airSource,
    oscillators,
    gains,
    bellOscillators,
    bellGains,
    muted: true,
    targetVolume: 0.28,
    started: false,
  };
}

function ensureAudio() {
  if (!audioState) audioState = createAudioState();
  if (!audioState) return null;
  if (audioState.context.state === "suspended") audioState.context.resume();
  audioState.started = true;
  return audioState;
}

function updateAudio(t) {
  if (!audioState || !audioState.started) return;

  const context = audioState.context;
  const now = context.currentTime;
  const wave = clamp(marineState.waveHeight / 4, 0, 1);
  const period = clamp(marineState.wavePeriod / 14, 0, 1);
  const sea = clamp((marineState.seaLevel + 1.5) / 3, 0, 1);
  const current = clamp(marineState.currentVelocity / 2, 0, 1);
  const seed = marineState.audioSeed || 0.37;
  const seedPhase = seed * TAU;
  const centerShift = (seed - 0.5) * 7 + Math.sin(seedPhase + sea * 2.2) * 2.5;
  const base = 36 + wave * 11 + sea * 5 + centerShift;
  const highBase = base * (1.92 + period * 0.38 + seed * 0.12);
  const drift = Math.sin(t * (0.003 + period * 0.005) + seedPhase) * (0.05 + current * 0.16);
  const targetMaster = audioState.muted ? 0 : audioState.targetVolume * 0.22;

  audioState.master.gain.setTargetAtTime(targetMaster, now, 1.4);
  audioState.filter.frequency.setTargetAtTime(540 + wave * 620 + current * 210 + seed * 120, now, 3.2);
  audioState.filter.Q.setTargetAtTime(0.16 + period * 0.18, now, 3.8);
  audioState.shimmerFilter.frequency.setTargetAtTime(820 + wave * 820 + sea * 300 + seed * 180, now, 4.2);
  audioState.airFilter.frequency.setTargetAtTime(780 + wave * 740 + current * 560 + seed * 420, now, 5.5);
  audioState.airFilter.Q.setTargetAtTime(0.55 + period * 0.7, now, 6);
  audioState.delay.delayTime.setTargetAtTime(1.15 + period * 1.25 + seed * 0.28, now, 5.2);
  audioState.delayFeedback.gain.setTargetAtTime(0.22 + wave * 0.12, now, 6);
  audioState.shimmerGain.gain.setTargetAtTime(0.07 + current * 0.08 + wave * 0.08, now, 4);
  audioState.airGain.gain.setTargetAtTime(0.004 + wave * 0.01 + current * 0.008, now, 7);

  audioState.oscillators.forEach(({ oscillator, ratio }, index) => {
    const phase = seedPhase * (index + 1) + index * 1.41;
    const slowBeat = Math.sin(t * (0.0022 + index * 0.0009 + seed * 0.001) + phase) * (0.01 + wave * 0.024);
    const tideBend = Math.sin(t * 0.0007 + phase * 0.5) * sea * 0.035;
    const frequency = (base + drift + slowBeat + tideBend) * ratio;
    oscillator.frequency.setTargetAtTime(frequency, now, 5 + index * 0.7);
  });

  audioState.gains.forEach((gain, index) => {
    const pulse = (Math.sin(t * (0.0035 + index * 0.00075 + seed * 0.0007) + index * 1.7 + seedPhase) + 1) * 0.5;
    const veil = Math.pow((Math.sin(t * 0.0018 + index * 2.3 + seedPhase * 0.7) + 1) * 0.5, 2);
    const root = index === 0 ? 0.14 : 0.02 + period * 0.009;
    const target = root * lerp(0.74, 1.08, pulse) * (index < 3 ? 1 : lerp(0.45, 1.15, veil));
    gain.gain.setTargetAtTime(target, now, 6.4);
  });

  audioState.bellOscillators.forEach(({ oscillator, ratio }, index) => {
    const phase = seedPhase + index * 0.83;
    const seaBend = Math.sin(t * (0.0012 + seed * 0.0008) + phase) * (0.03 + current * 0.045);
    const octaveFold = index > 3 ? 0.5 : 1;
    oscillator.frequency.setTargetAtTime(highBase * ratio * octaveFold + seaBend, now, 7 + index);
  });

  audioState.bellGains.forEach((gain, index) => {
    const bloom = Math.pow((Math.sin(t * (0.0015 + index * 0.00045 + seed * 0.0005) + index * 2.1 + seedPhase) + 1) * 0.5, 3.2);
    const target = (0.004 + wave * 0.009 + current * 0.006) * bloom;
    gain.gain.setTargetAtTime(target, now, 6.5 + index);
  });
}

function frame(now) {
  const t = now / 1000;
  drawPaper(t);
  drawShape(t);
  updateAudio(t);
  requestAnimationFrame(frame);
}

function start() {
  resize();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);

const themeToggle = document.getElementById("themeToggle");
const audioMute = document.getElementById("audioMute");
const audioVolume = document.getElementById("audioVolume");
const colorSchemeQuery = window.matchMedia?.("(prefers-color-scheme: dark)");

setTheme(preferredTheme());

colorSchemeQuery?.addEventListener("change", (event) => {
  if (!userThemeChoice && !storedTheme()) setTheme(event.matches ? "dark" : "light");
});

themeToggle?.addEventListener("click", () => {
  const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  setTheme(currentTheme === "dark" ? "light" : "dark", true);
});

audioMute?.addEventListener("click", () => {
  const state = ensureAudio();
  if (!state) return;
  state.muted = !state.muted;
  audioMute.textContent = state.muted ? "play sound" : "mute";
  audioMute.setAttribute("aria-pressed", String(state.muted));
});

audioVolume?.addEventListener("input", () => {
  const state = ensureAudio();
  if (!state) return;
  state.targetVolume = Number(audioVolume.value) / 100;
  if (state.muted && state.targetVolume > 0) {
    state.muted = false;
    audioMute.textContent = "mute";
    audioMute.setAttribute("aria-pressed", "false");
  }
});

loadMarineData().finally(start);
