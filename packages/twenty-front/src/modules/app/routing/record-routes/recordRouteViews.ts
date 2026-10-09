import { matchPath } from 'react-router-dom';
import { getRecordContextRouteMatch } from './recordContextRoutes';

import {
  getRecordRouteDefinitions,
  getRecordRoutePaths,
  type RecordRouteDefinition,
} from './recordRouteDefinitions';

export const getRecordRouteMatch = (pathname: string) => {
  for (const definition of getRecordRouteDefinitions()) {
    for (const path of getRecordRoutePaths(definition)) {
      for (const view of [undefined, ...Object.keys(definition.views ?? {})]) {
        const match = matchPath(
          `${path}/:recordIdentifier${view ? `/${view}` : ''}`,
          pathname,
        );
        if (match)
          return {
            definition:
              !definition.recordType || path === definition.path
                ? definition
                : { ...definition, path },
            recordIdentifier: match.params.recordIdentifier,
            view,
          };
      }
    }
  }
  return null;
};

export const getRecordRouteTabId = (pathname: string) => {
  const context = getRecordContextRouteMatch(pathname);
  if (context?.view) return context.definition.views?.[context.view];
  const match = getRecordRouteMatch(pathname);
  return match?.view ? match.definition.views?.[match.view] : undefined;
};

export const getRecordRouteViewLocation = ({
  definition,
  recordIdentifier,
  view,
  hash,
}: {
  definition: RecordRouteDefinition;
  recordIdentifier: number | string;
  view?: string;
  hash: string;
}) => {
  const mappedView =
    view ??
    Object.entries(definition.views ?? {}).find(
      ([, tabId]) => hash === `#${tabId}`,
    )?.[0];
  return {
    pathname: `${definition.path}/${recordIdentifier}${mappedView ? `/${mappedView}` : ''}`,
    hash: mappedView ? '' : hash,
  };
};

// Called only by the native tab UI: its current tab list remains the authority
// for tab availability. Configuration gives stable names, never record access.
export const getRecordRouteTabLocation = (pathname: string, tabId: string) => {
  const context = getRecordContextRouteMatch(pathname);
  if (context) {
    const view = Object.entries(context.definition.views ?? {}).find(
      ([, id]) => id === tabId,
    )?.[0];
    return {
      pathname: `${context.path}${view ? `/${view}` : ''}`,
      hash: view ? '' : `#${tabId}`,
    };
  }
  const match = getRecordRouteMatch(pathname);
  if (!match?.recordIdentifier) return { hash: `#${tabId}` };
  return getRecordRouteViewLocation({
    definition: match.definition,
    recordIdentifier: match.recordIdentifier,
    hash: `#${tabId}`,
  });
};
