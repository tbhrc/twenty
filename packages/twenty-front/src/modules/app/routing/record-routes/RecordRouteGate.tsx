import { type ReactNode, useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { WorkspaceRouteUnavailable } from '@/app/routing/components/WorkspaceRouteUnavailable';
import { RecordIndexSkeletonLoader } from '@/object-record/record-index/components/RecordIndexSkeletonLoader';

import {
  getRecordRouteGeneration,
  isRecordRouteReadable,
  resolveRecordRoute,
  type RecordRouteLookupResult,
} from './recordRouteCache';
import {
  getRecordRouteDefinitions,
  parseRecordRouteIdentifier,
  type RecordRouteDefinition,
} from './recordRouteDefinitions';
import { useRecordRouteVersion } from './router';
import {
  getRecordRouteMatch,
  getRecordRouteViewLocation,
} from './recordRouteViews';

export const RecordRouteGate = ({
  definition: aliasDefinition,
  children,
}: {
  definition?: RecordRouteDefinition;
  children: ReactNode;
}) => {
  useRecordRouteVersion();
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const definition = useMemo(
    () =>
      aliasDefinition ??
      getRecordRouteDefinitions().find(
        (item) => item.objectNameSingular === params.objectNameSingular,
      ),
    [aliasDefinition, params.objectNameSingular],
  );
  const target = aliasDefinition
    ? params.recordIdentifier
    : params.objectRecordId;
  const generation = getRecordRouteGeneration();
  // An optional identifier must not narrow access to ordinary native records.
  // Native pages retain their existing authentication and record permissions;
  // aliases always require identifier-field read permission.
  const retainNativePermissions =
    !aliasDefinition &&
    definition?.allowUnidentifiedRecords &&
    !isRecordRouteReadable(definition.objectNameSingular);
  // Returning to the same target starts a new read even when history keys repeat.
  const readIdentity = useMemo(
    () => ({
      aliasDefinition,
      definition,
      generation,
      target,
      retainNativePermissions,
    }),
    [aliasDefinition, definition, generation, target, retainNativePermissions],
  );
  const [resolved, setResolved] = useState<{
    readIdentity: typeof readIdentity;
    result: RecordRouteLookupResult;
  } | null>(null);

  useEffect(() => {
    if (!definition || retainNativePermissions) return;
    let cancelled = false;
    const number = aliasDefinition ? parseRecordRouteIdentifier(target) : null;
    if (!target || (aliasDefinition && number === null)) {
      setResolved({ readIdentity, result: { status: 'missing' } });
      return;
    }
    void resolveRecordRoute(
      definition,
      aliasDefinition ? { recordIdentifier: number! } : { recordId: target },
    ).then((result) => {
      if (!cancelled) setResolved({ readIdentity, result });
    });
    return () => {
      cancelled = true;
    };
  }, [
    aliasDefinition,
    definition,
    generation,
    target,
    retainNativePermissions,
    readIdentity,
  ]);

  const result =
    resolved?.readIdentity === readIdentity ? resolved.result : null;
  useEffect(() => {
    const canonicalLocation =
      definition && result?.status === 'ready'
        ? getRecordRouteViewLocation({
            definition,
            recordIdentifier: result.recordIdentifier,
            view: getRecordRouteMatch(location.pathname)?.view,
            hash: location.hash,
          })
        : null;
    if (
      !retainNativePermissions &&
      definition &&
      result?.status === 'ready' &&
      canonicalLocation &&
      (location.pathname.replace(/\/$/, '') !== canonicalLocation.pathname ||
        location.hash !== canonicalLocation.hash)
    ) {
      navigate(
        {
          ...canonicalLocation,
          search: location.search,
        },
        { replace: true, state: location.state },
      );
    }
  }, [
    aliasDefinition,
    retainNativePermissions,
    definition,
    result,
    navigate,
    location.search,
    location.pathname,
    location.hash,
    location.state,
  ]);

  if (!definition || retainNativePermissions) return children;
  if (!result) return <RecordIndexSkeletonLoader />;
  if (
    !aliasDefinition &&
    definition.allowUnidentifiedRecords &&
    result.status === 'unidentified'
  )
    return children;
  if (result.status !== 'ready') return <WorkspaceRouteUnavailable />;
  return children;
};
