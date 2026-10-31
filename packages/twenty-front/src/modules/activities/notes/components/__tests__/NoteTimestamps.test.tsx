import { render, screen } from '@testing-library/react';

import { NoteTimestamps } from '@/activities/notes/components/NoteTimestamps';

const note = {
  createdAt: '2026-10-31T11:10:46.457Z',
  updatedAt: '2026-10-31T11:10:58.161Z',
};

describe('NoteTimestamps', () => {
  it('shows both timestamps without hovering and retains original instants', () => {
    const { container } = render(<NoteTimestamps note={note} />);

    expect(screen.getByText(/Created:/)).toHaveTextContent(
      'Created: 31 Oct 2026, 15:10:46 Dubai (UTC+04:00)',
    );
    expect(screen.getByText(/Updated:/)).toHaveTextContent(
      'Updated: 31 Oct 2026, 15:10:58 Dubai (UTC+04:00)',
    );
    expect(
      [...container.querySelectorAll('time')].map((time) => time.dateTime),
    ).toEqual([note.createdAt, note.updatedAt]);
  });

  it('updates after an edit without changing the creation timestamp', () => {
    const { rerender, unmount } = render(<NoteTimestamps note={note} />);
    const edited = { ...note, updatedAt: '2026-11-01T00:01:00Z' };

    rerender(<NoteTimestamps note={edited} />);
    expect(screen.getByText(/Created:/)).toHaveTextContent(
      '31 Oct 2026, 15:10:46',
    );
    expect(screen.getByText(/Updated:/)).toHaveTextContent(
      '01 Nov 2026, 04:01:00',
    );

    unmount();
    render(<NoteTimestamps note={JSON.parse(JSON.stringify(edited))} />);
    expect(screen.getByText(/Created:/)).toHaveTextContent(
      '31 Oct 2026, 15:10:46',
    );
    expect(screen.getByText(/Updated:/)).toHaveTextContent(
      '01 Nov 2026, 04:01:00',
    );
  });

  it('never substitutes import or native record times for unknown original source times', () => {
    render(
      <NoteTimestamps note={{ ...note, createdBy: { source: 'IMPORT' } }} />,
    );
    expect(
      screen.getByText('Created (FDOS record):', { exact: false }),
    ).toBeVisible();
    expect(
      screen.getByText('Updated (FDOS record):', { exact: false }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Original source timestamps and import time: Unknown. See source evidence.',
      ),
    ).toBeVisible();
  });

  it('shows unknown when timestamps are unavailable', () => {
    render(<NoteTimestamps note={{ createdAt: '', updatedAt: 'invalid' }} />);
    expect(screen.getByText('Created: Unknown')).toBeVisible();
    expect(screen.getByText('Updated: Unknown')).toBeVisible();
  });
});
