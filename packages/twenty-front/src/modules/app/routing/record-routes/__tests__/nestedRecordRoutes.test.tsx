import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { RecordRouteGate } from '../RecordRouteGate';
import {
  getRecordRouteDefinitions,
  type RecordRouteDefinition,
} from '../recordRouteDefinitions';
import {
  configureRecordRouteScope,
  resolveRecordRoute,
} from '../recordRouteCache';
import { getRecordRoutePath } from '../getAppPath';
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
const tab = '22222222-2222-4222-8222-222222222222';
const definition: RecordRouteDefinition = {
  path: '/projects/work-items',
  objectNameSingular: 'item',
  objectNamePlural: 'items',
  recordIdentifierField: 'number',
  views: { files: tab },
};
const config = window as Window & { __TWENTY_RECORD_ROUTES__?: unknown };
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
      {location.hash}
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
        '/projects/work-items/:recordIdentifier',
        '/projects/work-items/:recordIdentifier/files',
        '/object/:objectNameSingular/:objectRecordId',
      ].map((path) => (
        <Route
          key={path}
          path={path}
          element={
            <RecordRouteGate>
              <Probe />
            </RecordRouteGate>
          }
        />
      ))}
    </Routes>
  </MemoryRouter>
);
it('registers the nested collection, record and named tab without converting a parent record context', () => {
  expect(getRecordRouteDefinitions()).toEqual([definition]);
  const routes = createWorkspaceRouteObjects({});
  for (const path of [
    '/projects/work-items',
    '/projects/work-items/:recordIdentifier',
    '/projects/work-items/:recordIdentifier/files',
  ])
    expect(routes.some((route) => route.path === path)).toBe(true);
  expect(
    getRecordRouteMatch('/projects/work-items/7/files')?.definition.path,
  ).toBe(definition.path);
  expect(getRecordRouteTabLocation('/projects/work-items/7', tab)).toEqual({
    pathname: '/projects/work-items/7/files',
    hash: '',
  });
  expect(getRecordRouteMatch('/projects/7/work-items/7')).toBeNull();
});
it.each([
  '/settings/items',
  '/projects/settings',
  '/projects/7',
  '/projects/:id',
  '/projects//items',
  '/projects/%69tems',
])(
  'rejects reserved, numeric, dynamic or malformed collection path %s',
  (path) => {
    config.__TWENTY_RECORD_ROUTES__ = [{ ...definition, path }];
    expect(getRecordRouteDefinitions()).toEqual([]);
  },
);
it('generates the numbered nested path from the current caller lookup', async () => {
  configureRecordRouteScope('caller', ['item'], async () => ({
    status: 'ready',
    recordId: id,
    recordIdentifier: 7,
  }));
  await resolveRecordRoute(definition, { recordId: id });
  expect(getRecordRoutePath({ objectNameSingular: 'item', recordId: id })).toBe(
    '/projects/work-items/7',
  );
});
it('opens a direct nested named tab through the normal caller gate', async () => {
  configureRecordRouteScope('caller', ['item'], async () => ({
    status: 'ready',
    recordId: id,
    recordIdentifier: 7,
  }));
  render(<Open entry="/projects/work-items/7/files" />);
  await screen.findByText('Opened /projects/work-items/7/files');
});
it('migrates a native UUID/hash into the nested named tab and retains its view query', async () => {
  configureRecordRouteScope('caller', ['item'], async () => ({
    status: 'ready',
    recordId: id,
    recordIdentifier: 7,
  }));
  render(<Open entry={`/object/item/${id}?viewId=saved#${tab}`} />);
  await screen.findByText('Opened /projects/work-items/7/files?viewId=saved');
});
