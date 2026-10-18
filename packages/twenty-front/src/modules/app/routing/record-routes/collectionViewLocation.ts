import { createPath, parsePath, type To } from 'react-router-dom';
import { isValidUuid } from 'twenty-shared/utils';

import {
  getIndexRouteDefinitions,
  getRecordRouteDefinitions,
  getRecordRoutePaths,
} from './recordRouteDefinitions';
import { getRecordRouteMatch } from './recordRouteViews';

const STATE_KEY = '__twentyCollectionView';

const getCollection = (pathname: string) => {
  const path = pathname.replace(/\/$/, '');
  const collection = [
    ...getRecordRouteDefinitions(),
    ...getIndexRouteDefinitions(),
  ].find(
    (definition) =>
      definition.hideViewId === true &&
      (!('indexRoute' in definition) || definition.indexRoute !== false) &&
      (definition.path === path ||
        ('recordIdentifierField' in definition &&
          getRecordRoutePaths(definition).includes(path)) ||
        `/objects/${definition.objectNamePlural}` === path),
  );
  if (collection) return { ...collection, surfacePath: collection.path };
  const record = getRecordRouteMatch(path);
  if (record?.definition.hideViewId)
    return { ...record.definition, surfacePath: path };
  const nativeRecord = /^\/object\/([^/]+)\/([^/]+)$/.exec(path);
  const definition =
    nativeRecord && isValidUuid(nativeRecord[2])
      ? getRecordRouteDefinitions().find(
          (item) =>
            item.hideViewId && item.objectNameSingular === nativeRecord[1],
        )
      : undefined;
  return definition ? { ...definition, surfacePath: path } : undefined;
};

export const getHiddenCollectionViewId = (
  pathname: string,
  state: unknown,
): string | null => {
  const definition = getCollection(pathname);
  if (!definition || !state || typeof state !== 'object') return null;
  const selection = (state as Record<string, unknown>)[STATE_KEY];
  if (!selection || typeof selection !== 'object') return null;
  const { path, viewId } = selection as Record<string, unknown>;
  return path === definition.path &&
    typeof viewId === 'string' &&
    isValidUuid(viewId)
    ? viewId
    : null;
};

// Saved-view UUIDs belong to native selection, never to public collection identity.
// History state retains each selection for reload and Back/Forward; the context
// provider still validates that view against readable metadata for this object.
export const getCleanCollectionNavigation = (to: To, state?: unknown) => {
  const parsed = typeof to === 'string' ? parsePath(to) : to;
  const definition = getCollection(parsed.pathname ?? '');
  if (!definition) return { to, state };
  const search = new URLSearchParams(parsed.search);
  const viewId = search.get('viewId');
  search.delete('viewId');
  const pathname = definition.surfacePath;
  const clean = {
    ...parsed,
    pathname,
    search: search.size ? `?${search}` : '',
  };
  return {
    to: typeof to === 'string' ? createPath(clean) : clean,
    state:
      viewId && isValidUuid(viewId)
        ? {
            ...(state && typeof state === 'object' ? state : {}),
            [STATE_KEY]: { path: definition.path, viewId },
          }
        : state,
  };
};

export const getCleanCollectionHref = (path: string) =>
  getCleanCollectionNavigation(path).to as string;
