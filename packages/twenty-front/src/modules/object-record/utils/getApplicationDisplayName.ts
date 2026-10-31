import { isFieldFullNameValue } from '@/object-record/record-field/ui/types/guards/isFieldFullNameValue';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

export const getApplicationDisplayName = (record: ObjectRecord): string => {
  const person = record.person;

  if (
    typeof person?.id === 'string' &&
    (!record.personId || person.id === record.personId) &&
    isFieldFullNameValue(person.name)
  ) {
    const name =
      `${person.name.firstName ?? ''} ${person.name.lastName ?? ''}`.trim();
    if (name) {
      return name;
    }
  }

  const storedName = typeof record.name === 'string' ? record.name.trim() : '';
  return ['sourced prospect', 'inbound application'].includes(
    storedName.toLowerCase(),
  )
    ? ''
    : storedName;
};
