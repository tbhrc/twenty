import { doesCommandMenuItemMatchNoteSurface } from '../doesCommandMenuItemMatchNoteSurface';
import { CommandMenuItemContainerType } from '@/command-menu-item/types/CommandMenuItemContainerType';
import { CommandMenuItemAvailabilityType } from '~/generated-metadata/graphql';

describe('Note action placement', () => {
  const global = { availabilityType: CommandMenuItemAvailabilityType.GLOBAL };
  const record = {
    availabilityType: CommandMenuItemAvailabilityType.RECORD_SELECTION,
  };

  it.each([
    CommandMenuItemContainerType.ShowPageHeader,
    CommandMenuItemContainerType.SidePanelFooter,
    CommandMenuItemContainerType.CommandMenuShowPageDropdown,
  ])(
    'keeps native and applicable record actions, excluding global workflows in %s',
    (surface) => {
      expect(doesCommandMenuItemMatchNoteSurface(global, 'note', surface)).toBe(
        false,
      );
      expect(doesCommandMenuItemMatchNoteSurface(record, 'note', surface)).toBe(
        true,
      );
    },
  );

  it('retains global CV intake in the global command menu and other records', () => {
    expect(
      doesCommandMenuItemMatchNoteSurface(
        global,
        'note',
        CommandMenuItemContainerType.CommandMenuList,
      ),
    ).toBe(true);
    expect(
      doesCommandMenuItemMatchNoteSurface(
        global,
        'person',
        CommandMenuItemContainerType.ShowPageHeader,
      ),
    ).toBe(true);
  });
});
