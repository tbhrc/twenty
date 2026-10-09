import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FieldMetadataType, RelationType } from 'twenty-shared/types';
import { RecordContextRouteGate } from '@/app/routing/record-routes/RecordContextRouteGate';
import {
  getRecordContextRouteDefinitions,
  type RecordContextRouteDefinition,
} from '@/app/routing/record-routes/recordContextRoutes';
import {
  getRecordContextRouteReadPlan,
  type RecordContextReadableObject,
} from '@/app/routing/record-routes/recordContextRouteReadPlan';
import {
  configureRecordRouteScope,
  resolveRecordContextRoute,
  getCachedContextRecordPath,
  getCachedContextRecordId,
} from '@/app/routing/record-routes/recordRouteCache';
import {
  resolveNativeRecordContext,
  type NativeContextRead,
} from '@/app/routing/record-routes/resolveNativeRecordContext';
import { type RecordRouteDefinition } from '@/app/routing/record-routes/recordRouteDefinitions';
import { getRecordRoutePath } from '@/app/routing/record-routes/getAppPath';
import { getRecordRouteTabLocation } from '@/app/routing/record-routes/recordRouteViews';
import { useParams } from '@/app/routing/record-routes/router';

jest.mock(
  '@/object-record/record-index/components/RecordIndexSkeletonLoader',
  () => ({ RecordIndexSkeletonLoader: () => <div>Loading context</div> }),
);
jest.mock('@/app/routing/components/WorkspaceRouteUnavailable', () => ({
  WorkspaceRouteUnavailable: () => <div>Unavailable context</div>,
}));
const uuid = (number: number) =>
  `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const sessionId = uuid(1),
  personId = uuid(2),
  applicationId = uuid(3),
  jobId = uuid(4),
  tabId = uuid(5);
const primary: RecordContextRouteDefinition = {
  path: '/person/:personIdentifier/assessments/GA1/:sessionIdentifier',
  objectNameSingular: 'ga1Session',
  objectNamePlural: 'ga1Sessions',
  recordIdentifier: { parameter: 'sessionIdentifier', field: 'sessionNumber' },
  relations: [
    {
      parameter: 'personIdentifier',
      objectNameSingular: 'person',
      field: 'person',
    },
  ],
  views: { files: tabId },
};
const alternate: RecordContextRouteDefinition = {
  ...primary,
  canonical: false,
  path: '/jobs/:jobIdentifier/person/:personIdentifier/assessments/GA1/:sessionIdentifier',
  relations: [
    {
      parameter: 'personIdentifier',
      objectNameSingular: 'person',
      field: 'person',
      verifyFieldPath: ['application', 'person'],
    },
    {
      parameter: 'jobIdentifier',
      objectNameSingular: 'job',
      fieldPath: ['application', 'job'],
    },
  ],
};
const endpoints: RecordRouteDefinition[] = [
  {
    path: '/person',
    objectNameSingular: 'person',
    objectNamePlural: 'people',
    recordIdentifierField: 'candidateNumber',
  },
  {
    path: '/jobs',
    objectNameSingular: 'job',
    objectNamePlural: 'jobs',
    recordIdentifierField: 'jobNumber',
  },
];
const numberField = (name: string) => ({
  name,
  isActive: true,
  type: FieldMetadataType.NUMBER,
});
const relationField = (name: string, target: string) => ({
  name,
  isActive: true,
  type: FieldMetadataType.RELATION,
  relation: {
    type: RelationType.MANY_TO_ONE,
    targetObjectMetadata: { nameSingular: target },
  },
});
const metadata = (): RecordContextReadableObject[] => [
  {
    nameSingular: 'ga1Session',
    namePlural: 'ga1Sessions',
    canRead: true,
    fields: [
      numberField('sessionNumber'),
      relationField('person', 'person'),
      relationField('application', 'application'),
    ],
  },
  {
    nameSingular: 'application',
    namePlural: 'applications',
    canRead: true,
    fields: [relationField('person', 'person'), relationField('job', 'job')],
  },
  {
    nameSingular: 'person',
    namePlural: 'people',
    canRead: true,
    fields: [numberField('candidateNumber')],
  },
  {
    nameSingular: 'job',
    namePlural: 'jobs',
    canRead: true,
    fields: [numberField('jobNumber')],
  },
];
const identifiers = {
  personIdentifier: 23,
  sessionIdentifier: 17,
  jobIdentifier: 9,
};
const primaryPath = '/person/23/assessments/GA1/17';
const alternatePath = '/jobs/9/person/23/assessments/GA1/17';
const configure = (routes: unknown) => {
  (
    window as Window & { __TWENTY_RECORD_CONTEXT_ROUTES__?: unknown }
  ).__TWENTY_RECORD_CONTEXT_ROUTES__ = routes;
};
function fixture() {
  const records: Record<string, Record<string, unknown>[]> = {
    ga1Session: [{ id: sessionId, sessionNumber: 17, personId, applicationId }],
    application: [{ id: applicationId, personId, jobId }],
    person: [{ id: personId, candidateNumber: 23 }],
    job: [{ id: jobId, jobNumber: 9 }],
  };
  const read: NativeContextRead = async (name, _fields, filter) =>
    records[name]
      .filter((row) =>
        Object.entries(filter).every(
          ([field, value]) => row[field] === (value as { eq: unknown }).eq,
        ),
      )
      .map((row) => ({ ...row }));
  return { records, read };
}
const plan = (definition: RecordContextRouteDefinition, objects = metadata()) =>
  getRecordContextRouteReadPlan(definition, objects, endpoints)!;
function scoped(
  read: NativeContextRead,
  paths = [primary.path, alternate.path],
) {
  configure([primary, alternate]);
  configureRecordRouteScope(
    'multiple-context-caller',
    [],
    null,
    ['ga1Session'],
    (definition, target) =>
      resolveNativeRecordContext(definition, target, {
        endpoints,
        read,
        relationPaths: plan(definition),
      }),
    paths,
  );
}
afterEach(() => {
  configure([]);
  configureRecordRouteScope(null, [], null);
});
it('accepts an explicit alternate for the same numbered source while rejecting two default paths', () => {
  configure([primary, alternate]);
  expect(getRecordContextRouteDefinitions()).toEqual([primary, alternate]);
  configure([primary, { ...alternate, canonical: undefined }]);
  expect(getRecordContextRouteDefinitions()).toEqual([primary]);
});
it.each([
  { ...alternate, canonical: true },
  { ...alternate, objectNamePlural: 'wrongSessions' },
  {
    ...alternate,
    recordIdentifier: {
      parameter: 'sessionIdentifier',
      field: 'differentNumber',
    },
  },
  {
    ...alternate,
    relations: [
      { ...alternate.relations[0], verifyFieldPath: ['application.person'] },
      alternate.relations[1],
    ],
  },
])(
  'rejects ambiguous identity or invalid verification configuration',
  (invalid) => {
    configure([primary, invalid]);
    expect(getRecordContextRouteDefinitions()).toEqual([primary]);
  },
);
it('does not permit an alternate without an earlier canonical numbered source', () => {
  configure([alternate]);
  expect(getRecordContextRouteDefinitions()).toEqual([]);
});
it('resolves both paths and retains the canonical generated href after alternate lookup', async () => {
  const { read } = fixture();
  scoped(read);
  expect(
    await resolveRecordContextRoute(primary, { recordId: sessionId }),
  ).toEqual({ status: 'ready', recordId: sessionId, path: primaryPath });
  expect(await resolveRecordContextRoute(alternate, { identifiers })).toEqual({
    status: 'ready',
    recordId: sessionId,
    path: alternatePath,
  });
  expect(getCachedContextRecordId('ga1Session', alternatePath)).toBe(sessionId);
  expect(getCachedContextRecordId('ga1Session', primaryPath)).toBe(sessionId);
  expect(getCachedContextRecordPath('ga1Session', sessionId)).toBe(primaryPath);
  expect(
    getRecordRoutePath({
      objectNameSingular: 'ga1Session',
      recordId: sessionId,
    }),
  ).toBe(primaryPath);
  expect(getRecordRouteTabLocation(alternatePath, tabId)).toEqual({
    pathname: alternatePath + '/files',
    hash: '',
  });
});
it.each([
  { ...identifiers, personIdentifier: 24 },
  { ...identifiers, jobIdentifier: 10 },
])('rejects mismatched parent selectors', async (selectors) => {
  const { read } = fixture();
  expect(
    await resolveNativeRecordContext(
      alternate,
      { identifiers: selectors },
      { endpoints, read, relationPaths: plan(alternate) },
    ),
  ).toEqual({ status: 'denied' });
});
it('rejects an Application belonging to a different Person even with the right Job', async () => {
  const { records, read } = fixture();
  records.application[0].personId = uuid(99);
  records.person.push({ id: uuid(99), candidateNumber: 24 });
  expect(
    await resolveNativeRecordContext(
      alternate,
      { identifiers },
      { endpoints, read, relationPaths: plan(alternate) },
    ),
  ).toEqual({ status: 'denied' });
});
it('does not infer an Application or Job for a standalone Session', async () => {
  const { records, read } = fixture();
  records.ga1Session[0].applicationId = null;
  scoped(read);
  expect(
    (await resolveRecordContextRoute(primary, { recordId: sessionId })).status,
  ).toBe('ready');
  expect(await resolveRecordContextRoute(alternate, { identifiers })).toEqual({
    status: 'missing',
  });
  expect(getCachedContextRecordPath('ga1Session', sessionId)).toBe(primaryPath);
});
it.each(['ga1Session', 'application', 'person', 'job'])(
  'requires caller access to %s for the alternate path',
  (objectName) => {
    const objects = metadata();
    objects.find((object) => object.nameSingular === objectName)!.canRead =
      false;
    expect(
      getRecordContextRouteReadPlan(alternate, objects, endpoints),
    ).toBeNull();
  },
);
it.each([
  [0, 'application'],
  [1, 'person'],
  [1, 'job'],
])('requires each intermediate relation field', (objectIndex, fieldName) => {
  const objects = metadata();
  const object = objects[Number(objectIndex)];
  object.fields = object.fields.filter((field) => field.name !== fieldName);
  expect(
    getRecordContextRouteReadPlan(alternate, objects, endpoints),
  ).toBeNull();
});
it('denies the alternate without a verified equality path', async () => {
  const { read } = fixture();
  const paths = plan(alternate);
  delete paths['personIdentifier:verify'];
  expect(
    await resolveNativeRecordContext(
      alternate,
      { identifiers },
      { endpoints, read, relationPaths: paths },
    ),
  ).toEqual({ status: 'denied' });
});
it('rechecks the Application Person and rejects reparenting during lookup', async () => {
  const { read } = fixture();
  let calls = 0;
  const changing: NativeContextRead = async (name, fields, filter) => {
    const rows = await read(name, fields, filter);
    if (name === 'application' && fields.includes('personId') && ++calls === 2)
      return rows.map((row) => ({ ...row, personId: uuid(99) }));
    return rows;
  };
  expect(
    await resolveNativeRecordContext(
      alternate,
      { identifiers },
      { endpoints, read: changing, relationPaths: plan(alternate) },
    ),
  ).toEqual({ status: 'denied' });
});
it('does not reuse canonical permissions for the alternate path', async () => {
  const { read } = fixture();
  scoped(read, [primary.path]);
  expect(
    (await resolveRecordContextRoute(primary, { recordId: sessionId })).status,
  ).toBe('ready');
  expect(await resolveRecordContextRoute(alternate, { identifiers })).toEqual({
    status: 'denied',
  });
});
it('does not coalesce concurrent reads for different paths on the same source UUID', async () => {
  const { read } = fixture();
  const calls: string[] = [];
  scoped(read);
  configureRecordRouteScope(
    'multiple-context-caller',
    [],
    null,
    ['ga1Session'],
    async (definition, target) => {
      calls.push(definition.path);
      return resolveNativeRecordContext(definition, target, {
        endpoints,
        read,
        relationPaths: plan(definition),
      });
    },
    [primary.path, alternate.path],
  );
  const results = await Promise.all([
    resolveRecordContextRoute(primary, { recordId: sessionId }),
    resolveRecordContextRoute(alternate, { recordId: sessionId }),
  ]);
  expect(calls).toEqual([primary.path, alternate.path]);
  expect(results.map((result) => result.status)).toEqual(['ready', 'ready']);
  expect(getCachedContextRecordPath('ga1Session', sessionId)).toBe(primaryPath);
});
it('removes a revoked alternate mapping without deleting the valid canonical href', async () => {
  const { records, read } = fixture();
  scoped(read);
  await resolveRecordContextRoute(primary, { recordId: sessionId });
  await resolveRecordContextRoute(alternate, { identifiers });
  records.ga1Session[0].applicationId = null;
  expect(await resolveRecordContextRoute(alternate, { identifiers })).toEqual({
    status: 'missing',
  });
  expect(getCachedContextRecordId('ga1Session', alternatePath)).toBeUndefined();
  expect(getCachedContextRecordPath('ga1Session', sessionId)).toBe(primaryPath);
});
const Probe = () => <div>Opened session {useParams().objectRecordId}</div>;
it('renders native content through the alternate route only after its complete relationship proof', async () => {
  const { read } = fixture();
  scoped(read);
  render(
    <MemoryRouter initialEntries={[alternatePath]}>
      <Routes>
        <Route
          path={alternate.path}
          element={
            <RecordContextRouteGate definition={alternate}>
              <Probe />
            </RecordContextRouteGate>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText(`Opened session ${sessionId}`);
});
