const frames = [
  {
    speaker: "Sabine",
    line: "Good morning, Alexiou.",
    background: "./scene 1 assets/Sabine_Neutral_Holo.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Nikolai",
    line: "Director.",
    background: "./scene 1 assets/Niko_Speaking.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Sabine",
    line: "Your section logged a swell fifty-two minutes ago. Edge gradient — you were in range.",
    background: "./scene 1 assets/Sabine_Speaking_Holo.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Nikolai",
    line: "Yes. I felt it.",
    background: "./scene 1 assets/Niko_Neutral.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Sabine",
    line: "Then you should be ready to move. I want you at the perimeter within the hour. Standard sweep — anomalous individuals first, material second. Document everything.",
    background: "./scene 1 assets/Sabine_Firm_Holo.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Nikolai",
    line: "Understood. Any specific parameters for this one?",
    background: "./scene 1 assets/Niko_Thinking.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Sabine",
    line: "Nothing outside standard. Interior will have reset — assume your last map is void. Swell-displaced material won't hold stable, so keep the window tight.",
    background: "./scene 1 assets/Sabine_Neutral_Holo.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Nikolai",
    line: "How deep did it reach?",
    background: "./scene 1 assets/Niko_Speaking.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Sabine",
    line: "Mid-band. Your section took the gradient, not the centre. Expect displacement events at the edge. Watch for hush-lag — the clearing isn't uniform.",
    background: "./scene 1 assets/Sabine_Firm_Holo.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Nikolai",
    line: "I had it at just under three minutes from the bunker.",
    background: "./scene 1 assets/Niko_Thinking.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Sabine",
    line: "Instruments registered four at your position. Longer toward the interior.",
    background: "./scene 1 assets/Sabine_Speaking_Holo.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Nikolai",
    line: "That's longer than the last one.",
    background: "./scene 1 assets/Niko_Attentive_Concerned.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Sabine",
    line: "Yes. Which is why I want eyes on your edge before anything settles. This wasn't a shallow swell.",
    background: "./scene 1 assets/Sabine_Neutral_Holo.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Nikolai",
    line: "Understood.",
    background: "./scene 1 assets/Niko_Speaking.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Sabine",
    line: "Check in one hour after you leave. Every ninety minutes after that.",
    background: "./scene 1 assets/Sabine_Speaking_Holo.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Nikolai",
    line: "I will.",
    background: "./scene 1 assets/Niko_Speaking.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Sabine",
    line: "Alexiou. If you find a survivor — call it in before you touch anything. Not after.",
    background: "./scene 1 assets/Sabine_Firm_Holo.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Nikolai",
    line: "I know the protocol.",
    background: "./scene 1 assets/Niko_Thinking.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Sabine",
    line: "Good. I'll be on channel.",
    background: "./scene 1 assets/Sabine_Neutral_Holo.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Nikolai",
    line: "I'll be out within the half hour.",
    background: "./scene 1 assets/Niko_Speaking.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Sabine",
    line: "See that you are.",
    background: "./scene 1 assets/Sabine_Speaking_Holo.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Nikolai",
    line: "I'll check in on time as well.",
    background: "./scene 1 assets/Niko_Neutral.png",
    sprite: null,
    spriteClass: "hidden"
  },
  {
    speaker: "Sabine",
    line: "Good. Reisz out.",
    background: "./scene 1 assets/Sabine_Neutral_Holo.png",
    sprite: null,
    spriteClass: "hidden"
  }
];

const beginOverlay = document.getElementById("begin-overlay");
const beginButton = document.getElementById("begin-button");
const scene = document.getElementById("scene");
const sceneBackground = document.getElementById("scene-background");
const sceneSprite = document.getElementById("scene-sprite");
const dialogueSpeaker = document.getElementById("dialogue-speaker");
const dialogueLine = document.getElementById("dialogue-line");

let currentFrame = -1;
let started = false;
let typingTimer = null;
let isTyping = false;
let fullLineText = "";
const TYPE_MS = 18;

function clearTyping() {
  if (typingTimer) {
    window.clearTimeout(typingTimer);
    typingTimer = null;
  }
}

function finishTyping() {
  clearTyping();
  dialogueLine.textContent = fullLineText;
  isTyping = false;
  dialogueLine.classList.remove("typing");
}

function typeLine(text) {
  clearTyping();
  fullLineText = text;
  dialogueLine.textContent = "";
  isTyping = true;
  dialogueLine.classList.add("typing");
  let index = 0;

  function step() {
    index += 1;
    dialogueLine.textContent = text.slice(0, index);

    if (index >= text.length) {
      isTyping = false;
      typingTimer = null;
      dialogueLine.classList.remove("typing");
      return;
    }

    typingTimer = window.setTimeout(step, TYPE_MS);
  }

  step();
}

function renderFrame(index) {
  const frame = frames[index];
  sceneBackground.src = frame.background;
  sceneBackground.alt = `${frame.speaker} background`;
  sceneBackground.classList.toggle("sabine-frame", frame.speaker === "Sabine");
  dialogueSpeaker.textContent = frame.speaker;
  typeLine(frame.line);
  sceneSprite.removeAttribute("src");
  sceneSprite.alt = "";
  sceneSprite.className = "scene-sprite hidden";
}

function startScene() {
  started = true;
  currentFrame = 0;
  beginOverlay.classList.add("hidden");
  renderFrame(currentFrame);
}

function advanceFrame() {
  if (!started) {
    return;
  }

  if (isTyping) {
    finishTyping();
    return;
  }

  if (currentFrame < frames.length - 1) {
    currentFrame += 1;
    renderFrame(currentFrame);
    return;
  }

  started = false;
  currentFrame = -1;
  beginOverlay.classList.remove("hidden");
}

beginButton.addEventListener("click", (event) => {
  event.stopPropagation();
  startScene();
});

scene.addEventListener("click", advanceFrame);

document.addEventListener("keydown", (event) => {
  const inspectShortcut =
    event.key === "F12" ||
    ((event.ctrlKey || event.metaKey) && event.shiftKey && ["I", "J", "C"].includes(event.key.toUpperCase())) ||
    ((event.ctrlKey || event.metaKey) && event.key.toUpperCase() === "U");

  if (inspectShortcut) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (event.key !== " " && event.key !== "Enter") {
    return;
  }

  event.preventDefault();

  if (!started) {
    startScene();
    return;
  }

  advanceFrame();
});

document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

document.addEventListener("dragstart", (event) => {
  event.preventDefault();
});

document.addEventListener("selectstart", (event) => {
  event.preventDefault();
});
