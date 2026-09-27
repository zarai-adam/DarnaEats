import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { List } from 'react-native-paper';
import { REPORT_PRIORITIES, REPORT_STATUSES, type ReportPriority, type ReportStatus } from '@shared/constants';
import { ChipSelector, EmptyState, ErrorState, LoadingState, Screen, StatusPill } from '@/components';
import { useAdminReports } from '@/features/admin/api';
import { useLocalized } from '@/localization/useLocalized';
import { formatDate } from '@/utils/format';
import { palette, spacing } from '@/theme';

const PRIORITY_TONE = { low: 'neutral', medium: 'info', high: 'warn', urgent: 'bad' } as const;

export default function ReportsQueue() {
  const { t, language } = useLocalized();
  const [status, setStatus] = useState<ReportStatus | 'all'>('open');
  const [priority, setPriority] = useState<ReportPriority | 'all'>('all');
  const reports = useAdminReports(status, priority);
  const items = reports.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        refreshing={reports.isRefetching}
        onRefresh={() => void reports.refetch()}
        onEndReached={() => reports.hasNextPage && void reports.fetchNextPage()}
        ListHeaderComponent={
          <View style={styles.filters}>
            <ChipSelector
              label={t('admin.status')}
              multiple={false}
              options={[
                { value: 'all', label: t('common.all') },
                ...REPORT_STATUSES.map((s) => ({ value: s, label: t(`reportStatus.${s}`) })),
              ]}
              selected={[status]}
              onChange={([v]) => setStatus((v ?? 'all') as ReportStatus | 'all')}
            />
            <ChipSelector
              label={t('admin.priority')}
              multiple={false}
              options={[
                { value: 'all', label: t('common.all') },
                ...REPORT_PRIORITIES.map((p) => ({ value: p, label: t(`priority.${p}`) })),
              ]}
              selected={[priority]}
              onChange={([v]) => setPriority((v ?? 'all') as ReportPriority | 'all')}
            />
            {reports.isLoading ? <LoadingState /> : null}
            {reports.error && !reports.data ? (
              <ErrorState error={reports.error} onRetry={() => void reports.refetch()} />
            ) : null}
          </View>
        }
        ListEmptyComponent={reports.data ? <EmptyState icon="check-all" title={t('admin.noReports')} /> : null}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        renderItem={({ item }) => (
          <List.Item
            title={`${t(`report.target.${item.targetType}`)} · ${t(`report.reasons.${item.reason}`)}`}
            description={`${item.description || '—'}\n${formatDate(item.createdAt, language, true)} · ${t(`reportStatus.${item.status}`)}`}
            descriptionNumberOfLines={3}
            right={() => <StatusPill label={t(`priority.${item.priority}`)} tone={PRIORITY_TONE[item.priority]} />}
            onPress={() => router.push(`/admin/reports/${item.id}`)}
            style={styles.item}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, flexGrow: 1 },
  filters: { gap: spacing.sm, marginBottom: spacing.md },
  item: { backgroundColor: palette.white, borderRadius: 12 },
});
