import { CoreObjectNameSingular } from 'twenty-shared/types';
import { getRecordRoutePath } from '@/app/routing/record-routes/getAppPath';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

export const getLinkToShowPage = (
  objectNameSingular: string,
  record: Partial<ObjectRecord>,
) => {
  const isWorkspaceMemberObjectMetadata =
    objectNameSingular === CoreObjectNameSingular.WorkspaceMember;

  if (objectNameSingular === CoreObjectNameSingular.NoteTarget) {
    return getRecordRoutePath({
      objectNameSingular: CoreObjectNameSingular.Note,
      recordId: record.note?.id ?? '',
      record: record.note,
    });
  }

  if (objectNameSingular === CoreObjectNameSingular.TaskTarget) {
    return getRecordRoutePath({
      objectNameSingular: CoreObjectNameSingular.Task,
      recordId: record.task?.id ?? '',
      record: record.task,
    });
  }

  const linkToShowPage =
    isWorkspaceMemberObjectMetadata || !record.id
      ? ''
      : getRecordRoutePath({ objectNameSingular, recordId: record.id, record });

  return linkToShowPage;
};
