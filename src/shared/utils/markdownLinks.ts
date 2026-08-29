import { normalizeUrl } from './url';

export interface ParsedLink {
    text: string;
    url: string;
    startIndex: number;
    endIndex: number;
}

const STORED_MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;
const EDITABLE_LINK_REGEX = /\(([^)]+)\)\[([^\]]+)\]/g;
const ANY_SUPPORTED_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)|\(([^)]+)\)\[([^\]]+)\]/g;
const PLAIN_DOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+(?:[/?#][^\s]*)?$/i;

export function parseMarkdownLinks(text: string): ParsedLink[] {
    const links: ParsedLink[] = [];
    let match: RegExpExecArray | null;

    while ((match = ANY_SUPPORTED_LINK_REGEX.exec(text)) !== null) {
        const isStoredMarkdown = match[1] !== undefined && match[2] !== undefined;

        links.push({
            text: isStoredMarkdown ? match[1] : match[3],
            url: isStoredMarkdown ? match[2] : match[4],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
        });
    }

    return links;
}

export function splitTextWithLinks(text: string): Array<{ type: 'text' | 'link'; content: string; url?: string }> {
    const links = parseMarkdownLinks(text);

    if (links.length === 0) {
        return [{ type: 'text', content: text }];
    }

    const fragments: Array<{ type: 'text' | 'link'; content: string; url?: string }> = [];
    let lastIndex = 0;

    for (const link of links) {
        if (link.startIndex > lastIndex) {
            fragments.push({
                type: 'text',
                content: text.slice(lastIndex, link.startIndex),
            });
        }

        const normalizedUrl = normalizeUrl(link.url);
        fragments.push(normalizedUrl
            ? { type: 'link', content: link.text, url: normalizedUrl }
            : { type: 'text', content: link.text });

        lastIndex = link.endIndex;
    }

    if (lastIndex < text.length) {
        fragments.push({
            type: 'text',
            content: text.slice(lastIndex),
        });
    }

    return fragments;
}

export function hasMarkdownLinks(text: string): boolean {
    return parseMarkdownLinks(text).length > 0;
}

export function autoConvertUrlsToLinks(text: string): string {
    return splitMarkdownAwareFragments(text)
        .map((fragment) => fragment.type === 'link' ? fragment.content : convertPlainUrlsToMarkdown(fragment.content))
        .join('');
}

export function getSinglePlainUrl(text: string): string | null {
    const trimmed = text.trim();
    if (!trimmed || /\s/.test(trimmed)) {
        return null;
    }

    if (!/^(https?:\/\/|www\.)/i.test(trimmed) && !PLAIN_DOMAIN_REGEX.test(trimmed)) {
        return null;
    }

    try {
        const normalizedUrl = normalizeUrl(trimmed);
        new URL(normalizedUrl);
        return normalizedUrl;
    } catch {
        return null;
    }
}

export function markdownToPlainText(text: string): string {
    return text
        .replace(STORED_MARKDOWN_LINK_REGEX, '$1')
        .replace(EDITABLE_LINK_REGEX, '$1');
}

export function markdownToEditableText(text: string): string {
    return text.replace(ANY_SUPPORTED_LINK_REGEX, (_match, markdownText, markdownUrl, editableText, editableUrl) => {
        const linkText = markdownText ?? editableText;
        const linkUrl = markdownUrl ?? editableUrl;
        return `(${linkText})[${linkUrl}]`;
    });
}

export function rebuildMarkdownFromEditText(editedText: string, originalMarkdown: string): string {
    const trimmedEditedText = editedText.trim();
    if (!trimmedEditedText) {
        return '';
    }

    const originalEditableText = markdownToEditableText(originalMarkdown).trim();
    if (originalEditableText && originalEditableText === trimmedEditedText) {
        return normalizeEditableLinksToMarkdown(originalMarkdown);
    }

    return normalizeEditableLinksToMarkdown(trimmedEditedText);
}

function splitMarkdownAwareFragments(text: string): Array<{ type: 'text' | 'link'; content: string }> {
    const links = parseMarkdownLinks(text);
    if (links.length === 0) {
        return [{ type: 'text', content: text }];
    }

    const fragments: Array<{ type: 'text' | 'link'; content: string }> = [];
    let lastIndex = 0;

    for (const link of links) {
        if (link.startIndex > lastIndex) {
            fragments.push({
                type: 'text',
                content: text.slice(lastIndex, link.startIndex),
            });
        }

        fragments.push({
            type: 'link',
            content: text.slice(link.startIndex, link.endIndex),
        });

        lastIndex = link.endIndex;
    }

    if (lastIndex < text.length) {
        fragments.push({
            type: 'text',
            content: text.slice(lastIndex),
        });
    }

    return fragments;
}

function convertPlainUrlsToMarkdown(text: string): string {
    const urlRegex = /(^|[\s(（])((?:https?:\/\/|www\.)[^\s<>"{}|\\^`\[\]]+)/gi;

    return text.replace(urlRegex, (_match, prefix: string, rawUrl: string) => {
        const normalizedUrl = normalizeUrl(rawUrl);
        return normalizedUrl ? `${prefix}[${rawUrl}](${normalizedUrl})` : `${prefix}${rawUrl}`;
    });
}

function normalizeEditableLinksToMarkdown(text: string): string {
    const normalizeLink = (_match: string, linkText: string, linkUrl: string) => {
        const normalizedUrl = normalizeUrl(linkUrl);
        return normalizedUrl ? `[${linkText}](${normalizedUrl})` : linkText;
    };

    return text
        .replace(EDITABLE_LINK_REGEX, normalizeLink)
        .replace(STORED_MARKDOWN_LINK_REGEX, normalizeLink);
}
