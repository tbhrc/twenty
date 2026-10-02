import { useCallback, useSyncExternalStore } from 'react';
import {
  matchPath as matchNativePath,
  matchRoutes as matchNativeRoutes,
  parsePath,
  createPath,
  useLocation as useNativeLocation,
  useNavigate as useNativeNavigate,
  useParams as useNativeParams,
  type NavigateFunction,
} from 'react-router-dom';

import { getFriendlyRecordTo } from './getAppPath';
import {
  getCachedRecordId,
  getRecordRouteVersion,
  subscribeRecordRoutes,
} from './recordRouteCache';
import {
  getRecordRouteDefinitions,
  parseRecordRouteIdentifier,
} from './recordRouteDefinitions';

export const useRecordRouteVersion = () =>
  useSyncExternalStore(
    subscribeRecordRoutes,
    getRecordRouteVersion,
    getRecordRouteVersion,
  );

export const getFriendlyRouteParameters = (pathname: string) => {
  for (const definition of getRecordRouteDefinitions()) {
    if (pathname === definition.path || pathname === `${definition.path}/`) {
      return {
        objectNamePlural: definition.objectNamePlural,
        objectNameSingular: undefined,
        objectRecordId: undefined,
      };
    }
    const match = matchNativePath(
      `${definition.path}/:recordIdentifier`,
      pathname,
    );
    if (!match) continue;
    const number = parseRecordRouteIdentifier(match.params.recordIdentifier);
    return {
      objectNameSingular: definition.objectNameSingular,
      objectNamePlural: definition.objectNamePlural,
      objectRecordId:
        number === null
          ? undefined
          : getCachedRecordId(definition.objectNameSingular, number),
    };
  }
  return null;
};

export const getLogicalRecordPathname = (pathname: string) => {
  const parameters = getFriendlyRouteParameters(pathname);
  if (!parameters) return pathname;
  if (parameters.objectNameSingular) {
    return parameters.objectRecordId
      ? `/object/${parameters.objectNameSingular}/${parameters.objectRecordId}`
      : pathname;
  }
  return `/objects/${parameters.objectNamePlural}`;
};

export const getLogicalRecordPath = (path: string) => {
  const parsed = parsePath(path);
  return createPath({
    ...parsed,
    pathname: getLogicalRecordPathname(parsed.pathname ?? ''),
  });
};

// Business hooks see native identity while the actual router and browser keep
// the deployment alias. The hooks read the current surface's location, so panel
// routing cannot accidentally inherit the main page's record parameters.
export const useLocation: typeof useNativeLocation = () => {
  useRecordRouteVersion();
  const location = useNativeLocation();
  const pathname = getLogicalRecordPathname(location.pathname);
  return pathname === location.pathname ? location : { ...location, pathname };
};

export const useParams: typeof useNativeParams = (() => {
  useRecordRouteVersion();
  const params = useNativeParams();
  const location = useNativeLocation();
  const friendly = getFriendlyRouteParameters(location.pathname);
  return friendly ? { ...params, ...friendly } : params;
}) as typeof useNativeParams;

export const matchPath: typeof matchNativePath = (pattern, pathname) =>
  matchNativePath(pattern, getLogicalRecordPathname(pathname));

export const matchRoutes: typeof matchNativeRoutes = (
  routes,
  location,
  basename,
) => {
  const parsed = typeof location === 'string' ? parsePath(location) : location;
  return matchNativeRoutes(
    routes,
    { ...parsed, pathname: getLogicalRecordPathname(parsed.pathname ?? '') },
    basename,
  );
};

export const useNavigate: typeof useNativeNavigate = () => {
  const navigate = useNativeNavigate();
  return useCallback(
    ((to, options) => {
      if (typeof to === 'number') return navigate(to);
      return navigate(getFriendlyRecordTo(to), options);
    }) as NavigateFunction,
    [navigate],
  );
};
