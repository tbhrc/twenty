import { useListenToEventsForQuery } from '@/sse-db-event/hooks/useListenToEventsForQuery';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useRefetchAggregateQueries } from '@/object-record/hooks/useRefetchAggregateQueries';
import { useWorkspaceSurfaceScopedComponentInstanceId } from '@/ui/layout/hooks/useWorkspaceSurfaceScopedComponentInstanceId';

type RecordShowPageSSESubscribeEffectProps = {
  objectNameSingular: string;
  recordId: string;
};

export const RecordShowPageSSESubscribeEffect = ({
  objectNameSingular,
  recordId,
}: RecordShowPageSSESubscribeEffectProps) => {
  const { objectMetadataItem } = useObjectMetadataItem({ objectNameSingular });
  const { refetchAggregateQueries } = useRefetchAggregateQueries();
  const queryId = useWorkspaceSurfaceScopedComponentInstanceId(
    `record-show-${objectNameSingular}-${recordId}`,
  );

  useListenToEventsForQuery({
    queryId,
    operationSignature: {
      objectNameSingular,
      variables: {
        filter:
          objectNameSingular === 'vacancy'
            ? undefined
            : { id: { eq: recordId } },
        limit: 1,
      },
    },
    onSseReconnected:
      objectNameSingular === 'vacancy'
        ? () =>
            refetchAggregateQueries({
              objectMetadataNamePlural: objectMetadataItem.namePlural,
            })
        : undefined,
  });

  return null;
};
