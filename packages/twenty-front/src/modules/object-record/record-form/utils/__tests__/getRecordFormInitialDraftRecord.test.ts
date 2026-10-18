import { getRecordFormInitialDraftRecord } from '@/object-record/record-form/utils/getRecordFormInitialDraftRecord';
import { FieldMetadataType } from 'twenty-shared/types';

describe('getRecordFormInitialDraftRecord', () => {
  const fields = [
    {
      name: 'businessContext',
      type: FieldMetadataType.SELECT,
      defaultValue: "'TALENT_BRIDGE'",
    },
    { name: 'hideSalary', type: FieldMetadataType.BOOLEAN, defaultValue: true },
    {
      name: 'showEmployerName',
      type: FieldMetadataType.BOOLEAN,
      defaultValue: false,
    },
    { name: 'headcount', type: FieldMetadataType.NUMBER, defaultValue: 1 },
    {
      name: 'salaryMin',
      type: FieldMetadataType.CURRENCY,
      defaultValue: { currencyCode: "'AED'", amountMicros: null },
    },
    {
      name: 'createdAt',
      type: FieldMetadataType.DATE_TIME,
      defaultValue: 'now()',
    },
  ];

  it('shows and submits configured static defaults, without inventing a salary', () => {
    expect(
      getRecordFormInitialDraftRecord({
        fieldMetadataItems: fields,
        initialDraftRecord: {},
      }),
    ).toEqual({
      businessContext: 'TALENT_BRIDGE',
      hideSalary: true,
      showEmployerName: false,
      headcount: 1,
      salaryMin: { currencyCode: 'AED', amountMicros: null },
    });
  });

  it('preserves the client context, explicit false, null and entered amounts', () => {
    const draft = {
      companyId: 'client-id',
      businessContext: 'IMPLEMENTAI',
      hideSalary: false,
      headcount: null,
      salaryMin: { currencyCode: 'USD', amountMicros: 7_000_000_000 },
    };
    expect(
      getRecordFormInitialDraftRecord({
        fieldMetadataItems: fields,
        initialDraftRecord: draft,
      }),
    ).toEqual({
      ...draft,
      showEmployerName: false,
    });
  });
});
