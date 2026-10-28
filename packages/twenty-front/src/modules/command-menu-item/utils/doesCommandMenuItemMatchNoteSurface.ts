import { CoreObjectNameSingular } from 'twenty-shared/types';
import { CommandMenuItemContainerType } from '@/command-menu-item/types/CommandMenuItemContainerType';
import { type CommandMenuItemDefinition } from '@/command-menu-item/types/CommandMenuItemDefinition';
import { CommandMenuItemAvailabilityType } from '~/generated-metadata/graphql';

export const doesCommandMenuItemMatchNoteSurface = (
  item: Pick<CommandMenuItemDefinition, 'availabilityType'>,
  objectNameSingular: unknown,
  containerType: CommandMenuItemContainerType,
) => {
  const isNoteSurface =
    objectNameSingular === CoreObjectNameSingular.Note &&
    [
      CommandMenuItemContainerType.ShowPageHeader,
      CommandMenuItemContainerType.SidePanelFooter,
      CommandMenuItemContainerType.CommandMenuShowPageDropdown,
    ].includes(containerType);

  return (
    !isNoteSurface ||
    item.availabilityType === CommandMenuItemAvailabilityType.RECORD_SELECTION
  );
};
