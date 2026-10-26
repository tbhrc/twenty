import { createAtomFamilyState } from '@/ui/utilities/state/jotai/utils/createAtomFamilyState';

export const fieldsWidgetLabelWidthFamilyState = createAtomFamilyState<
  number,
  string
>({
  key: 'fieldsWidgetLabelWidthFamilyState',
  defaultValue: 220,
  useLocalStorage: true,
  localStorageOptions: { getOnInit: true },
});
