import { render, screen } from '@testing-library/react';
import { FieldWidgetRelationEditAction } from '../FieldWidgetRelationEditAction';
import { RelationType } from '~/generated-metadata/graphql';

let mockRelationValue: unknown = [];
const mockPersistField = jest.fn();
jest.mock('@/object-metadata/hooks/useObjectMetadataItems', () => ({
  useObjectMetadataItems: () => ({ objectMetadataItems: [
    { id: 'vacancy-id', nameSingular: 'vacancy' },
    { id: 'person-id', nameSingular: 'person' },
  ] }),
}));
jest.mock('@/object-record/record-field/ui/hooks/usePersistField', () => ({
  usePersistField: () => mockPersistField,
}));
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue', () => ({
  useAtomFamilySelectorValue: () => mockRelationValue,
}));
jest.mock('@/object-record/record-field/ui/types/guards/isFieldMorphRelation', () => ({
  isFieldMorphRelation: () => false,
}));
jest.mock('@/object-record/record-field-list/record-detail-section/relation/components/RecordDetailRelationSectionDropdown', () => ({
  RecordDetailRelationSectionDropdown: ({ dropdownTriggerClickableComponent }: { dropdownTriggerClickableComponent: React.ReactNode }) => dropdownTriggerClickableComponent,
}));
jest.mock('@/object-record/record-field-list/record-detail-section/relation/components/RecordDetailMorphRelationSectionDropdown', () => ({
  RecordDetailMorphRelationSectionDropdown: () => null,
}));
jest.mock('twenty-ui/icon', () => ({
  IconPlus: () => <svg data-testid="plus" />,
  IconPencil: () => <svg data-testid="pencil" />,
}));
jest.mock('twenty-ui/components', () => ({
  IconButton: ({children, 'aria-label': label}: {children: React.ReactNode; 'aria-label': string}) => <button aria-label={label}>{children}</button>,
}));
const show = (objectName = 'vacancy', fieldName = 'applications', relationType = RelationType.ONE_TO_MANY) =>
  render(<FieldWidgetRelationEditAction recordId="record-id" fieldDefinition={{
    metadata: { objectMetadataNameSingular: objectName, fieldName, relationType },
  } as Parameters<typeof FieldWidgetRelationEditAction>[0]['fieldDefinition']} />);
beforeEach(() => { mockRelationValue = []; mockPersistField.mockClear(); });
test.each([{label: 'empty', value: []}, {label: 'populated', value: [{id: 'existing-application'}]}])('Job Candidates keeps visible Add/+ when $label', ({value}) => {
  mockRelationValue = value; show();
  expect(screen.getByRole('button', {name: 'Add relation'})).toBeVisible();
  expect(screen.getByTestId('plus')).toBeInTheDocument();
  expect(mockPersistField).not.toHaveBeenCalled();
});
test('other populated relation widgets keep their native Edit action', () => {
  mockRelationValue = [{id: 'existing'}]; show('person', 'companies');
  expect(screen.getByRole('button', {name: 'Edit relation'})).toBeVisible();
  expect(screen.getByTestId('pencil')).toBeInTheDocument();
});
test('single-valued relations keep Edit even on a vacancy', () => {
  show('vacancy', 'company', RelationType.MANY_TO_ONE);
  expect(screen.getByRole('button', {name: 'Edit relation'})).toBeVisible();
});
