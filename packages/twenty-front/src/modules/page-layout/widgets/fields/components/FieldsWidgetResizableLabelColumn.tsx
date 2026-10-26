import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { RecordInlineCellLabelWidthContext } from '@/object-record/record-inline-cell/components/RecordInlineCellLabelWidthContext';
import { fieldsWidgetLabelWidthFamilyState } from '@/page-layout/widgets/fields/states/fieldsWidgetLabelWidthFamilyState';
import { getUiZoom } from '@/ui/theme/utils/getUiZoom';
import { useAtomFamilyState } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';

const MIN_WIDTH = 80;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 220;
const VALUE_SPACE = 160;

const StyledContainer = styled.div`
  min-width: 0;
  position: relative;
  width: 100%;
`;

const StyledResizeHandle = styled.div`
  bottom: 0;
  cursor: col-resize;
  position: absolute;
  top: 0;
  touch-action: none;
  width: 10px;
  z-index: 2;

  &::after {
    background: ${themeCssVariables.border.color.medium};
    bottom: 0;
    content: '';
    left: 4px;
    position: absolute;
    top: 0;
    width: 1px;
  }

  &:hover::after,
  &:focus-visible::after {
    background: ${themeCssVariables.color.blue};
    width: 2px;
  }

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
  }
`;

type FieldsWidgetResizableLabelColumnProps = {
  scopeKey: string;
  children: ReactNode;
};

export const FieldsWidgetResizableLabelColumn = ({
  scopeKey,
  children,
}: FieldsWidgetResizableLabelColumnProps) => {
  const member = useAtomStateValue(currentWorkspaceMemberState);
  const [savedWidth, setSavedWidth] = useAtomFamilyState(
    fieldsWidgetLabelWidthFamilyState,
    `${member?.id ?? 'local'}:${scopeKey}`,
  );
  const container = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    startX: number;
    startWidth: number;
    zoom: number;
  } | null>(null);
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const maximum =
    availableWidth === null
      ? MAX_WIDTH
      : Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, availableWidth - VALUE_SPACE));
  const clamp = (value: number) =>
    Math.round(
      Math.max(
        MIN_WIDTH,
        Math.min(maximum, Number.isFinite(value) ? value : DEFAULT_WIDTH),
      ),
    );
  const width = clamp(dragWidth ?? savedWidth);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setAvailableWidth(element.clientWidth),
    );
    observer.observe(element);
    setAvailableWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  return (
    <RecordInlineCellLabelWidthContext.Provider value={width}>
      <StyledContainer ref={container}>
        {children}
        <StyledResizeHandle
          role="separator"
          aria-label={t`Resize field name column`}
          aria-orientation="vertical"
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={maximum}
          aria-valuenow={width}
          title={t`Drag to resize field names. Use arrow keys to adjust or double-click to reset.`}
          tabIndex={0}
          style={{ left: width + 19 }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.focus();
            drag.current = {
              startX: event.clientX,
              startWidth: width,
              zoom: getUiZoom(),
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            setDragWidth(
              clamp(
                drag.current.startWidth +
                  (event.clientX - drag.current.startX) / drag.current.zoom,
              ),
            );
          }}
          onPointerUp={(event) => {
            if (!drag.current) return;
            setSavedWidth(
              clamp(
                drag.current.startWidth +
                  (event.clientX - drag.current.startX) / drag.current.zoom,
              ),
            );
            drag.current = null;
            setDragWidth(null);
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            drag.current = null;
            setDragWidth(null);
          }}
          onLostPointerCapture={() => {
            drag.current = null;
            setDragWidth(null);
          }}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={() => setSavedWidth(DEFAULT_WIDTH)}
          onKeyDown={(event) => {
            const delta = event.shiftKey ? 40 : 10;
            const next =
              event.key === 'ArrowRight'
                ? width + delta
                : event.key === 'ArrowLeft'
                  ? width - delta
                  : event.key === 'Home'
                    ? MIN_WIDTH
                    : event.key === 'End'
                      ? maximum
                      : undefined;
            if (next === undefined) return;
            event.preventDefault();
            event.stopPropagation();
            setSavedWidth(clamp(next));
          }}
        />
      </StyledContainer>
    </RecordInlineCellLabelWidthContext.Provider>
  );
};
