import { useNavigate } from '@/app/routing/record-routes/router';
import { useLocation } from 'react-router-dom';

export const useSetViewInUrl = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const setViewInUrl = (viewId: string) => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('viewId', viewId);
    navigate(
      {
        pathname: location.pathname,
        search: `?${searchParams}`,
        hash: location.hash,
      },
      { state: location.state },
    );
  };

  return { setViewInUrl };
};
