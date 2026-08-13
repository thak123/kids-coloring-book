// Turns an arbitrary source image (an upload or an AI-generated picture)
// into clean pure black/white line art so flood fill has crisp boundaries.

const ImagePrep = (() => {
  function loadImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  // Draws `img` into a canvas capped to maxDim on the long edge.
  function toCanvas(img, maxDim) {
    maxDim = maxDim || 1200;
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  }

  // Grayscale + threshold: every pixel becomes pure black or pure white.
  // threshold: 0-255, lower = more pixels turn black (thicker lines).
  function applyThreshold(sourceCanvas, threshold) {
    const w = sourceCanvas.width, h = sourceCanvas.height;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const octx = out.getContext('2d');
    octx.drawImage(sourceCanvas, 0, 0);
    const imageData = octx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const v = gray < threshold ? 0 : 255;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
    octx.putImageData(imageData, 0, 0);
    return out;
  }

  return { loadImageFile, loadImageFromUrl, toCanvas, applyThreshold };
})();
