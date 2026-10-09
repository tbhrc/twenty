import { styled } from '@linaria/react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import {
  getPageRouteForLayout,
  getPageRouteForPath,
} from '@/app/routing/record-routes/pageRouteDefinitions';

import { CommandMenuComponentInstanceContext } from '@/command-menu/states/contexts/CommandMenuComponentInstanceContext';
import { PageLayoutRenderer } from '@/page-layout/components/PageLayoutRenderer';
import { LayoutRenderingProvider } from '@/ui/layout/contexts/LayoutRenderingContext';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import { isDefined } from 'twenty-shared/utils';
import { PageLayoutType } from '~/generated-metadata/graphql';
import { StandalonePageHeader } from '~/pages/page-layout/StandalonePageHeader';

const StyledPageLayoutContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;

  @media print {
    display: block;
    min-height: auto;
    overflow: visible;
  }
`;

export const StandalonePageLayoutPage = () => {
  const location = useLocation();
  const { pageLayoutId: nativePageLayoutId } = useParams<{
    pageLayoutId: string;
  }>();
  const pageLayoutId =
    nativePageLayoutId ?? getPageRouteForPath(location.pathname)?.pageLayoutId;
  const canonicalRoute = nativePageLayoutId
    ? getPageRouteForLayout(nativePageLayoutId)
    : undefined;

  if (canonicalRoute) {
    return (
      <Navigate
        to={{
          pathname: canonicalRoute.path,
          search: location.search,
          hash: location.hash,
        }}
        replace
        state={location.state}
      />
    );
  }

  if (!isDefined(pageLayoutId)) {
    return null;
  }

  return (
    <CommandMenuComponentInstanceContext.Provider
      value={{ instanceId: pageLayoutId }}
    >
      <PageCardLayout
        header={<StandalonePageHeader pageLayoutId={pageLayoutId} />}
      >
        <LayoutRenderingProvider
          value={{
            targetRecordIdentifier: undefined,
            layoutType: PageLayoutType.STANDALONE_PAGE,
          }}
        >
          <StyledPageLayoutContainer>
            <PageLayoutRenderer pageLayoutId={pageLayoutId} />
          </StyledPageLayoutContainer>
        </LayoutRenderingProvider>
      </PageCardLayout>
    </CommandMenuComponentInstanceContext.Provider>
  );
};
