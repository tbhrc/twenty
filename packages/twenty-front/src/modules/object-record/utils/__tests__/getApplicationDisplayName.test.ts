import { getApplicationDisplayName } from '@/object-record/utils/getApplicationDisplayName';

const application = {
  __typename: 'Application',
  id: 'application-1',
  name: 'Sourced prospect',
  personId: 'person-1',
  person: { id: 'person-1', name: { firstName: 'Ada', lastName: 'Lovelace' } },
};

describe('getApplicationDisplayName', () => {
  it('uses the native related Person rather than a stored source classification', () => {
    expect(getApplicationDisplayName(application)).toBe('Ada Lovelace');
    expect(application.name).toBe('Sourced prospect');
  });

  it('does not use an unrelated Person', () => {
    expect(
      getApplicationDisplayName({ ...application, personId: 'person-2' }),
    ).toBe('');
  });

  it.each(['Sourced prospect', 'Inbound application', '  SOURCED PROSPECT  '])(
    'does not present %s as identity without a native Person',
    (name) => {
      expect(
        getApplicationDisplayName({
          __typename: 'Application',
          id: 'application-1',
          name,
        }),
      ).toBe('');
    },
  );

  it('preserves a useful stored identity when the native relation is unavailable', () => {
    expect(
      getApplicationDisplayName({
        __typename: 'Application',
        id: 'application-1',
        name: 'Grace Hopper',
        person: null,
      }),
    ).toBe('Grace Hopper');
  });

  it('handles missing, malformed and empty names without inventing an identity', () => {
    for (const person of [
      undefined,
      {},
      { id: 'person-1', name: 'Ada' },
      { id: 'person-1', name: { firstName: '', lastName: '' } },
    ]) {
      expect(getApplicationDisplayName({ ...application, person })).toBe('');
    }
  });
});
