import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import { buildTriggerWorkflowVersionPayloads } from '@/command-menu-item/engine-command/utils/buildTriggerWorkflowVersionPayloads';
import { isHeadlessTriggerWorkflowVersionCommandContextApi } from '@/command-menu-item/engine-command/utils/isHeadlessTriggerWorkflowVersionCommandContextApi';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { DEFAULT_QUERY_PAGE_SIZE } from '@/object-record/constants/DefaultQueryPageSize';
import { useLazyFetchAllRecords } from '@/object-record/hooks/useLazyFetchAllRecords';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { useRunWorkflowVersion } from '@/workflow/hooks/useRunWorkflowVersion';
import { useStore } from 'jotai';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { t } from '@lingui/core/macro';
import { ConfirmationDialog } from '@/ui/layout/dialog/components/ConfirmationDialog';
import { useDialog } from '@/ui/layout/dialog/hooks/useDialog';
import { getMailboxWorkflowConfirmation } from '@/command-menu-item/engine-command/utils/getMailboxWorkflowConfirmation';
import {
  CoreObjectNameSingular,
  type RecordGqlOperationFilter,
} from 'twenty-shared/types';
import { isNonEmptyArray } from 'twenty-shared/utils';

export const TriggerWorkflowVersionEngineCommand = () => {
  const mountedCommandState = useHeadlessCommandContextApi();
  const store = useStore();

  if (!isHeadlessTriggerWorkflowVersionCommandContextApi(mountedCommandState)) {
    throw new Error(
      'TriggerWorkflowVersionEngineCommand requires a workflow trigger context',
    );
  }

  const confirmation = getMailboxWorkflowConfirmation(
    mountedCommandState.coreWorkflowId ?? mountedCommandState.workflowId,
  );
  const dialogId = 'mailbox-workflow-confirmation-' + useId();
  const [decision, setDecision] = useState<boolean | null>(
    confirmation ? null : true,
  );
  // Duplicate clicks must be fenced synchronously before React rerenders.
  // oxlint-disable-next-line twenty/no-state-useref
  const decisionMade = useRef(false);
  const { openDialog, closeDialog } = useDialog();

  useEffect(() => {
    if (!confirmation) return;
    openDialog(dialogId);
    return () => closeDialog(dialogId);
  }, [confirmation, openDialog, closeDialog, dialogId]);

  const decide = (confirmed: boolean) => {
    if (decisionMade.current) return;
    decisionMade.current = true;
    setDecision(confirmed);
  };

  const noMatchFilter: RecordGqlOperationFilter = { id: { in: [] } };

  const { fetchAllRecords } = useLazyFetchAllRecords({
    objectNameSingular:
      mountedCommandState.objectMetadataItem?.nameSingular ??
      CoreObjectNameSingular.Person,
    filter: mountedCommandState.graphqlFilter ?? noMatchFilter,
    limit: DEFAULT_QUERY_PAGE_SIZE,
  });

  const { runWorkflowVersion } = useRunWorkflowVersion();

  const execute = useCallback(async () => {
    if (decision !== true) return;
    let selectedRecords: ObjectRecord[];

    if (mountedCommandState.targetedRecordsRule.mode === 'selection') {
      selectedRecords = mountedCommandState.selectedRecords;
    } else {
      selectedRecords = await fetchAllRecords();
    }

    const objectMetadataItems = store.get(objectMetadataItemsSelector.atom);

    const payloads = buildTriggerWorkflowVersionPayloads({
      trigger: mountedCommandState.trigger,
      availabilityType: mountedCommandState.availabilityType,
      availabilityObjectMetadataId:
        mountedCommandState.availabilityObjectMetadataId,
      objectMetadataItems,
      selectedRecords,
    });

    if (!isNonEmptyArray(payloads)) {
      await runWorkflowVersion({
        workflowId:
          mountedCommandState.coreWorkflowId ?? mountedCommandState.workflowId,
        workflowVersionId:
          mountedCommandState.coreWorkflowVersionId ??
          mountedCommandState.workflowVersionId,
      });

      return;
    }

    for (const payload of payloads) {
      await runWorkflowVersion({
        workflowId:
          mountedCommandState.coreWorkflowId ?? mountedCommandState.workflowId,
        workflowVersionId:
          mountedCommandState.coreWorkflowVersionId ??
          mountedCommandState.workflowVersionId,
        payload,
      });
    }
  }, [
    decision,
    mountedCommandState,
    fetchAllRecords,
    runWorkflowVersion,
    store,
  ]);

  return (
    <>
      {confirmation && (
        <ConfirmationDialog
          dialogId={dialogId}
          title={t`Run CV ingestion?`}
          subtitle={t`Run CV ingestion for ${confirmation.mailbox} for the past 7 days now?\n\nExisting completed items are reused.\n\nA saved checkpoint resumes its original window.`}
          confirmButtonText={t`Yes`}
          cancelButtonText={t`No`}
          confirmButtonColor="accent"
          confirmButtonFirst
          onConfirmClick={() => decide(true)}
          onClose={() => decide(false)}
        />
      )}
      <HeadlessEngineCommandWrapperEffect
        execute={execute}
        ready={decision !== null}
      />
    </>
  );
};
