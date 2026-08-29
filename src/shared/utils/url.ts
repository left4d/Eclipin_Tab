/**
 * URL 处理与安全导航工具。
 *
 * 所有业务代码都应通过本模块打开外部地址，避免协议注入、
 * 新窗口反向控制和各功能对“是否新标签页打开”的处理不一致。
 */

const LOCAL_HOST_PATTERN = /^(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|[^./\s]+\.(?:local|lan|home|internal))(?::\d+)?(?:\/|$)/i;
const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:\/|$)/i;

export interface NavigateOptions {
    /** 默认遵循用户设置在新标签页中打开。 */
    openInNewTab?: boolean;
}

/**
 * 规范化 HTTP/HTTPS URL。
 * - 公网域名默认补充 https://
 * - localhost、局域网 IP 与常见局域网域名默认补充 http://
 * - 单个普通单词按搜索关键词处理；显式写出 http:// 时仍可访问单标签主机
 * - 拒绝 javascript:、file:、data: 等非网页协议
 */
export const normalizeUrl = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';

    let candidate = trimmed;
    if (/^\/\//.test(candidate)) {
        candidate = `https:${candidate}`;
    } else if (!/^https?:\/\//i.test(candidate)) {
        const isLocalHost = LOCAL_HOST_PATTERN.test(candidate);
        if (!isLocalHost && !DOMAIN_PATTERN.test(candidate)) return '';
        candidate = `${isLocalHost ? 'http' : 'https'}://${candidate}`;
    }

    try {
        const parsed = new URL(candidate);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
        if (!parsed.hostname) return '';
        return parsed.toString();
    } catch {
        return '';
    }
};

/** 检查字符串是否为有效网页 URL。 */
export const isValidUrl = (input: string): boolean => normalizeUrl(input) !== '';

/** 从 URL 中提取域名。 */
export const getDomainFromUrl = (input: string): string => {
    const normalized = normalizeUrl(input);
    if (!normalized) return '';
    try {
        return new URL(normalized).hostname;
    } catch {
        return '';
    }
};

/** 判断输入是否看起来像可直接导航的网页地址。 */
export const looksLikeUrl = (input: string): boolean => normalizeUrl(input) !== '';

/** 将地址栏式输入解析为安全网页地址；普通搜索关键词返回 null。 */
export const resolveNavigationInput = (input: string): string | null => {
    const normalized = normalizeUrl(input);
    return normalized || null;
};

/**
 * 打开安全的 HTTP(S) 地址。
 * 返回 false 表示地址无效或当前环境不可导航。
 */
export const navigateToUrl = (input: string, options: NavigateOptions = {}): boolean => {
    const normalized = normalizeUrl(input);
    if (!normalized || typeof window === 'undefined') return false;

    const { openInNewTab = true } = options;
    if (openInNewTab) {
        const opened = window.open(normalized, '_blank', 'noopener,noreferrer');
        if (opened) opened.opener = null;
    } else {
        window.location.assign(normalized);
    }
    return true;
};
