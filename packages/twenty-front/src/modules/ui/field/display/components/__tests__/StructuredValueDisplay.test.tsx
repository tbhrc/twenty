import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StructuredValueDisplay } from '@/ui/field/display/components/StructuredValueDisplay';
const show = (value: unknown) =>
  render(
    <I18nProvider i18n={i18n}>
      <StructuredValueDisplay value={value} />
    </I18nProvider>,
  );
describe('readable structured values', () => {
  it('renders questions, answers, source labels and nested mixed values without serializing', () => {
    const value = {
      applicationQuestionnaire: {
        enabled: false,
        questions: [
          { question: 'Experience?', answer: ['Two years', 2, true, null] },
        ],
      },
      sourceReferences: {
        publicAdvert: { url: 'https://implementai.ae/jobs/role' },
      },
    };
    const original = JSON.stringify(value);
    const { container } = show(value);
    expect(screen.getByText('Application Questionnaire')).toBeVisible();
    expect(screen.getByText('Experience?')).toBeVisible();
    expect(screen.getByText('Two years')).toBeVisible();
    expect(screen.getByText('No')).toBeVisible();
    expect(screen.getByText('Not provided')).toBeVisible();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://implementai.ae/jobs/role',
    );
    expect(container.textContent).not.toMatch(/[{}]/);
    expect(JSON.stringify(value)).toBe(original);
  });
  it.each([null, undefined, ''])('provides an empty state for %s', (value) => {
    show(value);
    expect(screen.getByText('Not provided')).toBeVisible();
  });
  it.each([[], {}])('shows empty collections', (value) => {
    show(value);
    expect(screen.getByText('No entries')).toBeVisible();
  });
  it('keeps literal braces and original newlines in ordinary text', () => {
    show({ text: 'Use {name}\n\nKeep this sentence.' });
    expect(screen.getByText(/Use \{name\}/)).toHaveTextContent('Use {name}');
  });
  it('parses complete serialized objects', () => {
    show('{"reportsTo":"Founder"}');
    expect(screen.getByText('Reports To')).toBeVisible();
    expect(screen.getByText('Founder')).toBeVisible();
  });
  it('keeps malformed content as text and does not execute HTML', () => {
    show({ source: '{"broken":', text: '<script>alert(1)</script>' });
    expect(screen.getByText('{"broken":')).toBeVisible();
    expect(document.querySelector('script')).toBeNull();
  });
  it.each([
    // oxlint-disable-next-line no-script-url
    'javascript:alert(1)',
    'data:text/html,hello',
    '//evil.test/path',
    'https://user:pass@example.com',
    'file:///tmp/a',
  ])('does not activate unsafe URL %s', (value) => {
    show({ url: value });
    expect(screen.queryByRole('link')).toBeNull();
  });
  it('expands long lists with the keyboard', async () => {
    show(Array.from({ length: 12 }, (_, index) => 'Entry ' + index));
    expect(screen.queryByText('Entry 11')).toBeNull();
    const summary = screen.getByText('View more (6)');
    summary.focus();
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByText('Entry 11')).toBeVisible();
  });
  it('wraps long unbroken values without changing them', () => {
    const text = 'x'.repeat(5000);
    show({ evidence: text });
    expect(screen.getByText(text)).toBeVisible();
  });
});
