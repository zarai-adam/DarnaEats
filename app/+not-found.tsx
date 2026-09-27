import { router } from 'expo-router';
import { Button } from 'react-native-paper';
import { EmptyState, Screen } from '@/components';
import { useLocalized } from '@/localization/useLocalized';

export default function NotFound() {
  const { t } = useLocalized();
  return (
    <Screen>
      <EmptyState
        icon="map-marker-question-outline"
        title={t('common.notFound')}
        action={
          <Button mode="contained" onPress={() => router.replace('/')}>
            {t('common.backHome')}
          </Button>
        }
      />
    </Screen>
  );
}
