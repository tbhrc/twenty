import { matchPath } from 'react-router-dom';
import { type RecordContextRouteDefinition } from './recordContextRoutes';
import {
  getRecordRouteDefinitions,
  parseRecordRouteIdentifier,
} from './recordRouteDefinitions';
import { type RecordContextResult } from './resolveNativeRecordContext';

export const isRecordContextProfileView = (
  definition: RecordContextRouteDefinition,
  view?: string,
) =>
  Boolean(
    definition.recordProfile &&
    (view === undefined ||
      (definition.recordProfile.views ?? []).includes(view)),
  );

// A presentation destination never resolves or caches identity. The source's
// existing authenticated context gate must return ready first, and the target
// then passes through its own native record gate under the same caller.
export const getRecordContextProfileLocation = (
  definition: RecordContextRouteDefinition,
  result: RecordContextResult | null,
  view: string | undefined,
  search: string,
) => {
  const profile = definition.recordProfile;
  if (
    !profile ||
    result?.status !== 'ready' ||
    !isRecordContextProfileView(definition, view)
  )
    return null;
  const relation = definition.relations.find(
    (entry) => entry.parameter === profile.relationParameter,
  );
  const endpoint = getRecordRouteDefinitions().find(
    (entry) => entry.objectNameSingular === relation?.objectNameSingular,
  );
  const match = matchPath(definition.path, result.path);
  const number = parseRecordRouteIdentifier(
    match?.params[profile.relationParameter],
  );
  if (
    !endpoint ||
    endpoint.recordType ||
    number === null ||
    (view && !endpoint.views?.[view])
  )
    return null;
  const query = new URLSearchParams(search);
  // Application list pagination is not a Person saved view. Browser history
  // still retains the source list entry; avoid installing its view on Person.
  query.delete('viewId');
  query.delete('panel');
  for (const [parameter, key] of Object.entries(
    profile.contextParameters ?? {},
  )) {
    const value = parseRecordRouteIdentifier(match?.params[parameter]);
    if (value === null) return null;
    query.set(key, String(value));
  }
  const encoded = query.toString();
  return {
    pathname: `${endpoint.path}/${number}${view ? `/${view}` : ''}`,
    search: encoded ? `?${encoded}` : '',
    hash: '',
  };
};
