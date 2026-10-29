import { isMatchingRawJsonFilter } from '@/utils/filter/utils/isMatchingRawJsonFilter';

describe('isMatchingRawJsonFilter', () => {
  describe('like', () => {
    it('preserves SQL LIKE case sensitivity', () => {
      expect(
        isMatchingRawJsonFilter({
          rawJsonFilter: { like: '%mixed@example.invalid%' },
          value: 'MiXeD@Example.invalid',
        }),
      ).toBe(false);
    });

    it('should match using wildcard pattern', () => {
      expect(
        isMatchingRawJsonFilter({
          rawJsonFilter: { like: '%test%' },
          value: 'some test value',
        }),
      ).toBe(true);
    });

    it('should not match when pattern does not match', () => {
      expect(
        isMatchingRawJsonFilter({
          rawJsonFilter: { like: '%xyz%' },
          value: 'some test value',
        }),
      ).toBe(false);
    });

    it('should treat regex metacharacters in the pattern literally', () => {
      expect(() =>
        isMatchingRawJsonFilter({
          rawJsonFilter: { like: '%(%' },
          value: 'some (test) value',
        }),
      ).not.toThrow();

      expect(
        isMatchingRawJsonFilter({
          rawJsonFilter: { like: '%(test)%' },
          value: 'some (test) value',
        }),
      ).toBe(true);

      expect(
        isMatchingRawJsonFilter({
          rawJsonFilter: { like: '%a.c%' },
          value: 'abc',
        }),
      ).toBe(false);
    });

    it('should match across lines', () => {
      expect(
        isMatchingRawJsonFilter({
          rawJsonFilter: { like: '%value%' },
          value: { key: 'value' } as any,
        }),
      ).toBe(true);
    });
  });

  describe('ilike', () => {
    it('matches structured additional email and secondary link values', () => {
      expect(
        isMatchingRawJsonFilter({
          rawJsonFilter: { ilike: '%"mixed@example.invalid"%' },
          value: ['MiXeD@Example.invalid'],
        }),
      ).toBe(true);
      expect(
        isMatchingRawJsonFilter({
          rawJsonFilter: { ilike: '%linkedin.com/in/mixed%' },
          value: [{ url: 'https://www.LinkedIn.com/in/MiXeD' }],
        }),
      ).toBe(true);
    });

    it.each([
      ['%mixed@example.invalid%', 'MiXeD@Example.invalid', true],
      ['%other@example.invalid%', 'MiXeD@Example.invalid', false],
      ['%linkedin.com/in/mixed%', 'https://www.LinkedIn.com/in/MiXeD', true],
      [String.raw`%a\_b\%c%`, 'A_B%C', true],
      [String.raw`%a\_b\%c%`, 'AxBzzzC', false],
      ["%x' OR true --%", "X' OR true --", true],
      [String.raw`%a.c%`, 'abc', false],
    ])('matches %s against %s as %s', (pattern, value, expected) => {
      expect(
        isMatchingRawJsonFilter({ rawJsonFilter: { ilike: pattern }, value }),
      ).toBe(expected);
    });
  });

  describe('is', () => {
    it('should match NULL check', () => {
      expect(
        isMatchingRawJsonFilter({
          rawJsonFilter: { is: 'NULL' },
          value: null as any,
        }),
      ).toBe(true);
    });

    it('should match NOT_NULL check', () => {
      expect(
        isMatchingRawJsonFilter({
          rawJsonFilter: { is: 'NOT_NULL' },
          value: '{"key": "val"}',
        }),
      ).toBe(true);
    });
  });

  describe('default', () => {
    it('should throw for unexpected filter', () => {
      expect(() =>
        isMatchingRawJsonFilter({
          rawJsonFilter: {} as any,
          value: 'test',
        }),
      ).toThrow('Unexpected value for string filter');
    });
  });
});
