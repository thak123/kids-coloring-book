const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.lineJoin = 'round';
ctx.lineCap = 'round';

let tool = 'pen';
let brushSize = 6;
let drawing = false;
let lastX = 0, lastY = 0;
const undoStack = [];
const MAX_UNDO = 25;

function pushUndo() {
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (undoStack.length > MAX_UNDO) undoStack.shift();
}

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}

function strokeTo(x, y) {
  ctx.strokeStyle = tool === 'pen' ? '#111111' : '#ffffff';
  ctx.lineWidth = brushSize;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();
  lastX = x;
  lastY = y;
}

function startDraw(e) {
  e.preventDefault();
  pushUndo();
  drawing = true;
  const p = canvasPoint(e);
  lastX = p.x;
  lastY = p.y;
  // draw a dot for single clicks/taps
  ctx.fillStyle = tool === 'pen' ? '#111111' : '#ffffff';
  ctx.beginPath();
  ctx.arc(p.x, p.y, brushSize / 2, 0, Math.PI * 2);
  ctx.fill();
}

function moveDraw(e) {
  if (!drawing) return;
  e.preventDefault();
  const p = canvasPoint(e);
  strokeTo(p.x, p.y);
}

function endDraw() {
  drawing = false;
}

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', moveDraw);
window.addEventListener('mouseup', endDraw);
canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove', moveDraw, { passive: false });
canvas.addEventListener('touchend', endDraw);

document.getElementById('penTool').addEventListener('click', (e) => {
  tool = 'pen';
  document.getElementById('penTool').classList.add('btn-primary');
  document.getElementById('eraserTool').classList.remove('btn-primary');
});
document.getElementById('eraserTool').addEventListener('click', () => {
  tool = 'eraser';
  document.getElementById('eraserTool').classList.add('btn-primary');
  document.getElementById('penTool').classList.remove('btn-primary');
});
document.getElementById('penTool').classList.add('btn-primary');

document.getElementById('brushSize').addEventListener('input', (e) => {
  brushSize = parseInt(e.target.value, 10);
  document.getElementById('brushSizeLabel').textContent = brushSize;
});

document.getElementById('undoBtn').addEventListener('click', () => {
  if (!undoStack.length) return;
  const last = undoStack.pop();
  ctx.putImageData(last, 0, 0);
});

document.getElementById('clearBtn').addEventListener('click', () => {
  if (!confirm('Clear the whole page?')) return;
  pushUndo();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const name = document.getElementById('pageName').value.trim() || 'My Drawing';
  const page = {
    id: uid(),
    name,
    image: canvas.toDataURL('image/png'),
    guide: null,
    source: 'draw',
    createdAt: Date.now()
  };
  Storage.addPage(page);
  window.location.href = `color.html?id=${encodeURIComponent(page.id)}&mode=free`;
});
