// Local persistence: coloring pages and provider settings live only in the
// visitor's browser (localStorage). Nothing is ever sent to a server we run.

const STORAGE_KEYS = {
  pages: 'cbook_pages_v1',
  settings: 'cbook_settings_v1'
};

const DEFAULT_SETTINGS = {
  provider: 'automatic1111',
  apiKey: '',
  model: '',
  baseUrl: 'http://127.0.0.1:7860'
};

function uid() {
  return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

const Storage = {
  getPages() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.pages);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to read saved pages', e);
      return [];
    }
  },

  savePages(pages) {
    localStorage.setItem(STORAGE_KEYS.pages, JSON.stringify(pages));
  },

  getPage(id) {
    return this.getPages().find(p => p.id === id) || null;
  },

  addPage(page) {
    const pages = this.getPages();
    pages.unshift(page);
    this.savePages(pages);
    return page;
  },

  updatePage(id, updates) {
    const pages = this.getPages();
    const idx = pages.findIndex(p => p.id === id);
    if (idx === -1) return null;
    pages[idx] = Object.assign({}, pages[idx], updates);
    this.savePages(pages);
    return pages[idx];
  },

  deletePage(id) {
    const pages = this.getPages().filter(p => p.id !== id);
    this.savePages(pages);
  },

  getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.settings);
      return raw ? Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw)) : Object.assign({}, DEFAULT_SETTINGS);
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  },

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  },

  exportPage(id) {
    const page = this.getPage(id);
    if (!page) return null;
    return JSON.stringify(page, null, 2);
  },

  exportAll() {
    return JSON.stringify(this.getPages(), null, 2);
  },

  importPages(json) {
    const parsed = JSON.parse(json);
    const incoming = Array.isArray(parsed) ? parsed : [parsed];
    const pages = this.getPages();
    let count = 0;
    incoming.forEach(p => {
      if (!p || !p.image) return;
      const page = Object.assign({}, p, { id: uid(), createdAt: Date.now() });
      pages.unshift(page);
      count++;
    });
    this.savePages(pages);
    return count;
  }
};
