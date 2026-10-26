import {
  compileBooleanSearch,
  isBooleanSearch,
} from 'src/engine/core-modules/search/utils/compile-boolean-search';
import { formatSearchTerms } from 'src/engine/core-modules/search/utils/format-search-terms';

describe('Boolean search', () => {
  it.each([
    ['engineer AND Dubai', "('engineer':* & 'Dubai':*)"],
    ['engineer OR recruiter', "('engineer':* | 'recruiter':*)"],
    ['engineer NOT junior', "('engineer':* & !('junior':*))"],
    ['engineer AND NOT junior', "('engineer':* & !('junior':*))"],
    ['NOT junior', "!('junior':*)"],
    ['not not junior', "!(!('junior':*))"],
    ['a OR b AND NOT c', "('a':* | ('b':* & !('c':*)))"],
    ['(a OR b) AND c', "((('a':* | 'b':*)) & 'c':*)"],
    ['(a OR b) c', "((('a':* | 'b':*)) & 'c':*)"],
    ['"sales manager" AND Dubai', "(('sales' <-> 'manager') & 'Dubai':*)"],
    ['"AND OR NOT"', "('AND' <-> 'OR' <-> 'NOT')"],
    ['goutham, gowtham', "('goutham':* | 'gowtham':*)"],
    ['a && b || !c', "(('a':* & 'b':*) | !('c':*))"],
    ['a -b', "('a':* & !('b':*))"],
    ['recruit* AND Dubai', "('recruit':* & 'Dubai':*)"],
    ["O'Reilly AND R&D", "(('O\\'Reilly':* & 'R':*) & 'D':*)"],
    ['"Gowtham Vijayaragavan"', "('Gowtham' <-> 'Vijayaragavan')"],
  ])('compiles %s with precedence and literal escaping', (input, expected) => {
    expect(compileBooleanSearch(input)).toBe(expected);
    expect(formatSearchTerms(input, 'and')).toBe(expected);
    expect(formatSearchTerms(input, 'or')).toBe(expected);
  });

  it.each([
    'a AND',
    'OR a',
    'a OR OR b',
    '(a OR b',
    'a)',
    '()',
    '""',
    '"unclosed',
    '*engineer',
    'engi*neer',
    '*',
    'a AND ()',
  ])('rejects malformed syntax: %s', (input) => {
    expect(() => compileBooleanSearch(input)).toThrow(
      'Invalid Boolean search:',
    );
  });

  it('does not interpret ordinary words or hyphens inside a word as operators', () => {
    expect(isBooleanSearch('Andrew Norton')).toBe(false);
    expect(isBooleanSearch('front-end')).toBe(false);
    expect(formatSearchTerms('my search input', 'or')).toBe(
      'my:* | search:* | input:*',
    );
  });

  it('bounds nesting and token count with useful input errors', () => {
    expect(() =>
      compileBooleanSearch('('.repeat(33) + 'a' + ')'.repeat(33)),
    ).toThrow('32 nested');
    expect(() =>
      compileBooleanSearch(Array(258).fill('a').join(' OR ')),
    ).toThrow('256 terms');
  });
});
