import { getAppPath } from '@/app/routing/record-routes/getAppPath';
import { getPageRouteForLayout } from '@/app/routing/record-routes/pageRouteDefinitions';
import { AppPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';

export const getPageLayoutNavigationMenuItemComputedLink = (
  item: Pick<NavigationMenuItem, 'pageLayoutId'>,
): string => {
  if (!isDefined(item.pageLayoutId)) {
    return '';
  }

  const namedRoute = getPageRouteForLayout(item.pageLayoutId);
  if (namedRoute) return namedRoute.path;

  return getAppPath(AppPath.PageLayoutPage, {
    pageLayoutId: item.pageLayoutId,
  });
};
