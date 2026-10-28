import { useContext, useId } from 'react';
import { t } from '@lingui/core/macro';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { Dropdown, IconButton } from 'twenty-ui/components';
import { IconDotsVertical } from 'twenty-ui/icon';

import { CommandMenuContext } from '@/command-menu-item/contexts/CommandMenuContext';
import { CommandMenuContextProvider } from '@/command-menu-item/contexts/CommandMenuContextProvider';
import { CommandMenuDropdownActionItem } from '@/command-menu-item/display/components/CommandMenuDropdownActionItem';
import { CommandMenuItemContainerType } from '@/command-menu-item/types/CommandMenuItemContainerType';
import { CommandMenuComponentInstanceContext } from '@/command-menu/states/contexts/CommandMenuComponentInstanceContext';
import { RouteContextStoreProviderEffect } from '@/context-store/components/RouteContextStoreProviderEffect';
import { ContextStoreComponentInstanceContext } from '@/context-store/states/contexts/ContextStoreComponentInstanceContext';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { RecordShowContainerContextStoreTargetedRecordsEffect } from '@/object-record/record-show/components/RecordShowContainerContextStoreTargetedRecordsEffect';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { CommandMenuItemAvailabilityType } from '~/generated-metadata/graphql';

const NoteCardActionsDropdown = ({ noteId }: { noteId: string }) => {
  const { commandMenuItems } = useContext(CommandMenuContext);
  const instanceId = useId();
  return (
    <DropdownRoot dropdownId={`note-actions-${noteId}-${instanceId}`} type="menu">
      <Dropdown.Trigger
        render={
          <IconButton
            aria-label={t`More note actions`}
            size="sm"
            variant="outline"
          >
            <IconDotsVertical />
          </IconButton>
        }
      />
      <DropdownContent side="bottom" align="end">
        <Dropdown.Section>
          {commandMenuItems
            .filter(
              (item) =>
                item.availabilityType ===
                CommandMenuItemAvailabilityType.RECORD_SELECTION,
            )
            .map((item) => (
              <CommandMenuDropdownActionItem item={item} key={item.id} />
            ))}
        </Dropdown.Section>
      </DropdownContent>
    </DropdownRoot>
  );
};

export const NoteCardActions = ({ noteId }: { noteId: string }) => {
  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: CoreObjectNameSingular.Note,
  });
  const instanceId = `note-card-${noteId}`;
  return (
    <ContextStoreComponentInstanceContext.Provider value={{ instanceId }}>
      <CommandMenuComponentInstanceContext.Provider value={{ instanceId }}>
        <RouteContextStoreProviderEffect
          objectMetadataItem={objectMetadataItem}
          isRecordShowPage
          isRecordIndexPage={false}
          isStandalonePage={false}
          isSettingsPage={false}
        />
        <RecordShowContainerContextStoreTargetedRecordsEffect
          recordId={noteId}
        />
        <NoteRecordActions noteId={noteId} />
      </CommandMenuComponentInstanceContext.Provider>
    </ContextStoreComponentInstanceContext.Provider>
  );
};

export const NoteRecordActions = ({ noteId }: { noteId: string }) => (
  <CommandMenuContextProvider
    displayType="dropdownItem"
    containerType={CommandMenuItemContainerType.CommandMenuShowPageDropdown}
  >
    <NoteCardActionsDropdown noteId={noteId} />
  </CommandMenuContextProvider>
);
