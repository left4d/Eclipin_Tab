/**
 * 从页面与 manifest 中提取图标候选列表。
 */
export const discoverIconCandidates = async (pageUrl: string): Promise<string[]> => {
  try {
    const baseUrl = new URL(pageUrl).href;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(pageUrl, {
        signal: controller.signal,
        redirect: 'follow',
        cache: 'no-store',
      });
      if (!response.ok) return [];

      const html = await response.text();
      const parser = new DOMParser();
      const documentNode = parser.parseFromString(html, 'text/html');
      const candidates: Array<{ url: string; score: number }> = [];

      documentNode.querySelectorAll<HTMLLinkElement>('link[rel][href]').forEach((link) => {
        try {
          const rel = link.rel.toLowerCase();
          if (!rel.includes('icon')) return;
          const sizes = link.sizes?.value || link.getAttribute('sizes') || '';
          const largestSize = Math.max(
            0,
            ...Array.from(sizes.matchAll(/(\d+)x(\d+)/g)).map((match) => Math.min(Number(match[1]), Number(match[2]))),
          );
          const relScore = rel.includes('apple-touch-icon') ? 400 : rel.includes('icon') ? 300 : 100;
          const href = link.getAttribute('href');
          if (!href) return;
          candidates.push({ url: new URL(href, baseUrl).href, score: relScore + largestSize });
        } catch {
          // 忽略无效 href
        }
      });

      const manifestLink = Array.from(documentNode.querySelectorAll<HTMLLinkElement>('link[rel][href]')).find((link) =>
        link.rel.toLowerCase().split(/\s+/).includes('manifest'),
      );
      if (manifestLink) {
        try {
          const manifestHref = manifestLink.getAttribute('href');
          if (manifestHref) {
            const manifestUrl = new URL(manifestHref, baseUrl).href;
            const manifestResponse = await fetch(manifestUrl, {
              signal: controller.signal,
              redirect: 'follow',
              cache: 'no-store',
            });
            if (manifestResponse.ok) {
              const manifest = (await manifestResponse.json()) as {
                icons?: Array<{ src?: string; sizes?: string; purpose?: string }>;
              };
              manifest.icons?.forEach((icon) => {
                if (!icon.src) return;
                try {
                  const largestSize = Math.max(
                    0,
                    ...Array.from((icon.sizes || '').matchAll(/(\d+)x(\d+)/g)).map((match) =>
                      Math.min(Number(match[1]), Number(match[2])),
                    ),
                  );
                  const purposeScore = icon.purpose?.includes('maskable') ? 50 : 0;
                  candidates.push({ url: new URL(icon.src, manifestUrl).href, score: 500 + purposeScore + largestSize });
                } catch {
                  // 忽略无效 manifest 图标
                }
              });
            }
          }
        } catch {
          // manifest 不可用时继续使用页面 link 图标
        }
      }

      return Array.from(new Set(candidates.sort((a, b) => b.score - a.score).map((candidate) => candidate.url))).slice(0, 12);
    } finally {
      window.clearTimeout(timeoutId);
    }
  } catch {
    return [];
  }
};
