import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from 'react-native-paper';
import type { ReportTargetType } from '@shared/constants';

export function ReportButton({
  targetType,
  targetId,
  compact = true,
}: {
  targetType: ReportTargetType;
  targetId: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Button
      icon="flag-outline"
      compact={compact}
      mode="text"
      textColor="#8F4A3A"
      onPress={() => router.push({ pathname: '/report', params: { targetType, targetId } })}
      accessibilityLabel={t('report.reportThis')}
    >
      {t('report.report')}
    </Button>
  );
}
