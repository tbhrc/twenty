import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { RecordRouteGate } from '../RecordRouteGate';
import {
  getRecordRouteDefinitions,
  getRecordRoutePaths,
  type RecordRouteDefinition,
} from '../recordRouteDefinitions';
import { getTypedRecordRouteLookupResult } from '../RecordRouteScopeEffect';
import {
  configureRecordRouteScope,
  getCachedTypedRecordPath,
  rememberRecordRoute,
  resolveRecordRoute,
} from '../recordRouteCache';
import { getRecordRoutePath, getFriendlyRecordPath } from '../getAppPath';
import {
  getRecordRouteMatch,
  getRecordRouteTabLocation,
} from '../recordRouteViews';
import { createWorkspaceRouteObjects } from '@/app/routing/utils/createWorkspaceRouteObjects';

jest.mock(
  '@/object-record/record-index/components/RecordIndexSkeletonLoader',
  () => ({ RecordIndexSkeletonLoader: () => <div>Loading</div> }),
);
jest.mock('@/app/routing/components/WorkspaceRouteUnavailable', () => ({
  WorkspaceRouteUnavailable: () => <div>Unavailable</div>,
}));
const id = '11111111-1111-4111-8111-111111111111';
const definition: RecordRouteDefinition = {
  path: '/products',
  objectNameSingular: 'item',
  objectNamePlural: 'items',
  recordIdentifierField: 'number',
  indexRoute: false,
  recordType: {
    field: 'kind',
    paths: { PRODUCT: '/products', SERVICE: '/services' },
  },
};
const config = window as Window & { __TWENTY_RECORD_ROUTES__?: unknown };
const row = { id, number: 7, kind: 'SERVICE' };
const resolveRow = () => getTypedRecordRouteLookupResult([row], definition);
beforeEach(() => {
  config.__TWENTY_RECORD_ROUTES__ = [definition];
  configureRecordRouteScope(null, [], null);
});
afterEach(async () => {
  await act(async () => configureRecordRouteScope(null, [], null));
  delete config.__TWENTY_RECORD_ROUTES__;
});
const Probe = () => {
  const location = useLocation();
  return (
    <div>
      Opened {location.pathname}
      {location.search}
    </div>
  );
};
const Open = ({ entry }: { entry: string }) => (
  <MemoryRouter
    initialEntries={[entry]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <Routes>
      {[
        '/products/:recordIdentifier',
        '/services/:recordIdentifier',
        '/object/:objectNameSingular/:objectRecordId',
      ].map((path) => (
        <Route
          key={path}
          path={path}
          element={
            <RecordRouteGate
              definition={path.startsWith('/object/') ? undefined : definition}
            >
              <Probe />
            </RecordRouteGate>
          }
        />
      ))}
    </Routes>
  </MemoryRouter>
);

it('registers both typed record paths without relabelling unfiltered native collections', () => {
  expect(getRecordRoutePaths(getRecordRouteDefinitions()[0])).toEqual([
    '/products',
    '/services',
  ]);
  const routes = createWorkspaceRouteObjects({});
  expect(routes.some((r) => r.path === '/services/:recordIdentifier')).toBe(
    true,
  );
  expect(routes.some((r) => r.path === '/services')).toBe(false);
  expect(getFriendlyRecordPath('/objects/items?viewId=saved')).toBe(
    '/objects/items?viewId=saved',
  );
  expect(getRecordRouteMatch('/services/7')?.definition.path).toBe('/services');
});
it.each(['PRODUCT', 'SERVICE'])(
  'chooses the native %s type and keeps its existing number',
  (kind) => {
    expect(
      getTypedRecordRouteLookupResult([{ ...row, kind }], definition),
    ).toEqual({
      status: 'ready',
      recordId: id,
      recordIdentifier: 7,
      recordPath: kind === 'PRODUCT' ? '/products' : '/services',
    });
  },
);
it('rejects missing/unknown type, duplicate identity and invalid number', () => {
  for (const kind of [undefined, null, 'UNKNOWN', 'toString'])
    expect(
      getTypedRecordRouteLookupResult([{ ...row, kind }], definition),
    ).toEqual({ status: 'missing' });
  expect(getTypedRecordRouteLookupResult([row, row], definition).status).toBe(
    'duplicate',
  );
  expect(
    getTypedRecordRouteLookupResult([{ ...row, number: 0 }], definition).status,
  ).toBe('error');
});
it('ignores untrusted record hints and only generates the authenticated native type path', async () => {
  configureRecordRouteScope('caller', ['item'], async () => resolveRow());
  rememberRecordRoute('item', { ...row, kind: 'PRODUCT' });
  expect(getCachedTypedRecordPath('item', id)).toBeUndefined();
  expect(
    getRecordRoutePath({
      objectNameSingular: 'item',
      recordId: id,
      record: { ...row, kind: 'PRODUCT' },
    }),
  ).toBe(`/object/item/${id}`);
  await resolveRecordRoute(definition, { recordId: id });
  expect(getRecordRoutePath({ objectNameSingular: 'item', recordId: id })).toBe(
    '/services/7',
  );
});
it('blocks a wrong-type URL after a previous successful cache fill', async () => {
  const lookup = jest.fn(async () => resolveRow());
  configureRecordRouteScope('caller', ['item'], lookup);
  await resolveRecordRoute(definition, { recordId: id });
  render(<Open entry="/products/7" />);
  await screen.findByText('Unavailable');
  expect(screen.queryByText(/Opened/)).toBeNull();
  expect(lookup).toHaveBeenCalledTimes(2);
});
it('opens a directly requested matching type without relying on a cached hint', async () => {
  configureRecordRouteScope('caller', ['item'], async () => resolveRow());
  render(<Open entry="/services/7" />);
  await screen.findByText('Opened /services/7');
});
it('switches named native tabs while preserving the actual typed namespace', () => {
  const files = '22222222-2222-4222-8222-222222222222';
  config.__TWENTY_RECORD_ROUTES__ = [{ ...definition, views: { files } }];
  expect(getRecordRouteTabLocation('/services/7', files)).toEqual({
    pathname: '/services/7/files',
    hash: '',
  });
  expect(getRecordRouteTabLocation('/services/7/files', 'unknown-tab')).toEqual(
    { pathname: '/services/7', hash: '#unknown-tab' },
  );
});
it('opens the matching type and migrates a native UUID link preserving search', async () => {
  configureRecordRouteScope('caller', ['item'], async () => resolveRow());
  render(<Open entry={`/object/item/${id}?viewId=saved`} />);
  await screen.findByText('Opened /services/7?viewId=saved');
});
it('revokes typed cached paths on a denied read and caller change', async () => {
  const lookup = jest
    .fn()
    .mockResolvedValueOnce(resolveRow())
    .mockResolvedValue({ status: 'denied' });
  configureRecordRouteScope('caller', ['item'], lookup);
  await resolveRecordRoute(definition, { recordId: id });
  await resolveRecordRoute(definition, { recordIdentifier: 7 });
  expect(getCachedTypedRecordPath('item', id)).toBeUndefined();
  configureRecordRouteScope('other-caller', [], null);
  expect(
    (await resolveRecordRoute(definition, { recordIdentifier: 7 })).status,
  ).toBe('denied');
});
it('discards an in-flight successful type read after caller revocation', async () => {
  let complete!: (v: ReturnType<typeof resolveRow>) => void;
  configureRecordRouteScope(
    'caller',
    ['item'],
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const pending = resolveRecordRoute(definition, { recordId: id });
  configureRecordRouteScope('revoked', [], null);
  complete(resolveRow());
  expect((await pending).status).toBe('denied');
  expect(getCachedTypedRecordPath('item', id)).toBeUndefined();
});
it('rejects ambiguous typed configuration rather than choosing a type arbitrarily', () => {
  for (const bad of [
    { ...definition, indexRoute: true },
    { ...definition, aliases: ['/alias'] },
    {
      ...definition,
      recordType: {
        field: 'kind',
        paths: { PRODUCT: '/products', SERVICE: '/products' },
      },
    },
    {
      ...definition,
      recordType: {
        field: 'kind',
        paths: { PRODUCT: '/products', SERVICE: '/settings' },
      },
    },
  ]) {
    config.__TWENTY_RECORD_ROUTES__ = [bad];
    expect(getRecordRouteDefinitions()).toEqual([]);
  }
});
