import {
  parseStructuredValue,
  safeStructuredValueUrl,
  structuredValueLabel,
} from '@/ui/field/display/utils/structuredValue';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useState, type ReactNode } from 'react';
import { isPlainObject } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme';

const StyledValue = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  width: 100%;
  dl {
    margin: 0;
  }
  dt {
    color: ${themeCssVariables.font.color.secondary};
    font-weight: 500;
  }
  dd {
    margin: 0 0 8px;
    padding-left: 12px;
  }
  ol {
    margin: 0;
    padding-left: 20px;
  }
  li + li {
    margin-top: 8px;
  }
  a {
    color: ${themeCssVariables.color.blue};
  }
  button {
    background: transparent;
    border: 0;
    color: ${themeCssVariables.color.blue};
    cursor: pointer;
    font: inherit;
    min-height: 32px;
    padding: 4px 0;
  }
  a:focus-visible,
  button:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }
`;

const MoreValues = ({
  children,
  count,
}: {
  children: () => ReactNode;
  count: number;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? t`Show less` : t`View more (${count})`}
      </button>
      {open && children()}
    </div>
  );
};

const Value = ({ value, depth = 0 }: { value: unknown; depth?: number }) => {
  if (value === null || value === undefined || value === '')
    return <span>{t`Not provided`}</span>;
  if (typeof value === 'boolean') return <span>{value ? t`Yes` : t`No`}</span>;
  if (typeof value === 'number') return <span>{String(value)}</span>;
  if (typeof value === 'string') {
    const url = safeStructuredValueUrl(value);
    return url ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
      >
        {value}
      </a>
    ) : (
      <span>{value}</span>
    );
  }
  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : isPlainObject(value)
      ? Object.entries(value)
      : [];
  if (entries.length === 0) return <span>{t`No entries`}</span>;
  const renderEntries = (items: (readonly [string, unknown])[]) =>
    Array.isArray(value) ? (
      <ol>
        {items.map(([key, item]) => (
          <li key={key}>
            <Value value={item} depth={depth + 1} />
          </li>
        ))}
      </ol>
    ) : (
      <dl>
        {items.map(([key, item]) => (
          <div key={key}>
            <dt>{structuredValueLabel(key)}</dt>
            <dd>
              <Value value={item} depth={depth + 1} />
            </dd>
          </div>
        ))}
      </dl>
    );
  if (depth > 6)
    return (
      <MoreValues count={entries.length}>
        {() => renderEntries(entries)}
      </MoreValues>
    );
  return (
    <>
      {renderEntries(entries.slice(0, 6))}
      {entries.length > 6 && (
        <MoreValues count={entries.length - 6}>
          {() => renderEntries(entries.slice(6))}
        </MoreValues>
      )}
    </>
  );
};
export const StructuredValueDisplay = ({ value }: { value: unknown }) => (
  <StyledValue onClick={(event) => event.stopPropagation()}>
    <Value value={parseStructuredValue(value)} />
  </StyledValue>
);
