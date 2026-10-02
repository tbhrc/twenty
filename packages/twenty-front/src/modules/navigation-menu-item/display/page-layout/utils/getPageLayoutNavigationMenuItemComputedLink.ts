import { getAppPath } from '@/app/routing/record-routes/getAppPath';
import { AppPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';

export const getPageLayoutNavigationMenuItemComputedLink = (
  item: Pick<NavigationMenuItem, 'pageLayoutId'>,
): string => {
  if (!isDefined(item.pageLayoutId)) {
    return '';
  }

  return getAppPath(AppPath.PageLayoutPage, {
    pageLayoutId: item.pageLayoutId,
  });
};
