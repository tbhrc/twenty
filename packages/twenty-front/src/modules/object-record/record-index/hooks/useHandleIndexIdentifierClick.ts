import { getAppPath } from '@/app/routing/record-routes/getAppPath';
import { getCleanCollectionHref } from '@/app/routing/record-routes/collectionViewLocation';
import { useRecordRouteVersion } from '@/app/routing/record-routes/router';
import { contextStoreCurrentViewIdComponentState } from '@/context-store/states/contextStoreCurrentViewIdComponentState';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { AppPath } from 'twenty-shared/types';

export const useHandleIndexIdentifierClick = ({
  objectMetadataItem,
}: {
  objectMetadataItem: EnrichedObjectMetadataItem;
}) => {
  useRecordRouteVersion();
  const contextStoreCurrentViewId = useAtomComponentStateValue(
    contextStoreCurrentViewIdComponentState,
  );

  const indexIdentifierUrl = (recordId: string) => {
    return getCleanCollectionHref(
      getAppPath(
        AppPath.RecordShowPage,
        {
          objectNameSingular: objectMetadataItem.nameSingular,
          objectRecordId: recordId,
        },
        {
          viewId: contextStoreCurrentViewId,
        },
      ),
    );
  };

  return { indexIdentifierUrl };
};
