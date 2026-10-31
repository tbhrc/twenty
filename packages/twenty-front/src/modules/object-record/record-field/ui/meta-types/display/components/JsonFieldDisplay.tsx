import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { useJsonFieldDisplay } from '@/object-record/record-field/ui/meta-types/hooks/useJsonFieldDisplay';
import { StructuredValueDisplay } from '@/ui/field/display/components/StructuredValueDisplay';
import { ExpandedFieldDisplay } from '@/ui/layout/expandable-list/components/ExpandedFieldDisplay';
import { t } from '@lingui/core/macro';
import { useContext, useId, useRef, useState } from 'react';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme';

const StyledDetailsButton = styled.button`
  background: transparent;
  border: 0;
  color: ${themeCssVariables.color.blue};
  cursor: pointer;
  font: inherit;
  min-height: 24px;
  padding: 0;
  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }
`;

export const JsonFieldDisplay = ({ compact }: { compact?: boolean }) => {
  const { fieldValue } = useJsonFieldDisplay();
  const { fieldDefinition } = useContext(FieldContext);
  const isCompact = compact ?? !fieldDefinition?.showLabel;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const detailsId = useId();
  const close = () => {
    setOpen(false);
    anchorRef.current?.focus();
  };
  if (!isCompact) return <StructuredValueDisplay value={fieldValue} />;
  return (
    <>
      <StyledDetailsButton
        type="button"
        ref={anchorRef}
        aria-expanded={open}
        aria-controls={open ? detailsId : undefined}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.stopPropagation();
            close();
          }
        }}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(!open);
        }}
      >
        {t`View details`}
      </StyledDetailsButton>
      {open && (
        <ExpandedFieldDisplay
          anchorElement={anchorRef.current ?? undefined}
          onClickOutside={close}
        >
          <div
            id={detailsId}
            style={{
              maxHeight: '60vh',
              maxWidth: 'min(480px, 80vw)',
              overflow: 'auto',
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                close();
              }
            }}
          >
            <StructuredValueDisplay value={fieldValue} />
          </div>
        </ExpandedFieldDisplay>
      )}
    </>
  );
};
