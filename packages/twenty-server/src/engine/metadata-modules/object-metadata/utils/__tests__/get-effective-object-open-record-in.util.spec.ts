import { ObjectOpenRecordIn } from 'twenty-shared/types';

import { getEffectiveObjectOpenRecordIn } from 'src/engine/metadata-modules/object-metadata/utils/get-effective-object-open-record-in.util';

const WORKSPACE = '20202020-aaaa-4aaa-8aaa-000000000001';
const OWNER = 'standard-application';
const authorContext = {
  workspaceCustomApplicationUniversalIdentifier: WORKSPACE,
  ownerApplicationUniversalIdentifier: OWNER,
};

describe('getEffectiveObjectOpenRecordIn', () => {
  it('opens a standard object in a full page after a workspace override', () => {
    expect(
      getEffectiveObjectOpenRecordIn(
        {
          openRecordIn: ObjectOpenRecordIn.USER_CHOICE,
          overrides: {
            [OWNER]: { openRecordIn: ObjectOpenRecordIn.SIDE_PANEL },
            [WORKSPACE]: { openRecordIn: ObjectOpenRecordIn.RECORD_PAGE },
          },
        },
        authorContext,
      ),
    ).toBe(ObjectOpenRecordIn.RECORD_PAGE);
  });

  it.each(Object.values(ObjectOpenRecordIn))(
    'honours the saved %s preference',
    (openRecordIn) => {
      expect(
        getEffectiveObjectOpenRecordIn(
          {
            openRecordIn: ObjectOpenRecordIn.USER_CHOICE,
            overrides: { [WORKSPACE]: { openRecordIn } },
          },
          authorContext,
        ),
      ).toBe(openRecordIn);
    },
  );

  it('uses the owner preference when the workspace has no opening override', () => {
    expect(
      getEffectiveObjectOpenRecordIn(
        {
          openRecordIn: ObjectOpenRecordIn.USER_CHOICE,
          overrides: {
            [WORKSPACE]: { icon: 'IconBuilding' },
            [OWNER]: { openRecordIn: ObjectOpenRecordIn.RECORD_PAGE },
          },
        },
        authorContext,
      ),
    ).toBe(ObjectOpenRecordIn.RECORD_PAGE);
  });

  it.each([undefined, null, 'INVALID'])(
    'preserves a custom object preference for an absent or invalid override: %s',
    (openRecordIn) => {
      expect(
        getEffectiveObjectOpenRecordIn(
          {
            openRecordIn: ObjectOpenRecordIn.RECORD_PAGE,
            overrides: { [WORKSPACE]: { openRecordIn } },
          },
          authorContext,
        ),
      ).toBe(ObjectOpenRecordIn.RECORD_PAGE);
    },
  );
});
