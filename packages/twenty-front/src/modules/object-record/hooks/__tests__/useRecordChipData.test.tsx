import { PreComputedChipGeneratorsContext } from '@/object-metadata/contexts/PreComputedChipGeneratorsContext';
import { useRecordChipData } from '@/object-record/hooks/useRecordChipData';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { renderHook } from '@testing-library/react';
import { type PropsWithChildren } from 'react';

const wrapper = ({ children }: PropsWithChildren) => (
  <PreComputedChipGeneratorsContext.Provider
    value={{
      chipGeneratorPerObjectPerField: {},
      identifierChipGeneratorPerObject: Object.fromEntries(
        ['application', 'person'].map((objectNameSingular) => [
          objectNameSingular,
          (record: ObjectRecord) => ({
            name: record.name,
            recordId: record.id,
            avatarShape: 'circle' as const,
            avatarUrl: '',
            isLabelIdentifier: true,
            objectNameSingular,
          }),
        ]),
      ),
    }}
  >
    {children}
  </PreComputedChipGeneratorsContext.Provider>
);

describe('useRecordChipData candidate identity', () => {
  it('uses native identity while preserving the Application navigation identity', () => {
    const { result } = renderHook(
      () =>
        useRecordChipData({
          objectNameSingular: 'application',
          record: {
            __typename: 'Application',
            id: 'application-1',
            name: 'Sourced prospect',
            personId: 'person-1',
            person: {
              id: 'person-1',
              name: { firstName: 'Ada', lastName: 'Lovelace' },
            },
          },
        }),
      { wrapper },
    );
    expect(result.current.recordChipData).toMatchObject({
      name: 'Ada Lovelace',
      recordId: 'application-1',
      objectNameSingular: 'application',
    });
  });

  it('uses an honest generic label when identity is unavailable', () => {
    const { result } = renderHook(
      () =>
        useRecordChipData({
          objectNameSingular: 'application',
          record: {
            __typename: 'Application',
            id: 'application-1',
            name: 'Sourced prospect',
          },
        }),
      { wrapper },
    );
    expect(result.current.recordChipData.name).toBe('Candidate');
  });

  it('leaves other object labels unchanged', () => {
    const { result } = renderHook(
      () =>
        useRecordChipData({
          objectNameSingular: 'person',
          record: { __typename: 'Person', id: 'person-1', name: 'Person name' },
        }),
      { wrapper },
    );
    expect(result.current.recordChipData.name).toBe('Person name');
  });
});
