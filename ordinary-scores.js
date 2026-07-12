const scores = [
  [
    "Same Sky",
    "At a time of your choosing step outside.|Picture someone you love beneath the same sky.|Choose one point above you.|Remain with it for one minute.|Go back inside."
  ],
  [
    "Sky",
    "Look upward.|Wait for one cloud to disappear.|Look back down."
  ],
  [
    "Wind",
    "Face the wind.|Remain still until it changes.|Turn with it once."
  ],
  [
    "Rain",
    "If it begins to rain remain where you are until it stops."
  ],
  [
    "Evening",
    "Remain outdoors until the first star appears.|Then go home."
  ],
  [
    "Birdsong",
    "Wait until you hear a bird.|Point toward the sound.|Lower your hand before you find the bird."
  ],
  [
    "Pine",
    "Walk into the woods.|Choose one tree.|Stand beside it until it no longer feels alone.|Leave without looking back."
  ],
  [
    "Path",
    "Follow a path until you are no longer thinking about following it.|Stop.|Return by another route."
  ],
  [
    "Leaves",
    "Pick up one fallen leaf.|Carry it until another leaf attracts your attention.|Exchange them."
  ],
  [
    "Moss",
    "Find a patch of moss.|Touch it with the back of your hand.|Say nothing for one minute."
  ],
  [
    "Clearing",
    "Stand where the trees give way to the sky.|Close your eyes.|Turn once.|Open them."
  ],
  [
    "Practise",
    "Choose someone who is far away.|Picture their face in front of yours.|Close your eyes.|Kiss them once.|Open your eyes."
  ],
  [
    "Borrowed Shadow",
    "Stand near a wall.|Wait until someone else's shadow crosses it.|Step into the place where it was.|Remain there for one minute.|Leave without explanation."
  ],
  [
    "Window",
    "Open a window.|Listen until you notice a sound you had not heard before.|Close the window."
  ],
  [
    "Chair",
    "Move a chair one inch.|Sit in it.|Notice the room again."
  ],
  [
    "Balance",
    "Stand on one foot.|Wave to the nearest object.|Wait for it to wave back.|Only then put your foot down."
  ]
];

const grid = document.querySelector('.score-grid');

scores.forEach(([title, text]) => {
  const card = document.createElement('article');
  card.className = 'score-card';
  const heading = document.createElement('h2');
  heading.className = 'score-title';
  heading.textContent = title;
  const lines = document.createElement('p');
  lines.className = 'score-lines';
  text.split('|').forEach((line) => {
    const span = document.createElement('span');
    span.textContent = line;
    lines.appendChild(span);
  });
  card.append(heading, lines);
  grid.appendChild(card);
});
