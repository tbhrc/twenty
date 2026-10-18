import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined, isPlainObject } from 'twenty-shared/utils';

type DefaultField = {
  name: string;
  type: FieldMetadataType;
  defaultValue?: unknown;
};

const unquote = (value: unknown): unknown =>
  typeof value === 'string' && /^'(?:[^']|'')*'$/.test(value)
    ? value.slice(1, -1).replaceAll("''", "'")
    : value;

export const getRecordFormInitialDraftRecord = ({
  fieldMetadataItems,
  initialDraftRecord,
}: {
  fieldMetadataItems: DefaultField[];
  initialDraftRecord: Partial<ObjectRecord>;
}): Partial<ObjectRecord> => {
  const defaults: Partial<ObjectRecord> = {};

  for (const field of fieldMetadataItems) {
    const value = unquote(field.defaultValue);
    if (!isDefined(value)) continue;

    if (
      field.type === FieldMetadataType.BOOLEAN &&
      typeof value === 'boolean'
    ) {
      defaults[field.name] = value;
    } else if (
      [FieldMetadataType.TEXT, FieldMetadataType.SELECT].includes(field.type) &&
      typeof value === 'string'
    ) {
      defaults[field.name] = value;
    } else if (
      [FieldMetadataType.NUMBER, FieldMetadataType.NUMERIC].includes(
        field.type,
      ) &&
      (typeof value === 'number' ||
        (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value))) &&
      Number.isFinite(Number(value))
    ) {
      defaults[field.name] = Number(value);
    } else if (
      field.type === FieldMetadataType.CURRENCY &&
      isPlainObject(value)
    ) {
      const currencyCode = unquote(value.currencyCode);
      const amountMicros = unquote(value.amountMicros);
      if (
        typeof currencyCode === 'string' &&
        /^[A-Z]{3}$/.test(currencyCode) &&
        (!isDefined(amountMicros) ||
          typeof amountMicros === 'number' ||
          (typeof amountMicros === 'string' && /^-?\d+$/.test(amountMicros)))
      ) {
        defaults[field.name] = {
          currencyCode,
          amountMicros: isDefined(amountMicros) ? Number(amountMicros) : null,
        };
      }
    }
  }

  // Context relations and explicit false/null values must win over defaults.
  return { ...defaults, ...initialDraftRecord };
};
