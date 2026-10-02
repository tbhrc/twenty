import { type ReactNode, useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { WorkspaceRouteUnavailable } from '@/app/routing/components/WorkspaceRouteUnavailable';
import { RecordIndexSkeletonLoader } from '@/object-record/record-index/components/RecordIndexSkeletonLoader';

import {
  getRecordRouteGeneration,
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
  const [resolved, setResolved] = useState<{
    generation: number;
    target: string | undefined;
    result: RecordRouteLookupResult;
  } | null>(null);

  useEffect(() => {
    if (!definition) return;
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
  }, [aliasDefinition, definition, generation, target]);

  const result =
    resolved?.generation === generation && resolved.target === target
      ? resolved.result
      : null;
  useEffect(() => {
    if (!aliasDefinition && definition && result?.status === 'ready') {
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
    definition,
    result,
    navigate,
    location.search,
    location.hash,
    location.state,
  ]);

  if (!definition) return children;
  if (!result) return <RecordIndexSkeletonLoader />;
  if (result.status !== 'ready') return <WorkspaceRouteUnavailable />;
  return children;
};
