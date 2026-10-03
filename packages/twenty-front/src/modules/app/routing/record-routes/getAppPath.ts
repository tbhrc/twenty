import { createPath, matchPath, parsePath, type To } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { getAppPath as getNativeAppPath } from 'twenty-shared/utils';

import {
  getCachedRecordIdentifier,
  getCachedContextRecordPath,
  requestRecordContextHref,
  isRecordRouteReadable,
  requestRecordRouteHref,
} from './recordRouteCache';
import {
  getRecordRouteDefinitions,
  parseRecordRouteIdentifier,
} from './recordRouteDefinitions';
import { getRecordContextRouteDefinitions } from './recordContextRoutes';

export const getRecordRoutePath = ({
  objectNameSingular,
  recordId,
  record,
}: {
  objectNameSingular: string;
  recordId: string;
  record?: Record<string, unknown>;
}) => {
  const nativePath = getNativeAppPath(AppPath.RecordShowPage, {
    objectNameSingular,
    objectRecordId: recordId,
  });
  const definition = getRecordRouteDefinitions().find(
    (item) => item.objectNameSingular === objectNameSingular,
  );
  const contextDefinition = getRecordContextRouteDefinitions().find(
    (item) => item.objectNameSingular === objectNameSingular,
  );
  if (contextDefinition) {
    const path = getCachedContextRecordPath(objectNameSingular, recordId);
    if (path) return path;
    requestRecordContextHref(contextDefinition, recordId);
    return nativePath;
  }
  if (!definition || !recordId) return nativePath;
  if (
    definition.allowUnidentifiedRecords &&
    record?.id === recordId &&
    record[definition.recordIdentifierField] === null
  )
    return nativePath;
  const identifier = getCachedRecordIdentifier(objectNameSingular, recordId);
  if (identifier !== undefined) return `${definition.path}/${identifier}`;
  const hint =
    record?.id === recordId && isRecordRouteReadable(objectNameSingular)
      ? parseRecordRouteIdentifier(record[definition.recordIdentifierField])
      : null;
  // A fetched record can provide its href, but cannot seed trusted UUID identity.
  // The destination gate resolves the alias using a fresh authenticated query.
  if (hint !== null) return `${definition.path}/${hint}`;
  requestRecordRouteHref(definition, recordId);
  return nativePath;
};

export const getFriendlyRecordPath = (path: string) => {
  const parsed = parsePath(path);
  const pathname = parsed.pathname ?? '';
  const indexMatch = matchPath(AppPath.RecordIndexPage, pathname);
  const indexDefinition = getRecordRouteDefinitions().find(
    (item) =>
      item.indexRoute !== false &&
      item.objectNamePlural === indexMatch?.params.objectNamePlural,
  );
  if (indexDefinition)
    return createPath({ ...parsed, pathname: indexDefinition.path });
  const showMatch = matchPath(AppPath.RecordShowPage, pathname);
  if (showMatch?.params.objectNameSingular && showMatch.params.objectRecordId) {
    return createPath({
      ...parsed,
      pathname: getRecordRoutePath({
        objectNameSingular: showMatch.params.objectNameSingular,
        recordId: showMatch.params.objectRecordId,
      }),
    });
  }
  return path;
};

export const getFriendlyRecordTo = (to: To): To => {
  if (typeof to === 'string') return getFriendlyRecordPath(to);
  if (!to.pathname) return to;
  return { ...to, ...parsePath(getFriendlyRecordPath(createPath(to))) };
};

export const getAppPath: typeof getNativeAppPath = (to, params, queryParams) =>
  getFriendlyRecordPath(getNativeAppPath(to, params, queryParams));
