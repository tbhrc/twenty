import { isValidUuid } from '@/utils/validation/isValidUuid';

describe('isValidUuid', () => {
  it('should return true for a valid UUID', () => {
    expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should return false for an invalid UUID', () => {
    expect(isValidUuid('invalid-uuid')).toBe(false);
    expect(isValidUuid('12345')).toBe(false);
    expect(isValidUuid('550e8400e29b41d4a716446655440000')).toBe(false);
    expect(isValidUuid('')).toBe(false);
    expect(isValidUuid('123e4567-e89b-12d3-a456-42661417400-')).toBe(false);
    expect(isValidUuid('123e4567-e89b-12d3-a456-42661417400')).toBe(false);
    expect(isValidUuid('123e4567-e89b-12d3-a456-42661417400)')).toBe(false);
    expect(isValidUuid('123e4567-e89b-12d3-a456-4266141740001')).toBe(false);
  });

  it.each([6, 7, 8])('accepts RFC 9562 version %i identities', (version) => {
    expect(isValidUuid(`123e4567-e89b-${version}2d3-a456-426614174000`)).toBe(true);
  });

  it.each([
    '123e4567-e89b-02d3-a456-426614174000',
    '123e4567-e89b-92d3-a456-426614174000',
    '123e4567-e89b-72d3-c456-426614174000',
  ])('rejects undefined versions and invalid variants: %s', (value) => {
    expect(isValidUuid(value)).toBe(false);
  });
});
