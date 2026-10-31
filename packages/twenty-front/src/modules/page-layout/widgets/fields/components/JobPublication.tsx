import {
  getJobPublication,
  type JobPublication as JobPublicationValue,
} from '@/page-layout/widgets/fields/utils/getJobPublication';
import { recordStoreFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreFamilySelector';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { themeCssVariables } from 'twenty-ui/theme';

const StyledPublication = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  font-size: ${themeCssVariables.font.size.sm};
  gap: 8px;
  margin-bottom: 12px;
  min-width: 0;
  padding: 12px 4px;
  span {
    color: ${themeCssVariables.font.color.secondary};
  }
  div {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  a {
    align-items: center;
    border: 1px solid ${themeCssVariables.border.color.medium};
    border-radius: 6px;
    color: ${themeCssVariables.color.blue};
    display: inline-flex;
    min-height: 32px;
    padding: 0 10px;
    text-decoration: none;
  }
  a:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }
  small {
    color: ${themeCssVariables.font.color.secondary};
    line-height: 1.5;
  }
`;
export const JobPublicationDisplay = ({
  publication,
}: {
  publication: JobPublicationValue;
}) => (
  <StyledPublication role="group" aria-label={t`Published on`}>
    <span>{t`Published on`}</span>
    {publication.state === 'published' ? (
      <>
        <div>
          {publication.portals.map(({ portal, label, url }) => (
            <a
              key={portal}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {label} ↗
            </a>
          ))}
        </div>
        <small>{t`These job boards share this vacancy. Applicant origin is recorded separately when known.`}</small>
      </>
    ) : (
      <small>
        {publication.state === 'unpublished'
          ? t`Not published`
          : t`Publication details unavailable`}
      </small>
    )}
  </StyledPublication>
);
export const JobPublication = ({ recordId }: { recordId: string }) => {
  const publicPortals = useAtomFamilySelectorValue(recordStoreFamilySelector, {
    recordId,
    fieldName: 'publicPortals',
  });
  const publicSlug = useAtomFamilySelectorValue(recordStoreFamilySelector, {
    recordId,
    fieldName: 'publicSlug',
  });
  const publicationState = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    { recordId, fieldName: 'publicationState' },
  );
  const status = useAtomFamilySelectorValue(recordStoreFamilySelector, {
    recordId,
    fieldName: 'status',
  });
  const businessContext = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    { recordId, fieldName: 'businessContext' },
  );
  return (
    <JobPublicationDisplay
      publication={getJobPublication({
        publicPortals,
        publicSlug,
        publicationState,
        status,
        businessContext,
      })}
    />
  );
};
