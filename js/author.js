const PALETTE = [
  '#e63946', '#ff8fa3', '#f4a261', '#ffb703', '#ffe066', '#a3de83',
  '#52b788', '#2d6a4f', '#4895ef', '#4361ee', '#3a86ff', '#7209b7',
  '#b388eb', '#f72585', '#ff70a6', '#8a5a2b', '#c8a165', '#6c584c',
  '#adb5bd', '#495057', '#111111', '#ffffff', '#00b4d8', '#06d6a0'
];

const params = new URLSearchParams(window.location.search);
const pageId = params.get('id');

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

document.getElementById('pageTitle').textContent = 'Guide Editor — ' + page.name;

const canvas = document.getElementById('authorCanvas');
const ctx = canvas.getContext('2d');
let selectedColor = PALETTE[0];
let steps = (page.guide && page.guide.steps) ? page.guide.steps.map(s => Object.assign({}, s)) : [];

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
    `<button class="swatch" style="background:${c}" data-color="${c}" title="${c}"></button>`
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
  document.querySelectorAll('#palette .swatch').forEach(el => {
    el.classList.toggle('selected', el.dataset.color.toLowerCase() === hex.toLowerCase());
  });
  document.getElementById('customColor').value = hex;
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

function renderMarkers() {
  document.querySelectorAll('.author-marker').forEach(el => el.remove());
  const wrap = document.getElementById('canvasWrap');
  wrap.style.position = 'relative';
  steps.forEach((step, i) => {
    const marker = document.createElement('div');
    marker.className = 'author-marker';
    marker.style.position = 'absolute';
    marker.style.left = (step.x * 100) + '%';
    marker.style.top = (step.y * 100) + '%';
    marker.style.transform = 'translate(-50%, -50%)';
    marker.style.width = '30px';
    marker.style.height = '30px';
    marker.style.borderRadius = '50%';
    marker.style.background = step.color;
    marker.style.border = '3px solid #fff';
    marker.style.boxShadow = '0 0 0 2px #2b2140';
    marker.style.display = 'flex';
    marker.style.alignItems = 'center';
    marker.style.justifyContent = 'center';
    marker.style.fontWeight = '800';
    marker.style.fontSize = '13px';
    marker.style.color = isLight(step.color) ? '#111' : '#fff';
    marker.style.pointerEvents = 'none';
    marker.textContent = i + 1;
    wrap.appendChild(marker);
  });
}

function isLight(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 180;
}

function renderStepList() {
  const list = document.getElementById('stepList');
  document.getElementById('emptyStepsMsg').style.display = steps.length ? 'none' : 'block';
  list.innerHTML = steps.map((step, i) => `
    <div class="step-item">
      <span class="step-num">${i + 1}</span>
      <span class="swatch-sm" style="background:${step.color}"></span>
      <input class="step-label" type="text" data-idx="${i}" value="${(step.label || '').replace(/"/g, '&quot;')}" placeholder="Step ${i + 1}" style="border:1px solid var(--border); border-radius:8px; padding:4px 8px; width:100%;">
      <button class="btn btn-ghost btn-sm" data-action="up" data-idx="${i}" title="Move up">⬆️</button>
      <button class="btn btn-ghost btn-sm" data-action="down" data-idx="${i}" title="Move down">⬇️</button>
      <button class="btn btn-ghost btn-sm" data-action="remove" data-idx="${i}" title="Remove">✖️</button>
    </div>
  `).join('');
  renderMarkers();
}

canvas.addEventListener('click', (e) => {
  const { x, y } = canvasPoint(e);
  steps.push({
    x: x / canvas.width,
    y: y / canvas.height,
    color: selectedColor,
    label: ''
  });
  renderStepList();
});

document.getElementById('stepList').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const idx = parseInt(btn.dataset.idx, 10);
  const action = btn.dataset.action;
  if (action === 'remove') {
    steps.splice(idx, 1);
  } else if (action === 'up' && idx > 0) {
    [steps[idx - 1], steps[idx]] = [steps[idx], steps[idx - 1]];
  } else if (action === 'down' && idx < steps.length - 1) {
    [steps[idx + 1], steps[idx]] = [steps[idx], steps[idx + 1]];
  }
  renderStepList();
});

document.getElementById('stepList').addEventListener('input', (e) => {
  const input = e.target.closest('.step-label');
  if (!input) return;
  const idx = parseInt(input.dataset.idx, 10);
  steps[idx].label = input.value;
});

document.getElementById('clearStepsBtn').addEventListener('click', () => {
  if (!steps.length) return;
  if (!confirm('Remove all steps?')) return;
  steps = [];
  renderStepList();
});

function setStatus(message, kind) {
  const el = document.getElementById('statusMsg');
  el.innerHTML = message ? `<div class="status-msg ${kind || 'info'}">${message}</div>` : '';
}

document.getElementById('saveGuideBtn').addEventListener('click', () => {
  if (!steps.length) {
    setStatus('Add at least one step first.', 'error');
    return;
  }
  const guide = { steps };
  let savedId = page.id;
  if (page.builtin) {
    const copy = {
      id: uid(),
      name: page.name + ' (custom guide)',
      image: page.image,
      guide,
      source: 'sample-copy',
      createdAt: Date.now()
    };
    Storage.addPage(copy);
    savedId = copy.id;
    setStatus('Saved as a new page (samples can\'t be edited directly) — "' + copy.name + '".', 'ok');
  } else {
    Storage.updatePage(page.id, { guide });
    setStatus('Guide saved!', 'ok');
  }
  const link = document.getElementById('tryGuideLink');
  link.href = `color.html?id=${encodeURIComponent(savedId)}&mode=guided`;
  link.style.display = 'inline-flex';
});

(async function init() {
  buildPalette();
  await loadBaseImage();
  renderStepList();
})();
