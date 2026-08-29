
// ============================================================================
// 文字图标生成
// ============================================================================
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

/**
 * 生成文字图标，同时返回 Blob 和 data URL
 */
export const generateTextIconBlob = (text: string): { blob: Blob; dataUrl: string } => {
  const dataUrl = generateTextIcon(text);
  // 将 data URL 转为 Blob
  const parts = dataUrl.split(',');
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(parts[1] || '');
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return { blob: new Blob([u8arr], { type: mime }), dataUrl };
};

/**
 * 生成文字图标（返回 data URL）
 *
 * 颜色方案：活力浅色背景 + 高饱和度深色文字（同色相）
 * 换行逻辑：文字中有空格时按空格拆分为多行显示
 * @param text 显示的文本
 * @param hue  可选，指定色相（0-359）。不传时随机生成。
 */
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

    // 按空格拆分文字为多行，无空格时直接显示一行
    const trimmed = displayText.trim();
    const lines = trimmed.includes(' ')
      ? trimmed.split(/\s+/).filter(Boolean)
      : [trimmed];

    // 颜色：活力浅色背景
    const bgHue = hue ?? Math.floor(Math.random() * 360);
    const bgSat = 55 + (bgHue * 7) % 25;      // 饱和度 55-80%
    const bgLig = 82 + (bgHue * 3) % 10;       // 亮度 82-92%（浅色）
    ctx.fillStyle = `hsl(${bgHue}, ${bgSat}%, ${bgLig}%)`;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 文字颜色：同色相，提高饱和度，降低明度
    const textSat = Math.min(bgSat + 20, 100);
    const textLig = 25 + (bgHue * 11) % 15;    // 亮度 25-40%（深色）
    ctx.fillStyle = `hsl(${bgHue}, ${textSat}%, ${textLig}%)`;

    // 字体样式：按 Figma 设计稿（192px 容器中 48px，等比到 576px canvas = 144px）
    // Bricolage Grotesque SemiBold 600, lineHeight 90%
    const fontSize = 144;
    const lineHeight = fontSize * 0.9; // 129.6px

    ctx.font = `600 ${fontSize}px "Bricolage Grotesque", sans-serif`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    // padding: 设计稿 16px / 192px * 576 = 48px
    const padding = 48;
    const textAreaWidth = CANVAS_SIZE - padding * 2;

    // 计算总文字块高度，垂直居中
    const totalTextHeight = lines.length * lineHeight;
    // alphabetic baseline 约在字体高度的 75% 处，首行基线位置
    const startY = (CANVAS_SIZE - totalTextHeight) / 2 + fontSize * 0.75;

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      // 如果文字超出宽度，缩放绘制
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

/**
 * 为文件夹生成图标（前4个应用的图标组合成2x2网格）
 * 注意：文件夹图标中的子项 icon 可能是 favicon:domain 引用，
 * 这里只用于文件夹预览缩略图（SVG 中嵌入），
 * 如果子项 icon 是引用 ID 则显示空白块
 */
export const generateFolderIcon = (items: Array<{ icon?: string }>): string => {
  if (items.length === 0) {
    return generateTextIcon('');
  }

  const icons = items.slice(0, 4).map(item => {
    const icon = item.icon || '';
    // favicon: 引用无法嵌入 SVG，用空字符串（会显示为空白）
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
