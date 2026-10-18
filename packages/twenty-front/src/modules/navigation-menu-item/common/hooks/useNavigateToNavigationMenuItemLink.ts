import { useNavigate } from '@/app/routing/record-routes/router';
import { isAbsoluteUrl } from 'twenty-shared/utils';

export const useNavigateToNavigationMenuItemLink = () => {
  const navigate = useNavigate();

  const navigateToNavigationMenuItemLink = (link: string) => {
    if (isAbsoluteUrl(link)) {
      window.open(link, '_blank', 'noopener,noreferrer');
      return;
    }

    navigate(link);
  };

  return { navigateToNavigationMenuItemLink };
};
