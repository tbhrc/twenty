import { PageLayoutTabListEffect } from '@/page-layout/components/PageLayoutTabListEffect';
import { makeTab } from '@/page-layout/testing/pageLayoutDraftFixtures';
import { LayoutRenderingProvider } from '@/ui/layout/contexts/LayoutRenderingContext';
import { WorkspaceSurfaceContext } from '@/ui/layout/contexts/WorkspaceSurfaceContext';
import { activeTabIdComponentState } from '@/ui/layout/tab-list/states/activeTabIdComponentState';
import { TabListComponentInstanceContext } from '@/ui/layout/tab-list/states/contexts/TabListComponentInstanceContext';
import { render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { StrictMode } from 'react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom';
import { PageLayoutType } from '~/generated-metadata/graphql';

const TAB_LIST_INSTANCE_ID = 'record-tabs';

const CurrentLocation = () => {
  const { pathname, search, hash } = useLocation();
  const navigationType = useNavigationType();

  return (
    <>
      <output aria-label="Current URL">{pathname + search + hash}</output>
      <output aria-label="Navigation type">{navigationType}</output>
    </>
  );
};

describe('PageLayoutTabListEffect', () => {
  const linkedInTab = '11111111-1111-4111-8111-111111111111';
  beforeEach(() => {
    (
      window as Window & { __TWENTY_RECORD_ROUTES__?: unknown }
    ).__TWENTY_RECORD_ROUTES__ = [
      {
        path: '/person',
        objectNameSingular: 'person',
        objectNamePlural: 'people',
        recordIdentifierField: 'candidateNumber',
        views: { linkedin: linkedInTab },
      },
    ];
  });
  afterEach(() => {
    (
      window as Window & { __TWENTY_RECORD_ROUTES__?: unknown }
    ).__TWENTY_RECORD_ROUTES__ = undefined;
  });
  it.each([
    {
      name: 'selects the configured native tab on a clean Person URL',
      pathname: '/person/12580/linkedin',
      extraTabId: linkedInTab,
      activeTabId: null,
      hash: '',
      isInSidePanel: false,
      ownsRouteLocation: true,
      expectedHash: '',
      expectedActiveTabId: linkedInTab,
      expectedNavigationType: 'POP',
    },
    {
      name: 'replaces the previous Home selection when the clean route changes',
      pathname: '/person/12580/linkedin',
      extraTabId: linkedInTab,
      activeTabId: 'timeline',
      hash: '',
      isInSidePanel: false,
      ownsRouteLocation: true,
      expectedHash: '',
      expectedActiveTabId: linkedInTab,
      expectedNavigationType: 'POP',
    },
    {
      name: 'does not select a configured tab absent from the permitted layout',
      pathname: '/person/12580/linkedin',
      activeTabId: null,
      hash: '',
      isInSidePanel: false,
      ownsRouteLocation: true,
      expectedHash: '',
      expectedActiveTabId: 'timeline',
      expectedNavigationType: 'POP',
    },
    {
      name: 'does not apply the main clean route to an embedded side panel',
      pathname: '/person/12580/linkedin',
      extraTabId: linkedInTab,
      activeTabId: null,
      hash: '',
      isInSidePanel: true,
      ownsRouteLocation: false,
      expectedHash: '',
      expectedActiveTabId: 'timeline',
      expectedNavigationType: 'POP',
    },
    {
      name: 'replaces the hash when the active tab becomes pinned',
      activeTabId: 'home',
      hash: '#home',
      isInSidePanel: false,
      ownsRouteLocation: true,
      expectedHash: '#timeline',
      expectedActiveTabId: 'timeline',
      expectedNavigationType: 'REPLACE',
    },
    {
      name: 'does not rewrite the main URL for a side-panel fallback',
      activeTabId: 'home',
      hash: '#home',
      isInSidePanel: true,
      ownsRouteLocation: false,
      expectedHash: '#home',
      expectedActiveTabId: 'timeline',
      expectedNavigationType: 'POP',
    },
    {
      name: 'does not add a hash when there was no tab in the URL',
      activeTabId: 'home',
      hash: '',
      isInSidePanel: false,
      ownsRouteLocation: true,
      expectedHash: '',
      expectedActiveTabId: 'timeline',
      expectedNavigationType: 'POP',
    },
    {
      name: 'preserves a valid deep link while replacing a stale active tab',
      activeTabId: 'home',
      hash: '#notes',
      isInSidePanel: false,
      ownsRouteLocation: true,
      expectedHash: '#notes',
      expectedActiveTabId: 'notes',
      expectedNavigationType: 'POP',
    },
    {
      name: 'preserves a valid deep link on initial load',
      activeTabId: null,
      hash: '#notes',
      isInSidePanel: false,
      ownsRouteLocation: true,
      expectedHash: '#notes',
      expectedActiveTabId: 'notes',
      expectedNavigationType: 'POP',
    },
    {
      name: 'keeps a valid active tab and its hash',
      activeTabId: 'notes',
      hash: '#notes',
      isInSidePanel: false,
      ownsRouteLocation: true,
      expectedHash: '#notes',
      expectedActiveTabId: 'notes',
      expectedNavigationType: 'POP',
    },
    {
      name: 'honors a deep-linked tab in a routed side panel',
      activeTabId: null,
      hash: '#notes',
      isInSidePanel: true,
      ownsRouteLocation: true,
      expectedHash: '#notes',
      expectedActiveTabId: 'notes',
      expectedNavigationType: 'POP',
    },
    {
      name: 'replaces a stale hash in the current routed side-panel page',
      activeTabId: 'home',
      hash: '#home',
      isInSidePanel: true,
      ownsRouteLocation: true,
      expectedHash: '#timeline',
      expectedActiveTabId: 'timeline',
      expectedNavigationType: 'REPLACE',
    },
    {
      name: 'ignores a deep link while editing',
      activeTabId: 'timeline',
      hash: '#notes',
      isInEditMode: true,
      isInSidePanel: false,
      ownsRouteLocation: true,
      expectedHash: '#notes',
      expectedActiveTabId: 'timeline',
      expectedNavigationType: 'POP',
    },
    {
      name: 'does not rewrite a stale hash while editing',
      activeTabId: 'home',
      hash: '#home',
      isInEditMode: true,
      isInSidePanel: false,
      ownsRouteLocation: true,
      expectedHash: '#home',
      expectedActiveTabId: 'timeline',
      expectedNavigationType: 'POP',
    },
    {
      name: 'ignores the main URL when initializing an embedded side panel',
      activeTabId: null,
      hash: '#notes',
      isInSidePanel: true,
      ownsRouteLocation: false,
      expectedHash: '#notes',
      expectedActiveTabId: 'timeline',
      expectedNavigationType: 'POP',
    },
  ])(
    '$name',
    ({
      activeTabId,
      pathname = '/object/company/record-id',
      extraTabId,
      hash,
      isInSidePanel,
      isInEditMode = false,
      ownsRouteLocation,
      expectedHash,
      expectedActiveTabId,
      expectedNavigationType,
    }) => {
      const store = createStore();
      const onChangeTab = jest.fn();
      const surfaceInstanceId = isInSidePanel ? 'side-panel-page-1' : 'main';
      const activeTabAtom = activeTabIdComponentState.atomFamily({
        instanceId: TAB_LIST_INSTANCE_ID,
      });
      store.set(activeTabAtom, activeTabId);

      render(
        <StrictMode>
          <Provider store={store}>
            <MemoryRouter
              initialEntries={[`${pathname}?viewId=company-view${hash}`]}
            >
              <WorkspaceSurfaceContext.Provider
                value={{
                  type: isInSidePanel ? 'side-panel' : 'main',
                  instanceId: surfaceInstanceId,
                  ownsRouteLocation,
                }}
              >
                <LayoutRenderingProvider
                  value={{
                    layoutType: PageLayoutType.RECORD_PAGE,
                    targetRecordIdentifier: {
                      id: 'record-id',
                      targetObjectNameSingular: 'company',
                    },
                  }}
                >
                  <TabListComponentInstanceContext.Provider
                    value={{
                      instanceId: TAB_LIST_INSTANCE_ID,
                    }}
                  >
                    <PageLayoutTabListEffect
                      isInEditMode={isInEditMode}
                      onChangeTab={onChangeTab}
                      tabs={[
                        makeTab('timeline', []),
                        makeTab('notes', [], 1),
                        ...(extraTabId ? [makeTab(extraTabId, [], 2)] : []),
                      ]}
                      componentInstanceId={TAB_LIST_INSTANCE_ID}
                    />
                    <CurrentLocation />
                  </TabListComponentInstanceContext.Provider>
                </LayoutRenderingProvider>
              </WorkspaceSurfaceContext.Provider>
            </MemoryRouter>
          </Provider>
        </StrictMode>,
      );

      expect(
        screen.getByRole('status', { name: 'Current URL' }),
      ).toHaveTextContent(`${pathname}?viewId=company-view${expectedHash}`);
      expect(store.get(activeTabAtom)).toBe(expectedActiveTabId);
      expect(onChangeTab).toHaveBeenCalledTimes(
        activeTabId === expectedActiveTabId ? 0 : 1,
      );
      if (activeTabId !== expectedActiveTabId) {
        expect(onChangeTab).toHaveBeenCalledWith(expectedActiveTabId);
      }
      expect(
        screen.getByRole('status', { name: 'Navigation type' }),
      ).toHaveTextContent(expectedNavigationType);
    },
  );
});
