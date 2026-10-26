import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useWorkspaceRouteObjects } from '@/app/routing/components/WorkspaceRouteObjectsProvider';
import { isWorkspaceLocationAvailableOnSurface } from '@/app/routing/utils/isWorkspaceLocationAvailableOnSurface';
import { SIDE_PANEL_PATH_SEARCH_PARAM } from '@/side-panel/routing/constants/SidePanelPathSearchParam';
import { useCurrentSidePanelRoutedPath } from '@/side-panel/routing/hooks/useCurrentSidePanelRoutedPath';
import { useOpenRoutedPageInSidePanel } from '@/side-panel/routing/hooks/useOpenRoutedPageInSidePanel';
import { isSafeInternalPath } from '@/ui/navigation/utils/isSafeInternalPath';

export const SidePanelPathUrlSyncEffect = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentRoutedPath = useCurrentSidePanelRoutedPath();
  const { openRoutedPageInSidePanel } = useOpenRoutedPageInSidePanel();
  const routeObjects = useWorkspaceRouteObjects();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const pathInUrl = searchParams.get(SIDE_PANEL_PATH_SEARCH_PARAM);

    if (pathInUrl === null) return;

    // Restore old deep links once; panel navigation belongs to its own state.
    if (
      pathInUrl !== currentRoutedPath &&
      isSafeInternalPath(pathInUrl) &&
      isWorkspaceLocationAvailableOnSurface(routeObjects, 'side-panel', pathInUrl)
    ) {
      openRoutedPageInSidePanel({
        path: pathInUrl,
        resetNavigationStack: true,
      });
    }

    searchParams.delete(SIDE_PANEL_PATH_SEARCH_PARAM);
    const search = searchParams.toString();
    navigate(
      {
        pathname: location.pathname,
        search: search ? `?${search}` : '',
        hash: location.hash,
      },
      { replace: true, state: location.state, preventScrollReset: true },
    );
  }, [currentRoutedPath, location, navigate, openRoutedPageInSidePanel, routeObjects]);

  return null;
};
