import { EmailsCard } from '@/activities/emails/components/EmailsCard';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { WidgetContentShell } from '@/page-layout/widgets/components/WidgetContentShell';
import { useDirectPersonRecipient } from '@/activities/emails/hooks/useDirectPersonRecipient';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { WidgetSkeletonLoader } from '@/page-layout/widgets/components/WidgetSkeletonLoader';
import { PageLayoutWidgetNoDataDisplay } from '@/page-layout/widgets/components/PageLayoutWidgetNoDataDisplay';

type EmailWidgetProps = {
  widget: PageLayoutWidget;
};

export const EmailWidget = ({ widget: _widget }: EmailWidgetProps) => {
  const target = useTargetRecord();
  const { supported, person, loading } = useDirectPersonRecipient({
    objectNameSingular: target.targetObjectNameSingular,
    recordId: target.id,
  });
  return (
    <WidgetContentShell>
      {supported ? (
        loading ? (
          <WidgetSkeletonLoader />
        ) : person?.id ? (
          <EmailsCard
            key={person.id}
            targetRecord={{ id: person.id, targetObjectNameSingular: 'person' }}
          />
        ) : (
          <PageLayoutWidgetNoDataDisplay />
        )
      ) : (
        <EmailsCard />
      )}
    </WidgetContentShell>
  );
};
