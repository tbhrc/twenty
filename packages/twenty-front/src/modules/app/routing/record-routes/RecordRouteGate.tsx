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
  const [resolved, setResolved] = useState<{
    generation: number;
    target: string | undefined;
    result: RecordRouteLookupResult;
  } | null>(null);

  useEffect(() => {
    if (!definition || retainNativePermissions) return;
    let cancelled = false;
    const number = aliasDefinition ? parseRecordRouteIdentifier(target) : null;
    if (!target || (aliasDefinition && number === null)) {
      setResolved({ generation, target, result: { status: 'missing' } });
      return;
    }
    void resolveRecordRoute(
      definition,
      aliasDefinition ? { recordIdentifier: number! } : { recordId: target },
    ).then((result) => {
      if (!cancelled) setResolved({ generation, target, result });
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
  ]);

  const result =
    resolved?.generation === generation && resolved.target === target
      ? resolved.result
      : null;
  useEffect(() => {
    if (
      !aliasDefinition &&
      !retainNativePermissions &&
      definition &&
      result?.status === 'ready'
    ) {
      navigate(
        {
          pathname: `${definition.path}/${result.recordIdentifier}`,
          search: location.search,
          hash: location.hash,
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
