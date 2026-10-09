import { CalendarEventsCard } from '@/activities/calendar/components/CalendarEventsCard';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { WidgetContentShell } from '@/page-layout/widgets/components/WidgetContentShell';
import { useDirectPersonRecipient } from '@/activities/emails/hooks/useDirectPersonRecipient';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { WidgetSkeletonLoader } from '@/page-layout/widgets/components/WidgetSkeletonLoader';
import { PageLayoutWidgetNoDataDisplay } from '@/page-layout/widgets/components/PageLayoutWidgetNoDataDisplay';

type CalendarWidgetProps = {
  widget: PageLayoutWidget;
};

export const CalendarWidget = ({ widget: _widget }: CalendarWidgetProps) => {
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
          <CalendarEventsCard
            key={person.id}
            targetRecord={{ id: person.id, targetObjectNameSingular: 'person' }}
          />
        ) : (
          <PageLayoutWidgetNoDataDisplay />
        )
      ) : (
        <CalendarEventsCard />
      )}
    </WidgetContentShell>
  );
};
