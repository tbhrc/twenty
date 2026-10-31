import { formatNoteTimestamp } from '@/activities/notes/utils/formatNoteTimestamp';

describe('formatNoteTimestamp', () => {
  it('shows the exact Dubai date, seconds and timezone', () => {
    expect(formatNoteTimestamp('2026-10-31T11:10:46.457Z')).toBe(
      '31 Oct 2026, 15:10:46 Dubai (UTC+04:00)',
    );
  });

  it('converts explicit offsets and rolls the date at midnight', () => {
    expect(formatNoteTimestamp('2026-12-31T20:00:00Z')).toBe(
      '01 Jan 2027, 00:00:00 Dubai (UTC+04:00)',
    );
    expect(formatNoteTimestamp('2026-10-31T15:10:46+04:00')).toBe(
      formatNoteTimestamp('2026-10-31T11:10:46Z'),
    );
  });

  it.each([
    null,
    undefined,
    '',
    'not a date',
    '2026-10-31',
    '2026-10-31T11:10:46',
    '2026-02-30T11:10:46Z',
  ])(
    'leaves missing, invalid or timezone-ambiguous dates unknown: %s',
    (value) => {
      expect(formatNoteTimestamp(value)).toBeNull();
    },
  );
});
