function allPages() {
  return getSamplePages().concat(Storage.getPages());
}

function pageCardHtml(page) {
  const hasGuide = !!(page.guide && page.guide.steps && page.guide.steps.length);
  const badges = [];
  if (page.builtin) badges.push('<span class="badge">Sample</span>');
  else badges.push('<span class="badge">Yours</span>');
  if (hasGuide) badges.push('<span class="badge guided">Guide ready</span>');

  const actions = [
    `<a class="btn btn-primary btn-sm" href="color.html?id=${encodeURIComponent(page.id)}&mode=free">Color</a>`
  ];
  if (hasGuide) {
    actions.push(`<a class="btn btn-accent btn-sm" href="color.html?id=${encodeURIComponent(page.id)}&mode=guided">Guided</a>`);
  }
  actions.push(`<a class="btn btn-ghost btn-sm" href="author.html?id=${encodeURIComponent(page.id)}">${hasGuide ? 'Edit guide' : 'Add guide'}</a>`);
  actions.push(`<button class="btn btn-ghost btn-sm" data-action="download-png" data-id="${page.id}">💾 PNG</button>`);
  if (!page.builtin) {
    actions.push(`<button class="btn btn-ghost btn-sm" data-action="duplicate" data-id="${page.id}">Duplicate</button>`);
    actions.push(`<button class="btn btn-ghost btn-sm" data-action="export" data-id="${page.id}">Export JSON</button>`);
    actions.push(`<button class="btn btn-ghost btn-sm" data-action="delete" data-id="${page.id}">Delete</button>`);
  }

  return `
  <div class="page-card">
    <div class="thumb"><img src="${page.image}" alt="${escapeHtml(page.name)}"></div>
    <div class="info">
      <div class="name">${escapeHtml(page.name)}</div>
      <div class="badge-row">${badges.join('')}</div>
      <div class="actions">${actions.join('')}</div>
    </div>
  </div>`;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s || '';
  return div.innerHTML;
}

function renderGallery() {
  const grid = document.getElementById('pageGrid');
  const pages = allPages();
  if (!pages.length) {
    grid.innerHTML = '<p class="empty-state">No pages yet — draw, upload, or generate one above!</p>';
    return;
  }
  grid.innerHTML = pages.map(pageCardHtml).join('');
}

function downloadJson(filename, content) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(filename, dataUrl) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'delete') {
    if (confirm('Delete this coloring page? This cannot be undone.')) {
      Storage.deletePage(id);
      renderGallery();
    }
  } else if (action === 'duplicate') {
    const page = Storage.getPage(id);
    if (page) {
      Storage.addPage(Object.assign({}, page, { id: uid(), name: page.name + ' (copy)', createdAt: Date.now() }));
      renderGallery();
    }
  } else if (action === 'export') {
    const json = Storage.exportPage(id);
    const page = Storage.getPage(id);
    if (json) downloadJson((page.name || 'coloring-page') + '.json', json);
  } else if (action === 'download-png') {
    const page = allPages().find(p => p.id === id);
    if (page) downloadDataUrl((page.name || 'coloring-page') + '.png', page.image);
  }
});

document.getElementById('exportAllBtn').addEventListener('click', () => {
  downloadJson('coloring-pages.json', Storage.exportAll());
});

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const count = Storage.importPages(text);
    alert(`Imported ${count} page(s).`);
    renderGallery();
  } catch (err) {
    alert('Could not import that file: ' + err.message);
  }
  e.target.value = '';
});

renderGallery();
