import { Request } from 'cross-fetch';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import {
  getPageRouteDefinitions,
  getPageRouteForPath,
} from '../pageRouteDefinitions';
import { getPageLayoutNavigationMenuItemComputedLink } from '@/navigation-menu-item/display/page-layout/utils/getPageLayoutNavigationMenuItemComputedLink';
import { StandalonePageLayoutPage } from '~/pages/page-layout/StandalonePageLayoutPage';

jest.mock('@/page-layout/components/PageLayoutRenderer', () => ({
  PageLayoutRenderer: ({ pageLayoutId }: { pageLayoutId: string }) => (
    <div data-testid="native-page">{pageLayoutId}</div>
  ),
}));
jest.mock('~/pages/page-layout/StandalonePageHeader', () => ({
  StandalonePageHeader: () => null,
}));
jest.mock('@/ui/layout/page/components/PageCardLayout', () => ({
  PageCardLayout: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/ui/layout/contexts/LayoutRenderingContext', () => ({
  LayoutRenderingProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

Object.assign(globalThis, { Request });

const pageId = '42a9af0f-8901-4ff3-b9d4-7010098ac7e6';
const otherId = '41778d85-9dfa-468c-a8d9-d8e45065876b';
const configuredWindow = window as Window & {
  __TWENTY_PAGE_ROUTES__?: unknown;
  __TWENTY_RECORD_ROUTES__?: unknown;
};

beforeEach(() => {
  configuredWindow.__TWENTY_PAGE_ROUTES__ = [
    { path: '/mission-control', pageLayoutId: pageId },
  ];
  configuredWindow.__TWENTY_RECORD_ROUTES__ = [];
});
afterEach(() => {
  delete configuredWindow.__TWENTY_PAGE_ROUTES__;
  delete configuredWindow.__TWENTY_RECORD_ROUTES__;
});

it('emits the named primary link and keeps unknown native pages usable', () => {
  expect(
    getPageLayoutNavigationMenuItemComputedLink({ pageLayoutId: pageId }),
  ).toBe('/mission-control');
  expect(
    getPageLayoutNavigationMenuItemComputedLink({ pageLayoutId: otherId }),
  ).toBe(`/page/${otherId}`);
  expect(
    getPageLayoutNavigationMenuItemComputedLink({ pageLayoutId: null }),
  ).toBe('');
});

it('matches optional trailing slash without treating a child path as the page', () => {
  expect(getPageRouteForPath('/mission-control/')?.pageLayoutId).toBe(pageId);
  expect(getPageRouteForPath('/mission-control/unregistered')).toBeUndefined();
});

it('rejects malformed, reserved, duplicate and object-index route configuration', () => {
  configuredWindow.__TWENTY_RECORD_ROUTES__ = [
    {
      path: '/tickets',
      objectNameSingular: 'ticket',
      objectNamePlural: 'tickets',
      recordIdentifierField: 'number',
    },
  ];
  configuredWindow.__TWENTY_PAGE_ROUTES__ = [
    { path: '/settings/apps', pageLayoutId: pageId },
    { path: '/tickets', pageLayoutId: pageId },
    { path: '/:param', pageLayoutId: pageId },
    { path: '//external', pageLayoutId: pageId },
    { path: '/invalid', pageLayoutId: 'bad' },
    { path: '/mission-control', pageLayoutId: pageId },
    { path: '/another', pageLayoutId: pageId },
    { path: '/mission-control', pageLayoutId: otherId },
    { path: '/campaigns/email', pageLayoutId: otherId },
  ];
  expect(getPageRouteDefinitions()).toEqual([
    { path: '/mission-control', pageLayoutId: pageId },
    { path: '/campaigns/email', pageLayoutId: otherId },
  ]);
});

it('disables aliases when configuration is absent or is not an array', () => {
  delete configuredWindow.__TWENTY_PAGE_ROUTES__;
  expect(getPageRouteDefinitions()).toEqual([]);
  configuredWindow.__TWENTY_PAGE_ROUTES__ = {};
  expect(getPageRouteDefinitions()).toEqual([]);
});

const mountPage = (
  initialEntries: NonNullable<Parameters<typeof createMemoryRouter>[1]>['initialEntries'],
) => {
  const router = createMemoryRouter(
    [
      { path: '/mission-control', element: <StandalonePageLayoutPage /> },
      { path: '/page/:pageLayoutId', element: <StandalonePageLayoutPage /> },
      { path: '/previous', element: <div>Previous</div> },
    ],
    { initialEntries },
  );
  render(<RouterProvider router={router} />);
  return router;
};

it('direct entry and reload render the same native page identity', async () => {
  mountPage(['/mission-control/']);
  expect(await screen.findByTestId('native-page')).toHaveTextContent(pageId);
});

it('replaces old bookmarks, preserving query, hash, state and the preceding history entry', async () => {
  const state = { saved: 'view' };
  const router = mountPage([
    '/previous',
    {
      pathname: `/page/${pageId}`,
      search: '?view=retained',
      hash: '#tab',
      state,
    },
  ]);
  await waitFor(() =>
    expect(router.state.location.pathname).toBe('/mission-control'),
  );
  expect(router.state.location.search).toBe('?view=retained');
  expect(router.state.location.hash).toBe('#tab');
  expect(router.state.location.state).toEqual(state);
  expect(await screen.findByTestId('native-page')).toHaveTextContent(pageId);
  await router.navigate(-1);
  expect(await screen.findByText('Previous')).toBeInTheDocument();
});

it('does not redirect unconfigured pages', async () => {
  const router = mountPage([`/page/${otherId}`]);
  expect(await screen.findByTestId('native-page')).toHaveTextContent(otherId);
  expect(router.state.location.pathname).toBe(`/page/${otherId}`);
});
