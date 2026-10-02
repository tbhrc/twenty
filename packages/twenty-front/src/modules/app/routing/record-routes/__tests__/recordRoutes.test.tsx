/* oxlint-disable twenty/no-navigate-prefer-link */
// These fixtures test imperative navigation and history hooks directly.
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation as useBrowserLocation,
  useNavigate as useBrowserNavigate,
} from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { createWorkspaceRouteObjects } from '@/app/routing/utils/createWorkspaceRouteObjects';
import {
  isWorkspaceLocationAvailableOnSurface,
  isWorkspaceLocationExpandableFromSidePanel,
} from '@/app/routing/utils/isWorkspaceLocationAvailableOnSurface';

import { RecordRouteGate } from '@/app/routing/record-routes/RecordRouteGate';
import { getRecordRouteLookupResult } from '@/app/routing/record-routes/RecordRouteScopeEffect';
import {
  getAppPath,
  getRecordRoutePath,
} from '@/app/routing/record-routes/getAppPath';
import {
  configureRecordRouteScope,
  getCachedRecordId,
  getCachedRecordIdentifier,
  rememberRecordRoute,
  resolveRecordRoute,
  type RecordRouteLookupResult,
} from '@/app/routing/record-routes/recordRouteCache';
import {
  getRecordRouteDefinitions,
  parseRecordRouteIdentifier,
  type RecordRouteDefinition,
} from '@/app/routing/record-routes/recordRouteDefinitions';
import {
  getLogicalRecordPathname,
  matchPath,
  useLocation,
  useParams,
} from '@/app/routing/record-routes/router';

jest.mock(
  '@/object-record/record-index/components/RecordIndexSkeletonLoader',
  () => ({ RecordIndexSkeletonLoader: () => <div>Loading route</div> }),
);
jest.mock('@/app/routing/components/WorkspaceRouteUnavailable', () => ({
  WorkspaceRouteUnavailable: () => <div>Unavailable route</div>,
}));

const definition: RecordRouteDefinition = {
  path: '/tickets',
  objectNameSingular: 'ticket',
  objectNamePlural: 'tickets',
  recordIdentifierField: 'ticketNumber',
};
const recordId = '11111111-1111-4111-8111-111111111111';
const ready: RecordRouteLookupResult = {
  status: 'ready',
  recordId,
  recordIdentifier: 1,
};
const setDefinitions = (definitions: unknown) => {
  (
    window as Window & { __TWENTY_RECORD_ROUTES__?: unknown }
  ).__TWENTY_RECORD_ROUTES__ = definitions;
};

const Probe = () => {
  const browser = useBrowserLocation();
  const logical = useLocation();
  const params = useParams();
  const navigate = useBrowserNavigate();
  const navigateToNextRecord = () => {
    // This fixture exercises imperative browser history and route resolution.
    // oxlint-disable-next-line twenty/no-navigate-prefer-link
    navigate(`${definition.path}/2#details`);
  };
  const navigateBack = () => {
    // oxlint-disable-next-line twenty/no-navigate-prefer-link
    navigate(-1);
  };
  return (
    <>
      <div data-testid="browser">
        {browser.pathname}
        {browser.search}
        {browser.hash}
      </div>
      <div data-testid="logical">{logical.pathname}</div>
      <div data-testid="record-id">{params.objectRecordId ?? 'unresolved'}</div>
      <div data-testid="state">{JSON.stringify(browser.state)}</div>
      <button onClick={navigateToNextRecord}>Next</button>
      <button onClick={navigateBack}>Back</button>
    </>
  );
};

const RouteFixture = ({
  entry = '/tickets/1?viewId=view#details',
}: {
  entry?:
    | string
    | { pathname: string; search?: string; hash?: string; state?: unknown };
}) => (
  <MemoryRouter
    initialEntries={[entry]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <Routes>
      <Route
        path="/tickets/:recordIdentifier"
        element={
          <RecordRouteGate definition={definition}>
            <Probe />
          </RecordRouteGate>
        }
      />
      <Route
        path={AppPath.RecordShowPage}
        element={
          <RecordRouteGate>
            <Probe />
          </RecordRouteGate>
        }
      />
    </Routes>
  </MemoryRouter>
);

describe('configured record routes', () => {
  beforeEach(() => {
    setDefinitions([definition]);
    configureRecordRouteScope(null, [], null);
  });
  afterEach(async () => {
    await act(async () => {
      configureRecordRouteScope(null, [], null);
    });
    setDefinitions(undefined);
  });

  it('registers actual aliases on both surfaces with index-only generic expansion', () => {
    const routes = createWorkspaceRouteObjects({});
    for (const surface of ['main', 'side-panel'] as const) {
      expect(
        isWorkspaceLocationAvailableOnSurface(routes, surface, '/tickets'),
      ).toBe(true);
      expect(
        isWorkspaceLocationAvailableOnSurface(
          routes,
          surface,
          '/tickets/1#details',
        ),
      ).toBe(true);
    }
    expect(isWorkspaceLocationExpandableFromSidePanel(routes, '/tickets')).toBe(
      true,
    );
    expect(
      isWorkspaceLocationExpandableFromSidePanel(routes, '/tickets/1'),
    ).toBe(false);
  });

  it('preserves native routes when deployment configuration is absent', () => {
    setDefinitions(undefined);
    expect(
      getAppPath(AppPath.RecordShowPage, {
        objectNameSingular: 'ticket',
        objectRecordId: recordId,
      }),
    ).toBe(`/object/ticket/${recordId}`);
  });

  it('rejects reserved routes, duplicate definitions and unsafe numeric identifiers', () => {
    setDefinitions([
      definition,
      definition,
      { ...definition, path: '/settings' },
      { ...definition, path: '//evil' },
    ]);
    expect(getRecordRouteDefinitions()).toEqual([definition]);
    for (const value of [
      '0',
      '-1',
      '01',
      '1.2',
      'NaN',
      '9007199254740992',
      null,
    ])
      expect(parseRecordRouteIdentifier(value)).toBeNull();
    expect(parseRecordRouteIdentifier('1')).toBe(1);
  });

  it('generates full-record href hints without seeding trusted UUID identity', async () => {
    configureRecordRouteScope(
      'workspace-a:user-a',
      ['ticket'],
      async () => ready,
    );
    expect(
      getAppPath(
        AppPath.RecordIndexPage,
        { objectNamePlural: 'tickets' },
        { viewId: 'view' },
      ),
    ).toBe('/tickets?viewId=view');
    expect(
      getRecordRoutePath({
        objectNameSingular: 'ticket',
        recordId,
        record: { id: recordId, ticketNumber: 1 },
      }),
    ).toBe('/tickets/1');
    expect(getCachedRecordId('ticket', 1)).toBeUndefined();
    await resolveRecordRoute(definition, { recordIdentifier: 1 });
    expect(getLogicalRecordPathname('/tickets/1')).toBe(
      `/object/ticket/${recordId}`,
    );
    expect(
      matchPath(AppPath.RecordShowPage, '/tickets/1')?.params.objectRecordId,
    ).toBe(recordId);
  });

  it('never supplies a numeric token to UUID consumers while lookup is pending', async () => {
    let finish!: (result: RecordRouteLookupResult) => void;
    configureRecordRouteScope(
      'workspace-a:user-a',
      ['ticket'],
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const PendingProbe = () => (
      <div data-testid="pending-id">
        {useParams().objectRecordId ?? 'unresolved'}
      </div>
    );
    render(
      <MemoryRouter initialEntries={['/tickets/1']}>
        <PendingProbe />
        <Routes>
          <Route
            path="/tickets/:recordIdentifier"
            element={
              <RecordRouteGate definition={definition}>
                <Probe />
              </RecordRouteGate>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('pending-id')).toHaveTextContent('unresolved');
    expect(screen.getByText('Loading route')).toBeInTheDocument();
    await act(async () => finish(ready));
    expect(screen.getByTestId('record-id')).toHaveTextContent(recordId);
    expect(screen.getByTestId('browser')).toHaveTextContent('/tickets/1');
  });

  it('canonicalizes an uncached legacy UUID path preserving search, hash and state', async () => {
    const lookup = jest.fn(async () => ready);
    configureRecordRouteScope('workspace-a:user-a', ['ticket'], lookup);
    render(
      <RouteFixture
        entry={{
          pathname: `/object/ticket/${recordId}`,
          search: '?viewId=view',
          hash: '#details',
          state: { parent: 'index' },
        }}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('browser')).toHaveTextContent(
        '/tickets/1?viewId=view#details',
      ),
    );
    expect(screen.getByTestId('logical')).toHaveTextContent(
      `/object/ticket/${recordId}`,
    );
    expect(screen.getByTestId('state')).toHaveTextContent('index');
    expect(lookup).toHaveBeenCalledWith(definition, { recordId });
    expect(lookup).toHaveBeenCalledWith(definition, { recordIdentifier: 1 });
  });

  it('keeps browser back/forward history friendly while logical identity changes', async () => {
    const secondId = '22222222-2222-4222-8222-222222222222';
    configureRecordRouteScope(
      'workspace-a:user-a',
      ['ticket'],
      async (_definition, target) =>
        'recordIdentifier' in target && target.recordIdentifier === 2
          ? { status: 'ready', recordId: secondId, recordIdentifier: 2 }
          : ready,
    );
    render(<RouteFixture />);
    await screen.findByTestId('record-id');
    fireEvent.click(screen.getByText('Next'));
    await waitFor(() =>
      expect(screen.getByTestId('record-id')).toHaveTextContent(secondId),
    );
    expect(screen.getByTestId('browser')).toHaveTextContent(
      '/tickets/2#details',
    );
    fireEvent.click(screen.getByText('Back'));
    await waitFor(() =>
      expect(screen.getByTestId('record-id')).toHaveTextContent(recordId),
    );
    expect(screen.getByTestId('browser')).toHaveTextContent(
      '/tickets/1?viewId=view#details',
    );
  });

  it.each(['missing', 'duplicate', 'denied', 'error'] as const)(
    'fails closed on %s lookup',
    async (status) => {
      configureRecordRouteScope('workspace-a:user-a', ['ticket'], async () => ({
        status,
      }));
      render(<RouteFixture />);
      expect(await screen.findByText('Unavailable route')).toBeInTheDocument();
      expect(screen.queryByTestId('record-id')).not.toBeInTheDocument();
      expect(getCachedRecordId('ticket', 1)).toBeUndefined();
    },
  );

  it('does not query when authentication or object/field read permission is absent', async () => {
    const lookup = jest.fn(async () => ready);
    configureRecordRouteScope('workspace-a:user-a', [], lookup);
    expect(
      await resolveRecordRoute(definition, { recordIdentifier: 1 }),
    ).toEqual({ status: 'denied' });
    configureRecordRouteScope(null, ['ticket'], lookup);
    expect(
      await resolveRecordRoute(definition, { recordIdentifier: 1 }),
    ).toEqual({ status: 'denied' });
    expect(lookup).not.toHaveBeenCalled();
  });

  it('clears mappings on workspace/session changes and discards late responses', async () => {
    let finish!: (result: RecordRouteLookupResult) => void;
    configureRecordRouteScope(
      'workspace-a:user-a',
      ['ticket'],
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = resolveRecordRoute(definition, { recordIdentifier: 1 });
    configureRecordRouteScope(
      'workspace-b:user-a',
      ['ticket'],
      async () => ready,
    );
    finish(ready);
    expect(await pending).toEqual({ status: 'denied' });
    expect(getCachedRecordId('ticket', 1)).toBeUndefined();
    rememberRecordRoute('ticket', { id: recordId, ticketNumber: 1 });
    configureRecordRouteScope(
      'workspace-b:user-b',
      ['ticket'],
      async () => ready,
    );
    expect(getCachedRecordIdentifier('ticket', recordId)).toBeUndefined();
  });

  it('rejects colliding numbers rather than aliasing one UUID to another', () => {
    configureRecordRouteScope(
      'workspace-a:user-a',
      ['ticket'],
      async () => ready,
    );
    rememberRecordRoute('ticket', { id: recordId, ticketNumber: 1 });
    const anotherId = '22222222-2222-4222-8222-222222222222';
    rememberRecordRoute('ticket', { id: anotherId, ticketNumber: 1 });
    expect(getCachedRecordId('ticket', 1)).toBeUndefined();
    expect(getCachedRecordIdentifier('ticket', recordId)).toBeUndefined();
    expect(getCachedRecordIdentifier('ticket', anotherId)).toBeUndefined();
  });

  it('classifies bounded lookup results without assuming uniqueness', () => {
    expect(getRecordRouteLookupResult([], 'ticketNumber')).toEqual({
      status: 'missing',
    });
    expect(
      getRecordRouteLookupResult(
        [
          { id: recordId, ticketNumber: 1 },
          { id: 'other', ticketNumber: 1 },
        ],
        'ticketNumber',
      ),
    ).toEqual({ status: 'duplicate' });
    expect(
      getRecordRouteLookupResult([{ id: recordId }], 'ticketNumber'),
    ).toEqual({ status: 'error' });
    expect(
      getRecordRouteLookupResult(
        [{ id: recordId, ticketNumber: 1 }],
        'ticketNumber',
      ),
    ).toEqual(ready);
  });
});
