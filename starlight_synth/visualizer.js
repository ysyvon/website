(() => {
  const body = document.body,
    stage = document.querySelector(".stage"),
    bassControl = document.querySelector("#bassStyle"),
    drumControl = document.querySelector("#drumKit");
  const nodes = [...document.querySelectorAll(".star")],
    starStates = nodes.map((node, i) => ({
      seed: Math.imul(i + 17, 2654435761) >>> 0,
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      clock: 8 + (i % 17) * 0.7,
      gone: false,
      size: parseFloat(node.style.getPropertyValue("--star-size")) || 1,
      birth: 1,
      birthDelay: 0,
    }));
  const layer = document.createElement("div");
  layer.className = "viz-layer";
  layer.innerHTML =
    Array.from(
      { length: 4 },
      (_, i) => `<i class="viz-cloud" data-cloud="${i}"></i>`,
    ).join("") +
    '<i class="viz-instrument viz-bass"></i><i class="viz-instrument viz-atmosphere"></i><i class="viz-instrument viz-percussion"></i>' +
    Array.from(
      { length: 28 },
      (_, i) => `<i class="viz-mote" data-mote="${i}"></i>`,
    ).join("");
  stage.prepend(layer);
  const clouds = [...layer.querySelectorAll(".viz-cloud")],
    instrumentFields = [...layer.querySelectorAll(".viz-instrument")],
    motes = [...layer.querySelectorAll(".viz-mote")];
  let data = new Uint8Array(128),
    previous = new Uint8Array(128),
    energy = 0,
    bass = 0,
    mids = 0,
    air = 0,
    flux = 0,
    activity = 0,
    fieldTime = 0,
    lifeTime = 0,
    lastMs = 0,
    mathKey = "",
    mathSeed = 1;
  function hashMath(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
  }
  function starRandom(state) {
    state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
    return state.seed / 4294967296;
  }
  body.dataset.theme = "dark";
  localStorage.setItem("starlight-theme", "dark");
  body.dataset.playing = "false";
  function frame(ms) {
    const active = window.ambientPlaying === true,
      dt = Math.min(0.05, (ms - lastMs) / 1000 || 0);
    lastMs = ms;
    activity += ((active ? 1 : 0.32) - activity) * (active ? 0.035 : 0.025);
    if (active) {
      fieldTime += dt * (0.16 + energy * 0.72 + mids * 0.42);
      lifeTime += dt;
    }
    const analyser = window.ambientAnalyser;
    if (active && analyser) {
      if (data.length !== analyser.frequencyBinCount) {
        data = new Uint8Array(analyser.frequencyBinCount);
        previous = new Uint8Array(data.length);
      }
      analyser.getByteFrequencyData(data);
      let all = 0,
        lo = 0,
        mid = 0,
        hi = 0,
        change = 0;
      for (let i = 0; i < data.length; i++) {
        all += data[i];
        if (i < 14) lo += data[i];
        else if (i < 48) mid += data[i];
        else hi += data[i];
        change += Math.max(0, data[i] - previous[i]);
        previous[i] = data[i];
      }
      energy = energy * 0.78 + (all / data.length / 255) * 0.22;
      bass = bass * 0.75 + (lo / 14 / 255) * 0.25;
      mids = mids * 0.8 + (mid / 34 / 255) * 0.2;
      air = air * 0.84 + (hi / (data.length - 48) / 255) * 0.16;
      flux = flux * 0.68 + (change / data.length / 80) * 0.32;
    } else {
      energy *= 0.9;
      bass *= 0.88;
      mids *= 0.9;
      air *= 0.92;
      flux *= 0.82;
    }
    const math = window.ambientMath || {},
      nextKey = `${math.mode || ""}|${math.seed || ""}|${math.detail || ""}`;
    if (nextKey !== mathKey) {
      mathKey = nextKey;
      mathSeed = hashMath(nextKey);
      if (active)
        starStates.forEach((state, i) => {
          if ((i + Math.floor(mathSeed * 1000)) % 3 === 0) {
            state.birth = 0;
            state.birthDelay = starRandom(state) * 6;
            state.gone = true;
          }
        });
    }
    const box = stage.getBoundingClientRect(),
      unit = Math.min(box.width, box.height),
      mode = body.dataset.ambient || "drone",
      t = fieldTime,
      A = activity * (7 + energy * 52 + mids * 24),
      driftX =
        activity * (Math.sin(t * 0.2) * unit * 0.038 + mids * unit * 0.045),
      driftY =
        activity * (Math.cos(t * 0.15) * unit * 0.032 + air * unit * 0.025);
    nodes.forEach((node, i) => {
      const state = starStates[i],
        instrumentBand = i % 3 === 0 ? bass : i % 3 === 1 ? mids : air,
        lifetimeSeed = (mathSeed + i * 0.61803398875) % 1;
      if (active && state.birth < 1) {
        if (state.birthDelay > 0) state.birthDelay -= dt;
        else
          state.birth = Math.min(
            1,
            state.birth + dt * (0.1 + lifetimeSeed * 0.08),
          );
      }
      const lifeSignal =
          0.62 * Math.sin(lifeTime * (0.22 + lifetimeSeed * 0.2) + i * 2.399) +
          0.28 * Math.sin(lifeTime * (0.075 + lifetimeSeed * 0.065) + i * 0.73),
        threshold = -0.52 + lifetimeSeed * 0.24,
        fadeBand = 0.34,
        lifeRaw = Math.max(
          0,
          Math.min(1, (lifeSignal - threshold + fadeBand) / (fadeBand * 2)),
        ),
        life = lifeRaw * lifeRaw * (3 - 2 * lifeRaw);
      state.clock -= dt * (0.38 + energy * 0.18 + instrumentBand * 0.18);
      if (active && state.clock <= 0) {
        let reach = unit * (0.012 + energy * 0.022 + instrumentBand * 0.035);
        state.tx = (starRandom(state) * 2 - 1) * reach;
        state.ty = (starRandom(state) * 2 - 1) * reach;
        state.clock = 8 + starRandom(state) * 18;
      }
      if (active && life < 0.012 && !state.gone) {
        node.style.left = 2 + starRandom(state) * 96 + "%";
        node.style.top = 2 + starRandom(state) * 96 + "%";
        state.x = state.y = state.tx = state.ty = 0;
        state.gone = true;
      } else if (life > 0.18) state.gone = false;
      const follow = dt * (0.055 + instrumentBand * 0.055);
      state.x += (state.tx - state.x) * follow;
      state.y += (state.ty - state.y) * follow;
      const microX =
          Math.sin(t * (0.055 + lifetimeSeed * 0.025) + i * 1.7) *
          unit *
          (0.0012 + instrumentBand * 0.002),
        microY =
          Math.cos(t * (0.047 + lifetimeSeed * 0.022) + i * 0.91) *
          unit *
          (0.0012 + instrumentBand * 0.002),
        depth = 0.5 + 0.5 * Math.sin(t * (0.05 + (i % 7) * 0.006) + i * 1.71),
        twinkle = Math.pow(
          Math.max(
            0,
            Math.sin(lifeTime * (0.72 + (i % 11) * 0.055) + i * 4.13),
          ),
          16,
        ),
        spark = Math.min(1, twinkle * (0.12 + air * 0.75) + flux * 0.06),
        instrumentScale =
          i % 3 === 0 ? bass * 0.8 : i % 3 === 1 ? mids * 0.7 : air * 0.45,
        sizeFlow =
          1 +
          activity *
            (depth * 0.28 + instrumentScale + energy * 0.12) *
            (state.size > 3 ? 0.5 : 1),
        baseVisibility = 0.2 + Math.min(0.22, state.size * 0.035),
        activeVisibility =
          life *
          state.birth *
          (0.18 + 0.44 * depth + 0.3 * instrumentBand + 0.18 * spark);
      node.style.transform = `translate3d(${state.x + microX}px,${state.y + microY}px,0) scale(${sizeFlow})`;
      node.style.opacity = active ? activeVisibility : baseVisibility;
    });
    clouds.forEach((cloud, i) => {
      let direction = i % 2 ? -1 : 1,
        a = t * (0.016 + i * 0.006) * direction + i * 1.71,
        r = unit * (0.1 + i * 0.04),
        audioReach = activity * (1 + bass * 0.35 + mids * 0.55 + air * 0.2),
        x =
          (Math.cos(a) + 0.35 * Math.sin(a * 0.47 + i)) * r * audioReach +
          driftX * (0.3 + i * 0.12),
        y =
          (Math.sin(a * 0.71) + 0.3 * Math.cos(a * 0.31 + i * 2)) *
            r *
            0.65 *
            audioReach +
          driftY * (0.35 + i * 0.09),
        s =
          1 +
          activity * (energy * 0.32 + mids * 0.18) +
          Math.sin(t * 0.09 + i) * 0.05,
        stretch = 1 + activity * Math.sin(a * 0.63 + i) * 0.08;
      cloud.style.transform = `translate3d(${x}px,${y}px,0) rotate(${a * 18}deg) scale(${s * stretch},${s / stretch})`;
      cloud.style.opacity =
        0.1 + activity * (0.12 + energy * 0.28 + mids * 0.13 + (i % 2) * 0.035);
    });
    const bassColors = {
        sub: "#4f8fc7",
        acid: "#8ecf72",
        pluck: "#c485df",
        fm: "#78c9d1",
      },
      drumColors = {
        soft: "#e5b7a7",
        punch: "#efb84f",
        glitch: "#d27ac8",
        space: "#88a6e8",
      };
    body.style.setProperty(
      "--bass-color",
      bassColors[bassControl?.value] || "#709bc8",
    );
    body.style.setProperty(
      "--drum-color",
      drumColors[drumControl?.value] || "#d5ae72",
    );
    instrumentFields.forEach((field, i) => {
      let band = i === 0 ? bass : i === 1 ? mids : air,
        a = t * (i === 0 ? 0.052 : i === 1 ? -0.038 : 0.07) + i * 2.15,
        reach = unit * (i === 0 ? 0.11 : i === 1 ? 0.17 : 0.2),
        x = Math.cos(a * 1.13) * reach * activity + driftX * (0.5 + i * 0.18),
        y =
          Math.sin(a * 0.79) * reach * 0.55 * activity +
          driftY * (0.45 + i * 0.2),
        pulse = 1 + activity * band * (i === 2 ? 0.55 : 0.62),
        stretch = 1 + activity * Math.sin(a * 0.7 + i) * 0.1;
      field.style.transform = `translate3d(${x}px,${y}px,0) rotate(${a * 22}deg) scale(${pulse * stretch},${pulse / stretch})`;
      field.style.opacity =
        activity *
        (i === 2 ? Math.min(0.18, 0.035 + air * 0.2) : 0.055 + band * 0.18);
    });
    motes.forEach((m, i) => {
      let bandIndex = i % 3,
        bandValue = bandIndex === 0 ? bass : bandIndex === 1 ? mids : air,
        ebb = 0.78 + 0.22 * Math.sin(t * 0.075 + i * 0.63),
        radiusX =
          unit * (0.08 + bandIndex * 0.115) * (1 + bandValue * 0.34) * ebb,
        radiusY =
          radiusX *
          (0.42 + bandIndex * 0.17) *
          (1 + Math.sin(t * 0.06 + i) * 0.08),
        a = t * (0.11 + bandIndex * 0.045) * (i % 2 ? -1 : 1) + i * 2.399963,
        x = box.width / 2 + driftX + Math.cos(a) * radiusX,
        y = box.height / 2 + driftY + Math.sin(a) * radiusY,
        depth = 0.5 + 0.5 * Math.cos(a + i * 0.31),
        size = 0.38 + activity * (0.42 + depth * 0.55 + bandValue * 0.65);
      m.style.transform = `translate3d(${x}px,${y}px,0) scale(${size})`;
      m.style.opacity =
        0.035 + activity * (0.18 + depth * 0.28 + bandValue * 0.22);
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
