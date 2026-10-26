import { getSafeMarkdownUrl } from '@/activities/files/utils/getSafeMarkdownUrl';

describe('getSafeMarkdownUrl', () => {
  it('should keep http, https and mailto URLs', () => {
    expect(getSafeMarkdownUrl('https://example.com/a?b=c')).toBe(
      'https://example.com/a?b=c',
    );
    expect(getSafeMarkdownUrl('http://example.com/')).toBe(
      'http://example.com/',
    );
    expect(getSafeMarkdownUrl('mailto:someone@example.com')).toBe(
      'mailto:someone@example.com',
    );
    expect(getSafeMarkdownUrl('  HTTPS://Example.com/x ')).toBe(
      'https://example.com/x',
    );
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    '  javascript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'tel:+971500000000',
    'ftp://example.com/file',
  ])('should drop the unsafe scheme %p', (url) => {
    expect(getSafeMarkdownUrl(url)).toBeUndefined();
  });

  it.each([
    './relative.png',
    '../up.png',
    '/absolute/path',
    '//evil.example.com/x',
    '#anchor',
    'example.com',
    '',
  ])('should drop the non-absolute URL %p', (url) => {
    expect(getSafeMarkdownUrl(url)).toBeUndefined();
  });

  it('should drop missing URLs', () => {
    expect(getSafeMarkdownUrl(undefined)).toBeUndefined();
    expect(getSafeMarkdownUrl(null)).toBeUndefined();
  });
});
