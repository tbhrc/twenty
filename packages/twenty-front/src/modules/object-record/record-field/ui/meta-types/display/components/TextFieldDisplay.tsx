import { useTextFieldDisplay } from '@/object-record/record-field/ui/meta-types/hooks/useTextFieldDisplay';
import { isFieldText } from '@/object-record/record-field/ui/types/guards/isFieldText';
import { TextDisplay } from '@/ui/field/display/components/TextDisplay/TextDisplay';
import { JsonFieldDisplay } from '@/object-record/record-field/ui/meta-types/display/components/JsonFieldDisplay';
import {
  isStructuredValue,
  parseStructuredValue,
} from '@/ui/field/display/utils/structuredValue';

export const TextFieldDisplay = () => {
  const { fieldValue, fieldDefinition, displayedMaxRows } =
    useTextFieldDisplay();

  const displayedMaxRowsFromSettings = isFieldText(fieldDefinition)
    ? fieldDefinition.metadata?.settings?.displayedMaxRows
    : undefined;

  const displayMaxRowCalculated = displayedMaxRows
    ? displayedMaxRows
    : displayedMaxRowsFromSettings;

  return isStructuredValue(parseStructuredValue(fieldValue)) ? (
    <JsonFieldDisplay compact={!fieldDefinition.showLabel} />
  ) : (
    <TextDisplay text={fieldValue} displayedMaxRows={displayMaxRowCalculated} />
  );
};
