import { matchPath } from 'react-router-dom';
import { isValidUuid } from 'twenty-shared/utils';

export type RecordContextRouteDefinition = {
  path: string;
  objectNameSingular: string;
  objectNamePlural: string;
  relations: { parameter: string; objectNameSingular: string; field: string }[];
  views?: Record<string, string>;
};

const name = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_]*$/.test(value);

export const getRecordContextRouteDefinitions =
  (): RecordContextRouteDefinition[] => {
    const configured =
      typeof window === 'undefined'
        ? undefined
        : (window as Window & { __TWENTY_RECORD_CONTEXT_ROUTES__?: unknown })
            .__TWENTY_RECORD_CONTEXT_ROUTES__;
    if (!Array.isArray(configured)) return [];
    const definitions: RecordContextRouteDefinition[] = [];
    const objects = new Set<string>();
    const paths = new Set<string>();
    for (const candidate of configured) {
      if (!candidate || typeof candidate !== 'object') continue;
      const { path, objectNameSingular, objectNamePlural, relations, views } =
        candidate;
      if (
        typeof path !== 'string' ||
        !/^\/(?:[a-z][a-z0-9-]*|:[A-Za-z][A-Za-z0-9_]*)(?:\/(?:[a-z][a-z0-9-]*|:[A-Za-z][A-Za-z0-9_]*))*$/.test(
          path,
        ) ||
        !name(objectNameSingular) ||
        !name(objectNamePlural) ||
        !Array.isArray(relations) ||
        relations.length < 1 ||
        relations.length > 4 ||
        relations.some(
          (relation) =>
            !relation ||
            !name(relation.parameter) ||
            !name(relation.objectNameSingular) ||
            !name(relation.field),
        ) ||
        (views !== undefined &&
          (!views ||
            typeof views !== 'object' ||
            Array.isArray(views) ||
            Object.entries(views).some(
              ([view, tabId]) =>
                !/^[a-z][a-z0-9-]*$/.test(view) ||
                typeof tabId !== 'string' ||
                !isValidUuid(tabId),
            ) ||
            new Set(Object.values(views)).size !==
              Object.keys(views).length)) ||
        paths.has(path) ||
        objects.has(objectNameSingular)
      )
        continue;
      const parameters = path
        .split('/')
        .filter((segment) => segment.startsWith(':'))
        .map((segment) => segment.slice(1));
      if (
        parameters.length !== relations.length ||
        new Set(parameters).size !== parameters.length ||
        new Set(relations.map((relation) => relation.parameter)).size !==
          relations.length ||
        new Set(relations.map((relation) => relation.field)).size !==
          relations.length ||
        relations.some((relation) => !parameters.includes(relation.parameter))
      )
        continue;
      // Context routes extend an existing collection and cannot replace native,
      // authentication, or settings routes.
      if (
        path.startsWith('/:') ||
        [
          'object',
          'objects',
          'settings',
          'welcome',
          'authorize',
          'developers',
        ].includes(path.split('/')[1])
      )
        continue;
      paths.add(path);
      objects.add(objectNameSingular);
      definitions.push({
        path,
        objectNameSingular,
        objectNamePlural,
        relations: relations.map((relation) => ({ ...relation })),
        ...(views === undefined ? {} : { views: { ...views } }),
      });
    }
    return definitions;
  };

export const getRecordContextRouteMatch = (pathname: string) => {
  for (const definition of getRecordContextRouteDefinitions()) {
    for (const view of [undefined, ...Object.keys(definition.views ?? {})]) {
      const match = matchPath(
        `${definition.path}${view ? `/${view}` : ''}`,
        pathname,
      );
      if (match)
        return {
          definition,
          parameters: match.params,
          view,
          path: definition.path.replace(
            /:([A-Za-z][A-Za-z0-9_]*)/g,
            (_, parameter: string) => match.params[parameter] ?? '',
          ),
        };
    }
  }
  return null;
};
