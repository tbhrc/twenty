import { MARKDOWN_EXTENSIONS } from '@/activities/files/const/markdown-preview.const';
import { isDefined } from 'twenty-shared/utils';

export const isMarkdownExtension = (
  extension: string | null | undefined,
): boolean =>
  isDefined(extension) &&
  MARKDOWN_EXTENSIONS.includes(
    extension.trim().toLowerCase().replace(/^\./, ''),
  );
