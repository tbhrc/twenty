from pathlib import Path
root=Path('/Users/m1max/Projects/twenty-person-95/packages/twenty-front/src/modules/page-layout/components/__tests__')
p=root/'PageLayoutTabList.test.tsx';s=p.read_text()
s=s.replace('let mockIsInEditMode = true;', 'let mockIsInEditMode = true;\nlet mockMeasuredVisibleCount = 2;')
s=s.replace('    visibleTabCount: 2,\n    hiddenTabs: visibleTabs.slice(2),\n    hiddenTabsCount: 1,\n    hasHiddenTabs: true,', '    visibleTabCount: mockMeasuredVisibleCount,\n    hiddenTabs: visibleTabs.slice(mockMeasuredVisibleCount),\n    hiddenTabsCount: visibleTabs.length > mockMeasuredVisibleCount ? visibleTabs.length - mockMeasuredVisibleCount : 0,\n    hasHiddenTabs: visibleTabs.length > mockMeasuredVisibleCount,')
s=s.replace('  behaveAsLinks = false,\n}: {', '  behaveAsLinks = false,\n  limitVisibleTabsTo,\n  tabs = TABS,\n}: {')
s=s.replace('  behaveAsLinks?: boolean;\n} = {})', '  behaveAsLinks?: boolean;\n  limitVisibleTabsTo?: number;\n  tabs?: typeof TABS;\n} = {})')
s=s.replace('              tabs={TABS}\n', '              tabs={tabs}\n              limitVisibleTabsTo={limitVisibleTabsTo}\n')
s=s.replace('    mockIsInEditMode = true;\n', '    mockIsInEditMode = true;\n    mockMeasuredVisibleCount = 2;\n',1)
s+= """
describe('FDOS Person primary navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsInEditMode = false;
    mockMeasuredVisibleCount = 7;
  });

  it('shows only Home ATS CRM while retaining original destinations under More', async () => {
    const personTabs = ['Home', 'ATS', 'CRM', 'CV', 'Notes', 'Jobs', 'Activity']
      .map((title, index) => makeTab(title, [], index));
    renderTabList({ tabs: personTabs, limitVisibleTabsTo: 3 });
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ATS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CRM' })).toBeInTheDocument();
    expect(screen.getByLabelText('More tabs')).toHaveTextContent('CV');
    expect(screen.getByLabelText('More tabs')).toHaveTextContent('Activity');
    await userEvent.setup().click(screen.getByRole('button', { name: 'CV' }));
    expect(screen.getByRole('button', { name: 'CV' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('leaves other record tab bars alone without a Person limit', () => {
    const tabs = ['Home', 'ATS', 'CRM', 'CV']
      .map((title, index) => makeTab(title, [], index));
    renderTabList({ tabs });
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.queryByLabelText('More tabs')).not.toBeInTheDocument();
  });
});
"""
# non person getAllByRole button may include other buttons? mock visible4. yes.
p.write_text(s)
p=root/'PageLayoutTabsRenderer.test.tsx';s=p.read_text()
s=s.replace("import { render, screen } from '@testing-library/react';","import { fireEvent, render, screen } from '@testing-library/react';")
s=s.replace("let mockIsInSidePanel = false;","let mockIsInSidePanel = false;\nlet mockTargetObjectNameSingular = 'calendarEvent';\nlet mockPersonTabsEnabled = false;")
s=s.replace("    tabsToRenderInTabList: [homeTab, timelineTab, frontComponentTab],", """    tabsToRenderInTabList: mockPersonTabsEnabled
      ? [homeTab, { ...timelineTab, title: 'ATS' },
          { ...frontComponentTab, title: 'CRM' }, { ...timelineTab, id: 'notes-tab-id', title: 'Notes', position: 3 }]
      : [homeTab, timelineTab, frontComponentTab],""")
s=s.replace("      targetObjectNameSingular: 'calendarEvent',","      targetObjectNameSingular: mockTargetObjectNameSingular,")
s=s.replace("    mockIsInSidePanel = false;\n    mockSetPrerenderedTabIds.mockClear();","    mockIsInSidePanel = false;\n    mockTargetObjectNameSingular = 'calendarEvent';\n    mockPersonTabsEnabled = false;\n    mockSetPrerenderedTabIds.mockClear();")
find='''  it('resets the scroll position when the target record changes', () => {'''
assert find in s
s=s.replace(find,"""  it('opens full Home and collapses/expands without hiding specialist tabs', () => {
    mockTargetObjectNameSingular = 'person';
    mockPersonTabsEnabled = true;
    mockActiveTabId = 'home-tab-id';

    render(<PageLayoutTabsRenderer />, { wrapper: TestWrapper });
    expect(screen.getByText('Rendered tab: home-tab-id')).toBeVisible();
    const collapse = screen.getByRole('button', { name: 'Collapse Home' });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(collapse);
    expect(screen.queryByText('Rendered tab: home-tab-id')).not.toBeInTheDocument();
    expect(screen.getByText(/Home collapsed/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Home' }));
    expect(screen.getByText('Rendered tab: home-tab-id')).toBeVisible();
  });

  it('resets collapsed Home when navigating to another Person', () => {
    mockTargetObjectNameSingular = 'person';
    mockPersonTabsEnabled = true;
    mockActiveTabId = 'home-tab-id';
    const { rerender } = render(<PageLayoutTabsRenderer />, { wrapper: TestWrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Home' }));
    mockTargetRecordId = 'another-person-id';
    rerender(<PageLayoutTabsRenderer />);
    expect(screen.getByRole('button', { name: 'Collapse Home' })).toHaveAttribute('aria-expanded','true');
    expect(screen.getByText('Rendered tab: home-tab-id')).toBeVisible();
  });

"""+find,1)
p.write_text(s)
print('PERSON95_TESTS_ADDED')
