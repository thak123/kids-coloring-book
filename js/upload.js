let sourceCanvas = null;
const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');

function renderPreview() {
  if (!sourceCanvas) return;
  const apply = document.getElementById('cleanupToggle').checked;
  const threshold = parseInt(document.getElementById('threshold').value, 10);
  previewCanvas.width = sourceCanvas.width;
  previewCanvas.height = sourceCanvas.height;
  if (apply) {
    const cleaned = ImagePrep.applyThreshold(sourceCanvas, threshold);
    previewCtx.drawImage(cleaned, 0, 0);
  } else {
    previewCtx.drawImage(sourceCanvas, 0, 0);
  }
}

document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const img = await ImagePrep.loadImageFile(file);
    sourceCanvas = ImagePrep.toCanvas(img, 1200);
    document.getElementById('previewSection').style.display = 'flex';
    document.getElementById('pageName').value = file.name.replace(/\.[^.]+$/, '');
    renderPreview();
  } catch (err) {
    alert('Could not load that image: ' + err.message);
  }
});

document.getElementById('threshold').addEventListener('input', (e) => {
  document.getElementById('thresholdLabel').textContent = e.target.value;
  renderPreview();
});
document.getElementById('cleanupToggle').addEventListener('change', renderPreview);

document.getElementById('saveBtn').addEventListener('click', () => {
  if (!sourceCanvas) return;
  const name = document.getElementById('pageName').value.trim() || 'My Picture';
  const page = {
    id: uid(),
    name,
    image: previewCanvas.toDataURL('image/png'),
    guide: null,
    source: 'upload',
    createdAt: Date.now()
  };
  Storage.addPage(page);
  window.location.href = `color.html?id=${encodeURIComponent(page.id)}&mode=free`;
});
