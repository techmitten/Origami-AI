/**
 * Composites an AI-generated background image with a title/bullets text overlay into a
 * single flattened PNG, the same way a PDF page render is one flattened image with its
 * visible text baked in (see pdfService.ts). AI image models render on-image text poorly,
 * so the background is decorative only and the actual slide content is drawn with canvas
 * text APIs on top of it.
 */

export interface SlideDimensions {
  width: number;
  height: number;
}

/** Fixed at 16:9 for v1 — the app's aspectRatio state (App.tsx) has no user-facing picker yet. */
export const slideDimensionsFor = (): SlideDimensions => ({ width: 1920, height: 1080 });

const loadImageFromBlob = (blob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load generated background image.'));
    };
    img.src = url;
  });

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
};

/** Draws a filled rounded-rect path; small local helper so we don't depend on ctx.roundRect support. */
const traceRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const drawSlideText = (ctx: CanvasRenderingContext2D, title: string, bullets: string[], dims: SlideDimensions) => {
  const { width, height } = dims;
  const paddingX = width * 0.07;
  const titleFontSize = Math.round(height * 0.075);
  const titleLineHeight = height * 0.09;
  const bulletFontSize = Math.round(height * 0.038);
  const bulletLineHeight = height * 0.055;
  const bulletGroupGap = height * 0.015;
  const titleBulletGap = height * 0.03;
  const topY = height * 0.28;

  ctx.textBaseline = 'top';

  ctx.font = `700 ${titleFontSize}px "Inter", "Helvetica Neue", Arial, sans-serif`;
  const titleLines = wrapText(ctx, title, width * 0.55);

  ctx.font = `400 ${bulletFontSize}px "Inter", "Helvetica Neue", Arial, sans-serif`;
  const bulletLineGroups = bullets.map((bullet) => wrapText(ctx, `•  ${bullet}`, width * 0.5));

  // AI-generated backgrounds vary wildly in color/brightness, so a fixed scrim can't guarantee
  // legibility everywhere text lands. Instead, size a solid backdrop card to the actual text
  // block (measured from the same wrapped lines we're about to draw) so contrast is guaranteed
  // regardless of what's behind it.
  let contentHeight = titleLines.length * titleLineHeight;
  if (bulletLineGroups.length > 0) {
    contentHeight += titleBulletGap;
    for (const lines of bulletLineGroups) {
      contentHeight += lines.length * bulletLineHeight + bulletGroupGap;
    }
    contentHeight -= bulletGroupGap;
  }

  const boxPaddingX = width * 0.035;
  const boxPaddingY = height * 0.035;
  const boxX = paddingX - boxPaddingX;
  const boxY = topY - boxPaddingY;
  const desiredBoxWidth = width * 0.55 + boxPaddingX * 2;
  const boxWidth = Math.min(desiredBoxWidth, width - boxX - width * 0.03);
  const boxHeight = contentHeight + boxPaddingY * 2;

  ctx.fillStyle = 'rgba(8, 10, 15, 0.72)';
  traceRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, height * 0.018);
  ctx.fill();

  let cursorY = topY;
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${titleFontSize}px "Inter", "Helvetica Neue", Arial, sans-serif`;
  for (const line of titleLines) {
    ctx.fillText(line, paddingX, cursorY);
    cursorY += titleLineHeight;
  }

  if (bulletLineGroups.length > 0) {
    cursorY += titleBulletGap;
    ctx.font = `400 ${bulletFontSize}px "Inter", "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    for (const lines of bulletLineGroups) {
      for (const line of lines) {
        ctx.fillText(line, paddingX, cursorY);
        cursorY += bulletLineHeight;
      }
      cursorY += bulletGroupGap;
    }
  }
};

const slideText = (title: string, bullets: string[]): string => [title, ...bullets].join('\n');

const newCanvas = (dims: SlideDimensions): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
  const canvas = document.createElement('canvas');
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  return { canvas, ctx };
};

/** Composites a Pollinations-generated background with the slide's title/bullets on top. */
export async function composeSlideImage(
  background: Blob,
  title: string,
  bullets: string[],
  dims: SlideDimensions,
): Promise<{ dataUrl: string; text: string }> {
  const { canvas, ctx } = newCanvas(dims);
  const { width, height } = dims;

  const img = await loadImageFromBlob(background);
  try {
    // Cover-fit the background image into the canvas.
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    ctx.drawImage(img, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
  } finally {
    URL.revokeObjectURL(img.src);
  }

  drawSlideText(ctx, title, bullets, dims);

  return { dataUrl: canvas.toDataURL('image/png'), text: slideText(title, bullets) };
}

/** Used when the background image failed to generate — a plain gradient stands in for it. */
export async function composeSlidePlaceholder(
  title: string,
  bullets: string[],
  dims: SlideDimensions,
): Promise<{ dataUrl: string; text: string }> {
  const { canvas, ctx } = newCanvas(dims);
  const { width, height } = dims;

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1e2530');
  gradient.addColorStop(1, '#0a0c10');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  drawSlideText(ctx, title, bullets, dims);

  return { dataUrl: canvas.toDataURL('image/png'), text: slideText(title, bullets) };
}
