import { FieldMetadataType, RelationType } from 'twenty-shared/types';

import { type RecordRouteDefinition } from '../recordRouteDefinitions';
import {
  resolveRetiredPersonRoute,
  type RetirementAliasObject,
  type RetirementAliasRead,
} from '../resolveRetiredPersonRoute';

const retiredId = '11111111-1111-4111-8111-111111111111';
const canonicalId = '22222222-2222-4222-8222-222222222222';
const aliasId = '33333333-3333-4333-8333-333333333333';
const definition: RecordRouteDefinition = {
  path: '/people',
  objectNameSingular: 'person',
  objectNamePlural: 'people',
  recordIdentifierField: 'candidateNumber',
};
const field = (name: string, type: FieldMetadataType) => ({
  name,
  type,
  isActive: true,
});
const createObjects = (): RetirementAliasObject[] => [
  {
    id: 'person-metadata',
    nameSingular: 'person',
    namePlural: 'people',
    isActive: true,
    canReadObjectRecords: true,
    readableFields: [
      field('id', FieldMetadataType.UUID),
      field('candidateNumber', FieldMetadataType.NUMBER),
      field('deletedAt', FieldMetadataType.DATE_TIME),
    ],
  },
  {
    id: 'alias-metadata',
    nameSingular: 'identityAlias',
    namePlural: 'identityAliases',
    isActive: true,
    canReadObjectRecords: true,
    readableFields: [
      field('id', FieldMetadataType.UUID),
      field('aliasType', FieldMetadataType.TEXT),
      field('aliasValue', FieldMetadataType.TEXT),
      field('deletedAt', FieldMetadataType.DATE_TIME),
      {
        ...field('person', FieldMetadataType.RELATION),
        relation: {
          type: RelationType.MANY_TO_ONE,
          targetObjectMetadata: {
            id: 'person-metadata',
            nameSingular: 'person',
            namePlural: 'people',
          },
        },
      },
    ],
  },
];
const alias = {
  id: aliasId,
  aliasType: 'retired_person_number',
  aliasValue: '71',
  deletedAt: null,
  personId: canonicalId,
};
const canonical = { id: canonicalId, candidateNumber: 29, deletedAt: null };
const createRead = (
  aliases: Record<string, unknown>[] = [alias],
  people: Record<string, unknown>[] = [canonical],
): jest.MockedFunction<RetirementAliasRead> =>
  jest
    .fn<ReturnType<RetirementAliasRead>, Parameters<RetirementAliasRead>>()
    .mockResolvedValueOnce({ records: aliases, complete: true })
    .mockResolvedValueOnce({ records: people, complete: true });

describe('retired Person route resolution', () => {
  it('reads the exact number alias then the active canonical Person', async () => {
    const read = createRead();
    expect(
      await resolveRetiredPersonRoute(
        definition,
        { recordIdentifier: 71 },
        {
          objects: createObjects(),
          read,
        },
      ),
    ).toEqual({ status: 'ready', recordId: canonicalId, recordIdentifier: 29 });
    expect(read.mock.calls).toEqual([
      [
        'identityAlias',
        ['id', 'aliasType', 'aliasValue', 'deletedAt', 'personId'],
        {
          and: [
            { aliasType: { eq: 'retired_person_number' } },
            { aliasValue: { eq: '71' } },
          ],
        },
      ],
      [
        'person',
        ['id', 'candidateNumber', 'deletedAt'],
        { id: { eq: canonicalId } },
      ],
    ]);
  });

  it('uses only the UUID alias namespace for a UUID target', async () => {
    const read = createRead([
      { ...alias, aliasType: 'retired_person_uuid', aliasValue: retiredId },
    ]);
    expect(
      await resolveRetiredPersonRoute(
        definition,
        { recordId: retiredId },
        {
          objects: createObjects(),
          read,
        },
      ),
    ).toEqual({ status: 'ready', recordId: canonicalId, recordIdentifier: 29 });
    expect(read.mock.calls[0][2]).toEqual({
      and: [
        { aliasType: { eq: 'retired_person_uuid' } },
        { aliasValue: { eq: retiredId } },
      ],
    });
  });

  it.each([0, 1])(
    'denies missing effective object read permission %s',
    async (index) => {
      const objects = createObjects();
      objects[index].canReadObjectRecords = false;
      const read = createRead();
      expect(
        await resolveRetiredPersonRoute(
          definition,
          { recordIdentifier: 71 },
          { objects, read },
        ),
      ).toEqual({ status: 'denied' });
      expect(read).not.toHaveBeenCalled();
    },
  );

  it.each([
    [0, 'id'],
    [0, 'candidateNumber'],
    [0, 'deletedAt'],
    [1, 'id'],
    [1, 'aliasType'],
    [1, 'aliasValue'],
    [1, 'deletedAt'],
    [1, 'person'],
  ] as const)('denies unreadable required field %s.%s', async (index, name) => {
    const objects = createObjects();
    objects[index].readableFields = objects[index].readableFields.filter(
      (item) => item.name !== name,
    );
    const read = createRead();
    expect(
      await resolveRetiredPersonRoute(
        definition,
        { recordIdentifier: 71 },
        { objects, read },
      ),
    ).toEqual({ status: 'denied' });
    expect(read).not.toHaveBeenCalled();
  });

  it('denies a relation to a foreign object', async () => {
    const objects = createObjects();
    const relation = objects[1].readableFields.find(
      (item) => item.name === 'person',
    )?.relation;
    if (!relation) throw new Error('missing test relation');
    relation.targetObjectMetadata.id = 'foreign-metadata';
    const read = createRead();
    expect(
      await resolveRetiredPersonRoute(
        definition,
        { recordIdentifier: 71 },
        { objects, read },
      ),
    ).toEqual({ status: 'denied' });
    expect(read).not.toHaveBeenCalled();
  });

  it('never resolves another object through Person aliases', async () => {
    const read = createRead();
    expect(
      await resolveRetiredPersonRoute(
        { ...definition, objectNameSingular: 'company' },
        { recordIdentifier: 71 },
        {
          objects: createObjects(),
          read,
        },
      ),
    ).toEqual({ status: 'missing' });
    expect(read).not.toHaveBeenCalled();
  });

  it.each([
    { aliasType: 'retired_person_uuid' },
    { aliasValue: '72' },
    { deletedAt: '2020-01-01T00:00:00Z' },
    { deletedAt: undefined },
    { personId: null },
    { personId: 'invalid' },
    { id: 'invalid' },
  ])('rejects mismatched or incomplete alias evidence %p', async (override) => {
    const read = createRead([{ ...alias, ...override }]);
    expect(
      await resolveRetiredPersonRoute(
        definition,
        { recordIdentifier: 71 },
        {
          objects: createObjects(),
          read,
        },
      ),
    ).toEqual({ status: 'error' });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it.each([
    { id: retiredId },
    { candidateNumber: null },
    { candidateNumber: 71 },
    { deletedAt: '2020-01-01T00:00:00Z' },
    { deletedAt: undefined },
  ])(
    'rejects mismatched, archived or unnumbered canonical Person %p',
    async (override) => {
      const read = createRead([alias], [{ ...canonical, ...override }]);
      expect(
        await resolveRetiredPersonRoute(
          definition,
          { recordIdentifier: 71 },
          {
            objects: createObjects(),
            read,
          },
        ),
      ).toEqual({ status: 'error' });
    },
  );

  it('rejects duplicate aliases even when both point to the same Person', async () => {
    const read = createRead([alias, { ...alias, id: retiredId }]);
    expect(
      await resolveRetiredPersonRoute(
        definition,
        { recordIdentifier: 71 },
        {
          objects: createObjects(),
          read,
        },
      ),
    ).toEqual({ status: 'duplicate' });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it.each([
    { records: [], complete: true, status: 'missing' },
    { records: [canonical], complete: false, status: 'error' },
    { records: [canonical, canonical], complete: true, status: 'duplicate' },
  ])(
    'fails closed for unavailable canonical evidence %s',
    async ({ records, complete, status }) => {
      const read = createRead()
        .mockReset()
        .mockResolvedValueOnce({ records: [alias], complete: true })
        .mockResolvedValueOnce({ records, complete });
      expect(
        await resolveRetiredPersonRoute(
          definition,
          { recordIdentifier: 71 },
          {
            objects: createObjects(),
            read,
          },
        ),
      ).toEqual({ status });
      expect(read).toHaveBeenCalledTimes(2);
    },
  );

  it('never follows another alias when the canonical Person is unavailable', async () => {
    const read = createRead([alias], []);
    expect(
      await resolveRetiredPersonRoute(
        definition,
        { recordIdentifier: 71 },
        {
          objects: createObjects(),
          read,
        },
      ),
    ).toEqual({ status: 'missing' });
    expect(read).toHaveBeenCalledTimes(2);
    expect(read.mock.calls.map(([objectName]) => objectName)).toEqual([
      'identityAlias',
      'person',
    ]);
  });

  it('rejects a UUID alias that points back to the retired UUID', async () => {
    const read = createRead([
      {
        ...alias,
        aliasType: 'retired_person_uuid',
        aliasValue: retiredId,
        personId: retiredId,
      },
    ]);
    expect(
      await resolveRetiredPersonRoute(
        definition,
        { recordId: retiredId },
        {
          objects: createObjects(),
          read,
        },
      ),
    ).toEqual({ status: 'error' });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it.each([
    { records: [], complete: true, status: 'missing' },
    { records: [alias], complete: false, status: 'error' },
  ])(
    'fails closed for unavailable alias evidence %s',
    async ({ records, complete, status }) => {
      const read = createRead()
        .mockReset()
        .mockResolvedValue({ records, complete });
      expect(
        await resolveRetiredPersonRoute(
          definition,
          { recordIdentifier: 71 },
          {
            objects: createObjects(),
            read,
          },
        ),
      ).toEqual({ status });
    },
  );

  it('fails closed when the original caller request is rejected', async () => {
    const read = createRead()
      .mockReset()
      .mockRejectedValue(new Error('denied'));
    expect(
      await resolveRetiredPersonRoute(
        definition,
        { recordIdentifier: 71 },
        {
          objects: createObjects(),
          read,
        },
      ),
    ).toEqual({ status: 'error' });
  });
});
