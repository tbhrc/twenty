import { APP_HEADER_HEIGHT } from '@/ui/layout/constants/AppHeaderHeight';
import { useNavigationDrawerExpanded } from '@/navigation/hooks/useNavigationDrawerExpanded';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import { useWorkspaceSurfaceHeaderPortal } from '@/ui/layout/hooks/useWorkspaceSurfaceHeaderPortal';
import {
  Breadcrumb,
  type BreadcrumbProps,
} from '@/ui/navigation/bread-crumb/components/Breadcrumb';
import { PAGE_ACTION_CONTAINER_CLICK_OUTSIDE_ID } from '@/ui/layout/page/constants/PageActionContainerClickOutsideId';
import { NavigationDrawerCollapseButton } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerCollapseButton';
import { useIsMobile } from 'twenty-ui/utilities';
import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { isDefined } from 'twenty-shared/utils';
import { MOBILE_VIEWPORT, themeCssVariables } from 'twenty-ui/theme';

type PageCardHeaderProps = {
  links?: BreadcrumbProps['links'];
  breadcrumb?: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
  tag?: ReactNode;
  actionButton?: ReactNode;
  searchBar?: ReactNode;
  centerTitle?: boolean;
  titleColor?: string;
};

const StyledHeader = styled.div<{
  centerTitle?: boolean;
  hasSearchBar: boolean;
}>`
  align-items: center;
  background-color: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  box-sizing: border-box;
  column-gap: ${themeCssVariables.spacing[2]};
  display: grid;
  grid-template-columns: ${({ centerTitle, hasSearchBar }) =>
    hasSearchBar
      ? 'minmax(0, auto) minmax(160px, 420px) minmax(80px, 1fr)'
      : centerTitle
        ? 'minmax(0, 1fr) minmax(0, auto) minmax(0, 1fr)'
        : 'minmax(0, auto) minmax(min-content, 1fr)'};
  min-height: ${APP_HEADER_HEIGHT}px;
  padding: 0 ${themeCssVariables.spacing[3]};
  width: 100%;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-template-columns: ${({ hasSearchBar, centerTitle }) =>
      hasSearchBar
        ? 'minmax(0, auto) minmax(0, 1fr)'
        : centerTitle
          ? 'minmax(0, 1fr) minmax(0, auto) minmax(0, 1fr)'
          : 'minmax(0, auto) minmax(min-content, 1fr)'};
  }
`;

const StyledSearchBar = styled.div`
  grid-column: 2;
  min-width: 0;
  padding: ${themeCssVariables.spacing[1]} 0;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-column: 1 / -1;
    grid-row: 2;
  }
`;

const StyledLeft = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  grid-column: 1;
  min-width: 0;
  overflow: hidden;
  width: 100%;
`;

const StyledTitle = styled.div<{ titleColor?: string }>`
  align-items: center;
  color: ${({ titleColor }) =>
    titleColor ?? themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledCenteredTitle = styled(StyledTitle)`
  grid-column: 2;
  justify-content: center;
  justify-self: stretch;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
`;

const StyledRight = styled.div<{
  centerTitle?: boolean;
  hasSearchBar: boolean;
}>`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  grid-column: ${({ centerTitle, hasSearchBar }) =>
    centerTitle || hasSearchBar ? 3 : 2};
  justify-content: flex-end;
  justify-self: end;
  min-width: 0;
  width: 100%;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-column: ${({ hasSearchBar, centerTitle }) =>
      hasSearchBar ? 2 : centerTitle ? 3 : 2};
    grid-row: ${({ hasSearchBar }) => (hasSearchBar ? 1 : 'auto')};
  }
`;

const StyledSurfaceTitle = styled(StyledTitle)`
  overflow: hidden;
  width: 100%;
`;

const StyledSurfaceActions = styled.div`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: ${themeCssVariables.spacing[2]};
`;

export const PageCardHeader = ({
  links,
  breadcrumb,
  icon,
  title,
  tag,
  actionButton,
  searchBar,
  centerTitle = false,
  titleColor,
}: PageCardHeaderProps) => {
  const isMobile = useIsMobile();
  const isNavigationDrawerExpanded = useNavigationDrawerExpanded();
  const workspaceSurface = useWorkspaceSurface();
  const workspaceSurfaceHeaderPortal = useWorkspaceSurfaceHeaderPortal();

  const hasTitleContent = isDefined(icon) || isDefined(title) || isDefined(tag);
  const shouldCenterTitle = centerTitle && hasTitleContent;

  const titleContent = (
    <>
      {icon}
      {isDefined(title) && title}
      {tag}
    </>
  );

  const surfaceTitleContent = isDefined(breadcrumb) ? (
    breadcrumb
  ) : hasTitleContent ? (
    titleContent
  ) : isDefined(links) ? (
    <Breadcrumb links={links} />
  ) : null;

  if (workspaceSurface.type === 'side-panel') {
    return (
      <>
        {isDefined(workspaceSurfaceHeaderPortal.title) &&
          isDefined(surfaceTitleContent) &&
          createPortal(
            <StyledSurfaceTitle titleColor={titleColor}>
              {surfaceTitleContent}
            </StyledSurfaceTitle>,
            workspaceSurfaceHeaderPortal.title,
          )}
        {isDefined(workspaceSurfaceHeaderPortal.actions) &&
          isDefined(actionButton) &&
          createPortal(
            <StyledSurfaceActions
              data-click-outside-id={PAGE_ACTION_CONTAINER_CLICK_OUTSIDE_ID}
            >
              {actionButton}
            </StyledSurfaceActions>,
            workspaceSurfaceHeaderPortal.actions,
          )}
      </>
    );
  }

  return (
    <StyledHeader
      centerTitle={shouldCenterTitle}
      hasSearchBar={isDefined(searchBar)}
    >
      <StyledLeft>
        {!isMobile && !isNavigationDrawerExpanded && (
          <NavigationDrawerCollapseButton direction="right" />
        )}
        {isDefined(breadcrumb)
          ? breadcrumb
          : isDefined(links) && <Breadcrumb links={links} />}
        {!shouldCenterTitle && hasTitleContent && (
          <StyledTitle titleColor={titleColor}>{titleContent}</StyledTitle>
        )}
      </StyledLeft>
      {isDefined(searchBar) && <StyledSearchBar>{searchBar}</StyledSearchBar>}
      {shouldCenterTitle && !isDefined(searchBar) && (
        <StyledCenteredTitle titleColor={titleColor}>
          {titleContent}
        </StyledCenteredTitle>
      )}
      <StyledRight
        centerTitle={shouldCenterTitle}
        hasSearchBar={isDefined(searchBar)}
        data-click-outside-id={PAGE_ACTION_CONTAINER_CLICK_OUTSIDE_ID}
      >
        {actionButton}
      </StyledRight>
    </StyledHeader>
  );
};
