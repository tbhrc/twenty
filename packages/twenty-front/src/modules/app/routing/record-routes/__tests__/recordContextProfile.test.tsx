import userEvent from '@testing-library/user-event';
import { act, render, screen } from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { RecordContextRouteGate } from '@/app/routing/record-routes/RecordContextRouteGate';
import { RecordRouteGate } from '@/app/routing/record-routes/RecordRouteGate';
import {
  getRecordContextRouteDefinitions,
  type RecordContextRouteDefinition,
} from '@/app/routing/record-routes/recordContextRoutes';
import { getRecordContextProfileLocation } from '@/app/routing/record-routes/recordContextProfile';
import { configureRecordRouteScope } from '@/app/routing/record-routes/recordRouteCache';
import { type RecordRouteDefinition } from '@/app/routing/record-routes/recordRouteDefinitions';
import { useParams } from '@/app/routing/record-routes/router';

jest.mock(
  '@/object-record/record-index/components/RecordIndexSkeletonLoader',
  () => ({ RecordIndexSkeletonLoader: () => <div>Loading</div> }),
);
jest.mock('@/app/routing/components/WorkspaceRouteUnavailable', () => ({
  WorkspaceRouteUnavailable: () => <div>Unavailable</div>,
}));
const id = '00000000-0000-4000-8000-000000000001';
const profileId = '00000000-0000-4000-8000-000000000002';
const homeId = '00000000-0000-4000-8000-000000000003';
const cvId = '00000000-0000-4000-8000-000000000004';
const endpoint: RecordRouteDefinition = {
  path: '/contacts',
  objectNameSingular: 'contact',
  objectNamePlural: 'contacts',
  recordIdentifierField: 'number',
  views: { home: homeId },
};
const context: RecordContextRouteDefinition = {
  path: '/projects/:projectIdentifier/contact/:contactIdentifier',
  objectNameSingular: 'participation',
  objectNamePlural: 'participations',
  relations: [
    {
      parameter: 'projectIdentifier',
      objectNameSingular: 'project',
      field: 'project',
    },
    {
      parameter: 'contactIdentifier',
      objectNameSingular: 'contact',
      field: 'contact',
    },
  ],
  views: { home: homeId, cv: cvId },
  recordProfile: {
    relationParameter: 'contactIdentifier',
    contextParameters: { projectIdentifier: 'project' },
    views: ['home'],
  },
};
const config = window as Window & {
  __TWENTY_RECORD_ROUTES__?: unknown;
  __TWENTY_RECORD_CONTEXT_ROUTES__?: unknown;
};
const ready = {
  status: 'ready',
  recordId: id,
  path: '/projects/3/contact/7',
} as const;
beforeEach(() => {
  config.__TWENTY_RECORD_ROUTES__ = [endpoint];
  config.__TWENTY_RECORD_CONTEXT_ROUTES__ = [context];
});
afterEach(async () => {
  await act(async () => configureRecordRouteScope(null, [], null));
  delete config.__TWENTY_RECORD_ROUTES__;
  delete config.__TWENTY_RECORD_CONTEXT_ROUTES__;
});

it('uses only the verified source relation to open the shared profile, retaining explicit context', () => {
  expect(
    getRecordContextProfileLocation(
      context,
      ready,
      undefined,
      '?viewId=source-view&panel=old&from=list',
    ),
  ).toEqual({
    pathname: '/contacts/7',
    search: '?from=list&project=3',
    hash: '',
  });
  expect(getRecordContextProfileLocation(context, ready, 'home', '')).toEqual({
    pathname: '/contacts/7/home',
    search: '?project=3',
    hash: '',
  });
});
it.each(['denied', 'missing', 'duplicate', 'error'] as const)(
  'does not construct a profile before a successful %s source proof',
  (status) => {
    expect(
      getRecordContextProfileLocation(context, { status }, undefined, ''),
    ).toBeNull();
  },
);
it('retains specialized source views, their bindings and native configuration without an opt-in', () => {
  expect(getRecordContextProfileLocation(context, ready, 'cv', '')).toBeNull();
  expect(
    getRecordContextProfileLocation(
      { ...context, recordProfile: undefined },
      ready,
      undefined,
      '',
    ),
  ).toBeNull();
});
it('does not infer an endpoint, target number, context number or unknown profile tab', () => {
  config.__TWENTY_RECORD_ROUTES__ = [];
  expect(
    getRecordContextProfileLocation(context, ready, undefined, ''),
  ).toBeNull();
  config.__TWENTY_RECORD_ROUTES__ = [endpoint];
  for (const path of [
    '/projects/3/contact/0',
    '/projects/0/contact/7',
    '/different/3/contact/7',
  ])
    expect(
      getRecordContextProfileLocation(
        context,
        { ...ready, path },
        undefined,
        '',
      ),
    ).toBeNull();
  config.__TWENTY_RECORD_ROUTES__ = [{ ...endpoint, views: {} }];
  expect(
    getRecordContextProfileLocation(context, ready, 'home', ''),
  ).toBeNull();
});
it.each([
  { relationParameter: 'wrong' },
  { ...context.recordProfile, views: ['unknown'] },
  { ...context.recordProfile, contextParameters: { wrong: 'project' } },
  {
    ...context.recordProfile,
    contextParameters: { projectIdentifier: 'panel' },
  },
  {
    ...context.recordProfile,
    contextParameters: { projectIdentifier: 'viewId' },
  },
  {
    ...context.recordProfile,
    contextParameters: { projectIdentifier: 'same', contactIdentifier: 'same' },
  },
])('rejects invalid shared-profile configuration', (recordProfile) => {
  config.__TWENTY_RECORD_CONTEXT_ROUTES__ = [{ ...context, recordProfile }];
  expect(getRecordContextRouteDefinitions()).toEqual([]);
});
it('parses a valid profile configuration without changing unrelated context definitions', () => {
  config.__TWENTY_RECORD_CONTEXT_ROUTES__ = [
    context,
    {
      ...context,
      path: '/tasks/:projectIdentifier/contact/:contactIdentifier',
      objectNameSingular: 'task',
      objectNamePlural: 'tasks',
      recordProfile: undefined,
    },
  ];
  expect(getRecordContextRouteDefinitions()).toHaveLength(2);
  expect(getRecordContextRouteDefinitions()[0].recordProfile).toEqual(
    context.recordProfile,
  );
  expect(getRecordContextRouteDefinitions()[1].recordProfile).toBeUndefined();
});
const Probe = () => {
  const location = useLocation(),
    params = useParams();
  return (
    <div>
      Shared profile {params.objectRecordId} {location.pathname}
      {location.search} {String(location.state?.source)}
    </div>
  );
};
/* oxlint-disable twenty/no-navigate-prefer-link -- History controls require stack deltas, which Link does not support. */
const Navigation = () => {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => navigate(1)}>Forward</button>
    </>
  );
};
/* oxlint-enable twenty/no-navigate-prefer-link */
const Open = ({
  entry = '/projects/3/contact/7',
  history = false,
}: {
  entry?: string;
  history?: boolean;
}) => (
  <MemoryRouter
    initialEntries={
      history
        ? ['/list', { pathname: entry, state: { source: 'list' } }]
        : [{ pathname: entry, state: { source: 'list' } }]
    }
    initialIndex={history ? 1 : 0}
  >
    <Navigation />
    <Routes>
      <Route path="/list" element={<div>Source list</div>} />
      <Route
        path={context.path}
        element={
          <RecordContextRouteGate definition={context}>
            <div>Different profile</div>
          </RecordContextRouteGate>
        }
      />
      <Route
        path={context.path + '/home'}
        element={
          <RecordContextRouteGate definition={context}>
            <div>Different profile</div>
          </RecordContextRouteGate>
        }
      />
      <Route
        path={context.path + '/cv'}
        element={
          <RecordContextRouteGate definition={context}>
            <div>CV for this participation</div>
          </RecordContextRouteGate>
        }
      />
      <Route
        path="/contacts/:recordIdentifier"
        element={
          <RecordRouteGate definition={endpoint}>
            <Probe />
          </RecordRouteGate>
        }
      />
      <Route
        path="/contacts/:recordIdentifier/home"
        element={
          <RecordRouteGate definition={endpoint}>
            <Probe />
          </RecordRouteGate>
        }
      />
    </Routes>
  </MemoryRouter>
);
const scoped = (sourceAllowed = true, targetAllowed = true) => {
  const target = jest.fn(async () =>
    targetAllowed
      ? ({ status: 'ready', recordId: profileId, recordIdentifier: 7 } as const)
      : ({ status: 'denied' } as const),
  );
  const source = jest.fn(async () =>
    sourceAllowed ? ready : ({ status: 'denied' } as const),
  );
  configureRecordRouteScope(
    'profile-caller',
    ['contact'],
    target,
    ['participation'],
    source,
    [context.path],
  );
  return { source, target };
};
it.each(['', '/home'])(
  'opens the same native profile through a verified contextual %s link without rendering the other profile',
  async (suffix) => {
    const { source, target } = scoped();
    render(<Open entry={ready.path + suffix} />);
    await screen.findByText(
      new RegExp(
        `Shared profile ${profileId} /contacts/7${suffix}\\?project=3 list`,
      ),
    );
    expect(screen.queryByText('Different profile')).not.toBeInTheDocument();
    expect(source).toHaveBeenCalled();
    expect(target).toHaveBeenCalled();
  },
);
it.each([
  [false, true],
  [true, false],
])(
  'requires source and destination caller permissions (%s/%s)',
  async (sourceAllowed, targetAllowed) => {
    const { target } = scoped(sourceAllowed, targetAllowed);
    render(<Open />);
    await screen.findByText('Unavailable');
    expect(
      screen.queryByText(/Shared profile|Different profile/),
    ).not.toBeInTheDocument();
    if (!sourceAllowed) expect(target).not.toHaveBeenCalled();
  },
);
it('does not redirect or replace the selected original of a specialized source CV view', async () => {
  scoped();
  render(<Open entry={ready.path + '/cv'} />);
  await screen.findByText('CV for this participation');
  expect(screen.queryByText(/Shared profile/)).not.toBeInTheDocument();
});
it('back and forward retain the source list and shared profile without another history entry', async () => {
  scoped();
  render(<Open history />);
  await screen.findByText(/Shared profile/);
  const user = userEvent.setup();
  await user.click(screen.getByText('Back'));
  await screen.findByText('Source list');
  await user.click(screen.getByText('Forward'));
  await screen.findByText(/Shared profile/);
});
it('direct profile access uses the same native target without requiring a source context', async () => {
  const { source, target } = scoped();
  render(<Open entry="/contacts/7" />);
  await screen.findByText(
    new RegExp(`Shared profile ${profileId} /contacts/7 list`),
  );
  expect(source).not.toHaveBeenCalled();
  expect(target).toHaveBeenCalled();
});
it('an opted-in profile with no valid endpoint fails closed instead of displaying another profile', async () => {
  config.__TWENTY_RECORD_ROUTES__ = [];
  const { target } = scoped();
  render(<Open />);
  await screen.findByText('Unavailable');
  expect(screen.queryByText('Different profile')).not.toBeInTheDocument();
  expect(target).not.toHaveBeenCalled();
});
