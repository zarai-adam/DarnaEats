import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import type { AvailabilityState } from '@shared/availability';
import type { OrderStatus } from '@shared/constants';
import { palette } from '@/theme';

function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]} accessibilityRole="text" accessibilityLabel={label}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const AVAILABILITY_COLORS: Record<AvailabilityState, [string, string]> = {
  available: ['#E3E8CF', palette.oliveDark],
  preorder: ['#D3E3F1', palette.deepBlue],
  sold_out: ['#F4D7D3', palette.danger],
  outside_hours: ['#F3E6CE', palette.warning],
  preorder_closed: ['#F4D7D3', palette.danger],
  unavailable: ['#E6E1DA', palette.muted],
};

export function AvailabilityBadge({ state, quantity }: { state: AvailabilityState; quantity?: number }) {
  const { t } = useTranslation();
  const [bg, fg] = AVAILABILITY_COLORS[state];
  const label =
    state === 'available' && quantity !== undefined && quantity <= 5
      ? t('availability.limited', { count: quantity })
      : t(`availability.${state}`);
  return <Pill label={label} bg={bg} fg={fg} />;
}

const ORDER_COLORS: Record<OrderStatus, [string, string]> = {
  pending: ['#F3E6CE', palette.warning],
  accepted: ['#D3E3F1', palette.deepBlue],
  preparing: ['#D3E3F1', palette.deepBlue],
  ready: ['#E3E8CF', palette.oliveDark],
  out_for_delivery: ['#E3E8CF', palette.oliveDark],
  completed: ['#DCEBDD', palette.success],
  cancelled: ['#E6E1DA', palette.muted],
  disputed: ['#F4D7D3', palette.danger],
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const [bg, fg] = ORDER_COLORS[status];
  return <Pill label={t(`orderStatus.${status}`)} bg={bg} fg={fg} />;
}

export function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info';
}) {
  const colors = {
    neutral: ['#E6E1DA', palette.muted],
    good: ['#DCEBDD', palette.success],
    warn: ['#F3E6CE', palette.warning],
    bad: ['#F4D7D3', palette.danger],
    info: ['#D3E3F1', palette.deepBlue],
  }[tone];
  return <Pill label={label} bg={colors[0]!} fg={colors[1]!} />;
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '600' },
});
