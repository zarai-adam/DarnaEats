import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Text } from 'react-native-paper';
import { EmptyState, ErrorState, LoadingState, ReasonDialog, Screen } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useDeleteDish, useDish } from '@/features/dishes/api';
import { DishForm } from '@/features/dishes/DishForm';
import { useLocalized } from '@/localization/useLocalized';
import { palette } from '@/theme';

export default function EditDish() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocalized();
  const uid = useUid();
  const dish = useDish(id);
  const remove = useDeleteDish(uid);
  const [confirm, setConfirm] = useState(false);

  if (dish.isLoading) return <LoadingState />;
  if (dish.error && !dish.data) return <ErrorState error={dish.error} onRetry={() => void dish.refetch()} />;
  if (!dish.data || dish.data.sellerId !== uid) return <EmptyState title={t('dish.notFound')} />;

  return (
    <Screen scroll>
      {dish.data.isHidden ? (
        <Text variant="bodyMedium" style={{ color: palette.danger }}>
          {t('sellerMenu.hiddenExplain', { reason: dish.data.hiddenReason ?? '' })}
        </Text>
      ) : null}
      <DishForm uid={uid} dish={dish.data} onSaved={() => router.back()} />
      <Button icon="delete-outline" textColor={palette.danger} onPress={() => setConfirm(true)}>
        {t('dishForm.delete')}
      </Button>
      <ReasonDialog
        visible={confirm}
        title={t('dishForm.deleteTitle')}
        message={t('dishForm.deleteMessage')}
        confirmLabel={t('dishForm.delete')}
        requireReason={false}
        destructive
        loading={remove.isPending}
        onDismiss={() => setConfirm(false)}
        onConfirm={() => void remove.mutateAsync(dish.data!.id).then(() => router.back())}
      />
    </Screen>
  );
}
