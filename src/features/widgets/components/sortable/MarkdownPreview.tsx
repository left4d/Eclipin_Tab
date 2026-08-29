import { Fragment, type ReactNode } from 'react';
import styles from '../WidgetPanel.module.css';

const isSafeMarkdownHref = (href: string) => /^(https?:\/\/|mailto:)/i.test(href.trim());

const renderInlineMarkdown = (text: string): ReactNode[] => {
  const parts = text
    .split(/(`[^`\n]+`|~~[^~\n]+~~|\+\+[^+\n]+\+\+|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\n]+\))/g)
    .filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`code-${index}`}>{part.slice(1, -1)}</code>;
    }


    if (part.startsWith('~~') && part.endsWith('~~')) {
      return <del key={`strike-${index}`}>{part.slice(2, -2)}</del>;
    }

    if (part.startsWith('++') && part.endsWith('++')) {
      return <u key={`underline-${index}`}>{part.slice(2, -2)}</u>;
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`strong-${index}`}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={`em-${index}`}>{part.slice(1, -1)}</em>;
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const href = linkMatch[2].trim();
      if (isSafeMarkdownHref(href)) {
        return (
          <a key={`link-${index}`} href={href} target="_blank" rel="noopener noreferrer nofollow">
            {linkMatch[1]}
          </a>
        );
      }
    }

    return <Fragment key={`text-${index}`}>{part}</Fragment>;
  });
};

const renderMarkdownHeading = (level: number, content: ReactNode[], key: string): ReactNode => {
  if (level === 1) return <h1 key={key}>{content}</h1>;
  if (level === 2) return <h2 key={key}>{content}</h2>;
  return <h3 key={key}>{content}</h3>;
};

export const renderMarkdown = (text: string): ReactNode[] => {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const nodes: ReactNode[] = [];
  let listItems: Array<{ text: string; line: number }> = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={`list-${listItems[0].line}`}>
        {listItems.map((item) => (
          <li key={`item-${item.line}`}>{renderInlineMarkdown(item.text)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      listItems.push({ text: listMatch[1], line: index });
      return;
    }

    flushList();

    if (!trimmed) {
      nodes.push(<div key={`space-${index}`} className={styles.markdownSpacer} aria-hidden="true" />);
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      nodes.push(renderMarkdownHeading(headingMatch[1].length, renderInlineMarkdown(headingMatch[2]), `heading-${index}`));
      return;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      nodes.push(<blockquote key={`quote-${index}`}>{renderInlineMarkdown(quoteMatch[1])}</blockquote>);
      return;
    }

    nodes.push(<p key={`paragraph-${index}`}>{renderInlineMarkdown(line)}</p>);
  });

  flushList();
  return nodes;
};
