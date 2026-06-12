'use client';

import React, { useState } from 'react';
import { Check, Copy, Square, CheckSquare } from 'lucide-react';

interface Block {
  type: 'paragraph' | 'heading' | 'list' | 'code' | 'blockquote' | 'table' | 'hr';
  level?: number;
  ordered?: boolean;
  language?: string;
  items?: string[];
  rows?: string[][];
  headers?: string[];
  content?: string;
}

// Inline Markdown Parser: parses bold, inline code, and links safely into JSX nodes
function renderInline(text: string): React.ReactNode[] {
  const regex = /(\*\*.*?\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-[#F8F6F0]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[#00D4FF] font-mono text-[10.5px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          className="text-cyan-400 hover:text-cyan-300 underline font-medium"
          target="_blank"
          rel="noreferrer"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}

// Block-level Markdown Parser
export function parseMarkdown(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      i++;
      continue;
    }

    // 1. Code Block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      let code = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code += lines[i] + '\n';
        i++;
      }
      blocks.push({
        type: 'code',
        language: lang || 'plaintext',
        content: code.trim(),
      });
      i++; // skip closing ```
      continue;
    }

    // 2. Table
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length > 0) {
        const parseRow = (rowStr: string) => {
          const content = rowStr.replace(/^\|/, '').replace(/\|$/, '');
          return content.split('|').map((cell) => cell.trim());
        };

        const headerRow = parseRow(tableLines[0]);
        let dataStartIndex = 1;
        if (tableLines[1] && tableLines[1].includes('-') && tableLines[1].includes('|')) {
          dataStartIndex = 2;
        }

        const rows: string[][] = [];
        for (let r = dataStartIndex; r < tableLines.length; r++) {
          rows.push(parseRow(tableLines[r]));
        }

        blocks.push({
          type: 'table',
          headers: headerRow,
          rows: rows,
        });
      }
      continue;
    }

    // 3. Blockquote
    if (trimmed.startsWith('>')) {
      let quote = '';
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quote += lines[i].trim().replace(/^>\s?/, '') + '\n';
        i++;
      }
      blocks.push({
        type: 'blockquote',
        content: quote.trim(),
      });
      continue;
    }

    // 4. Headings
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        blocks.push({
          type: 'heading',
          level: match[1].length,
          content: match[2].trim(),
        });
        i++;
        continue;
      }
    }

    // 5. Unordered List (Checklist or Bullets)
    if (
      trimmed.startsWith('- ') ||
      trimmed.startsWith('* ') ||
      trimmed.startsWith('- [ ]') ||
      trimmed.startsWith('- [x]')
    ) {
      const items: string[] = [];
      while (i < lines.length) {
        const currentTrim = lines[i].trim();
        if (
          currentTrim.startsWith('- ') ||
          currentTrim.startsWith('* ') ||
          currentTrim.startsWith('- [ ]') ||
          currentTrim.startsWith('- [x]')
        ) {
          items.push(currentTrim);
          i++;
        } else if (currentTrim === '') {
          if (
            lines[i + 1] &&
            (lines[i + 1].trim().startsWith('- ') ||
              lines[i + 1].trim().startsWith('* ') ||
              lines[i + 1].trim().startsWith('- ['))
          ) {
            i++;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      blocks.push({
        type: 'list',
        ordered: false,
        items: items,
      });
      continue;
    }

    // 6. Ordered List
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const currentTrim = lines[i].trim();
        if (/^\d+\.\s+/.test(currentTrim)) {
          items.push(currentTrim);
          i++;
        } else if (currentTrim === '') {
          if (lines[i + 1] && /^\d+\.\s+/.test(lines[i + 1].trim())) {
            i++;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      blocks.push({
        type: 'list',
        ordered: true,
        items: items,
      });
      continue;
    }

    // 7. Horizontal Rule
    if (trimmed === '---' || trimmed === '***') {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 8. Paragraph
    let paragraphText = '';
    while (i < lines.length) {
      const currentLine = lines[i];
      const currentTrim = currentLine.trim();

      if (
        currentTrim === '' ||
        currentTrim.startsWith('```') ||
        currentTrim.startsWith('#') ||
        currentTrim.startsWith('>') ||
        currentTrim.startsWith('|') ||
        currentTrim.startsWith('- ') ||
        currentTrim.startsWith('* ') ||
        /^\d+\.\s+/.test(currentTrim) ||
        currentTrim === '---'
      ) {
        break;
      }

      paragraphText += (paragraphText ? ' ' : '') + currentTrim;
      i++;
    }
    blocks.push({
      type: 'paragraph',
      content: paragraphText,
    });
  }

  return blocks;
}

// Code Block renderer with copy-to-clipboard functionality
interface CodeBlockProps {
  code: string;
  language: string;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-white/[0.08] bg-[#03060f]/95 shadow-lg max-w-full font-mono text-[11px]">
      <div className="flex justify-between items-center px-4 py-2 bg-white/[0.02] border-b border-white/[0.06] text-[10px] text-slate-400 select-none uppercase tracking-wider font-semibold">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto text-slate-300 leading-relaxed font-mono whitespace-pre">
        {code}
      </div>
    </div>
  );
}

// Main Markdown component to display parsed blocks
export default function Markdown({ content }: { content: string }) {
  const blocks = parseMarkdown(content);

  return (
    <div className="space-y-3 text-slate-200">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            const headingClass =
              block.level === 1
                ? 'text-lg font-bold text-[#F8F6F0] mt-3 mb-2 pb-1 border-b border-white/[0.06]'
                : block.level === 2
                  ? 'text-base font-bold text-[#F8F6F0] mt-3 mb-1.5'
                  : 'text-sm font-bold text-[#F8F6F0] mt-2.5 mb-1';
            const HeadingTag =
              `h${Math.min(block.level || 3, 6)}` as keyof React.JSX.IntrinsicElements;
            return (
              <HeadingTag key={idx} className={headingClass}>
                {renderInline(block.content || '')}
              </HeadingTag>
            );
          }

          case 'paragraph':
            return (
              <p
                key={idx}
                className="leading-relaxed text-[11.5px] text-slate-300 whitespace-pre-wrap"
              >
                {renderInline(block.content || '')}
              </p>
            );

          case 'hr':
            return <hr key={idx} className="my-3 border-t border-white/[0.08]" />;

          case 'blockquote':
            return (
              <blockquote
                key={idx}
                className="pl-3.5 border-l-2 border-cyan-500/50 my-3 text-slate-400 italic text-[11.5px] bg-white/[0.01] py-1 rounded-r-md"
              >
                {renderInline(block.content || '')}
              </blockquote>
            );

          case 'list': {
            const ListTag = block.ordered ? 'ol' : 'ul';
            const listClass = block.ordered
              ? 'list-decimal pl-5 space-y-1 my-2 text-[11.5px] text-slate-300'
              : 'space-y-1.5 my-2 text-[11.5px] text-slate-300';

            return (
              <ListTag key={idx} className={listClass}>
                {block.items?.map((item, i) => {
                  let cleanedItem = item;
                  let prefix: React.ReactNode = null;

                  if (block.ordered) {
                    cleanedItem = item.replace(/^\d+\.\s+/, '');
                  } else {
                    if (item.startsWith('- [x]')) {
                      cleanedItem = item.slice(5).trim();
                      prefix = <CheckSquare className="w-3.5 h-3.5 text-[#00D4FF] shrink-0" />;
                    } else if (item.startsWith('- [ ]')) {
                      cleanedItem = item.slice(5).trim();
                      prefix = <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
                    } else if (item.startsWith('- ')) {
                      cleanedItem = item.slice(2).trim();
                      prefix = (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 shrink-0 mt-1.5" />
                      );
                    } else if (item.startsWith('* ')) {
                      cleanedItem = item.slice(2).trim();
                      prefix = (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 shrink-0 mt-1.5" />
                      );
                    }
                  }

                  return (
                    <li
                      key={i}
                      className={`flex items-start gap-2 ${block.ordered ? 'list-item list-inside' : ''}`}
                    >
                      {!block.ordered && prefix}
                      <span className="flex-1 leading-relaxed">{renderInline(cleanedItem)}</span>
                    </li>
                  );
                })}
              </ListTag>
            );
          }

          case 'code':
            return (
              <CodeBlock
                key={idx}
                code={block.content || ''}
                language={block.language || 'plaintext'}
              />
            );

          case 'table': {
            const hasHeaders = (block.headers?.length ?? 0) > 0;
            return (
              <div
                key={idx}
                className="my-3 overflow-x-auto rounded-xl border border-white/[0.08] shadow-md"
              >
                <table className="w-full border-collapse text-left text-[11px] leading-relaxed">
                  {hasHeaders && (
                    <thead>
                      <tr className="bg-white/[0.03] border-b border-white/[0.08] text-[#F8F6F0] font-bold">
                        {block.headers?.map((h, i) => (
                          <th key={i} className="px-3.5 py-2 hover:bg-white/[0.01]">
                            {renderInline(h)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-white/[0.04]">
                    {block.rows?.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={rIdx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.01]'}
                      >
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3.5 py-2 text-slate-300">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
