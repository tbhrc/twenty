import { useNavigate } from '@/app/routing/record-routes/router';
import { getAppPath } from '@/app/routing/record-routes/getAppPath';
import { useCallback } from 'react';

import { type AppPath, type NavigateOptions } from 'twenty-shared/types';

type NavigateAppOptions = NavigateOptions;

// Stable across renders so an effect can list it as a dependency without
// re-running every time the caller renders.
export const useNavigateApp = () => {
  const navigate = useNavigate();

  return useCallback(
    <T extends AppPath>(
      to: T,
      params?: Parameters<typeof getAppPath<T>>[1],
      queryParams?: Record<string, any>,
      options?: NavigateAppOptions,
    ) => {
      const path = getAppPath(to, params, queryParams);

      return navigate(path, options);
    },
    [navigate],
  );
};
