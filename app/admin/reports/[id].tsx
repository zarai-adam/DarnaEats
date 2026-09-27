import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Snackbar, Text, TextInput } from 'react-native-paper';
import { REPORT_PRIORITIES, REPORT_STATUSES, type ReportPriority, type ReportStatus } from '@shared/constants';
import { ChipSelector, ErrorState, LoadingState, Screen, SectionHeader, StatusPill } from '@/components';
import { useAdminReport, useUpdateReport } from '@/features/admin/api';
import { useLocalized } from '@/localization/useLocalized';
import { errorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';
import { palette, radius, spacing } from '@/theme';

type Action = 'none' | 'hide_dish' | 'remove_review' | 'suspend_seller';

export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useLocalized();
  const report = useAdminReport(id);
  const update = useUpdateReport();
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState('');
  const [status, setStatus] = useState<ReportStatus | null>(null);
  const [priority, setPriority] = useState<ReportPriority | null>(null);
  const [action, setAction] = useState<Action>('none');
  const [notice, setNotice] = useState<string | null>(null);

  if (report.isLoading) return <LoadingState />;
  if (!report.data) return <ErrorState error={report.error} onRetry={() => void report.refetch()} />;
  const r = report.data;

  const relatedRoute: Href | null =
    r.targetType === 'dish'
      ? `/dish/${r.targetId}`
      : r.targetType === 'seller' || r.targetType === 'hygiene'
        ? `/admin/sellers/${r.targetId}`
        : null;
  const actions: Action[] = [
    'none',
    ...(r.targetType === 'dish' ? (['hide_dish'] as Action[]) : []),
    ...(r.targetType === 'review' ? (['remove_review'] as Action[]) : []),
    'suspend_seller',
  ];

  const save = async () => {
    try {
      await update.mutateAsync({
        reportId: r.id,
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(resolution.trim() ? { resolution: resolution.trim() } : {}),
        ...(action !== 'none' ? { action, actionReason: resolution.trim() || note.trim() || 'report_action' } : {}),
      });
      setNote('');
      setAction('none');
      setNotice(t('common.saved'));
    } catch (e) {
      setNotice(errorMessage(e, t));
    }
  };

  return (
    <Screen scroll refreshing={report.isRefetching} onRefresh={() => void report.refetch()}>
      <View style={styles.row}>
        <StatusPill label={t(`reportStatus.${r.status}`)} tone="info" />
        <StatusPill
          label={t(`priority.${r.priority}`)}
          tone={r.priority === 'urgent' || r.priority === 'high' ? 'bad' : 'neutral'}
        />
      </View>
      <View style={styles.card}>
        <Text variant="titleMedium">
          {t(`report.target.${r.targetType}`)} · {t(`report.reasons.${r.reason}`)}
        </Text>
        <Text variant="bodyMedium">{r.description || '—'}</Text>
        <Text variant="bodySmall" style={styles.muted}>
          {t('admin.targetId')}: {r.targetId}
        </Text>
        <Text variant="bodySmall" style={styles.muted}>
          {formatDate(r.createdAt, language, true)}
        </Text>
        {relatedRoute ? (
          <Button compact onPress={() => router.push(relatedRoute)}>
            {t('admin.openTarget')}
          </Button>
        ) : null}
        {r.relatedConversationId ? (
          <Button
            compact
            icon="chat-processing-outline"
            onPress={() =>
              router.push({
                pathname: '/admin/conversation',
                params: { conversationId: r.relatedConversationId!, reportId: r.id },
              })
            }
          >
            {t('admin.inspectConversation')}
          </Button>
        ) : null}
      </View>

      {r.adminNotes?.length ? (
        <>
          <SectionHeader title={t('admin.internalNotes')} />
          {r.adminNotes.map((n) => (
            <View key={`${n.at}-${n.by}`} style={styles.note}>
              <Text variant="bodyMedium">{n.text}</Text>
              <Text variant="bodySmall" style={styles.muted}>
                {formatDate(n.at, language, true)}
              </Text>
            </View>
          ))}
        </>
      ) : null}
      {r.resolution ? (
        <Text variant="bodyMedium">
          {t('admin.resolution')}: {r.resolution}
        </Text>
      ) : null}

      <SectionHeader title={t('admin.triage')} />
      <ChipSelector
        label={t('admin.status')}
        multiple={false}
        options={REPORT_STATUSES.map((s) => ({ value: s, label: t(`reportStatus.${s}`) }))}
        selected={[status ?? r.status]}
        onChange={([v]) => setStatus(v as ReportStatus)}
      />
      <ChipSelector
        label={t('admin.priority')}
        multiple={false}
        options={REPORT_PRIORITIES.map((p) => ({ value: p, label: t(`priority.${p}`) }))}
        selected={[priority ?? r.priority]}
        onChange={([v]) => setPriority(v as ReportPriority)}
      />
      <ChipSelector
        label={t('admin.action')}
        multiple={false}
        options={actions.map((a) => ({ value: a, label: t(`admin.actions.${a}`) }))}
        selected={[action]}
        onChange={([v]) => setAction((v ?? 'none') as Action)}
      />
      {action !== 'none' ? <HelperText type="info">{t('admin.actionAudited')}</HelperText> : null}
      <TextInput
        mode="outlined"
        label={t('admin.addNote')}
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={1000}
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label={t('admin.resolution')}
        value={resolution}
        onChangeText={setResolution}
        multiline
        maxLength={1000}
        style={styles.input}
      />
      <Button
        mode="contained"
        onPress={() => void save()}
        loading={update.isPending}
        disabled={update.isPending}
        contentStyle={{ minHeight: 48 }}
      >
        {t('common.save')}
      </Button>
      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice(null)} duration={3500}>
        {notice}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: palette.border,
  },
  note: { backgroundColor: palette.white, borderRadius: radius.sm, padding: spacing.sm },
  input: { backgroundColor: palette.white },
  muted: { color: palette.muted },
});
