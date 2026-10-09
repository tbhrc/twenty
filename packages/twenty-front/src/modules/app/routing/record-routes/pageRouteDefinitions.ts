import { isValidUuid } from 'twenty-shared/utils';

import {
  getRecordRouteDefinitions,
  getIndexRouteDefinitions,
  getRecordRoutePaths,
} from './recordRouteDefinitions';

export type PageRouteDefinition = { path: string; pageLayoutId: string };

const RESERVED_SEGMENTS = new Set([
  'object',
  'objects',
  'settings',
  'developers',
  'welcome',
  'verify',
  'verify-email',
  'reset-password',
  'invite',
  'create',
  'sync',
  'chat',
  'home',
  'page',
  'workflow-core',
  'authorize',
  'dpa',
  'not-found',
  'workspace-activation',
  'install-apps',
  'invite-team',
  'plan-required',
  'book-call',
]);

export const getPageRouteDefinitions = (): PageRouteDefinition[] => {
  const configured =
    typeof window === 'undefined'
      ? undefined
      : (window as Window & { __TWENTY_PAGE_ROUTES__?: unknown })
          .__TWENTY_PAGE_ROUTES__;
  if (!Array.isArray(configured)) return [];
  const paths = new Set([
    ...getRecordRouteDefinitions().flatMap(getRecordRoutePaths),
    ...getIndexRouteDefinitions().map((r) => r.path),
  ]);
  const pageIds = new Set<string>();
  const definitions: PageRouteDefinition[] = [];
  for (const candidate of configured) {
    if (!candidate || typeof candidate !== 'object') continue;
    const { path, pageLayoutId } = candidate;
    if (
      typeof path !== 'string' ||
      !/^\/[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)?$/.test(path) ||
      RESERVED_SEGMENTS.has(path.split('/')[1]) ||
      paths.has(path) ||
      typeof pageLayoutId !== 'string' ||
      !isValidUuid(pageLayoutId) ||
      pageIds.has(pageLayoutId)
    )
      continue;
    paths.add(path);
    pageIds.add(pageLayoutId);
    definitions.push({ path, pageLayoutId });
  }
  return definitions;
};

export const getPageRouteForPath = (pathname: string) =>
  getPageRouteDefinitions().find(
    (definition) => definition.path === pathname.replace(/\/$/, ''),
  );

export const getPageRouteForLayout = (pageLayoutId: string) =>
  getPageRouteDefinitions().find(
    (definition) => definition.pageLayoutId === pageLayoutId,
  );
