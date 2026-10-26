import { GlobalPeopleSearch } from '@/object-record/record-index/components/GlobalPeopleSearch';
import { useObjectRecordSearchRecords } from '@/object-record/hooks/useObjectRecordSearchRecords';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('@/app/routing/record-routes/getAppPath', () => ({
  getAppPath: (_path: string, params: { objectRecordId: string }) =>
    `/person/${params.objectRecordId}`,
}));
jest.mock('@/object-record/hooks/useObjectRecordSearchRecords');
jest.mock('use-debounce', () => ({ useDebounce: (value: string) => [value] }));

const mockSearch = jest.mocked(useObjectRecordSearchRecords);
const person = {
  recordId: 'person-1',
  objectNameSingular: 'person',
  objectLabelSingular: 'Person',
  label: 'Goutham Kumar',
  tsRank: 1,
  tsRankCD: 1,
};

describe('GlobalPeopleSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    HTMLElement.prototype.scrollIntoView = jest.fn();
    mockSearch.mockReturnValue({
      searchRecords: [person],
      loading: false,
      error: undefined,
    });
  });

  it('searches the whole native Person directory without view filters', async () => {
    render(<GlobalPeopleSearch />);
    expect(mockSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ skip: true }),
    );
    await userEvent.type(screen.getByRole('combobox'), 'goutham');
    expect(mockSearch).toHaveBeenLastCalledWith({
      objectNameSingulars: ['person'],
      searchInput: 'goutham',
      limit: 20,
      skip: false,
      fetchPolicy: 'network-only',
    });
    expect(screen.getByRole('option')).toHaveTextContent('Goutham Kumar');
  });

  it('opens the existing Person by keyboard and closes the results', async () => {
    render(<GlobalPeopleSearch />);
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'goutham{ArrowDown}');
    expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Enter}');
    expect(mockNavigate).toHaveBeenCalledWith('/person/person-1');
    expect(input).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens a clicked result without losing it to input blur', async () => {
    render(<GlobalPeopleSearch />);
    await userEvent.type(screen.getByRole('combobox'), 'goutham');
    await userEvent.click(screen.getByRole('option'));
    expect(mockNavigate).toHaveBeenCalledWith('/person/person-1');
  });

  it('reveals a keyboard selection at the end of a long result list', async () => {
    mockSearch.mockReturnValue({
      searchRecords: Array.from({ length: 20 }, (_, index) => ({
        ...person,
        recordId: `person-${index}`,
        label: `Person ${index}`,
      })),
      loading: false,
      error: undefined,
    });
    render(<GlobalPeopleSearch />);
    await userEvent.type(screen.getByRole('combobox'), 'person{ArrowUp}');
    expect(screen.getByRole('option', { name: 'Person 19' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
    });
    await userEvent.keyboard('{Enter}');
    expect(mockNavigate).toHaveBeenCalledWith('/person/person-19');
  });

  it('clears the query and closes on Escape or outside focus', async () => {
    render(
      <>
        <GlobalPeopleSearch />
        <button>Outside</button>
      </>,
    );
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'goutham{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await userEvent.click(input);
    await userEvent.click(
      screen.getByRole('button', { name: 'Clear people search' }),
    );
    expect(input).toHaveValue('');
  });

  it('does not navigate to stale records while searching', async () => {
    mockSearch.mockReturnValue({
      searchRecords: [person],
      loading: true,
      error: undefined,
    });
    render(<GlobalPeopleSearch />);
    await userEvent.type(screen.getByRole('combobox'), 'gowtham{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Searching all people',
    );
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('distinguishes a failed search from no matches', async () => {
    mockSearch.mockReturnValue({
      searchRecords: [],
      loading: false,
      error: undefined,
    });
    const { rerender } = render(<GlobalPeopleSearch />);
    await userEvent.type(screen.getByRole('combobox'), 'unknown');
    expect(screen.getByRole('status')).toHaveTextContent('No people found');
    mockSearch.mockReturnValue({
      searchRecords: [person],
      loading: false,
      error: new Error('offline'),
    });
    rerender(<GlobalPeopleSearch />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'People search failed',
    );
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
});
