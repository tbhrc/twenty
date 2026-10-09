import { createAtomFamilyState } from '@/ui/utilities/state/jotai/utils/createAtomFamilyState';

export const pageLayoutPersonalPreferenceFamilyState = createAtomFamilyState<
  string | boolean | null,
  {
    workspaceId: string;
    userId: string;
    pageLayoutId: string;
    preference: string;
  }
>({
  key: 'pageLayoutPersonalPreference',
  defaultValue: null,
  useLocalStorage: true,
  localStorageOptions: { getOnInit: true },
});
