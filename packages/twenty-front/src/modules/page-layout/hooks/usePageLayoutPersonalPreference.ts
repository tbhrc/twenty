import { currentUserState } from '@/auth/states/currentUserState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { useCurrentPageLayout } from '@/page-layout/hooks/useCurrentPageLayout';
import { pageLayoutPersonalPreferenceFamilyState } from '@/page-layout/states/pageLayoutPersonalPreferenceFamilyState';
import { useAtomFamilyState } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isNonEmptyString } from '@sniptt/guards';

export const usePageLayoutPersonalPreference = (preference: string) => {
  const currentUser = useAtomStateValue(currentUserState);
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const { currentPageLayout } = useCurrentPageLayout();
  const workspaceId = currentWorkspace?.id ?? '';
  const userId = currentUser?.id ?? '';
  const pageLayoutId = currentPageLayout?.id ?? '';
  const hasOwner = [workspaceId, userId, pageLayoutId].every(isNonEmptyString);
  const [value, setValue] = useAtomFamilyState(
    pageLayoutPersonalPreferenceFamilyState,
    { workspaceId, userId, pageLayoutId, preference },
  );

  return {
    value: hasOwner ? value : null,
    setValue: (nextValue: string | boolean) => {
      if (hasOwner) {
        setValue(nextValue);
      }
    },
  };
};
