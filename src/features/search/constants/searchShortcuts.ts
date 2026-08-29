export interface SearchShortcut {
  id: string;
  token: string;
  aliases: string[];
  label: string;
  descriptionZh: string;
  descriptionEn: string;
  homeUrl: string;
  buildSearchUrl: (query: string, language: 'zh' | 'en') => string;
}

const encoded = (query: string) => encodeURIComponent(query.trim());

export const SEARCH_SHORTCUTS: SearchShortcut[] = [
  {
    id: 'google',
    token: '!g',
    aliases: ['!g', '!google'],
    label: 'Google',
    descriptionZh: '网页搜索',
    descriptionEn: 'Web search',
    homeUrl: 'https://www.google.com/',
    buildSearchUrl: (query) => `https://www.google.com/search?q=${encoded(query)}`,
  },
  {
    id: 'bing',
    token: '!b',
    aliases: ['!b', '!bing'],
    label: 'Bing',
    descriptionZh: '网页搜索',
    descriptionEn: 'Web search',
    homeUrl: 'https://www.bing.com/',
    buildSearchUrl: (query) => `https://www.bing.com/search?q=${encoded(query)}`,
  },
  {
    id: 'baidu',
    token: '!bd',
    aliases: ['!bd', '!baidu'],
    label: 'Baidu',
    descriptionZh: '百度搜索',
    descriptionEn: 'Baidu search',
    homeUrl: 'https://www.baidu.com/',
    buildSearchUrl: (query) => `https://www.baidu.com/s?wd=${encoded(query)}`,
  },
  {
    id: 'duckduckgo',
    token: '!ddg',
    aliases: ['!ddg', '!duck'],
    label: 'DuckDuckGo',
    descriptionZh: '隐私搜索',
    descriptionEn: 'Privacy search',
    homeUrl: 'https://duckduckgo.com/',
    buildSearchUrl: (query) => `https://duckduckgo.com/?q=${encoded(query)}`,
  },
  {
    id: 'github',
    token: '!gh',
    aliases: ['!gh', '!github'],
    label: 'GitHub',
    descriptionZh: '代码与仓库',
    descriptionEn: 'Code & repositories',
    homeUrl: 'https://github.com/',
    buildSearchUrl: (query) => `https://github.com/search?q=${encoded(query)}`,
  },
  {
    id: 'youtube',
    token: '!yt',
    aliases: ['!yt', '!youtube'],
    label: 'YouTube',
    descriptionZh: '视频搜索',
    descriptionEn: 'Video search',
    homeUrl: 'https://www.youtube.com/',
    buildSearchUrl: (query) => `https://www.youtube.com/results?search_query=${encoded(query)}`,
  },
  {
    id: 'wikipedia',
    token: '!w',
    aliases: ['!w', '!wiki'],
    label: 'Wikipedia',
    descriptionZh: '百科搜索',
    descriptionEn: 'Encyclopedia',
    homeUrl: 'https://www.wikipedia.org/',
    buildSearchUrl: (query, language) => `https://${language === 'zh' ? 'zh' : 'en'}.wikipedia.org/w/index.php?search=${encoded(query)}`,
  },
  {
    id: 'maps',
    token: '!map',
    aliases: ['!map', '!maps'],
    label: 'Maps',
    descriptionZh: '地点与路线',
    descriptionEn: 'Places & routes',
    homeUrl: 'https://www.google.com/maps',
    buildSearchUrl: (query) => `https://www.google.com/maps/search/?api=1&query=${encoded(query)}`,
  },
  {
    id: 'images',
    token: '!img',
    aliases: ['!img', '!image', '!images'],
    label: 'Images',
    descriptionZh: '图片搜索',
    descriptionEn: 'Image search',
    homeUrl: 'https://images.google.com/',
    buildSearchUrl: (query) => `https://www.google.com/search?tbm=isch&q=${encoded(query)}`,
  },
];

export interface ParsedSearchShortcut {
  shortcut: SearchShortcut;
  token: string;
  query: string;
}

export const parseSearchShortcut = (input: string): ParsedSearchShortcut | null => {
  const trimmed = input.trimStart();
  if (!trimmed.startsWith('!')) return null;

  const firstWhitespace = trimmed.search(/\s/);
  const token = (firstWhitespace === -1 ? trimmed : trimmed.slice(0, firstWhitespace)).toLowerCase();
  const shortcut = SEARCH_SHORTCUTS.find((item) => item.aliases.includes(token));
  if (!shortcut) return null;

  const query = firstWhitespace === -1 ? '' : trimmed.slice(firstWhitespace).trim();
  return { shortcut, token, query };
};

export const filterSearchShortcuts = (input: string): SearchShortcut[] => {
  const token = input.trim().toLowerCase();
  if (!token.startsWith('!')) return [];
  if (token.includes(' ')) return [];

  return SEARCH_SHORTCUTS.filter((item) => (
    item.aliases.some((alias) => alias.startsWith(token))
    || item.label.toLowerCase().includes(token.slice(1))
  ));
};
