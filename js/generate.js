const PROVIDER_CONFIG = {
  automatic1111: {
    showBaseUrl: true,
    showApiKey: false,
    showModel: true,
    baseUrlPlaceholder: 'http://127.0.0.1:7860',
    baseUrlHint: 'Your local AUTOMATIC1111 Stable Diffusion WebUI, started with the --api flag. It must also allow this page\'s origin via --cors-allow-origins (or --cors-allow-origins=*).',
    modelPlaceholder: '(uses whatever checkpoint is loaded in the WebUI)'
  },
  openai: {
    showBaseUrl: false,
    showApiKey: true,
    showModel: true,
    modelPlaceholder: 'gpt-image-1'
  },
  gemini: {
    showBaseUrl: false,
    showApiKey: true,
    showModel: true,
    modelPlaceholder: 'gemini-2.5-flash-image'
  },
  'openai-compatible': {
    showBaseUrl: true,
    showApiKey: true,
    showModel: true,
    baseUrlPlaceholder: 'https://your-endpoint.example.com/v1',
    baseUrlHint: 'Any server that implements an OpenAI-style POST {baseUrl}/images/generations returning base64 images.',
    modelPlaceholder: 'model name required by your endpoint'
  }
};

function applyProviderUi(settings) {
  const cfg = PROVIDER_CONFIG[settings.provider] || PROVIDER_CONFIG.automatic1111;
  document.getElementById('baseUrlRow').style.display = cfg.showBaseUrl ? '' : 'none';
  document.getElementById('apiKeyRow').style.display = cfg.showApiKey ? '' : 'none';
  document.getElementById('modelRow').style.display = cfg.showModel ? '' : 'none';
  document.getElementById('baseUrl').placeholder = cfg.baseUrlPlaceholder || '';
  document.getElementById('baseUrlHint').textContent = cfg.baseUrlHint || '';
  document.getElementById('model').placeholder = cfg.modelPlaceholder || '';
}

function loadSettingsIntoForm() {
  const settings = Storage.getSettings();
  document.getElementById('provider').value = settings.provider;
  document.getElementById('baseUrl').value = settings.baseUrl || '';
  document.getElementById('apiKey').value = settings.apiKey || '';
  document.getElementById('model').value = settings.model || '';
  applyProviderUi(settings);
}

function readSettingsFromForm() {
  return {
    provider: document.getElementById('provider').value,
    baseUrl: document.getElementById('baseUrl').value.trim(),
    apiKey: document.getElementById('apiKey').value.trim(),
    model: document.getElementById('model').value.trim()
  };
}

document.getElementById('provider').addEventListener('change', () => {
  const settings = readSettingsFromForm();
  applyProviderUi(settings);
});

document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  Storage.saveSettings(readSettingsFromForm());
  const msg = document.getElementById('settingsSavedMsg');
  msg.textContent = 'Saved!';
  setTimeout(() => { msg.textContent = ''; }, 2000);
});

loadSettingsIntoForm();

const STYLE_SUFFIX = ', black and white coloring book page for kids, bold clean thick outlines, line art, no shading, no gradients, no color, no text, no watermark, simple flat white background, high contrast';
const NEGATIVE_PROMPT = 'color, colour, shading, grayscale gradient, photo, photorealistic, watermark, text, signature, blurry';

function setStatus(message, kind) {
  const el = document.getElementById('statusMsg');
  if (!message) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="status-msg ${kind || 'info'}">${message}</div>`;
}

async function extractErrorText(res) {
  try {
    const text = await res.text();
    return `HTTP ${res.status}: ${text.slice(0, 300)}`;
  } catch (e) {
    return `HTTP ${res.status}`;
  }
}

async function generateWithAutomatic1111(settings, prompt) {
  const base = (settings.baseUrl || 'http://127.0.0.1:7860').replace(/\/$/, '');
  const body = {
    prompt: prompt + STYLE_SUFFIX,
    negative_prompt: NEGATIVE_PROMPT,
    steps: 25,
    width: 768,
    height: 768,
    cfg_scale: 7
  };
  if (settings.model) body.override_settings = { sd_model_checkpoint: settings.model };

  let res;
  try {
    res = await fetch(base + '/sdapi/v1/txt2img', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (err) {
    throw new Error('Could not reach ' + base + '. Is AUTOMATIC1111 running with --api and CORS enabled for this page\'s origin?');
  }
  if (!res.ok) throw new Error(await extractErrorText(res));
  const json = await res.json();
  if (!json.images || !json.images[0]) throw new Error('No image returned by the server.');
  return 'data:image/png;base64,' + json.images[0];
}

async function generateWithOpenAiStyle(baseUrl, apiKey, model, prompt) {
  const url = baseUrl.replace(/\/$/, '') + '/images/generations';
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: model, prompt: prompt + STYLE_SUFFIX, size: '1024x1024' })
    });
  } catch (err) {
    throw new Error('Network/CORS error calling ' + url + '. This provider may block direct browser requests.');
  }
  if (!res.ok) throw new Error(await extractErrorText(res));
  const json = await res.json();
  const item = json.data && json.data[0];
  if (!item) throw new Error('No image returned.');
  if (item.b64_json) return 'data:image/png;base64,' + item.b64_json;
  if (item.url) return item.url;
  throw new Error('Unrecognized response shape from provider.');
}

async function generateWithGemini(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt + STYLE_SUFFIX }] }] })
    });
  } catch (err) {
    throw new Error('Network/CORS error calling Gemini.');
  }
  if (!res.ok) throw new Error(await extractErrorText(res));
  const json = await res.json();
  const parts = json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts;
  const imgPart = parts && parts.find(p => p.inlineData);
  if (!imgPart) throw new Error('No image returned. Check that the model name supports image generation.');
  return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
}

async function runGeneration(prompt) {
  const settings = readSettingsFromForm();
  Storage.saveSettings(settings);

  if (settings.provider === 'automatic1111') {
    return generateWithAutomatic1111(settings, prompt);
  }
  if (settings.provider === 'openai') {
    if (!settings.apiKey) throw new Error('Add your OpenAI API key in the settings panel above.');
    return generateWithOpenAiStyle('https://api.openai.com/v1', settings.apiKey, settings.model || 'gpt-image-1', prompt);
  }
  if (settings.provider === 'gemini') {
    if (!settings.apiKey) throw new Error('Add your Gemini API key in the settings panel above.');
    return generateWithGemini(settings.apiKey, settings.model || 'gemini-2.5-flash-image', prompt);
  }
  if (settings.provider === 'openai-compatible') {
    if (!settings.baseUrl) throw new Error('Add the base URL of your endpoint in the settings panel above.');
    return generateWithOpenAiStyle(settings.baseUrl, settings.apiKey, settings.model || '', prompt);
  }
  throw new Error('Unknown provider.');
}

let sourceCanvas = null;
const resultCanvas = document.getElementById('resultCanvas');
const resultCtx = resultCanvas.getContext('2d');

function renderCleanupPreview() {
  if (!sourceCanvas) return;
  const apply = document.getElementById('cleanupToggle').checked;
  const threshold = parseInt(document.getElementById('threshold').value, 10);
  resultCanvas.width = sourceCanvas.width;
  resultCanvas.height = sourceCanvas.height;
  if (apply) {
    const cleaned = ImagePrep.applyThreshold(sourceCanvas, threshold);
    resultCtx.drawImage(cleaned, 0, 0);
  } else {
    resultCtx.drawImage(sourceCanvas, 0, 0);
  }
}

document.getElementById('generateBtn').addEventListener('click', async () => {
  const prompt = document.getElementById('promptInput').value.trim();
  if (!prompt) {
    setStatus('Type a description first.', 'error');
    return;
  }
  const btn = document.getElementById('generateBtn');
  btn.disabled = true;
  setStatus('Generating&hellip; this can take a little while.', 'info');
  document.getElementById('resultWrap').style.display = 'none';
  document.getElementById('cleanupPanel').style.display = 'none';
  try {
    const dataUrl = await runGeneration(prompt);
    const img = await ImagePrep.loadImageFromUrl(dataUrl);
    sourceCanvas = ImagePrep.toCanvas(img, 1200);
    document.getElementById('resultWrap').style.display = 'block';
    document.getElementById('cleanupPanel').style.display = 'block';
    document.getElementById('pageName').value = prompt.slice(0, 40);
    renderCleanupPreview();
    setStatus('Done! Adjust the cleanup slider if needed, then save.', 'ok');
  } catch (err) {
    console.error(err);
    setStatus(escapeAndShow(err.message), 'error');
  } finally {
    btn.disabled = false;
  }
});

function escapeAndShow(msg) {
  const div = document.createElement('div');
  div.textContent = msg;
  return div.innerHTML;
}

document.getElementById('threshold').addEventListener('input', (e) => {
  document.getElementById('thresholdLabel').textContent = e.target.value;
  renderCleanupPreview();
});
document.getElementById('cleanupToggle').addEventListener('change', renderCleanupPreview);

document.getElementById('saveBtn').addEventListener('click', () => {
  if (!sourceCanvas) return;
  const name = document.getElementById('pageName').value.trim() || 'AI Picture';
  const page = {
    id: uid(),
    name,
    image: resultCanvas.toDataURL('image/png'),
    guide: null,
    source: 'ai',
    createdAt: Date.now()
  };
  Storage.addPage(page);
  window.location.href = `color.html?id=${encodeURIComponent(page.id)}&mode=free`;
});
