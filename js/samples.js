// Built-in sample coloring pages. Each is drawn with plain Canvas 2D calls
// (no image assets needed) and ships with a ready-made Guide Mode sequence.
//
// Every shape is a fully closed outline (circle/ellipse via full 0..2PI arcs,
// or a closed polygon), and shapes are kept apart with a small gap so their
// interiors never overlap. Guide seed points are derived from the exact same
// variables used to draw each shape, so they can never drift out of sync
// with the artwork.

const SAMPLES_WIDTH = 900;
const SAMPLES_HEIGHT = 700;

function samplesLineStyle(ctx) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SAMPLES_WIDTH, SAMPLES_HEIGHT);
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

function norm(x, y) {
  return { x: x / SAMPLES_WIDTH, y: y / SAMPLES_HEIGHT };
}

function buildFlower() {
  const w = SAMPLES_WIDTH, h = SAMPLES_HEIGHT;
  const cx = 450, cy = 280;
  const centerR = 55;
  const petalR = 60;
  const petalDist = 135;
  const petalCount = 6;
  const petalAngles = [];
  for (let i = 0; i < petalCount; i++) petalAngles.push((Math.PI * 2 / petalCount) * i);

  const stem = { x1: 435, y1: 345, x2: 465, y2: 590 };
  const leafLeft = { cx: 370, cy: 470, rx: 55, ry: 28, rot: -0.5 };
  const leafRight = { cx: 535, cy: 510, rx: 55, ry: 28, rot: 0.5 };

  function draw(ctx) {
    samplesLineStyle(ctx);

    petalAngles.forEach(angle => {
      const px = cx + Math.cos(angle) * petalDist;
      const py = cy + Math.sin(angle) * petalDist;
      ctx.beginPath();
      ctx.arc(px, py, petalR, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeRect(stem.x1, stem.y1, stem.x2 - stem.x1, stem.y2 - stem.y1);

    ctx.beginPath();
    ctx.ellipse(leafLeft.cx, leafLeft.cy, leafLeft.rx, leafLeft.ry, leafLeft.rot, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(leafRight.cx, leafRight.cy, leafRight.rx, leafRight.ry, leafRight.rot, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(60, 660);
    ctx.lineTo(840, 660);
    ctx.stroke();
  }

  const petalColors = ['#e63946', '#f4a261', '#ffe066', '#52b788', '#4895ef', '#b388eb'];
  const steps = [
    Object.assign(norm(cx, cy), { color: '#8a5a2b', label: 'Center' })
  ];
  petalAngles.forEach((angle, i) => {
    const px = cx + Math.cos(angle) * petalDist;
    const py = cy + Math.sin(angle) * petalDist;
    steps.push(Object.assign(norm(px, py), { color: petalColors[i], label: 'Petal ' + (i + 1) }));
  });
  steps.push(Object.assign(norm((stem.x1 + stem.x2) / 2, (stem.y1 + stem.y2) / 2), { color: '#2d6a4f', label: 'Stem' }));
  steps.push(Object.assign(norm(leafLeft.cx, leafLeft.cy), { color: '#40916c', label: 'Leaf' }));
  steps.push(Object.assign(norm(leafRight.cx, leafRight.cy), { color: '#40916c', label: 'Leaf' }));

  return {
    id: 'sample_flower',
    name: 'Sunny Flower',
    builtin: true,
    draw,
    guide: { steps }
  };
}

function buildFish() {
  const body = { cx: 420, cy: 350, rx: 220, ry: 140 };
  const tail = { p1: [170, 350], p2: [60, 270], p3: [60, 430] };
  const topFin = { cx: 420, cy: 160, rx: 70, ry: 35 };
  const bottomFin = { cx: 420, cy: 540, rx: 70, ry: 35 };
  const eye = { cx: 540, cy: 310, r: 25 };
  const bodySeed = { x: 420, y: 350 };

  function draw(ctx) {
    samplesLineStyle(ctx);

    ctx.beginPath();
    ctx.ellipse(body.cx, body.cy, body.rx, body.ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tail.p1[0], tail.p1[1]);
    ctx.lineTo(tail.p2[0], tail.p2[1]);
    ctx.lineTo(tail.p3[0], tail.p3[1]);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(topFin.cx, topFin.cy, topFin.rx, topFin.ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(bottomFin.cx, bottomFin.cy, bottomFin.rx, bottomFin.ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(eye.cx, eye.cy, eye.r, 0, Math.PI * 2);
    ctx.stroke();

    // bubbles (decorative, part of the background region)
    [[720, 160, 14], [770, 220, 9], [740, 100, 7]].forEach(([bx, by, br]) => {
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  const tailCentroid = [
    (tail.p1[0] + tail.p2[0] + tail.p3[0]) / 3,
    (tail.p1[1] + tail.p2[1] + tail.p3[1]) / 3
  ];

  const steps = [
    Object.assign(norm(bodySeed.x, bodySeed.y), { color: '#f4a261', label: 'Body' }),
    Object.assign(norm(tailCentroid[0], tailCentroid[1]), { color: '#4895ef', label: 'Tail' }),
    Object.assign(norm(topFin.cx, topFin.cy), { color: '#ffe066', label: 'Top fin' }),
    Object.assign(norm(bottomFin.cx, bottomFin.cy), { color: '#ffe066', label: 'Bottom fin' }),
    Object.assign(norm(eye.cx, eye.cy), { color: '#111111', label: 'Eye' })
  ];

  return {
    id: 'sample_fish',
    name: 'Happy Fish',
    builtin: true,
    draw,
    guide: { steps }
  };
}

function buildHouse() {
  const bodyRect = { x1: 300, y1: 300, x2: 600, y2: 560 };
  const roof = { apex: [450, 180], left: [270, 290], right: [630, 290] };
  const door = { x1: 420, y1: 425, x2: 480, y2: 555 };
  const win = { x1: 330, y1: 330, x2: 390, y2: 380 };
  const bodySeed = { x: 550, y: 450 };

  function draw(ctx) {
    samplesLineStyle(ctx);

    ctx.strokeRect(bodyRect.x1, bodyRect.y1, bodyRect.x2 - bodyRect.x1, bodyRect.y2 - bodyRect.y1);

    ctx.beginPath();
    ctx.moveTo(roof.apex[0], roof.apex[1]);
    ctx.lineTo(roof.left[0], roof.left[1]);
    ctx.lineTo(roof.right[0], roof.right[1]);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeRect(door.x1, door.y1, door.x2 - door.x1, door.y2 - door.y1);
    ctx.strokeRect(win.x1, win.y1, win.x2 - win.x1, win.y2 - win.y1);
    // window cross
    ctx.beginPath();
    ctx.moveTo((win.x1 + win.x2) / 2, win.y1);
    ctx.lineTo((win.x1 + win.x2) / 2, win.y2);
    ctx.moveTo(win.x1, (win.y1 + win.y2) / 2);
    ctx.lineTo(win.x2, (win.y1 + win.y2) / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(60, 660);
    ctx.lineTo(840, 660);
    ctx.stroke();
  }

  const roofCentroid = [
    (roof.apex[0] + roof.left[0] + roof.right[0]) / 3,
    (roof.apex[1] + roof.left[1] + roof.right[1]) / 3
  ];

  const steps = [
    Object.assign(norm(roofCentroid[0], roofCentroid[1]), { color: '#e63946', label: 'Roof' }),
    Object.assign(norm(bodySeed.x, bodySeed.y), { color: '#ffd166', label: 'Walls' }),
    Object.assign(norm((door.x1 + door.x2) / 2, (door.y1 + door.y2) / 2), { color: '#8a5a2b', label: 'Door' }),
    Object.assign(norm((win.x1 + win.x2) / 2, (win.y1 + win.y2) / 2), { color: '#4895ef', label: 'Window' })
  ];

  return {
    id: 'sample_house',
    name: 'Little House',
    builtin: true,
    draw,
    guide: { steps }
  };
}

const SAMPLE_DEFS = [buildFlower(), buildFish(), buildHouse()];

function renderSampleToDataUrl(sample) {
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLES_WIDTH;
  canvas.height = SAMPLES_HEIGHT;
  const ctx = canvas.getContext('2d');
  sample.draw(ctx);
  return canvas.toDataURL('image/png');
}

function getSamplePages() {
  return SAMPLE_DEFS.map(sample => ({
    id: sample.id,
    name: sample.name,
    builtin: true,
    image: renderSampleToDataUrl(sample),
    guide: sample.guide,
    width: SAMPLES_WIDTH,
    height: SAMPLES_HEIGHT
  }));
}
