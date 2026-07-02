/**
 * Tiny, dependency-free markdown parser for Shamwari's assistant replies.
 *
 * The chat system prompt asks Claude for "bold, bullet points, no headings",
 * so we only need to handle the small subset the model actually emits:
 *   - **bold** inline spans
 *   - `- ` / `* ` bullet lists
 *   - blank-line-separated paragraphs
 *   - (defensively) `#`-style headings, rendered as a bold paragraph
 *
 * Keeping this native avoids pulling react-markdown + a remark pipeline into
 * the mobile bundle. The parser is pure so it can be unit-tested in isolation,
 * and MarkdownText.tsx turns the block tree into React Native <Text> nodes.
 */

export type InlineSpan = {
  text: string;
  bold: boolean;
};

export type MarkdownBlock =
  | { type: 'paragraph'; spans: InlineSpan[] }
  | { type: 'bullet'; items: InlineSpan[][] };

/**
 * Split a line into bold / normal spans on `**` delimiters.
 *
 * Segments between paired `**` markers are bold; text outside them is normal.
 * An unpaired trailing `**` degrades gracefully (the remainder is treated as a
 * bold run) rather than throwing — robustness beats strict correctness here.
 */
export function parseInline(text: string): InlineSpan[] {
  const parts = text.split('**');
  const spans: InlineSpan[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '') continue;
    spans.push({ text: parts[i], bold: i % 2 === 1 });
  }
  return spans.length > 0 ? spans : [{ text: '', bold: false }];
}

const BULLET_RE = /^[-*]\s+(.*)$/;
const HEADING_RE = /^#{1,6}\s+(.*)$/;

/** Parse assistant markdown text into a flat list of renderable blocks. */
export function parseMarkdown(input: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = input.replace(/\r\n/g, '\n').split('\n');

  let paragraph: string[] = [];
  let bullets: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', spans: parseInline(paragraph.join(' ')) });
      paragraph = [];
    }
  };
  const flushBullets = () => {
    if (bullets.length > 0) {
      blocks.push({ type: 'bullet', items: bullets.map(parseInline) });
      bullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    const bulletMatch = line.match(BULLET_RE);
    const headingMatch = line.match(HEADING_RE);

    if (bulletMatch) {
      flushParagraph();
      bullets.push(bulletMatch[1]);
    } else if (headingMatch) {
      flushParagraph();
      flushBullets();
      blocks.push({ type: 'paragraph', spans: [{ text: headingMatch[1], bold: true }] });
    } else if (line === '') {
      flushParagraph();
      flushBullets();
    } else {
      flushBullets();
      paragraph.push(line);
    }
  }

  flushParagraph();
  flushBullets();
  return blocks;
}
