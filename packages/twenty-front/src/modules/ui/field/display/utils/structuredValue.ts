import { isPlainObject } from 'twenty-shared/utils';

export const parseStructuredValue = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) || isPlainObject(parsed) ? parsed : value;
  } catch {
    return value;
  }
};
export const isStructuredValue = (value: unknown): boolean =>
  Array.isArray(value) || isPlainObject(value);
export const structuredValueLabel = (key: string): string => {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
export const safeStructuredValueUrl = (value: string): string | undefined => {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
};
