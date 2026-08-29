const lightnessCache = new Map<string, boolean>();

/**
 * 判断背景颜色/渐变是浅色还是深色。
 * 如果背景是浅色（需要深色文字），返回 true。
 */
export const isBackgroundLight = (backgroundValue: string): boolean => {
  if (lightnessCache.has(backgroundValue)) {
    return lightnessCache.get(backgroundValue)!;
  }

  const layers = backgroundValue.split(',').map((layer) => layer.trim());
  const baseLayer = layers[layers.length - 1];
  if (baseLayer.startsWith('url(blob:')) return true;

  const colors: string[] = [];
  const hexMatches = backgroundValue.match(/#[0-9A-Fa-f]{6}/g);
  if (hexMatches) colors.push(...hexMatches);
  const rgbMatches = backgroundValue.match(/rgba?\([^)]+\)/g);
  if (rgbMatches) colors.push(...rgbMatches);
  if (colors.length === 0) return false;

  let totalLuminance = 0;
  let maxLuminance = 0;
  colors.forEach((color) => {
    let r = 0;
    let g = 0;
    let b = 0;

    if (color.startsWith('#')) {
      const hex = color.substring(1);
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else {
      const match = color.match(/\d+/g);
      if (match && match.length >= 3) {
        r = parseInt(match[0], 10);
        g = parseInt(match[1], 10);
        b = parseInt(match[2], 10);
      }
    }

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    totalLuminance += luminance;
    maxLuminance = Math.max(maxLuminance, luminance);
  });

  const averageLuminance = totalLuminance / colors.length;
  const result = (averageLuminance + maxLuminance) / 2 > 0.4;

  if (lightnessCache.size > 50) {
    const firstKey = lightnessCache.keys().next().value;
    if (firstKey) lightnessCache.delete(firstKey);
  }
  lightnessCache.set(backgroundValue, result);
  return result;
};
