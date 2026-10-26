import { getAppPath } from '@/app/routing/record-routes/getAppPath';
import { useObjectRecordSearchRecords } from '@/object-record/hooks/useObjectRecordSearchRecords';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppPath, CoreObjectNameSingular } from 'twenty-shared/types';
import { LightIconButton } from 'twenty-ui/components';
import { IconSearch, IconUser, IconX } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';
import { useDebounce } from 'use-debounce';

const StyledSearch = styled.div`
  min-width: 0;
  position: relative;
  width: 100%;
`;

const StyledInputContainer = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};

  &:focus-within {
    border-color: ${themeCssVariables.color.blue};
    outline: 1px solid ${themeCssVariables.color.blue};
  }
`;

const StyledInput = styled.input`
  background: transparent;
  border: 0;
  color: ${themeCssVariables.font.color.primary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.md};
  min-width: 0;
  outline: none;
  padding: 0;
  width: 100%;

  &::placeholder {
    color: ${themeCssVariables.font.color.secondary};
  }
`;

const StyledResults = styled.div`
  background: ${themeCssVariables.background.primary};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-shadow: ${themeCssVariables.boxShadow.strong};
  left: 0;
  max-height: min(400px, 65vh);
  overflow-y: auto;
  position: absolute;
  right: 0;
  top: calc(100% + ${themeCssVariables.spacing[1]});
  z-index: 10;
`;

const StyledStatus = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledResult = styled.div<{ active: boolean }>`
  align-items: center;
  background: ${({ active }) =>
    active ? themeCssVariables.background.tertiary : 'transparent'};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[2]};
  overflow-wrap: anywhere;
  padding: ${themeCssVariables.spacing[3]};

  &:hover {
    background: ${themeCssVariables.background.tertiary};
  }
`;

export const GlobalPeopleSearch = () => {
  const [searchInput, setSearchInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const navigate = useNavigate();
  const trimmedSearchInput = searchInput.trim();
  const [debouncedSearchInput] = useDebounce(trimmedSearchInput, 250);
  const { searchRecords, loading, error } = useObjectRecordSearchRecords({
    objectNameSingulars: [CoreObjectNameSingular.Person],
    searchInput: debouncedSearchInput,
    limit: 20,
    skip: !isOpen || debouncedSearchInput.length === 0,
    fetchPolicy: 'network-only',
  });

  // Never offer a previous query's records while the new query is pending.
  const isSearching = loading || trimmedSearchInput !== debouncedSearchInput;
  const visibleRecords = isSearching || error ? [] : searchRecords;
  const showResults = isOpen && trimmedSearchInput.length > 0;
  const activeRecord = visibleRecords[activeIndex];

  const openPerson = (recordId: string) => {
    setIsOpen(false);
    setSearchInput('');
    setActiveIndex(-1);
    navigate(
      getAppPath(AppPath.RecordShowPage, {
        objectNameSingular: CoreObjectNameSingular.Person,
        objectRecordId: recordId,
      }),
    );
  };

  return (
    <StyledSearch
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <StyledInputContainer>
        <IconSearch size={16} />
        <StyledInput
          role="combobox"
          aria-label={t`Search all people`}
          placeholder={t`Search all people…`}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showResults}
          aria-controls={showResults ? listId : undefined}
          aria-activedescendant={
            showResults && activeRecord
              ? `${listId}-${activeRecord.recordId}`
              : undefined
          }
          value={searchInput}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setActiveIndex(-1);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'Escape') {
              setIsOpen(false);
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setIsOpen(true);
              if (visibleRecords.length > 0) {
                setActiveIndex((previousIndex) =>
                  event.key === 'ArrowDown'
                    ? (previousIndex + 1) % visibleRecords.length
                    : previousIndex < 0
                      ? visibleRecords.length - 1
                      : (previousIndex - 1 + visibleRecords.length) %
                        visibleRecords.length,
                );
              }
            }
            if (event.key === 'Enter' && showResults && !isSearching) {
              event.preventDefault();
              const record = activeRecord ?? visibleRecords[0];
              if (record) openPerson(record.recordId);
            }
          }}
        />
        {searchInput && (
          <LightIconButton
            size="sm"
            aria-label={t`Clear people search`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setSearchInput('');
              setActiveIndex(-1);
            }}
          >
            <IconX size={14} />
          </LightIconButton>
        )}
      </StyledInputContainer>
      {showResults && (
        <StyledResults>
          <StyledStatus role="status" aria-live="polite">
            {isSearching
              ? t`Searching all people…`
              : error
                ? t`People search failed. Change your search to try again.`
                : visibleRecords.length === 0
                  ? t`No people found. Try another name or email.`
                  : visibleRecords.length === 20
                    ? t`Top 20 matches across all people. Keep typing to narrow results.`
                    : t`Matches across all people`}
          </StyledStatus>
          <div id={listId} role="listbox" aria-label={t`People search results`}>
            {visibleRecords.map((record, index) => (
              <StyledResult
                key={record.recordId}
                id={`${listId}-${record.recordId}`}
                role="option"
                aria-selected={index === activeIndex}
                active={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => openPerson(record.recordId)}
              >
                <IconUser size={16} />
                {record.label}
              </StyledResult>
            ))}
          </div>
        </StyledResults>
      )}
    </StyledSearch>
  );
};
