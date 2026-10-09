import { PAGE_LAYOUT_WIDGET_DND_TYPE } from '@/page-layout/constants/PageLayoutWidgetDndType';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { type PageLayoutWidgetDragData } from '@/page-layout/types/PageLayoutWidgetDragData';
import { WidgetRenderer } from '@/page-layout/widgets/components/WidgetRenderer';
import { DragDropItemDropTarget } from '@/ui/utilities/drag-and-drop/components/DragDropItemDropTarget';
import { DragDropItemSortableCell } from '@/ui/utilities/drag-and-drop/components/DragDropItemSortableCell';
import { type Draggable } from '@dnd-kit/abstract';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme';

const StyledWidgetSlot = styled.div<{
  isInEditMode: boolean;
  shouldShowDivider: boolean;
}>`
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  min-height: 0;
  min-width: 0;

  @container tab-viewport (min-height: 0px) {
    &.page-layout-viewport-filling-widget-slot {
      --widget-height: 100%;
      --widget-scroll-overflow: auto;

      height: calc(100cqh - var(--viewport-filling-widget-editor-block-inset));
      overflow: clip;

      .widget {
        overflow: clip;
      }

      .widget-card-header {
        background: var(--record-card-background-color);
        position: sticky;
        top: 0;
        z-index: 3;
      }
    }
  }

  &:not(:last-child) {
    border-bottom: ${({ isInEditMode, shouldShowDivider }) =>
      !isInEditMode && shouldShowDivider
        ? `1px solid ${themeCssVariables.border.color.light}`
        : 'none'};
  }
`;

const StyledLiveWidgetContainer = styled.div<{ fillsViewport: boolean }>`
  display: ${({ fillsViewport }) => (fillsViewport ? 'flex' : 'block')};
  flex-shrink: ${({ fillsViewport }) => (fillsViewport ? 0 : 'initial')};
  height: ${({ fillsViewport }) => (fillsViewport ? '100%' : 'auto')};
  min-height: 0;
  min-width: ${({ fillsViewport }) => (fillsViewport ? '0' : 'auto')};
`;

type PageLayoutVerticalListWidgetSlotProps = {
  canAcceptWidgetDrag: (source: Draggable) => boolean;
  index: number;
  isInEditMode: boolean;
  fillsViewport: boolean;
  shouldShowDivider: boolean;
  tabId: string;
  widget: PageLayoutWidget;
};

export const PageLayoutVerticalListWidgetSlot = ({
  canAcceptWidgetDrag,
  index,
  isInEditMode,
  fillsViewport,
  shouldShowDivider,
  tabId,
  widget,
}: PageLayoutVerticalListWidgetSlotProps) => {
  const widgetDragData: PageLayoutWidgetDragData = {
    type: 'widget',
    widgetId: widget.id,
    widgetType: widget.type,
    widgetPosition: widget.position,
    tabId,
    index,
  };

  return (
    <StyledWidgetSlot
      className={
        fillsViewport ? 'page-layout-viewport-filling-widget-slot' : undefined
      }
      isInEditMode={isInEditMode}
      shouldShowDivider={shouldShowDivider}
    >
      <DragDropItemDropTarget
        index={index}
        droppableId={tabId}
        orientation="horizontal"
        compact
      />
      {isInEditMode ? (
        <DragDropItemSortableCell
          id={widget.id}
          index={index}
          group={tabId}
          data={widgetDragData}
          type={PAGE_LAYOUT_WIDGET_DND_TYPE}
          accept={canAcceptWidgetDrag}
          allowNativeDragWhenDisabled
          disabled={false}
          hasTransition={false}
          highlightWhileDragging={isInEditMode}
          orientation="horizontal"
          fill={fillsViewport}
        >
          <WidgetRenderer widget={widget} />
        </DragDropItemSortableCell>
      ) : (
        // A disabled sortable still receives aria-disabled from dnd-kit.
        // Live widgets contain interactive controls, so do not register their
        // container as a draggable outside layout edit mode.
        <StyledLiveWidgetContainer
          fillsViewport={fillsViewport}
          className={
            fillsViewport ? 'page-layout-static-widget-fill' : undefined
          }
        >
          <WidgetRenderer widget={widget} />
        </StyledLiveWidgetContainer>
      )}
    </StyledWidgetSlot>
  );
};
