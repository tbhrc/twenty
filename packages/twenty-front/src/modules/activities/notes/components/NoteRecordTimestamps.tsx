import { NoteTimestamps } from '@/activities/notes/components/NoteTimestamps';
import { type Note } from '@/activities/types/Note';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';

export const NoteRecordTimestamps = ({ noteId }: { noteId: string }) => {
  const note = useAtomFamilyStateValue(recordStoreFamilyState, noteId) as
    | Note
    | undefined;

  return note ? <NoteTimestamps note={note} /> : null;
};
