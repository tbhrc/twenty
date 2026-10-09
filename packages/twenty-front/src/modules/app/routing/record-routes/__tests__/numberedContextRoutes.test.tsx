import { render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
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
import { configureRecordRouteScope } from '@/app/routing/record-routes/recordRouteCache';
import { type RecordRouteDefinition } from '@/app/routing/record-routes/recordRouteDefinitions';
import {
  resolveNativeRecordContext,
  type NativeContextRead,
} from '@/app/routing/record-routes/resolveNativeRecordContext';
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
const reportId = uuid(1),
  sessionId = uuid(2),
  personId = uuid(3);
const definition: RecordContextRouteDefinition = {
  path: '/person/:personIdentifier/reports/GA1/:reportIdentifier',
  objectNameSingular: 'ga1Report',
  objectNamePlural: 'ga1Reports',
  recordIdentifier: { parameter: 'reportIdentifier', field: 'reportNumber' },
  relations: [
    {
      parameter: 'personIdentifier',
      objectNameSingular: 'person',
      fieldPath: ['session', 'person'],
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
    nameSingular: 'ga1Report',
    namePlural: 'ga1Reports',
    canRead: true,
    fields: [
      numberField('reportNumber'),
      relationField('session', 'ga1Session'),
    ],
  },
  {
    nameSingular: 'ga1Session',
    namePlural: 'ga1Sessions',
    canRead: true,
    fields: [relationField('person', 'person')],
  },
  {
    nameSingular: 'person',
    namePlural: 'people',
    canRead: true,
    fields: [numberField('candidateNumber')],
  },
];
const relationPaths = getRecordContextRouteReadPlan(
  definition,
  metadata(),
  endpoints,
)!;
function fixture() {
  const records: Record<string, Record<string, unknown>[]> = {
    ga1Report: [{ id: reportId, reportNumber: 17, sessionId }],
    ga1Session: [{ id: sessionId, personId }],
    person: [{ id: personId, candidateNumber: 23 }],
  };
  const read: NativeContextRead = async (name, _fields, filter) =>
    records[name]
      .filter((record) =>
        Object.entries(filter).every(
          ([field, comparison]) =>
            record[field] === (comparison as { eq: unknown }).eq,
        ),
      )
      .map((record) => ({ ...record }));
  return { records, read };
}
const target = { identifiers: { personIdentifier: 23, reportIdentifier: 17 } };
const ready = {
  status: 'ready',
  recordId: reportId,
  path: '/person/23/reports/GA1/17',
};
function configure(value: unknown) {
  (
    window as Window & { __TWENTY_RECORD_CONTEXT_ROUTES__?: unknown }
  ).__TWENTY_RECORD_CONTEXT_ROUTES__ = value;
}
afterEach(() => {
  configure([]);
  configureRecordRouteScope(null, [], null);
});

it('accepts the configured uppercase kind with own number and relation path', () => {
  configure([definition]);
  expect(getRecordContextRouteDefinitions()).toEqual([definition]);
});
it.each([
  {
    recordIdentifier: { parameter: 'personIdentifier', field: 'reportNumber' },
  },
  { recordIdentifier: undefined },
  {
    relations: [
      {
        parameter: 'personIdentifier',
        objectNameSingular: 'person',
        field: 'person',
        fieldPath: ['session', 'person'],
      },
    ],
  },
  {
    relations: [
      {
        parameter: 'personIdentifier',
        objectNameSingular: 'person',
        fieldPath: ['session.person'],
      },
    ],
  },
  {
    relations: [
      {
        parameter: 'personIdentifier',
        objectNameSingular: 'person',
        fieldPath: ['a', 'b', 'c', 'd'],
      },
    ],
  },
  { path: '/Settings/:personIdentifier/GA1/:reportIdentifier' },
])('rejects malformed or reserved route contracts %j', (patch) => {
  configure([{ ...definition, ...patch }]);
  expect(getRecordContextRouteDefinitions()).toEqual([]);
});

it('resolves a numbered report and native UUID to the same numeric-only canonical path', async () => {
  const { read } = fixture();
  expect(
    await resolveNativeRecordContext(definition, target, {
      endpoints,
      read,
      relationPaths,
    }),
  ).toEqual(ready);
  expect(
    await resolveNativeRecordContext(
      definition,
      { recordId: reportId },
      { endpoints, read, relationPaths },
    ),
  ).toEqual(ready);
});
it('rejects swapped Person/report selectors and missing native reports', async () => {
  const { read } = fixture();
  expect(
    await resolveNativeRecordContext(
      definition,
      { identifiers: { personIdentifier: 24, reportIdentifier: 17 } },
      { endpoints, read, relationPaths },
    ),
  ).toEqual({ status: 'denied' });
  expect(
    await resolveNativeRecordContext(
      definition,
      { identifiers: { personIdentifier: 23, reportIdentifier: 18 } },
      { endpoints, read, relationPaths },
    ),
  ).toEqual({ status: 'missing' });
});
it.each(['ga1Report', 'person'])(
  'rejects duplicate numbered %s identities',
  async (name) => {
    const { records, read } = fixture();
    records[name].push({ ...records[name][0], id: uuid(99) });
    expect(
      await resolveNativeRecordContext(definition, target, {
        endpoints,
        read,
        relationPaths,
      }),
    ).toEqual({ status: 'duplicate' });
  },
);
it('rejects inaccessible intermediate records and unverified metadata paths', async () => {
  const { read } = fixture();
  expect(
    await resolveNativeRecordContext(definition, target, { endpoints, read }),
  ).toEqual({ status: 'denied' });
  const denied: NativeContextRead = async (name, fields, filter) => {
    if (name === 'ga1Session') throw new Error('forbidden');
    return read(name, fields, filter);
  };
  expect(
    await resolveNativeRecordContext(definition, target, {
      endpoints,
      read: denied,
      relationPaths,
    }),
  ).toEqual({ status: 'error' });
});
it.each(['ga1Session', 'ga1Report'])(
  'rejects %s reparenting during lookup',
  async (name) => {
    const { read } = fixture();
    let calls = 0;
    const changed: NativeContextRead = async (object, fields, filter) => {
      const rows = await read(object, fields, filter);
      if (object === name && ++calls === 2)
        return rows.map((row) => ({
          ...row,
          [name === 'ga1Session' ? 'personId' : 'sessionId']: uuid(99),
        }));
      return rows;
    };
    expect(
      await resolveNativeRecordContext(definition, target, {
        endpoints,
        read: changed,
        relationPaths,
      }),
    ).toEqual({ status: 'denied' });
  },
);
it.each([0, -1, 1.2, Number.MAX_SAFE_INTEGER + 1])(
  'rejects non-positive/non-integral/unsafe report number %s',
  async (reportIdentifier) => {
    const { read } = fixture();
    expect(
      await resolveNativeRecordContext(
        definition,
        { identifiers: { personIdentifier: 23, reportIdentifier } },
        { endpoints, read, relationPaths },
      ),
    ).toEqual({ status: 'missing' });
  },
);
it('requires native object, number and relation permissions at every hop', () => {
  for (const index of [0, 1, 2]) {
    const objects = metadata();
    objects[index].canRead = false;
    expect(
      getRecordContextRouteReadPlan(definition, objects, endpoints),
    ).toBeNull();
  }
  for (const [index, field] of [
    [0, 'reportNumber'],
    [0, 'session'],
    [1, 'person'],
    [2, 'candidateNumber'],
  ] as const) {
    const objects = metadata();
    objects[index].fields = objects[index].fields.filter(
      (entry) => entry.name !== field,
    );
    expect(
      getRecordContextRouteReadPlan(definition, objects, endpoints),
    ).toBeNull();
  }
  const objects = metadata();
  objects[1].fields[0].relation!.type = RelationType.ONE_TO_MANY;
  expect(
    getRecordContextRouteReadPlan(definition, objects, endpoints),
  ).toBeNull();
  const incorrectTarget = metadata();
  incorrectTarget[0].fields[1].relation!.targetObjectMetadata.nameSingular =
    'person';
  expect(
    getRecordContextRouteReadPlan(definition, incorrectTarget, endpoints),
  ).toBeNull();
});
const Probe = () => (
  <div>
    Opened report {useParams().objectRecordId}
    <Link to="/person/23/reports/GA1/18">Other report</Link>
  </div>
);
const renderRoute = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={definition.path}
          element={
            <RecordContextRouteGate definition={definition}>
              <Probe />
            </RecordContextRouteGate>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
it('renders native record content only after the complete numbered route binding succeeds', async () => {
  configure([definition]);
  const { read } = fixture();
  configureRecordRouteScope(
    'synthetic-workspace-caller',
    [],
    null,
    ['ga1Report'],
    (route, selected) =>
      resolveNativeRecordContext(route, selected, {
        endpoints,
        read,
        relationPaths,
      }),
  );
  renderRoute('/person/23/reports/GA1/17/');
  await waitFor(() =>
    expect(screen.getByText(`Opened report ${reportId}`)).toBeInTheDocument(),
  );
});
it('re-resolves when only the report number changes and never retains the previous report on denial', async () => {
  configure([definition]);
  const { read } = fixture();
  configureRecordRouteScope(
    'synthetic-workspace-caller',
    [],
    null,
    ['ga1Report'],
    (route, selected) =>
      resolveNativeRecordContext(route, selected, {
        endpoints,
        read,
        relationPaths,
      }),
  );
  renderRoute('/person/23/reports/GA1/17/');
  await screen.findByText(`Opened report ${reportId}`);
  await userEvent.click(screen.getByRole('link', { name: 'Other report' }));
  await screen.findByText('Unavailable context');
  expect(
    screen.queryByText(`Opened report ${reportId}`),
  ).not.toBeInTheDocument();
});
it.each(['017', '0', '-1', '17.pdf', 'GA1-000017', uuid(17)])(
  'does not coerce report URL token %s into native identity',
  async (token) => {
    configure([definition]);
    const lookup = jest.fn();
    configureRecordRouteScope(
      'synthetic-workspace-caller',
      [],
      null,
      ['ga1Report'],
      lookup,
    );
    renderRoute(`/person/23/reports/GA1/${token}`);
    await waitFor(() =>
      expect(screen.getByText('Unavailable context')).toBeInTheDocument(),
    );
    expect(lookup).not.toHaveBeenCalled();
  },
);
