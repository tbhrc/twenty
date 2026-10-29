import { render, screen } from '@testing-library/react';
import { PublishedJobPostLink } from '../PublishedJobPostLink';
it('exposes the existing published Job URL as a safe external link', () => {
  const record = {
    id: 'fixture',
    publicationState: 'PUBLISHED',
    businessContext: 'TALENT_BRIDGE',
    publicSlug: 'facility-engineer',
  };
  render(<PublishedJobPostLink record={record} />);
  const link = screen.getByRole('link', { name: 'Open published job' });
  expect(link).toHaveAttribute(
    'href',
    'https://jobs.talentbridgedubai.com/jobs/facility-engineer',
  );
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});
it('does not display a guessed link for an unpublished Job', () => {
  render(
    <PublishedJobPostLink
      record={{ id: 'fixture', publicationState: 'UNPUBLISHED' }}
    />,
  );
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
