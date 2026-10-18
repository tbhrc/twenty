import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

import {
  getCleanCollectionHref,
  getCleanCollectionNavigation,
  getHiddenCollectionViewId,
} from '../collectionViewLocation';
import { getFriendlyRecordPath, getRecordRoutePath } from '../getAppPath';
import {
  configureRecordRouteScope,
  resolveRecordRoute,
} from '../recordRouteCache';
import {
  getIndexRouteDefinitions,
  getRecordRouteDefinitions,
} from '../recordRouteDefinitions';
import { useNavigate } from '../router';
import { useSetViewInUrl } from '@/views/hooks/useSetViewInUrl';

const first = '11111111-1111-4111-8111-111111111111';
const second = '22222222-2222-4222-8222-222222222222';
const workflowId = '299ee35d-b88c-419c-afec-8a3e1064bfa9';
const workflow = {
  path: '/workflows',
  objectNameSingular: 'workflow',
  objectNamePlural: 'workflows',
  recordIdentifierField: 'workflowNumber',
  hideViewId: true,
};
const runs = {
  path: '/workflow-runs',
  objectNameSingular: 'workflowRun',
  objectNamePlural: 'workflowRuns',
  recordIdentifierField: 'workflowRunNumber',
  hideViewId: true,
};
const versions = {
  path: '/workflows/versions',
  objectNameSingular: 'workflowVersion',
  objectNamePlural: 'workflowVersions',
  indexOnly: true,
  hideViewId: true,
};
const config = window as Window & { __TWENTY_RECORD_ROUTES__?: unknown };
beforeEach(() => {
  config.__TWENTY_RECORD_ROUTES__ = [workflow, runs, versions];
});
afterEach(() => {
  delete config.__TWENTY_RECORD_ROUTES__;
  configureRecordRouteScope(null, [], null);
});

it('keeps collection links human-readable and native UUID selections internal, preserving other state and search', () => {
  const selected = getCleanCollectionNavigation(
    `/objects/workflows?viewId=${first}&filter=active#saved`,
    { previous: 'kept' },
  );
  expect(selected.to).toBe('/workflows?filter=active#saved');
  expect(selected.state).toMatchObject({ previous: 'kept' });
  expect(getHiddenCollectionViewId('/workflows', selected.state)).toBe(first);
  expect(getHiddenCollectionViewId('/objects/workflows', selected.state)).toBe(
    first,
  );
  expect(
    getHiddenCollectionViewId('/workflow-runs', selected.state),
  ).toBeNull();
  expect(getCleanCollectionNavigation(selected.to, selected.state)).toEqual(
    selected,
  );
  expect(getCleanCollectionHref(`/workflow-runs?viewId=${first}`)).toBe(
    '/workflow-runs',
  );
});

it('uses the existing Versions collection without inventing record identity', () => {
  expect(getIndexRouteDefinitions()).toEqual([versions]);
  expect(getRecordRouteDefinitions()).toEqual([workflow, runs]);
  expect(
    getCleanCollectionHref(`/objects/workflowVersions?viewId=${first}`),
  ).toBe('/workflows/versions');
  expect(
    getHiddenCollectionViewId(
      '/workflows/versions',
      getCleanCollectionNavigation(`/workflows/versions?viewId=${first}`).state,
    ),
  ).toBe(first);
  expect(
    getRecordRoutePath({
      objectNameSingular: 'workflowVersion',
      recordId: second,
    }),
  ).toBe(`/object/workflowVersion/${second}`);
});

it('retains native behavior for unconfigured objects and rejects invalid view identity', () => {
  expect(
    getCleanCollectionNavigation(`/objects/people?viewId=${first}`, {
      kept: true,
    }),
  ).toEqual({ to: `/objects/people?viewId=${first}`, state: { kept: true } });
  const invalid = getCleanCollectionNavigation('/workflows?viewId=invalid');
  expect(invalid.to).toBe('/workflows');
  expect(getHiddenCollectionViewId('/workflows', invalid.state)).toBeNull();
  config.__TWENTY_RECORD_ROUTES__ = [{ ...workflow, hideViewId: 'invalid' }];
  expect(getRecordRouteDefinitions()).toEqual([]);
});

it('generates Workflow 9 from caller-authorized native identity and removes the list-view UUID from its href', async () => {
  configureRecordRouteScope('authorized-user', ['workflow'], async () => ({
    status: 'ready',
    recordId: workflowId,
    recordIdentifier: 9,
  }));
  await resolveRecordRoute(workflow, { recordIdentifier: 9 });
  expect(
    getRecordRoutePath({
      objectNameSingular: 'workflow',
      recordId: workflowId,
    }),
  ).toBe('/workflows/9');
  const old = getFriendlyRecordPath(
    `/object/workflow/${workflowId}?viewId=${first}`,
  );
  expect(getCleanCollectionHref(old)).toBe('/workflows/9');
  expect(
    getHiddenCollectionViewId(
      '/workflows/9',
      getCleanCollectionNavigation(old).state,
    ),
  ).toBe(first);
  configureRecordRouteScope('denied-user', [], null);
  expect(
    getRecordRoutePath({
      objectNameSingular: 'workflow',
      recordId: workflowId,
    }),
  ).toBe(`/object/workflow/${workflowId}`);
});

const Probe = () => {
  const location = useLocation(),
    navigate = useNavigate(),
    { setViewInUrl } = useSetViewInUrl();
  return (
    <>
      <output>
        {location.pathname}
        {location.search}::
        {getHiddenCollectionViewId(location.pathname, location.state)}
      </output>
      <button onClick={() => navigate(`/objects/workflows?viewId=${first}`)}>
        Open first
      </button>
      <button onClick={() => setViewInUrl(second)}>Second view</button>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => navigate(1)}>Forward</button>
    </>
  );
};
it('switches native saved views with clean URLs and restores the correct selection on Back/Forward', async () => {
  render(
    <MemoryRouter
      initialEntries={['/']}
    >
      <Probe />
    </MemoryRouter>,
  );
  await act(async () => fireEvent.click(screen.getByText('Open first')));
  expect(screen.getByRole('status').textContent).toBe(`/workflows::${first}`);
  await act(async () => fireEvent.click(screen.getByText('Second view')));
  expect(screen.getByRole('status').textContent).toBe(`/workflows::${second}`);
  await act(async () => fireEvent.click(screen.getByText('Back')));
  expect(screen.getByRole('status').textContent).toBe(`/workflows::${first}`);
  await act(async () => fireEvent.click(screen.getByText('Forward')));
  expect(screen.getByRole('status').textContent).toBe(`/workflows::${second}`);
});

it('reloads a clean history entry with its saved-view selection', () => {
  const selected = getCleanCollectionNavigation(
    `/workflow-runs?viewId=${second}`,
    { unrelated: 'preserved' },
  );
  render(
    <MemoryRouter
      initialEntries={[{ pathname: '/workflow-runs', state: selected.state }]}
    >
      <Probe />
    </MemoryRouter>,
  );
  expect(screen.getByRole('status').textContent).toBe(
    `/workflow-runs::${second}`,
  );
});
