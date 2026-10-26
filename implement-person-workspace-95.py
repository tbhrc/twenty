from pathlib import Path
root=Path('/Users/m1max/Projects/twenty-person-95/packages/twenty-front/src/modules/page-layout/components')
p=root/'PageLayoutTabList.tsx'; s=p.read_text()
def swap(a,b):
 global s
 if a not in s: raise RuntimeError('Missing tab list anchor '+a[:60])
 s=s.replace(a,b,1)
swap('  pageLayoutType: PageLayoutType;\n};', '  pageLayoutType: PageLayoutType;\n  limitVisibleTabsTo?: number;\n};')
swap('  pageLayoutType,\n}: PageLayoutTabListProps)', '  pageLayoutType,\n  limitVisibleTabsTo,\n}: PageLayoutTabListProps)')
swap('''    visibleTabCount,
    hiddenTabs,
    hiddenTabsCount,
    hasHiddenTabs,
''','''    visibleTabCount: measuredVisibleTabCount,
''')
a='''  const pageLayoutId = useAvailableComponentInstanceIdOrThrow('''
b='''  // FDOS #95: preserve all native tab IDs and deep links, but put detail
  // destinations in the existing More menu on the shared Person record.
  // Width measurement still takes precedence on a narrow viewport.
  const visibleTabCount = isDefined(limitVisibleTabsTo)
    ? Math.min(measuredVisibleTabCount, limitVisibleTabsTo)
    : measuredVisibleTabCount;
  const hiddenTabs = tabsWithIcons.slice(visibleTabCount);
  const hiddenTabsCount = hiddenTabs.length;
  const hasHiddenTabs = hiddenTabsCount > 0;

  const pageLayoutId = useAvailableComponentInstanceIdOrThrow('''
swap(a,b)
swap('const shouldScrollTabs = isMobile && !canReorderTabs;', 'const shouldScrollTabs = isMobile && !canReorderTabs && !isDefined(limitVisibleTabsTo);')
p.write_text(s)
p=root/'PageLayoutTabsRenderer.tsx'; s=p.read_text()
def swap2(a,b):
 global s
 if a not in s: raise RuntimeError('Missing tabs renderer anchor '+a[:70])
 s=s.replace(a,b,1)
swap2("import { useIsMobile } from 'twenty-ui/utilities';", "import { useIsMobile } from 'twenty-ui/utilities';\nimport { useEffect, useState } from 'react';")
swap2('''const StyledTabContentDisplay = styled.div<{ isActiveTab: boolean }>`''','''const StyledPersonHomeToggle = styled.button`
  align-self: flex-start;
  background: transparent;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  flex-shrink: 0;
  margin: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledPersonHomeCollapsed = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledTabContentDisplay = styled.div<{ isActiveTab: boolean }>`''')
swap2('''  const sortedTabs = sortTabsByPosition(tabsToRenderInTabList);

  const activeTabExists''','''  const sortedTabs = sortTabsByPosition(tabsToRenderInTabList);
  const isPersonWorkspace =
    currentPageLayout.type === PageLayoutType.RECORD_PAGE &&
    targetRecordIdentifier?.targetObjectNameSingular === 'person' &&
    workspaceSurface.type === 'main' &&
    sortedTabs[0]?.title === 'Home' &&
    sortedTabs[1]?.title === 'ATS' &&
    sortedTabs[2]?.title === 'CRM';
  const homeTabId = sortedTabs[0]?.id;
  const [isHomeCollapsed, setIsHomeCollapsed] = useState(false);
  useEffect(() => setIsHomeCollapsed(false), [targetRecordIdentifier?.id]);
  const isActivePersonHome = isPersonWorkspace && activeTabId === homeTabId;

  const activeTabExists''')
swap2('''      pageLayoutType={currentPageLayout.type}
    />
  );''','''      pageLayoutType={currentPageLayout.type}
      limitVisibleTabsTo={isPersonWorkspace && !isPageLayoutInEditMode ? 3 : undefined}
    />
  );''')
swap2('''              {!shouldRenderRecordIdentifierBar && tabList}

              <StyledScrollWrapperContainer>''','''              {!shouldRenderRecordIdentifierBar && tabList}
              {isActivePersonHome && !isPageLayoutInEditMode && (
                <StyledPersonHomeToggle
                  type="button"
                  aria-expanded={!isHomeCollapsed}
                  aria-controls="fdos-person-home-content"
                  onClick={() => setIsHomeCollapsed((value) => !value)}
                >
                  {isHomeCollapsed ? 'Expand Home' : 'Collapse Home'}
                </StyledPersonHomeToggle>
              )}
              {isActivePersonHome && isHomeCollapsed ? (
                <StyledPersonHomeCollapsed id="fdos-person-home-content">
                  Home collapsed. Choose ATS or CRM above, or expand Home.
                </StyledPersonHomeCollapsed>
              ) : (
              <StyledScrollWrapperContainer id={isActivePersonHome ? 'fdos-person-home-content' : undefined}>''')
swap2('''              </StyledScrollWrapperContainer>
            </StyledTabsAndDashboardContainer>''','''              </StyledScrollWrapperContainer>
              )}
            </StyledTabsAndDashboardContainer>''')
p.write_text(s)
print('PATCHED',root/'PageLayoutTabList.tsx',root/'PageLayoutTabsRenderer.tsx')
