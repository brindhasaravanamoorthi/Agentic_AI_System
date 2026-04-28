import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders markdown content with GFM (tables, strikethrough, etc.)
 * Can be used with llm-ui's useLLMOutput or standalone
 */
export function MarkdownBlock({ content, className = '' }) {
  if (!content?.trim()) return null;

  return (
    <div className={`prose prose-sm prose-slate max-w-none dark:prose-invert prose-invert ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
