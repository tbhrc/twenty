import { act, render, screen, waitFor } from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation as useBrowserLocation,
} from 'react-router-dom';

import { RecordContextRouteGate } from '../RecordContextRouteGate';
import {
  getRecordContextRouteDefinitions,
  type RecordContextRouteDefinition,
} from '../recordContextRoutes';
import {
  configureRecordRouteScope,
  getCachedContextRecordId,
  getCachedContextRecordPath,
  resolveRecordContextRoute,
} from '../recordRouteCache';
import { type RecordRouteDefinition } from '../recordRouteDefinitions';
import {
  resolveNativeRecordContext,
  type NativeContextRead,
  type RecordContextResult,
} from '../resolveNativeRecordContext';
import { useParams } from '../router';

jest.mock(
  '@/object-record/record-index/components/RecordIndexSkeletonLoader',
  () => ({ RecordIndexSkeletonLoader: () => <div>Loading context</div> }),
);
jest.mock('@/app/routing/components/WorkspaceRouteUnavailable', () => ({
  WorkspaceRouteUnavailable: () => <div>Unavailable context</div>,
}));

const parentId = '11111111-1111-4111-8111-111111111111';
const relatedId = '22222222-2222-4222-8222-222222222222';
const relationId = '33333333-3333-4333-8333-333333333333';
const definition: RecordContextRouteDefinition = {
  path: '/projects/:projectNumber/contacts/:contactNumber',
  objectNameSingular: 'participation',
  objectNamePlural: 'participations',
  relations: [
    {
      parameter: 'projectNumber',
      objectNameSingular: 'project',
      field: 'project',
    },
    {
      parameter: 'contactNumber',
      objectNameSingular: 'contact',
      field: 'contact',
    },
  ],
};
const endpoints: RecordRouteDefinition[] = [
  {
    path: '/projects',
    objectNameSingular: 'project',
    objectNamePlural: 'projects',
    recordIdentifierField: 'projectNumber',
  },
  {
    path: '/contacts',
    objectNameSingular: 'contact',
    objectNamePlural: 'contacts',
    recordIdentifierField: 'contactNumber',
  },
];
const relation = { id: relationId, projectId: parentId, contactId: relatedId };
const ready: RecordContextResult = {
  status: 'ready',
  recordId: relationId,
  path: '/projects/1/contacts/2',
};
const setDefinitions = (value: unknown) => {
  (
    window as Window & { __TWENTY_RECORD_CONTEXT_ROUTES__?: unknown }
  ).__TWENTY_RECORD_CONTEXT_ROUTES__ = value;
};
const sourceRead: NativeContextRead = async (objectName) =>
  objectName === 'project'
    ? [{ id: parentId, projectNumber: 1 }]
    : objectName === 'contact'
      ? [{ id: relatedId, contactNumber: 2 }]
      : [relation];
const Probe = () => {
  const location = useBrowserLocation();
  return (
    <>
      <div data-testid="browser">
        {location.pathname}
        {location.search}
        {location.hash}
      </div>
      <div data-testid="native">{useParams().objectRecordId}</div>
    </>
  );
};
const Fixture = ({ entry }: { entry: string }) => (
  <MemoryRouter
    initialEntries={[entry]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <Routes>
      <Route
        path={definition.path}
        element={
          <RecordContextRouteGate definition={definition}>
            <Probe />
          </RecordContextRouteGate>
        }
      />
      <Route
        path="/object/:objectNameSingular/:objectRecordId"
        element={
          <RecordContextRouteGate>
            <Probe />
          </RecordContextRouteGate>
        }
      />
    </Routes>
  </MemoryRouter>
);

describe('native record context routes', () => {
  beforeEach(() => {
    setDefinitions([definition]);
    configureRecordRouteScope(null, [], null);
  });
  afterEach(async () => {
    await act(async () => configureRecordRouteScope(null, [], null));
    setDefinitions(undefined);
  });

  it('reads both endpoints independently then exactly one relationship', async () => {
    const read = jest.fn(sourceRead);
    expect(
      await resolveNativeRecordContext(
        definition,
        { identifiers: { projectNumber: 1, contactNumber: 2 } },
        { endpoints, read },
      ),
    ).toEqual(ready);
    expect(read).toHaveBeenNthCalledWith(
      1,
      'project',
      ['id', 'projectNumber'],
      { projectNumber: { eq: 1 } },
    );
    expect(read).toHaveBeenNthCalledWith(
      2,
      'contact',
      ['id', 'contactNumber'],
      { contactNumber: { eq: 2 } },
    );
    expect(read).toHaveBeenNthCalledWith(
      3,
      'participation',
      ['id', 'projectId', 'contactId'],
      { projectId: { eq: parentId }, contactId: { eq: relatedId } },
    );
  });
  it('rechecks uniqueness and both endpoint numbers for a native UUID bookmark', async () => {
    const read = jest.fn(sourceRead);
    expect(
      await resolveNativeRecordContext(
        definition,
        { recordId: relationId },
        { endpoints, read },
      ),
    ).toEqual(ready);
    expect(read).toHaveBeenCalledTimes(4);
  });
  it.each([{ rows: [] }, { rows: [relation, { ...relation, id: parentId }] }])(
    'rejects missing and duplicate current relationships',
    async ({ rows }) => {
      expect(
        await resolveNativeRecordContext(
          definition,
          { identifiers: { projectNumber: 1, contactNumber: 2 } },
          {
            endpoints,
            read: (objectName, fields, filter) =>
              objectName === 'participation'
                ? Promise.resolve(rows)
                : sourceRead(objectName, fields, filter),
          },
        ),
      ).toEqual({ status: rows.length ? 'duplicate' : 'missing' });
    },
  );
  it('rejects a relinked record, wrong endpoint number, and unavailable endpoint access', async () => {
    for (const read of [
      async (objectName: string) =>
        objectName === 'participation'
          ? [{ ...relation, contactId: parentId }]
          : sourceRead(objectName, [], {}),
      async (objectName: string) =>
        objectName === 'contact'
          ? [{ id: relatedId, contactNumber: 3 }]
          : sourceRead(objectName, [], {}),
      async (objectName: string) => {
        if (objectName === 'contact')
          throw new Error('private provider detail');
        return sourceRead(objectName, [], {});
      },
    ])
      expect(
        (
          await resolveNativeRecordContext(
            definition,
            { identifiers: { projectNumber: 1, contactNumber: 2 } },
            { endpoints, read },
          )
        ).status,
      ).not.toBe('ready');
  });
  it('does not resolve numeric identifiers without readable endpoint bindings', async () => {
    expect(
      await resolveNativeRecordContext(
        definition,
        { identifiers: { projectNumber: 1, contactNumber: 2 } },
        { endpoints: [], read: sourceRead },
      ),
    ).toEqual({ status: 'denied' });
  });
  it('renders the authorized native record at its canonical context and redirects UUID bookmarks', async () => {
    const lookup = jest.fn(async () => ready);
    configureRecordRouteScope(
      'workspace-a:user-a',
      [],
      null,
      ['participation'],
      lookup,
    );
    render(
      <Fixture
        entry={`/object/participation/${relationId}?viewId=view#details`}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('browser')).toHaveTextContent(
        '/projects/1/contacts/2?viewId=view#details',
      ),
    );
    expect(screen.getByTestId('native')).toHaveTextContent(relationId);
    expect(lookup).toHaveBeenCalledWith(definition, { recordId: relationId });
    expect(lookup).toHaveBeenCalledWith(definition, {
      identifiers: { projectNumber: 1, contactNumber: 2 },
    });
  });
  it('keeps numeric context tokens away from native record consumers while lookup is pending', async () => {
    let finish!: (value: RecordContextResult) => void;
    configureRecordRouteScope(
      'workspace-a:user-a',
      [],
      null,
      ['participation'],
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<Fixture entry="/projects/1/contacts/2" />);
    expect(screen.getByText('Loading context')).toBeInTheDocument();
    expect(screen.queryByTestId('native')).not.toBeInTheDocument();
    await act(async () => finish(ready));
    expect(screen.getByTestId('native')).toHaveTextContent(relationId);
  });
  it('retains native page permissions when public endpoint fields are unreadable, while denying context links', async () => {
    const lookup = jest.fn(async () => ready);
    configureRecordRouteScope('workspace-a:user-a', [], null, [], lookup);
    const native = render(
      <Fixture entry={`/object/participation/${relationId}`} />,
    );
    expect(screen.getByTestId('native')).toHaveTextContent(relationId);
    expect(lookup).not.toHaveBeenCalled();
    native.unmount();
    render(<Fixture entry="/projects/1/contacts/2" />);
    expect(await screen.findByText('Unavailable context')).toBeInTheDocument();
    expect(lookup).not.toHaveBeenCalled();
  });
  it('drops in-flight results and all cached identity when the workspace changes', async () => {
    let finish!: (value: RecordContextResult) => void;
    configureRecordRouteScope(
      'workspace-a:user-a',
      [],
      null,
      ['participation'],
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = resolveRecordContextRoute(definition, {
      recordId: relationId,
    });
    configureRecordRouteScope(
      'workspace-b:user-b',
      [],
      null,
      ['participation'],
      async () => ready,
    );
    finish(ready);
    expect(await pending).toEqual({ status: 'denied' });
    expect(
      getCachedContextRecordId(
        'participation',
        ready.status === 'ready' ? ready.path : '',
      ),
    ).toBeUndefined();
    expect(
      getCachedContextRecordPath('participation', relationId),
    ).toBeUndefined();
  });
  it('revokes a successful location when a fresh current lookup is denied', async () => {
    configureRecordRouteScope(
      'workspace-a:user-a',
      [],
      null,
      ['participation'],
      async () => ready,
    );
    await resolveRecordContextRoute(definition, { recordId: relationId });
    configureRecordRouteScope(
      'workspace-a:user-a',
      [],
      null,
      ['participation'],
      async () => ({ status: 'denied' }),
    );
    expect(
      await resolveRecordContextRoute(definition, { recordId: relationId }),
    ).toEqual({ status: 'denied' });
    expect(
      getCachedContextRecordPath('participation', relationId),
    ).toBeUndefined();
  });
  it('rejects unsafe routes and malformed relationship parameters', () => {
    setDefinitions([
      {
        ...definition,
        path: '/settings/:projectNumber/contacts/:contactNumber',
      },
      { ...definition, relations: [definition.relations[0]] },
      definition,
    ]);
    expect(getRecordContextRouteDefinitions()).toEqual([definition]);
  });
});
