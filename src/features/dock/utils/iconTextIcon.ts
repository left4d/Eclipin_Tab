const CANVAS_SIZE = 576;
let reusableCanvas: HTMLCanvasElement | null = null;
let reusableCtx: CanvasRenderingContext2D | null = null;

function getReusableCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (!reusableCanvas) {
    reusableCanvas = document.createElement('canvas');
    reusableCanvas.width = CANVAS_SIZE;
    reusableCanvas.height = CANVAS_SIZE;
    reusableCtx = reusableCanvas.getContext('2d');
  }
  if (!reusableCtx) return null;
  reusableCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  return { canvas: reusableCanvas, ctx: reusableCtx };
}

export const generateTextIconBlob = (text: string): { blob: Blob; dataUrl: string } => {
  const dataUrl = generateTextIcon(text);
  const parts = dataUrl.split(',');
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(parts[1] || '');
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return { blob: new Blob([u8arr], { type: mime }), dataUrl };
};

export const generateTextIcon = (text: string, hue?: number): string => {
  try {
    const canvasData = getReusableCanvas();
    if (!canvasData) return '';
    const { canvas, ctx } = canvasData;

    let displayText = text;
    try {
      const isUrlLike = text.startsWith('http') || text.includes('.');
      if (isUrlLike) {
        let hostname = text;
        try {
          const urlObj = new URL(text.startsWith('http') ? text : `https://${text}`);
          hostname = urlObj.hostname;
        } catch {
          hostname = text;
        }
        hostname = hostname.replace(/^www\./, '');
        const mainName = hostname.split('.')[0];
        if (mainName) {
          displayText = mainName;
        }
      }
    } catch {
      // 忽略
    }

    const trimmed = displayText.trim();
    const lines = trimmed.includes(' ') ? trimmed.split(/\s+/).filter(Boolean) : [trimmed];

    const bgHue = hue ?? Math.floor(Math.random() * 360);
    const bgSat = 55 + (bgHue * 7) % 25;
    const bgLig = 82 + (bgHue * 3) % 10;
    ctx.fillStyle = `hsl(${bgHue}, ${bgSat}%, ${bgLig}%)`;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const textSat = Math.min(bgSat + 20, 100);
    const textLig = 25 + (bgHue * 11) % 15;
    ctx.fillStyle = `hsl(${bgHue}, ${textSat}%, ${textLig}%)`;

    const fontSize = 144;
    const lineHeight = fontSize * 0.9;

    ctx.font = `600 ${fontSize}px "Bricolage Grotesque", sans-serif`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    const padding = 48;
    const textAreaWidth = CANVAS_SIZE - padding * 2;
    const totalTextHeight = lines.length * lineHeight;
    const startY = (CANVAS_SIZE - totalTextHeight) / 2 + fontSize * 0.75;

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const measured = ctx.measureText(lineText);
      if (measured.width > textAreaWidth) {
        const scale = textAreaWidth / measured.width;
        ctx.save();
        ctx.translate(padding, startY + i * lineHeight);
        ctx.scale(scale, 1);
        ctx.fillText(lineText, 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(lineText, padding, startY + i * lineHeight);
      }
    }

    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
};

export const generateFolderIcon = (items: Array<{ icon?: string }>): string => {
  if (items.length === 0) {
    return generateTextIcon('');
  }

  const icons = items.slice(0, 4).map((item) => {
    const icon = item.icon || '';
    if (icon.startsWith('favicon:')) return '';
    return icon || generateTextIcon('');
  });

  const svg = `
    <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-0">
          <rect x="0" y="0" width="32" height="32" rx="8"/>
        </clipPath>
        <clipPath id="clip-1">
          <rect x="32" y="0" width="32" height="32" rx="8"/>
        </clipPath>
        <clipPath id="clip-2">
          <rect x="0" y="32" width="32" height="32" rx="8"/>
        </clipPath>
        <clipPath id="clip-3">
          <rect x="32" y="32" width="32" height="32" rx="8"/>
        </clipPath>
      </defs>
      ${icons.map((icon, index) => {
        const x = (index % 2) * 32;
        const y = Math.floor(index / 2) * 32;
        if (!icon) {
          return `<rect x="${x}" y="${y}" width="32" height="32" rx="8" fill="rgba(128,128,128,0.2)"/>`;
        }
        return `
          <g clip-path="url(#clip-${index})">
            <image href="${icon}" x="${x}" y="${y}" width="32" height="32" preserveAspectRatio="xMidYMid slice"/>
          </g>
        `;
      }).join('')}
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};
