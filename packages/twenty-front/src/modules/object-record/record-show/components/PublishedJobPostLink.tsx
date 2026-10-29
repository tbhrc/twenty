import { getPublishedJobPostUrl } from '@/object-record/record-show/utils/getPublishedJobPostUrl';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { IconExternalLink } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';

const StyledLink = styled.a`
  align-items: center;
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  display: inline-flex;
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]};
  text-decoration: none;
  white-space: nowrap;
  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }
  @media (max-width: 480px) {
    span {
      display: none;
    }
  }
`;

export const PublishedJobPostLink = ({
  record,
}: {
  record: ObjectRecord | undefined;
}) => {
  const url = getPublishedJobPostUrl(record);
  return url ? (
    <StyledLink
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t`Open published job`}
      title={t`Open published job`}
    >
      <IconExternalLink size={16} aria-hidden />
      <span>{t`Open published job`}</span>
    </StyledLink>
  ) : null;
};
