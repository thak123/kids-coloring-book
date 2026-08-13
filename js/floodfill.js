// Flood fill ("bucket fill") for the coloring canvas, plus a read-only
// region test used by Guide Mode to check "did the child click inside the
// same enclosed region as this guide step's target point?".

const FloodFill = (() => {
  function colorsClose(data, idx, r, g, b, a, tol) {
    return (
      Math.abs(data[idx] - r) <= tol &&
      Math.abs(data[idx + 1] - g) <= tol &&
      Math.abs(data[idx + 2] - b) <= tol &&
      Math.abs(data[idx + 3] - a) <= tol
    );
  }

  // Iterative (stack-based) region growing from (startX, startY). Returns a
  // Uint8Array mask (1 = part of the region) plus the target color that was
  // matched and the region's bounding box.
  function computeRegionMask(data, width, height, startX, startY, tolerance) {
    const startPixel = startY * width + startX;
    const startIdx = startPixel * 4;
    const tr = data[startIdx];
    const tg = data[startIdx + 1];
    const tb = data[startIdx + 2];
    const ta = data[startIdx + 3];

    const mask = new Uint8Array(width * height);
    mask[startPixel] = 1;
    const stack = [startPixel];
    let minX = startX, maxX = startX, minY = startY, maxY = startY;

    while (stack.length) {
      const p = stack.pop();
      const px = p % width;
      const py = (p - px) / width;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;

      if (px > 0) tryVisit(p - 1);
      if (px < width - 1) tryVisit(p + 1);
      if (py > 0) tryVisit(p - width);
      if (py < height - 1) tryVisit(p + width);
    }

    function tryVisit(n) {
      if (mask[n]) return;
      const idx = n * 4;
      if (colorsClose(data, idx, tr, tg, tb, ta, tolerance)) {
        mask[n] = 1;
        stack.push(n);
      }
    }

    return { mask, target: [tr, tg, tb, ta], minX, maxX, minY, maxY };
  }

  // Paints the region containing (startX, startY) with fillColor = [r,g,b,a].
  // Mutates the canvas. Returns { changed, pixelCount }.
  function fill(ctx, width, height, startX, startY, fillColor, tolerance) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const { mask, target } = computeRegionMask(data, width, height, startX, startY, tolerance);
    const [fr, fg, fb, fa] = fillColor;

    if (target[0] === fr && target[1] === fg && target[2] === fb && target[3] === fa) {
      return { changed: false, pixelCount: 0 };
    }

    let pixelCount = 0;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i]) {
        const idx = i * 4;
        data[idx] = fr;
        data[idx + 1] = fg;
        data[idx + 2] = fb;
        data[idx + 3] = fa;
        pixelCount++;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    return { changed: pixelCount > 0, pixelCount };
  }

  // Read-only: are (x1,y1) and (x2,y2) part of the same contiguous region?
  function sameRegion(ctx, width, height, x1, y1, x2, y2, tolerance) {
    if (x2 < 0 || y2 < 0 || x2 >= width || y2 >= height) return false;
    const imageData = ctx.getImageData(0, 0, width, height);
    const { mask } = computeRegionMask(imageData.data, width, height, x1, y1, tolerance);
    return !!mask[y2 * width + x2];
  }

  function hexToRgba(hex, alpha) {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return [r, g, b, alpha === undefined ? 255 : alpha];
  }

  return { fill, sameRegion, hexToRgba, computeRegionMask };
})();
