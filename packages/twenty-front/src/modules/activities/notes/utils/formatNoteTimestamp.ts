import { isValid, parseISO } from 'date-fns';

const NOTE_TIME_ZONE = 'Asia/Dubai';

const noteDateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: NOTE_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export const formatNoteTimestamp = (value: string | null | undefined) => {
  // A date without an offset cannot establish an exact instant.
  if (!value || !/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    return null;
  }

  const date = parseISO(value);

  if (!isValid(date)) {
    return null;
  }

  return `${noteDateTimeFormat.format(date)} Dubai (UTC+04:00)`;
};
