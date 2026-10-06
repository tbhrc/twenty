import { PAGE_ACTION_CONTAINER_CLICK_OUTSIDE_ID } from '@/ui/layout/page/constants/PageActionContainerClickOutsideId';
import { CommandMenuContextProvider } from '@/command-menu-item/contexts/CommandMenuContextProvider';
import { CommandMenuComponentInstanceContext } from '@/command-menu/states/contexts/CommandMenuComponentInstanceContext';
import { CommandMenuItemContainerType } from '@/command-menu-item/types/CommandMenuItemContainerType';
import { getCommandMenuIdFromRecordIndexId } from '@/command-menu-item/utils/getCommandMenuIdFromRecordIndexId';
import { PinnedCommandMenuItemButtons } from '@/command-menu-item/display/components/PinnedCommandMenuItemButtons';
import { RecordIndexCommandMenuDropdown } from '@/command-menu-item/components/RecordIndexCommandMenuDropdown';
import { RecordIndexContainerContextStoreNumberOfSelectedRecordsEffect } from '@/object-record/record-index/components/RecordIndexContainerContextStoreNumberOfSelectedRecordsEffect';
import { RecordIndexFiltersToContextStoreEffect } from '@/object-record/record-index/components/RecordIndexFiltersToContextStoreEffect';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { selectedRowIdsComponentSelector } from '@/object-record/record-table/states/selectors/selectedRowIdsComponentSelector';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';

const StyledSelectionToolbar = styled.div`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px;
  @media print {
    display: none;
  }
`;

export const RecordTableWidgetSelectionToolbar = () => {
  const { recordIndexId } = useRecordIndexContextOrThrow();
  const selectedRowIds = useAtomComponentSelectorValue(
    selectedRowIdsComponentSelector,
    recordIndexId,
  );

  return (
    <>
      {/* Embedded scopes must select exact loaded IDs, never all workspace records. */}
      <RecordIndexFiltersToContextStoreEffect forceExplicitSelection />
      <RecordIndexContainerContextStoreNumberOfSelectedRecordsEffect />
      {selectedRowIds.length > 0 && (
        <CommandMenuComponentInstanceContext.Provider
          value={{
            instanceId: getCommandMenuIdFromRecordIndexId(recordIndexId),
          }}
        >
          <StyledSelectionToolbar
            role="toolbar"
            aria-label={t`Selected records`}
            data-click-outside-id={PAGE_ACTION_CONTAINER_CLICK_OUTSIDE_ID}
          >
            <span>{t`${selectedRowIds.length} selected`}</span>
            <CommandMenuContextProvider
              displayType="button"
              containerType={CommandMenuItemContainerType.IndexPageHeader}
            >
              <PinnedCommandMenuItemButtons />
            </CommandMenuContextProvider>
            <CommandMenuContextProvider
              displayType="dropdownItem"
              containerType={CommandMenuItemContainerType.IndexPageDropdown}
            >
              <RecordIndexCommandMenuDropdown />
            </CommandMenuContextProvider>
          </StyledSelectionToolbar>
        </CommandMenuComponentInstanceContext.Provider>
      )}
    </>
  );
};
