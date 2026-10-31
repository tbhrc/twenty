import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';

export const getRecordShowPageBreadcrumbPaginationLabel = ({
  rank,
  total,
  isGroupByActive,
  viewName,
  isGroupValueLoading,
  groupValueLabel,
  isLoading = false,
  hasError = false,
  isRecordInView = true,
}: {
  rank: string;
  total: string;
  isGroupByActive: boolean;
  viewName?: string;
  isGroupValueLoading: boolean;
  groupValueLabel?: string;
  isLoading?: boolean;
  hasError?: boolean;
  isRecordInView?: boolean;
}): string => {
  if (isLoading || hasError) return '';

  if (!isRecordInView) {
    return t`Not in current view (${total} records)`;
  }

  if (!isGroupByActive || !isNonEmptyString(viewName)) {
    return t`Position ${rank} of ${total} in current view`;
  }

  if (isGroupValueLoading || !isNonEmptyString(groupValueLabel)) {
    return t`Position ${rank} of ${total} in ${viewName}`;
  }

  return t`Position ${rank} of ${total} in ${viewName} → ${groupValueLabel}`;
};
