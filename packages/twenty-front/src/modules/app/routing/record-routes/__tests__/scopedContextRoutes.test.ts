import { FieldMetadataType, RelationType } from 'twenty-shared/types';

import {
  getRecordContextRouteDefinitions,
  type RecordContextRouteDefinition,
} from '@/app/routing/record-routes/recordContextRoutes';
import { getRecordContextRouteReadPlan } from '@/app/routing/record-routes/recordContextRouteReadPlan';
import { type RecordRouteDefinition } from '@/app/routing/record-routes/recordRouteDefinitions';
import {
  resolveNativeRecordContext,
  type NativeContextRead,
} from '@/app/routing/record-routes/resolveNativeRecordContext';

const uuid = (number: number) =>
  `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const definition: RecordContextRouteDefinition = {
  path: '/workflows/:workflowIdentifier/versions/:versionIdentifier',
  objectNameSingular: 'workflowVersion',
  objectNamePlural: 'workflowVersions',
  recordIdentifier: {
    parameter: 'versionIdentifier',
    field: 'versionNumber',
    scopedBy: ['workflowIdentifier'],
  },
  relations: [
    {
      parameter: 'workflowIdentifier',
      objectNameSingular: 'workflow',
      field: 'workflow',
    },
  ],
};
const endpoints: RecordRouteDefinition[] = [
  {
    path: '/workflows',
    objectNameSingular: 'workflow',
    objectNamePlural: 'workflows',
    recordIdentifierField: 'workflowNumber',
  },
];
const numberField = (name: string) => ({
  name,
  isActive: true,
  type: FieldMetadataType.NUMBER,
});
const metadata = [
  {
    nameSingular: 'workflowVersion',
    namePlural: 'workflowVersions',
    canRead: true,
    fields: [
      numberField('versionNumber'),
      {
        name: 'workflow',
        isActive: true,
        type: FieldMetadataType.RELATION,
        relation: {
          type: RelationType.MANY_TO_ONE,
          targetObjectMetadata: { nameSingular: 'workflow' },
        },
      },
    ],
  },
  {
    nameSingular: 'workflow',
    namePlural: 'workflows',
    canRead: true,
    fields: [numberField('workflowNumber')],
  },
];
const relationPaths = getRecordContextRouteReadPlan(
  definition,
  metadata,
  endpoints,
)!;
function fixture() {
  const records: Record<string, Record<string, unknown>[]> = {
    workflow: [
      { id: uuid(1), workflowNumber: 9 },
      { id: uuid(2), workflowNumber: 10 },
    ],
    workflowVersion: [
      { id: uuid(11), versionNumber: 1, workflowId: uuid(1), name: 'Editable' },
      { id: uuid(12), versionNumber: 1, workflowId: uuid(2), name: 'v99' },
    ],
  };
  const read: NativeContextRead = jest.fn(async (name, _fields, filter) =>
    records[name]
      .filter((record) =>
        Object.entries(filter).every(
          ([field, comparison]) =>
            record[field] === (comparison as { eq: unknown }).eq,
        ),
      )
      .map((record) => ({ ...record })),
  );
  return { records, read };
}
const target = { identifiers: { workflowIdentifier: 9, versionIdentifier: 1 } };
const ready = {
  status: 'ready',
  recordId: uuid(11),
  path: '/workflows/9/versions/1',
};
afterEach(() => {
  (
    window as Window & { __TWENTY_RECORD_CONTEXT_ROUTES__?: unknown }
  ).__TWENTY_RECORD_CONTEXT_ROUTES__ = [];
});

it('accepts an explicit direct native parent scope and clones its parameters', () => {
  (
    window as Window & { __TWENTY_RECORD_CONTEXT_ROUTES__?: unknown }
  ).__TWENTY_RECORD_CONTEXT_ROUTES__ = [definition];
  const parsed = getRecordContextRouteDefinitions();
  expect(parsed).toEqual([definition]);
  expect(parsed[0].recordIdentifier?.scopedBy).not.toBe(
    definition.recordIdentifier?.scopedBy,
  );
});
it.each(
  [
    [],
    ['missing'],
    ['workflowIdentifier', 'workflowIdentifier'],
    'workflowIdentifier',
  ].map((scopedBy) => ({ scopedBy })),
)('rejects invalid scope %j', ({ scopedBy }) => {
  (
    window as Window & { __TWENTY_RECORD_CONTEXT_ROUTES__?: unknown }
  ).__TWENTY_RECORD_CONTEXT_ROUTES__ = [
    {
      ...definition,
      recordIdentifier: { ...definition.recordIdentifier, scopedBy },
    },
  ];
  expect(getRecordContextRouteDefinitions()).toEqual([]);
});
it('requires a direct readable many-to-one scope and numeric native ordinal', () => {
  expect(relationPaths.workflowIdentifier).toEqual([
    { field: 'workflow', objectNameSingular: 'workflow' },
  ]);
  for (const objectIndex of [0, 1]) {
    const inaccessible = metadata.map((object, index) => ({
      ...object,
      canRead: index !== objectIndex,
    }));
    expect(
      getRecordContextRouteReadPlan(definition, inaccessible, endpoints),
    ).toBeNull();
  }
  const indirect = {
    ...definition,
    relations: [
      { ...definition.relations[0], field: undefined, fieldPath: ['workflow'] },
    ],
  };
  expect(
    getRecordContextRouteReadPlan(indirect, metadata, endpoints),
  ).toBeNull();
});
it('resolves repeated ordinals under different workflows without using editable labels', async () => {
  const { read } = fixture();
  const options = { endpoints, read, relationPaths };
  expect(await resolveNativeRecordContext(definition, target, options)).toEqual(
    ready,
  );
  expect(
    await resolveNativeRecordContext(
      definition,
      { recordId: uuid(11) },
      options,
    ),
  ).toEqual(ready);
  expect(
    await resolveNativeRecordContext(
      definition,
      {
        identifiers: { workflowIdentifier: 10, versionIdentifier: 1 },
      },
      options,
    ),
  ).toEqual({
    status: 'ready',
    recordId: uuid(12),
    path: '/workflows/10/versions/1',
  });
  expect(read).toHaveBeenCalledWith('workflowVersion', expect.any(Array), {
    versionNumber: { eq: 1 },
    workflowId: { eq: uuid(1) },
  });
});
it('rejects duplicate ordinals inside one workflow for both path and UUID links', async () => {
  const { records, read } = fixture();
  records.workflowVersion.push({ ...records.workflowVersion[0], id: uuid(13) });
  for (const selector of [target, { recordId: uuid(11) }]) {
    expect(
      await resolveNativeRecordContext(definition, selector, {
        endpoints,
        read,
        relationPaths,
      }),
    ).toEqual({ status: 'duplicate' });
  }
});
it('rejects duplicated parent numbers before reading a scoped version', async () => {
  const { records, read } = fixture();
  records.workflow.push({ id: uuid(3), workflowNumber: 9 });
  expect(
    await resolveNativeRecordContext(definition, target, {
      endpoints,
      read,
      relationPaths,
    }),
  ).toEqual({ status: 'duplicate' });
  expect(read).not.toHaveBeenCalledWith(
    'workflowVersion',
    expect.anything(),
    expect.anything(),
  );
});
it('does not fall back to another workflow when the requested scoped number is missing', async () => {
  const { records, read } = fixture();
  records.workflowVersion.shift();
  expect(
    await resolveNativeRecordContext(definition, target, {
      endpoints,
      read,
      relationPaths,
    }),
  ).toEqual({ status: 'missing' });
});
it('rejects a parent change between the first read and final identity verification', async () => {
  const { read, records } = fixture();
  let versionReads = 0;
  const changingRead: NativeContextRead = async (...args) => {
    if (args[0] === 'workflowVersion' && ++versionReads === 2) {
      records.workflowVersion[0].workflowId = uuid(2);
    }
    return read(...args);
  };
  expect(
    await resolveNativeRecordContext(definition, target, {
      endpoints,
      read: changingRead,
      relationPaths,
    }),
  ).not.toEqual(expect.objectContaining({ status: 'ready' }));
});
it('fails closed on unreadable parents and does not create any native identities', async () => {
  const { read } = fixture();
  const denied: NativeContextRead = async (...args) => {
    if (args[0] === 'workflow') throw Error('Permission denied');
    return read(...args);
  };
  expect(
    await resolveNativeRecordContext(definition, target, {
      endpoints,
      read: denied,
      relationPaths,
    }),
  ).toEqual({ status: 'error' });
});
