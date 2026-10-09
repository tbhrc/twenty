import { matchPath } from 'react-router-dom';
import { isValidUuid } from 'twenty-shared/utils';

export type RecordContextRouteDefinition = {
  path: string;
  canonical?: false;
  objectNameSingular: string;
  objectNamePlural: string;
  recordIdentifier?: { parameter: string; field: string };
  relations: {
    parameter: string;
    objectNameSingular: string;
    field?: string;
    fieldPath?: string[];
    verifyFieldPath?: string[];
  }[];
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
      const {
        path,
        objectNameSingular,
        objectNamePlural,
        relations,
        views,
        recordIdentifier,
        canonical,
      } = candidate;
      if (
        typeof path !== 'string' ||
        !/^\/(?:[A-Za-z][A-Za-z0-9-]*|:[A-Za-z][A-Za-z0-9_]*)(?:\/(?:[A-Za-z][A-Za-z0-9-]*|:[A-Za-z][A-Za-z0-9_]*))*$/.test(
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
            !(
              (name(relation.field) && relation.fieldPath === undefined) ||
              (relation.field === undefined &&
                recordIdentifier !== undefined &&
                Array.isArray(relation.fieldPath) &&
                relation.fieldPath.length >= 1 &&
                relation.fieldPath.length <= 3 &&
                relation.fieldPath.every(name))
            ),
        ) ||
        (canonical !== undefined && canonical !== false) ||
        relations.some(
          (relation) =>
            relation.verifyFieldPath !== undefined &&
            (recordIdentifier === undefined ||
              !Array.isArray(relation.verifyFieldPath) ||
              relation.verifyFieldPath.length < 1 ||
              relation.verifyFieldPath.length > 3 ||
              !relation.verifyFieldPath.every(name)),
        ) ||
        (recordIdentifier !== undefined &&
          (!recordIdentifier ||
            !name(recordIdentifier.parameter) ||
            !name(recordIdentifier.field))) ||
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
        (canonical !== false && objects.has(objectNameSingular))
      )
        continue;
      if (canonical === false) {
        const primary = definitions.find(
          (entry) =>
            entry.objectNameSingular === objectNameSingular &&
            entry.canonical !== false,
        );
        if (
          !primary ||
          primary.objectNamePlural !== objectNamePlural ||
          !recordIdentifier ||
          JSON.stringify(primary.recordIdentifier) !==
            JSON.stringify(recordIdentifier)
        )
          continue;
      }
      const parameters = path
        .split('/')
        .filter((segment) => segment.startsWith(':'))
        .map((segment) => segment.slice(1));
      if (
        parameters.length !== relations.length + (recordIdentifier ? 1 : 0) ||
        new Set(parameters).size !== parameters.length ||
        new Set(relations.map((relation) => relation.parameter)).size !==
          relations.length ||
        new Set(
          relations.map((relation) =>
            JSON.stringify(relation.fieldPath ?? [relation.field]),
          ),
        ).size !== relations.length ||
        relations.some(
          (relation) => !parameters.includes(relation.parameter),
        ) ||
        (recordIdentifier &&
          (!parameters.includes(recordIdentifier.parameter) ||
            relations.some(
              (relation) => relation.parameter === recordIdentifier.parameter,
            )))
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
        ].includes(path.split('/')[1].toLowerCase())
      )
        continue;
      paths.add(path);
      if (canonical !== false) objects.add(objectNameSingular);
      definitions.push({
        path,
        ...(canonical === false ? { canonical: false as const } : {}),
        objectNameSingular,
        objectNamePlural,
        relations: relations.map((relation) => ({
          ...relation,
          ...(relation.fieldPath ? { fieldPath: [...relation.fieldPath] } : {}),
          ...(relation.verifyFieldPath
            ? { verifyFieldPath: [...relation.verifyFieldPath] }
            : {}),
        })),
        ...(recordIdentifier
          ? { recordIdentifier: { ...recordIdentifier } }
          : {}),
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
