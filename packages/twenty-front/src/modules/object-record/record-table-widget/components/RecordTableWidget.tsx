import { totalNumberOfRecordsToVirtualizeComponentState } from '@/object-record/record-table/virtualization/states/totalNumberOfRecordsToVirtualizeComponentState';
import { recordIndexAllRecordIdsComponentSelector } from '@/object-record/record-index/states/selectors/recordIndexAllRecordIdsComponentSelector';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { t } from '@lingui/core/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { RecordIndexTableContainerEffect } from '@/object-record/record-index/components/RecordIndexTableContainerEffect';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { RecordTableWidgetStatesEffect } from '@/object-record/record-table-widget/components/RecordTableWidgetStatesEffect';
import { RecordTableWidgetContext } from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { RecordTableWithWrappers } from '@/object-record/record-table/components/RecordTableWithWrappers';
import { styled } from '@linaria/react';
import { useContext } from 'react';

const StyledTableContainer = styled.div`
  min-height: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const StyledLoadingStatus = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.secondary};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]};
`;

type RecordTableWidgetProps = {
  isUIEditable?: boolean;
  isEmptyStateHidden?: boolean;
};

export const RecordTableWidget = ({
  isUIEditable = false,
  isEmptyStateHidden = false,
}: RecordTableWidgetProps) => {
  const { objectNameSingular, recordIndexId, viewBarInstanceId } =
    useRecordIndexContextOrThrow();
  const recordTableWidgetContext = useContext(RecordTableWidgetContext);
  const totalCount = useAtomComponentStateValue(
    totalNumberOfRecordsToVirtualizeComponentState,
    recordIndexId,
  );
  const recordIds = useAtomComponentSelectorValue(
    recordIndexAllRecordIdsComponentSelector,
    recordIndexId,
  );
  const loadedCount = recordIds.filter(Boolean).length;

  return (
    <>
      <RecordTableWidgetStatesEffect
        recordTableId={recordIndexId}
        isUIEditable={isUIEditable}
        isPageLayoutInEditMode={
          recordTableWidgetContext?.isPageLayoutInEditMode
        }
        isEmptyStateHidden={isEmptyStateHidden}
      />
      <RecordIndexTableContainerEffect />
      <StyledTableContainer>
        <RecordTableWithWrappers
          recordTableId={recordIndexId}
          objectNameSingular={objectNameSingular}
          viewBarId={viewBarInstanceId}
        />
      </StyledTableContainer>
      {recordTableWidgetContext?.scopeView && totalCount !== null && (
        <StyledLoadingStatus role="status">
          {t`${loadedCount} of ${totalCount} records loaded`}
          {loadedCount < totalCount && <> · {t`Scroll to load more`}</>}
        </StyledLoadingStatus>
      )}
    </>
  );
};
