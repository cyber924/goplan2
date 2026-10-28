'use client';

import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownReportViewerProps {
  content: string;
  className?: string;
}

/**
 * Fixes tables where cells contain multiline text (\n inside table cells)
 * and rejoins them into valid single-line GFM table rows with <br />.
 */
function fixMarkdownTables(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    const startsWithPipe = trimmed.startsWith('|');
    const isTableSeparator = /^\|?\s*:?-{2,}:?\s*(\|?\s*:?-{2,}:?\s*)+\|?$/.test(trimmed);

    if (isTableSeparator) {
      inTable = true;
      result.push(trimmed);
      continue;
    }

    if (inTable) {
      if (trimmed === '') {
        inTable = false;
        result.push('');
        continue;
      }

      if (startsWithPipe) {
        result.push(trimmed);
      } else {
        // Line does NOT start with | -> it's a multiline continuation of the previous cell!
        if (result.length > 0 && result[result.length - 1].startsWith('|')) {
          result[result.length - 1] = result[result.length - 1] + '<br />' + trimmed;
        } else {
          inTable = false;
          result.push(rawLine);
        }
      }
    } else {
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      const nextIsSeparator = /^\|?\s*:?-{2,}:?\s*(\|?\s*:?-{2,}:?\s*)+\|?$/.test(nextLine);

      if (startsWithPipe && nextIsSeparator) {
        inTable = true;
        result.push(''); // Ensure blank line before table
        result.push(trimmed);
      } else {
        result.push(rawLine);
      }
    }
  }

  return result.join('\n');
}

/**
 * Normalizes raw text from database/AI:
 * - Unescapes literal '\\n' and '\\r\\n' into real newlines.
 * - Ensures markdown headers (###) and tables (|) have clean blank lines around them.
 * - Fixes multiline cells inside tables into unified GFM rows with <br />.
 */
function normalizeMarkdown(rawText: string): string {
  if (!rawText) return '';

  // 1. Unescape literal string representations of newlines (\r\n and \n)
  let text = rawText.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');

  // 2. Separate glued headers (e.g. "스케일업합니다.### 시장 확대 전략" -> "\n\n### 시장 확대 전략")
  text = text.replace(/([^\n])\s*(#{1,6}\s+)/g, '$1\n\n$2');

  // 3. Fix multiline table rows so they stay inside the table
  text = fixMarkdownTables(text);

  return text.trim();
}

export default function MarkdownReportViewer({ content, className = '' }: MarkdownReportViewerProps) {
  const normalized = normalizeMarkdown(content);

  return (
    <div className={`markdown-report-viewer text-[#334155] ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        urlTransform={(url) => url} // Allows data:image/base64 URIs and all standard URLs without stripping
        components={{
          // Professional Consulting / Official Government Report Table
          table: ({ children, ...props }) => (
            <div className="my-6 overflow-x-auto rounded-xl border border-[#cbd5e1] shadow-sm bg-white">
              <table className="w-full text-left border-collapse min-w-[500px]" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-[#f1f5f9] text-[#0f172a] border-b-2 border-[#cbd5e1]" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th className="py-3 px-4 text-xs sm:text-sm font-bold text-[#0f172a] tracking-tight border-r border-[#cbd5e1] last:border-r-0 bg-[#f1f5f9] text-left">
              {children}
            </th>
          ),
          tbody: ({ children, ...props }) => (
            <tbody className="divide-y divide-[#e2e8f0]">
              {children}
            </tbody>
          ),
          tr: ({ children, ...props }) => (
            <tr className="hover:bg-[#f8fafc] transition-colors even:bg-[#fafafa]" {...props}>
              {children}
            </tr>
          ),
          td: ({ children, ...props }) => (
            <td className="py-3 px-4 text-xs sm:text-sm text-[#334155] border-r border-[#e2e8f0] last:border-r-0 leading-relaxed align-top text-left font-normal">
              {children}
            </td>
          ),

          // Executive Report Headings
          h1: ({ children, ...props }) => (
            <h1 className="text-xl md:text-2xl font-black text-[#0b2447] mt-8 mb-4 border-b-2 border-[#0b50d0] pb-2 tracking-tight flex items-center gap-2" {...props}>
              <span className="w-2 h-6 bg-[#0b50d0] rounded-sm inline-block flex-shrink-0" />
              <span>{children}</span>
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-lg md:text-xl font-black text-[#0b2447] mt-7 mb-3 pl-3 border-l-4 border-[#0b50d0] tracking-tight bg-[#e8f0ff]/40 py-1.5 rounded-r-lg" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-base md:text-lg font-black text-[#0b2447] mt-6 mb-2.5 tracking-tight flex items-center gap-2 bg-[#f8fafc] px-3 py-1.5 rounded-lg border border-[#e2e8f4]" {...props}>
              <span className="w-2 h-2 bg-[#0b50d0] rounded-sm inline-block flex-shrink-0 rotate-45" />
              <span>{children}</span>
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 className="text-sm md:text-base font-bold text-[#0b50d0] mt-4 mb-2" {...props}>
              {children}
            </h4>
          ),

          // Executive Callout Box (Blockquote)
          blockquote: ({ children, ...props }) => (
            <blockquote className="my-5 border-l-4 border-[#0b50d0] bg-[#f8fafc] p-4 md:p-5 rounded-r-xl font-medium text-[#1e293b] leading-relaxed text-sm md:text-base border border-[#e2e8f4] border-l-0" {...props}>
              <div className="flex items-start gap-2.5">
                <span className="text-[#0b50d0] text-xl font-black leading-none select-none">“</span>
                <div className="flex-1 space-y-1">{children}</div>
              </div>
            </blockquote>
          ),

          // Clear Paragraphs with proper breathing room
          p: ({ children, ...props }) => (
            <p className="text-[#475069] text-base leading-[1.85] my-3.5 font-normal text-justify tracking-normal" {...props}>
              {children}
            </p>
          ),

          // Lists
          ul: ({ children, ...props }) => (
            <ul className="list-disc pl-5 my-4 space-y-2 text-[#475069] leading-relaxed marker:text-[#0b50d0] marker:font-black" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal pl-5 my-4 space-y-2 text-[#475069] leading-relaxed marker:text-[#0b50d0] marker:font-bold" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="text-[#475069] text-sm md:text-base leading-[1.75] font-normal pl-1" {...props}>
              {children}
            </li>
          ),

          // Emphasized Keywords
          strong: ({ children, ...props }) => (
            <strong className="font-bold text-[#0b2447] bg-[#e8f0ff]/80 px-1 py-0.5 rounded mx-0.5">
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em className="italic text-[#0b2447] font-semibold">
              {children}
            </em>
          ),

          // Code
          code: ({ children, ...props }) => (
            <code className="bg-[#f1f5f9] border border-[#cbd5e1] px-1.5 py-0.5 rounded font-mono text-xs text-[#0b50d0] font-semibold">
              {children}
            </code>
          ),

          // Image rendering (Supports Base64 Data URI and Remote URLs)
          img: ({ src, alt, ...props }) => {
            if (!src) return null;
            return (
              <span className="my-8 flex flex-col items-center justify-center">
                <img
                  src={typeof src === 'string' ? src : ''}
                  alt={alt || '기획안 도판'}
                  className="rounded-2xl border-2 border-[#cbd5e1] shadow-md max-w-full h-auto object-cover max-h-[520px]"
                  loading="lazy"
                  {...props}
                />
                {alt && (
                  <span className="text-xs text-[#64748b] font-medium mt-2.5 bg-[#f8fafc] px-3 py-1 rounded-full border border-[#e2e8f0]">
                    [도판] {alt}
                  </span>
                )}
              </span>
            );
          },

          hr: () => (
            <hr className="my-6 border-t border-[#e2e8f0]" />
          ),
        }}
      >
        {normalized}
      </Markdown>
    </div>
  );
}
