export type AdvancedSearchTarget = 'engine' | 'images' | 'youtube' | 'bilibili' | 'github' | 'maps' | 'wikipedia';

export type AdvancedSearchFilterId =
  | 'exact'
  | 'site'
  | 'exclude'
  | 'filetype'
  | 'date'
  | 'intitle'
  | 'inurl'
  | 'or'
  | 'imageSize'
  | 'imageType'
  | 'youtubeChannel'
  | 'youtubeUploadDate'
  | 'youtubeDuration'
  | 'youtubeSort'
  | 'bilibiliUploader'
  | 'bilibiliDuration'
  | 'bilibiliSort'
  | 'githubRepo'
  | 'githubLanguage'
  | 'githubStars'
  | 'githubPath'
  | 'githubUser'
  | 'githubOrg'
  | 'githubType'
  | 'mapsLocation'
  | 'mapsNearby'
  | 'mapsCategory'
  | 'mapsOpenNow'
  | 'wikiLanguage'
  | 'wikiNamespace'
  | 'wikiTitle';

export type AdvancedSearchFilterValue = string | boolean | { from: string; to: string };
export type AdvancedSearchFilterValues = Partial<Record<AdvancedSearchFilterId, AdvancedSearchFilterValue>>;

export interface AdvancedSearchFilterDefinition {
  id: AdvancedSearchFilterId;
  label: string;
  description: string;
  group: 'common' | 'more';
  kind: 'text' | 'select' | 'toggle' | 'date-range';
  placeholder?: string;
  quick?: boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface AdvancedSearchOptions {
  query: string;
  target: AdvancedSearchTarget;
  filters?: AdvancedSearchFilterValues;
  rawQuery?: string;

  // Compatibility with the previous API. New callers should use `filters`.
  exactMatch?: boolean;
  site?: string;
  exclude?: string;
  fileType?: string;
  anyWords?: string;
  titleContains?: string;
  urlContains?: string;
  afterDate?: string;
  beforeDate?: string;
}

export const ADVANCED_SEARCH_TARGETS: Array<{
  id: AdvancedSearchTarget;
  label: string;
  description: string;
  icon: string;
}> = [
  { id: 'engine', label: '网页', description: '当前搜索引擎', icon: '⌕' },
  { id: 'images', label: '图片', description: 'Google 图片', icon: '▧' },
  { id: 'youtube', label: 'YouTube', description: 'YouTube 视频', icon: '▶' },
  { id: 'bilibili', label: 'B站', description: '哔哩哔哩视频', icon: '▣' },
  { id: 'github', label: 'GitHub', description: '代码与仓库', icon: '<>' },
  { id: 'maps', label: '地图', description: 'Google Maps', icon: '⌖' },
  { id: 'wikipedia', label: '百科', description: 'Wikipedia', icon: 'W' },
];

const FILE_TYPES = [
  { value: 'pdf', label: 'PDF' },
  { value: 'doc', label: 'Word (.doc)' },
  { value: 'docx', label: 'Word (.docx)' },
  { value: 'xls', label: 'Excel (.xls)' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'ppt', label: 'PPT (.ppt)' },
  { value: 'pptx', label: 'PPT (.pptx)' },
  { value: 'txt', label: '文本 (.txt)' },
  { value: 'csv', label: 'CSV' },
  { value: 'md', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
];

const WEB_FILTERS: AdvancedSearchFilterDefinition[] = [
  { id: 'exact', label: '精确匹配', description: '完整匹配当前搜索内容', group: 'common', kind: 'toggle', quick: true },
  { id: 'exclude', label: '排除关键词', description: '排除一个或多个关键词', group: 'common', kind: 'text', placeholder: '广告, 旧版, 教程', quick: true },
  { id: 'site', label: '限定网站', description: '只搜索指定域名', group: 'common', kind: 'text', placeholder: 'github.com', quick: true },
  { id: 'filetype', label: '文件类型', description: '只搜索指定文件类型', group: 'common', kind: 'select', options: FILE_TYPES, quick: true },
  { id: 'date', label: '日期范围', description: '限定结果的时间范围', group: 'common', kind: 'date-range', quick: true },
  { id: 'intitle', label: '标题包含', description: '关键词必须出现在标题中', group: 'more', kind: 'text', placeholder: 'performance', quick: true },
  { id: 'inurl', label: 'URL 包含', description: '关键词必须出现在 URL 中', group: 'more', kind: 'text', placeholder: 'docs / api' },
  { id: 'or', label: '任一关键词', description: '多个词满足其一即可', group: 'more', kind: 'text', placeholder: 'React Vue Svelte' },
];

const IMAGE_FILTERS: AdvancedSearchFilterDefinition[] = [
  ...WEB_FILTERS.filter((item) => ['exact', 'exclude', 'site', 'filetype', 'date'].includes(item.id)),
  {
    id: 'imageSize', label: '图片尺寸', description: '按图片尺寸筛选', group: 'more', kind: 'select', options: [
      { value: 's', label: '小' }, { value: 'm', label: '中' }, { value: 'l', label: '大' }, { value: 'i', label: '图标' },
    ],
  },
  {
    id: 'imageType', label: '图片类型', description: '照片、人脸、线稿等', group: 'more', kind: 'select', options: [
      { value: 'photo', label: '照片' }, { value: 'face', label: '人脸' }, { value: 'clipart', label: '剪贴画' }, { value: 'lineart', label: '线稿' }, { value: 'animated', label: '动图' },
    ],
  },
];

const YOUTUBE_FILTERS: AdvancedSearchFilterDefinition[] = [
  { id: 'youtubeChannel', label: '频道', description: '把频道名称或 @handle 加入搜索语句', group: 'common', kind: 'text', placeholder: '@Fireship', quick: true },
  {
    id: 'youtubeUploadDate', label: '上传时间', description: '按上传时间筛选视频', group: 'common', kind: 'select', quick: true, options: [
      { value: 'hour', label: '最近一小时' }, { value: 'today', label: '今天' }, { value: 'week', label: '本周' }, { value: 'month', label: '本月' }, { value: 'year', label: '今年' },
    ],
  },
  {
    id: 'youtubeDuration', label: '视频长度', description: '按视频时长筛选', group: 'common', kind: 'select', quick: true, options: [
      { value: 'short', label: '4 分钟以内' }, { value: 'medium', label: '4–20 分钟' }, { value: 'long', label: '20 分钟以上' },
    ],
  },
  {
    id: 'youtubeSort', label: '排序', description: '设置 YouTube 搜索排序', group: 'more', kind: 'select', quick: true, options: [
      { value: 'relevance', label: '相关度' }, { value: 'date', label: '上传日期' }, { value: 'views', label: '观看次数' }, { value: 'rating', label: '评分' },
    ],
  },
];

const BILIBILI_FILTERS: AdvancedSearchFilterDefinition[] = [
  { id: 'bilibiliUploader', label: 'UP 主', description: '把 UP 主名称加入 B 站搜索关键词', group: 'common', kind: 'text', placeholder: '影视飓风', quick: true },
  {
    id: 'bilibiliDuration', label: '视频长度', description: '使用 B 站的视频时长筛选', group: 'common', kind: 'select', quick: true, options: [
      { value: '1', label: '10 分钟以内' },
      { value: '2', label: '10–30 分钟' },
      { value: '3', label: '30–60 分钟' },
      { value: '4', label: '60 分钟以上' },
    ],
  },
  {
    id: 'bilibiliSort', label: '排序', description: '使用 B 站搜索排序方式', group: 'common', kind: 'select', quick: true, options: [
      { value: 'totalrank', label: '综合排序' },
      { value: 'click', label: '最多播放' },
      { value: 'pubdate', label: '最新发布' },
      { value: 'dm', label: '最多弹幕' },
      { value: 'stow', label: '最多收藏' },
    ],
  },
];

const GITHUB_FILTERS: AdvancedSearchFilterDefinition[] = [
  { id: 'githubRepo', label: '仓库', description: '限定 owner/repo', group: 'common', kind: 'text', placeholder: 'facebook/react', quick: true },
  { id: 'githubLanguage', label: '语言', description: '限定编程语言', group: 'common', kind: 'text', placeholder: 'TypeScript', quick: true },
  { id: 'githubStars', label: 'Stars', description: '仓库搜索时按 Stars 筛选，例如 >=1000', group: 'common', kind: 'text', placeholder: '>=1000', quick: true },
  { id: 'githubPath', label: '文件路径', description: '代码搜索时限定路径', group: 'common', kind: 'text', placeholder: 'src/components', quick: true },
  { id: 'githubUser', label: '用户', description: '限定 GitHub 用户', group: 'more', kind: 'text', placeholder: 'octocat' },
  { id: 'githubOrg', label: '组织', description: '限定 GitHub Organization', group: 'more', kind: 'text', placeholder: 'openai' },
  {
    id: 'githubType', label: '搜索类型', description: '代码 / Issue / 仓库', group: 'common', kind: 'select', quick: true, options: [
      { value: 'code', label: '代码' }, { value: 'issues', label: 'Issue' }, { value: 'repositories', label: '仓库' },
    ],
  },
];

const MAP_FILTERS: AdvancedSearchFilterDefinition[] = [
  { id: 'mapsLocation', label: '地点', description: '限定城市、地区或地址', group: 'common', kind: 'text', placeholder: '上海 / 徐汇区', quick: true },
  { id: 'mapsNearby', label: '附近', description: '搜索某个地标或地点附近', group: 'common', kind: 'text', placeholder: '西湖 / 国贸', quick: true },
  { id: 'mapsCategory', label: '类别', description: '餐厅、咖啡、酒店等类别', group: 'common', kind: 'text', placeholder: '咖啡 / 餐厅', quick: true },
  { id: 'mapsOpenNow', label: '营业状态', description: '只倾向显示当前营业地点', group: 'more', kind: 'toggle', quick: true },
];

const WIKI_FILTERS: AdvancedSearchFilterDefinition[] = [
  {
    id: 'wikiLanguage', label: '语言', description: '选择 Wikipedia 语言版本', group: 'common', kind: 'select', quick: true, options: [
      { value: 'zh', label: '中文' }, { value: 'en', label: 'English' }, { value: 'ja', label: '日本語' }, { value: 'de', label: 'Deutsch' }, { value: 'fr', label: 'Français' }, { value: 'es', label: 'Español' },
    ],
  },
  {
    id: 'wikiNamespace', label: '命名空间', description: '限定条目、分类、文件等范围', group: 'common', kind: 'select', quick: true, options: [
      { value: '0', label: '条目' }, { value: '14', label: '分类' }, { value: '6', label: '文件' }, { value: '10', label: '模板' }, { value: '2', label: '用户' }, { value: '1', label: '讨论' },
    ],
  },
  { id: 'wikiTitle', label: '标题包含', description: '只查标题中包含指定词的页面', group: 'more', kind: 'text', placeholder: 'React', quick: true },
];

export const ADVANCED_SEARCH_FILTERS_BY_TARGET: Record<AdvancedSearchTarget, AdvancedSearchFilterDefinition[]> = {
  engine: WEB_FILTERS,
  images: IMAGE_FILTERS,
  youtube: YOUTUBE_FILTERS,
  bilibili: BILIBILI_FILTERS,
  github: GITHUB_FILTERS,
  maps: MAP_FILTERS,
  wikipedia: WIKI_FILTERS,
};

export const getAdvancedSearchFilterDefinitions = (target: AdvancedSearchTarget) => ADVANCED_SEARCH_FILTERS_BY_TARGET[target];

const normalizeSite = (value: string) => value
  .trim()
  .replace(/^https?:\/\//i, '')
  .replace(/^www\./i, '')
  .replace(/\/.*$/, '');

const normalizeWords = (value: string) => value
  .split(/[，,\s]+/)
  .map((word) => word.trim())
  .filter(Boolean);

const stripQuotes = (value: string) => value.trim().replace(/["']/g, '');
const quoteIfNeeded = (value: string) => value.includes(' ') ? `"${stripQuotes(value)}"` : stripQuotes(value);
const stringFilter = (filters: AdvancedSearchFilterValues, id: AdvancedSearchFilterId) => {
  const value = filters[id];
  return typeof value === 'string' ? value.trim() : '';
};
const boolFilter = (filters: AdvancedSearchFilterValues, id: AdvancedSearchFilterId) => filters[id] === true;
const dateFilter = (filters: AdvancedSearchFilterValues) => {
  const value = filters.date;
  if (value && typeof value === 'object' && 'from' in value && 'to' in value) return value;
  return { from: '', to: '' };
};

const withLegacyFilters = (options: AdvancedSearchOptions): AdvancedSearchFilterValues => {
  const filters: AdvancedSearchFilterValues = { ...(options.filters ?? {}) };
  if (options.exactMatch) filters.exact = true;
  if (options.site) filters.site = options.site;
  if (options.exclude) filters.exclude = options.exclude;
  if (options.fileType) filters.filetype = options.fileType;
  if (options.anyWords) filters.or = options.anyWords;
  if (options.titleContains) filters.intitle = options.titleContains;
  if (options.urlContains) filters.inurl = options.urlContains;
  if (options.afterDate || options.beforeDate) filters.date = { from: options.afterDate ?? '', to: options.beforeDate ?? '' };
  return filters;
};

const buildWebQuery = (query: string, filters: AdvancedSearchFilterValues) => {
  const parts: string[] = [];
  const trimmedQuery = query.trim();
  if (trimmedQuery) parts.push(boolFilter(filters, 'exact') ? `"${stripQuotes(trimmedQuery)}"` : trimmedQuery);

  const site = normalizeSite(stringFilter(filters, 'site'));
  if (site) parts.push(`site:${site}`);

  normalizeWords(stringFilter(filters, 'exclude'))
    .map((value) => value.replace(/^-+/, ''))
    .forEach((value) => parts.push(`-${value}`));

  const fileType = stringFilter(filters, 'filetype');
  if (fileType) parts.push(`filetype:${fileType}`);

  const anyWords = normalizeWords(stringFilter(filters, 'or')).map(stripQuotes);
  if (anyWords.length === 1) parts.push(anyWords[0]);
  if (anyWords.length > 1) parts.push(`(${anyWords.join(' OR ')})`);

  const title = stripQuotes(stringFilter(filters, 'intitle'));
  if (title) parts.push(`intitle:${quoteIfNeeded(title)}`);

  const url = stripQuotes(stringFilter(filters, 'inurl')).replace(/^\/+|\/+$/g, '');
  if (url) parts.push(`inurl:${url}`);

  const date = dateFilter(filters);
  if (date.from) parts.push(`after:${date.from}`);
  if (date.to) parts.push(`before:${date.to}`);

  return parts.join(' ').trim();
};

const normalizeGithubRepo = (value: string) => value
  .trim()
  .replace(/^https?:\/\/(?:www\.)?github\.com\//i, '')
  .replace(/^\/+|\/+$/g, '')
  .split('/').slice(0, 2).join('/');

const normalizeGithubOwner = (value: string) => value
  .trim()
  .replace(/^https?:\/\/(?:www\.)?github\.com\//i, '')
  .replace(/^@/, '')
  .replace(/\/.*/, '');

const buildGithubQuery = (query: string, filters: AdvancedSearchFilterValues) => {
  const parts: string[] = [];
  if (query.trim()) parts.push(query.trim());

  const repo = normalizeGithubRepo(stringFilter(filters, 'githubRepo'));
  if (repo) parts.push(`repo:${repo}`);

  const language = stringFilter(filters, 'githubLanguage');
  if (language) parts.push(`language:${quoteIfNeeded(language)}`);

  const stars = stringFilter(filters, 'githubStars').replace(/^stars:/i, '');
  if (stars) parts.push(`stars:${stars}`);

  const path = stringFilter(filters, 'githubPath');
  if (path) parts.push(`path:${quoteIfNeeded(path)}`);

  const user = normalizeGithubOwner(stringFilter(filters, 'githubUser'));
  if (user) parts.push(`user:${user}`);

  const org = normalizeGithubOwner(stringFilter(filters, 'githubOrg'));
  if (org) parts.push(`org:${org}`);

  return parts.join(' ').trim();
};

const buildYoutubeQuery = (query: string, filters: AdvancedSearchFilterValues) => {
  const parts: string[] = [];
  if (query.trim()) parts.push(query.trim());
  const channel = stringFilter(filters, 'youtubeChannel');
  if (channel) parts.push(quoteIfNeeded(channel));
  return parts.join(' ').trim();
};

const buildBilibiliQuery = (query: string, filters: AdvancedSearchFilterValues) => {
  const parts: string[] = [];
  if (query.trim()) parts.push(query.trim());
  const uploader = stringFilter(filters, 'bilibiliUploader');
  if (uploader) parts.push(quoteIfNeeded(uploader));
  return parts.join(' ').trim();
};

const buildMapsQuery = (query: string, filters: AdvancedSearchFilterValues) => {
  const parts: string[] = [];
  if (query.trim()) parts.push(query.trim());

  const category = stringFilter(filters, 'mapsCategory');
  if (category) parts.push(category);

  const nearby = stringFilter(filters, 'mapsNearby');
  if (nearby) parts.push(`near ${nearby}`);

  const location = stringFilter(filters, 'mapsLocation');
  if (location) parts.push(`in ${location}`);

  if (boolFilter(filters, 'mapsOpenNow')) parts.push('open now');
  return parts.join(' ').trim();
};

const buildWikipediaQuery = (query: string, filters: AdvancedSearchFilterValues) => {
  const parts: string[] = [];
  if (query.trim()) parts.push(query.trim());
  const title = stringFilter(filters, 'wikiTitle');
  if (title) parts.push(`intitle:${quoteIfNeeded(title)}`);
  return parts.join(' ').trim();
};

export const buildAdvancedSearchQuery = (options: AdvancedSearchOptions): string => {
  const filters = withLegacyFilters(options);
  if (options.rawQuery !== undefined) return options.rawQuery.trim();

  switch (options.target) {
    case 'github': return buildGithubQuery(options.query, filters);
    case 'youtube': return buildYoutubeQuery(options.query, filters);
    case 'bilibili': return buildBilibiliQuery(options.query, filters);
    case 'maps': return buildMapsQuery(options.query, filters);
    case 'wikipedia': return buildWikipediaQuery(options.query, filters);
    case 'images':
    case 'engine':
    default: return buildWebQuery(options.query, filters);
  }
};

const youtubeDateMap: Record<string, number> = { hour: 1, today: 2, week: 3, month: 4, year: 5 };
const youtubeDurationMap: Record<string, number> = { short: 1, long: 2, medium: 3 };
const youtubeSortMap: Record<string, number> = { relevance: 0, rating: 1, date: 2, views: 3 };

const bytesToBase64 = (bytes: number[]) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    const chunk = (a << 16) | (b << 8) | c;
    output += alphabet[(chunk >> 18) & 63];
    output += alphabet[(chunk >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(chunk >> 6) & 63] : '=';
    output += index + 2 < bytes.length ? alphabet[chunk & 63] : '=';
  }
  return output;
};

const buildYoutubeSp = (filters: AdvancedSearchFilterValues) => {
  const outer: number[] = [];
  const filtering: number[] = [];
  const sortValue = youtubeSortMap[stringFilter(filters, 'youtubeSort')] ?? 0;
  const dateValue = youtubeDateMap[stringFilter(filters, 'youtubeUploadDate')];
  const durationValue = youtubeDurationMap[stringFilter(filters, 'youtubeDuration')];

  if (sortValue) outer.push(0x08, sortValue);
  if (dateValue) filtering.push(0x08, dateValue);
  filtering.push(0x10, 0x01); // videoType = video
  if (durationValue) filtering.push(0x18, durationValue);

  outer.push(0x12, filtering.length, ...filtering);
  return bytesToBase64(outer);
};

export const buildAdvancedSearch = (options: AdvancedSearchOptions): { query?: string; url?: string } => {
  const filters = withLegacyFilters(options);
  const finalQuery = buildAdvancedSearchQuery({ ...options, filters });
  if (!finalQuery) return {};
  const encoded = encodeURIComponent(finalQuery);

  switch (options.target) {
    case 'images': {
      const tbs: string[] = [];
      const size = stringFilter(filters, 'imageSize');
      const imageType = stringFilter(filters, 'imageType');
      if (size) tbs.push(`isz:${size}`);
      if (imageType) tbs.push(`itp:${imageType}`);
      return { url: `https://www.google.com/search?tbm=isch&q=${encoded}${tbs.length ? `&tbs=${encodeURIComponent(tbs.join(','))}` : ''}` };
    }
    case 'youtube':
      return { url: `https://www.youtube.com/results?search_query=${encoded}&sp=${encodeURIComponent(buildYoutubeSp(filters))}` };
    case 'bilibili': {
      const order = stringFilter(filters, 'bilibiliSort') || 'totalrank';
      const duration = stringFilter(filters, 'bilibiliDuration');
      return {
        url: `https://search.bilibili.com/video?keyword=${encoded}&order=${encodeURIComponent(order)}${duration ? `&duration=${encodeURIComponent(duration)}` : ''}`,
      };
    }
    case 'github': {
      const type = stringFilter(filters, 'githubType');
      return { url: `https://github.com/search?q=${encoded}${type ? `&type=${encodeURIComponent(type)}` : ''}` };
    }
    case 'maps':
      return { url: `https://www.google.com/maps/search/?api=1&query=${encoded}` };
    case 'wikipedia': {
      const language = stringFilter(filters, 'wikiLanguage') || 'zh';
      const namespace = stringFilter(filters, 'wikiNamespace');
      const namespaceParam = namespace ? `&ns${encodeURIComponent(namespace)}=1` : '';
      return { url: `https://${language}.wikipedia.org/w/index.php?search=${encoded}${namespaceParam}` };
    }
    default:
      return { query: finalQuery };
  }
};
