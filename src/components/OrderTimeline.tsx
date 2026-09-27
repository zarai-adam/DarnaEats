import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import type { FulfillmentMethod, OrderStatus } from '@shared/constants';
import { useLocalized } from '@/localization/useLocalized';
import { formatDate } from '@/utils/format';
import { palette, spacing } from '@/theme';

export function OrderTimeline({
  status,
  fulfillment,
  history,
}: {
  status: OrderStatus;
  fulfillment: FulfillmentMethod;
  history: { status: OrderStatus; at: number }[];
}) {
  const { t, language } = useLocalized();
  const steps: OrderStatus[] =
    fulfillment === 'seller_delivery'
      ? ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed']
      : ['pending', 'accepted', 'preparing', 'ready', 'completed'];

  if (status === 'cancelled' || status === 'disputed') {
    const entry = [...history].reverse().find((h) => h.status === status);
    return (
      <View style={styles.row} accessibilityRole="text">
        <MaterialCommunityIcons
          name={status === 'cancelled' ? 'close-circle' : 'alert-octagon'}
          size={24}
          color={palette.danger}
        />
        <Text variant="titleSmall">
          {t(`orderStatus.${status}`)} {entry ? `· ${formatDate(entry.at, language, true)}` : ''}
        </Text>
      </View>
    );
  }

  const currentIndex = steps.indexOf(status);
  return (
    <View style={styles.list} accessibilityRole="list">
      {steps.map((step, i) => {
        const done = i <= currentIndex;
        const at = history.find((h) => h.status === step)?.at;
        return (
          <View
            key={step}
            style={styles.row}
            accessibilityLabel={`${t(`orderStatus.${step}`)}${done ? `, ${t('common.done')}` : ''}`}
          >
            <MaterialCommunityIcons
              name={done ? 'check-circle' : 'checkbox-blank-circle-outline'}
              size={22}
              color={done ? palette.olive : palette.border}
            />
            <View style={styles.flex}>
              <Text variant="bodyMedium" style={done ? styles.done : styles.pending}>
                {t(`orderStatus.${step}`)}
              </Text>
              {at ? (
                <Text variant="bodySmall" style={styles.muted}>
                  {formatDate(at, language, true)}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  done: { color: palette.text, fontWeight: '600' },
  pending: { color: palette.muted },
  muted: { color: palette.muted },
});
