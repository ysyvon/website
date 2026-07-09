(function () {
  function setupCanvas(canvas, cssSize) {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = cssSize * ratio;
    canvas.height = cssSize * ratio;
    canvas.style.width = cssSize + 'px';
    canvas.style.height = cssSize + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, cssSize, cssSize);
    ctx.strokeStyle = '#111111';
    ctx.fillStyle = '#111111';
    ctx.lineCap = 'round';
    return ctx;
  }

  function drawJitterCircle(ctx, x, y, radius, loops) {
    for (let loop = 0; loop < loops; loop += 1) {
      ctx.beginPath();
      for (let i = 0; i <= 96; i += 1) {
        const angle = (Math.PI * 2 * i) / 96;
        const jitter = Math.sin(i * 1.7 + loop) * 2.2 + Math.cos(i * 0.9 + loop * 2) * 1.6;
        const px = x + Math.cos(angle) * (radius + jitter);
        const py = y + Math.sin(angle) * (radius + jitter);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawDot(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawOrbit() {
    const canvas = document.getElementById('orbit-mark');
    if (!canvas) return;
    const size = 318;
    const ctx = setupCanvas(canvas, size);
    const center = size / 2;

    drawJitterCircle(ctx, center, center, 58, 4);

    const dots = [
      [154, 26, 4], [210, 33, 2], [254, 68, 1.2], [282, 111, 2],
      [300, 163, 3.5], [282, 210, 2], [242, 247, 3], [194, 268, 3.5],
      [150, 290, 4], [112, 266, 3.2], [74, 234, 2.8], [50, 184, 3.2],
      [68, 132, 2], [52, 90, 3], [110, 84, 3.5], [100, 42, 4],
      [172, 93, 2.4], [213, 119, 2], [230, 181, 1.5], [206, 225, 2],
      [144, 237, 3], [104, 209, 2.5], [96, 157, 1.5], [124, 114, 2.2]
    ];

    dots.forEach(function (dot) {
      drawDot(ctx, dot[0], dot[1], dot[2]);
    });
  }

  function drawFooterMark() {
    const canvas = document.getElementById('footer-mark');
    if (!canvas) return;
    const size = 72;
    const ctx = setupCanvas(canvas, size);
    const center = size / 2;

    drawDot(ctx, center, center, 10);

    for (let i = 0; i < 18; i += 1) {
      const angle = (Math.PI * 2 * i) / 18;
      const inner = 14 + (i % 2) * 2;
      const outer = 24 + (i % 3) * 4;
      ctx.beginPath();
      ctx.lineWidth = i % 2 ? 2 : 1.5;
      ctx.moveTo(center + Math.cos(angle) * inner, center + Math.sin(angle) * inner);
      ctx.lineTo(center + Math.cos(angle) * outer, center + Math.sin(angle) * outer);
      ctx.stroke();
      if (i % 2 === 0) {
        drawDot(ctx, center + Math.cos(angle) * 31, center + Math.sin(angle) * 31, 2);
      }
    }
  }

  drawOrbit();
  drawFooterMark();
})();
