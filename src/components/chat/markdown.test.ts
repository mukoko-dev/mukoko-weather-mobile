/**
 * Tests for the native markdown parser. Covers inline bold, bullet lists,
 * headings (defensive), paragraphs, and mixed content.
 */

import { parseInline, parseMarkdown } from '@/components/chat/markdown';

describe('parseInline', () => {
  it('returns a single normal span for plain text', () => {
    expect(parseInline('hello world')).toEqual([
      { text: 'hello world', bold: false },
    ]);
  });

  it('marks text between ** markers as bold', () => {
    expect(parseInline('a **b** c')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c', bold: false },
    ]);
  });

  it('handles a fully bold line', () => {
    expect(parseInline('**bold**')).toEqual([{ text: 'bold', bold: true }]);
  });

  it('never returns an empty span list', () => {
    expect(parseInline('')).toEqual([{ text: '', bold: false }]);
  });
});

describe('parseMarkdown', () => {
  it('parses a single paragraph', () => {
    const blocks = parseMarkdown('Just a line.');
    expect(blocks).toEqual([
      { type: 'paragraph', spans: [{ text: 'Just a line.', bold: false }] },
    ]);
  });

  it('groups consecutive bullet lines into one list', () => {
    const blocks = parseMarkdown('- one\n- two\n* three');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('bullet');
    if (blocks[0].type === 'bullet') {
      expect(blocks[0].items).toHaveLength(3);
      expect(blocks[0].items[0]).toEqual([{ text: 'one', bold: false }]);
    }
  });

  it('separates paragraphs from a following bullet list', () => {
    const blocks = parseMarkdown('Intro line\n\n- point a\n- point b');
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'bullet']);
  });

  it('renders headings as bold paragraphs', () => {
    const blocks = parseMarkdown('## Heading');
    expect(blocks).toEqual([
      { type: 'paragraph', spans: [{ text: 'Heading', bold: true }] },
    ]);
  });

  it('keeps bold spans inside bullet items', () => {
    const blocks = parseMarkdown('- **Harare**: sunny');
    if (blocks[0].type === 'bullet') {
      expect(blocks[0].items[0]).toEqual([
        { text: 'Harare', bold: true },
        { text: ': sunny', bold: false },
      ]);
    } else {
      throw new Error('expected a bullet block');
    }
  });
});
