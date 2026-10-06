import { setupI18n } from '@lingui/core';
import {
  getCandidateStageEmailNotice,
  type CandidateStageEmailDispatch,
} from '@/object-record/record-field/ui/utils/getCandidateStageEmailNotice';

const translator = setupI18n({ locale: 'en', messages: { en: {} } });
const applicationId = 'candidate';
const stage = 'ASSESSMENT';
const savedAt = '2026-10-06T09:00:00Z';
const dispatch: CandidateStageEmailDispatch = {
  id: 'dispatch',
  applicationId,
  toStage: stage,
  status: 'HELD',
  createdAt: '2026-10-06T09:00:01Z',
  renderedSubject: 'General Assessment Invitation',
  sentReceipt: null,
};
const call = (
  read: () => Promise<{
    stage: string | null;
    dispatch: CandidateStageEmailDispatch | null;
  }>,
) =>
  getCandidateStageEmailNotice({
    applicationId,
    stage,
    stageLabel: 'Assessment',
    savedAt,
    read,
  });
const text = (notice: Awaited<ReturnType<typeof call>>) =>
  notice ? translator._(notice.message) : null;
const state = (changes: Partial<CandidateStageEmailDispatch> = {}) => ({
  stage,
  dispatch: { ...dispatch, ...changes },
});

describe('candidate stage email notification', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('names the actual queued subject after the saved stage', async () => {
    const notice = await call(async () => state());
    expect(notice?.variant).toBe('success');
    expect(text(notice)).toContain(
      'Email queued: General Assessment Invitation',
    );
  });

  it('identifies an existing held email without claiming a new trigger', async () => {
    const notice = await call(async () =>
      state({ createdAt: '2026-10-05T09:00:00Z' }),
    );
    expect(text(notice)).toContain('Email already queued');
  });

  it('distinguishes sending from sent', async () => {
    const notice = await call(async () => state({ status: 'SENDING' }));
    expect(text(notice)).toContain('Email sending');
    expect(text(notice)).not.toContain('Email sent:');
  });

  it('reports sent only for a new dispatch with its bound native acknowledgement', async () => {
    const notice = await call(async () =>
      state({
        status: 'SENT',
        sentReceipt: {
          applicationId,
          toStage: stage,
          sentAt: '2026-10-06T09:00:31Z',
        },
      }),
    );
    expect(text(notice)).toContain('Email sent: General Assessment Invitation');
  });

  it.each([null, { applicationId: 'other', toStage: stage, sentAt: savedAt }])(
    'never presents a new SENT row without a matching acknowledgement as a confirmed send: %p',
    async (sentReceipt) => {
      const notice = await call(async () =>
        state({ status: 'SENT', sentReceipt }),
      );
      expect(notice?.variant).toBe('warning');
      expect(text(notice)).not.toContain('Email sent:');
    },
  );

  it('does not present a historic sent fence as a newly triggered email', async () => {
    const notice = await call(async () =>
      state({ status: 'SENT', createdAt: '2026-10-05T09:00:00Z' }),
    );
    expect(text(notice)).toContain(
      'Previous email already sent; no new email queued',
    );
    expect(notice?.variant).toBe('info');
  });

  it.each(['FAILED', 'CANCELLED', 'UNCERTAIN'])(
    'never claims a queued or sent email for %s',
    async (status) => {
      const notice = await call(async () => state({ status }));
      expect(text(notice)).not.toMatch(/Email queued:|Email sent:/);
      expect(notice?.variant).not.toBe('success');
    },
  );

  it('waits for the asynchronous queue without performing a write', async () => {
    const read = jest
      .fn()
      .mockResolvedValueOnce({ stage, dispatch: null })
      .mockResolvedValue(state());
    const pending = call(read);
    await jest.runAllTimersAsync();
    expect(text(await pending)).toContain(
      'Email queued: General Assessment Invitation',
    );
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('no-template or delayed absence has a bounded unconfirmed outcome, never a queued claim', async () => {
    const read = jest.fn().mockResolvedValue({ stage, dispatch: null });
    const pending = call(read);
    await jest.runAllTimersAsync();
    const notice = await pending;
    expect(notice?.variant).toBe('warning');
    expect(text(notice)).toContain('status is not confirmed');
    expect(read).toHaveBeenCalledTimes(4);
  });

  it('suppresses obsolete feedback when the candidate stage changed again', async () => {
    expect(await call(async () => ({ stage: 'MAYBE', dispatch }))).toBeNull();
  });

  it('rejects another candidate or stage receipt without exposing its subject', async () => {
    for (const changes of [{ applicationId: 'other' }, { toStage: 'MAYBE' }]) {
      const notice = await call(async () =>
        state({ ...changes, renderedSubject: 'Another candidate email' }),
      );
      expect(text(notice)).not.toContain('Another candidate email');
      expect(notice?.variant).toBe('warning');
    }
  });

  it('a denied or unavailable status read never becomes a send confirmation or retry', async () => {
    const read = jest.fn().mockRejectedValue(new Error('permission denied'));
    const notice = await call(read);
    expect(notice?.variant).toBe('warning');
    expect(text(notice)).toContain('not confirmed');
    expect(text(notice)).not.toContain('permission denied');
    expect(read).toHaveBeenCalledTimes(1);
  });
});
