const PALETTE = [
  '#e63946', '#ff8fa3', '#f4a261', '#ffb703', '#ffe066', '#a3de83',
  '#52b788', '#2d6a4f', '#4895ef', '#4361ee', '#3a86ff', '#7209b7',
  '#b388eb', '#f72585', '#ff70a6', '#8a5a2b', '#c8a165', '#6c584c',
  '#adb5bd', '#495057', '#111111', '#ffffff', '#00b4d8', '#06d6a0'
];

const TOLERANCE = 40;

const params = new URLSearchParams(window.location.search);
const pageId = params.get('id');
const mode = params.get('mode') === 'guided' ? 'guided' : 'free';

function findPage(id) {
  const sample = getSamplePages().find(p => p.id === id);
  if (sample) return sample;
  return Storage.getPage(id);
}

const page = findPage(pageId);
if (!page) {
  document.querySelector('main').innerHTML = '<p class="empty-state">That coloring page could not be found. <a href="index.html">Go back home</a>.</p>';
  throw new Error('page not found');
}

document.getElementById('pageTitle').textContent = page.name;

const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const undoStack = [];
let selectedColor = PALETTE[0];

const guideSteps = (mode === 'guided' && page.guide && page.guide.steps) ? page.guide.steps : null;
let currentStep = 0;
const completedSteps = [];

function loadBaseImage() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      resolve();
    };
    img.src = page.image;
  });
}

function buildPalette() {
  const wrap = document.getElementById('palette');
  wrap.innerHTML = PALETTE.map(c =>
    `<button class="swatch" style="background:${c}" data-color="${c}" title="${c}" aria-label="color ${c}"></button>`
  ).join('');
  selectColor(PALETTE[0]);
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.swatch');
    if (!btn) return;
    selectColor(btn.dataset.color);
  });
}

function selectColor(hex) {
  selectedColor = hex;
  document.querySelectorAll('.swatch').forEach(el => {
    el.classList.toggle('selected', el.dataset.color.toLowerCase() === hex.toLowerCase());
  });
  const custom = document.getElementById('customColor');
  if (custom) custom.value = hex;
}

document.getElementById('customColor').addEventListener('input', (e) => {
  selectColor(e.target.value);
});

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  let x = Math.floor((clientX - rect.left) * scaleX);
  let y = Math.floor((clientY - rect.top) * scaleY);
  x = Math.max(0, Math.min(canvas.width - 1, x));
  y = Math.max(0, Math.min(canvas.height - 1, y));
  return { x, y };
}

function pushUndo() {
  undoStack.push({
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
    step: currentStep
  });
  if (undoStack.length > 40) undoStack.shift();
}

function shakeCanvas() {
  const wrap = document.getElementById('canvasWrap');
  wrap.style.transition = 'transform 0.08s';
  wrap.style.transform = 'translateX(-6px)';
  setTimeout(() => { wrap.style.transform = 'translateX(6px)'; }, 80);
  setTimeout(() => { wrap.style.transform = 'translateX(0)'; }, 160);
}

function setHint(message, kind) {
  const el = document.getElementById('hintBanner');
  el.innerHTML = message ? `<div class="hint-banner">${message}</div>` : '';
}

function clearStepHintDot() {
  const dot = document.getElementById('stepHintDot');
  if (dot) dot.remove();
}

function showStepHintDot() {
  clearStepHintDot();
  if (!guideSteps || currentStep >= guideSteps.length) return;
  const step = guideSteps[currentStep];
  const wrap = document.getElementById('canvasWrap');
  const dot = document.createElement('div');
  dot.id = 'stepHintDot';
  dot.className = 'hint-dot';
  dot.style.left = (step.x * 100) + '%';
  dot.style.top = (step.y * 100) + '%';
  wrap.style.position = 'relative';
  wrap.appendChild(dot);
}

function pulseTargetSwatch() {
  document.querySelectorAll('.swatch').forEach(el => el.classList.remove('pulse'));
  if (!guideSteps || currentStep >= guideSteps.length) return;
  const targetColor = guideSteps[currentStep].color.toLowerCase();
  const match = Array.from(document.querySelectorAll('.swatch')).find(el => el.dataset.color.toLowerCase() === targetColor);
  if (match) match.classList.add('pulse');
  else {
    // target color isn't one of the fixed swatches; nudge the custom picker instead
    document.getElementById('customColor').value = guideSteps[currentStep].color;
  }
}

function renderProgress() {
  const row = document.getElementById('progressRow');
  if (!guideSteps) { row.innerHTML = ''; return; }
  row.innerHTML = guideSteps.map((s, i) => {
    let cls = 'progress-dot';
    if (i < currentStep) cls += ' done';
    else if (i === currentStep) cls += ' current';
    return `<span class="${cls}" title="${s.label || ''}"></span>`;
  }).join('');
}

function updateGuideUi() {
  renderProgress();
  showStepHintDot();
  pulseTargetSwatch();
  if (guideSteps && currentStep < guideSteps.length) {
    const label = guideSteps[currentStep].label ? ` (${guideSteps[currentStep].label})` : '';
    setHint(`👉 Color the highlighted spot${label} with the glowing color!`);
  } else if (guideSteps) {
    setHint('');
  }
}

function handleClick(e) {
  e.preventDefault();
  const { x, y } = canvasPoint(e);

  if (mode === 'guided' && guideSteps) {
    if (currentStep >= guideSteps.length) return;
    const step = guideSteps[currentStep];
    const seedX = Math.min(canvas.width - 1, Math.max(0, Math.round(step.x * canvas.width)));
    const seedY = Math.min(canvas.height - 1, Math.max(0, Math.round(step.y * canvas.height)));

    const inTargetRegion = FloodFill.sameRegion(ctx, canvas.width, canvas.height, seedX, seedY, x, y, TOLERANCE);
    if (!inTargetRegion) {
      shakeCanvas();
      setHint('Try the glowing spot! ✨');
      return;
    }
    if (selectedColor.toLowerCase() !== step.color.toLowerCase()) {
      shakeCanvas();
      setHint('So close! Pick the glowing color 🎨');
      return;
    }

    pushUndo();
    FloodFill.fill(ctx, canvas.width, canvas.height, seedX, seedY, FloodFill.hexToRgba(step.color), TOLERANCE);
    completedSteps.push(currentStep);
    currentStep++;
    if (currentStep >= guideSteps.length) {
      clearStepHintDot();
      renderProgress();
      setHint('');
      showCelebration();
    } else {
      updateGuideUi();
    }
  } else {
    pushUndo();
    FloodFill.fill(ctx, canvas.width, canvas.height, x, y, FloodFill.hexToRgba(selectedColor), TOLERANCE);
  }
}

canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchstart', handleClick, { passive: false });

document.getElementById('undoBtn').addEventListener('click', () => {
  if (!undoStack.length) return;
  const entry = undoStack.pop();
  ctx.putImageData(entry.imageData, 0, 0);
  if (guideSteps) {
    currentStep = entry.step;
    completedSteps.length = currentStep;
    updateGuideUi();
  }
});

document.getElementById('resetBtn').addEventListener('click', async () => {
  if (!confirm('Reset this page back to blank?')) return;
  undoStack.length = 0;
  currentStep = 0;
  completedSteps.length = 0;
  await loadBaseImage();
  if (guideSteps) updateGuideUi();
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = (page.name || 'coloring-page') + '.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
});

document.getElementById('celebrationClose').addEventListener('click', () => {
  document.getElementById('celebration').style.display = 'none';
});

function showCelebration() {
  document.getElementById('celebration').style.display = 'flex';
}

(async function init() {
  buildPalette();
  await loadBaseImage();
  if (guideSteps && guideSteps.length) {
    updateGuideUi();
  } else if (mode === 'guided') {
    setHint('This page doesn\'t have a guide yet. <a href="author.html?id=' + encodeURIComponent(page.id) + '">Add one</a>, or color free-style!');
  }
})();
