import { isMarkdownExtension } from '@/activities/files/utils/isMarkdownExtension';

describe('isMarkdownExtension', () => {
  it.each(['md', 'markdown', '.md', '.markdown', 'MD', '.Markdown', ' .md '])(
    'should recognise %p as markdown',
    (extension) => {
      expect(isMarkdownExtension(extension)).toBe(true);
    },
  );

  it.each(['txt', '.mdx', 'mdown', 'md.txt', '', '.', 'html'])(
    'should not recognise %p as markdown',
    (extension) => {
      expect(isMarkdownExtension(extension)).toBe(false);
    },
  );

  it('should not recognise a missing extension', () => {
    expect(isMarkdownExtension(undefined)).toBe(false);
    expect(isMarkdownExtension(null)).toBe(false);
  });
});
