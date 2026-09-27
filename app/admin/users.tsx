import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Searchbar, Snackbar, Text } from 'react-native-paper';
import { ChipSelector, EmptyState, ErrorState, LoadingState, ReasonDialog, Screen, StatusPill } from '@/components';
import { useAdminUserMutations, useAdminUsers } from '@/features/admin/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLocalized } from '@/localization/useLocalized';
import { errorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';
import { palette, radius, spacing } from '@/theme';

type Pending = { uid: string; kind: 'toggleModerator' | 'deactivate' | 'reactivate'; roles: string[] };

export default function UserManagement() {
  const { t, language } = useLocalized();
  const { user, isAdmin } = useAuth();
  const [filter, setFilter] = useState<'all' | 'seller' | 'admin' | 'moderator'>('all');
  const [query, setQuery] = useState('');
  const users = useAdminUsers(filter);
  const { setRoles, setActive } = useAdminUserMutations();
  const [pending, setPending] = useState<Pending | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users.data ?? []).filter(
      (u) =>
        !q ||
        u.displayName.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.phoneNumber ?? '').includes(q),
    );
  }, [users.data, query]);

  if (!isAdmin) return <EmptyState icon="shield-lock-outline" title={t('admin.adminOnly')} />;

  const confirm = async (reason: string) => {
    if (!pending) return;
    try {
      if (pending.kind === 'toggleModerator') {
        const next = pending.roles.includes('moderator')
          ? pending.roles.filter((r) => r !== 'moderator')
          : [...pending.roles, 'moderator'];
        await setRoles.mutateAsync({ uid: pending.uid, roles: next, reason });
      } else {
        await setActive.mutateAsync({ uid: pending.uid, active: pending.kind === 'reactivate', reason });
      }
      setNotice(t('common.saved'));
    } catch (e) {
      setNotice(errorMessage(e, t));
    } finally {
      setPending(null);
    }
  };

  return (
    <Screen padded={false}>
      <FlatList
        data={filtered}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.content}
        refreshing={users.isRefetching}
        onRefresh={() => void users.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <Searchbar
              value={query}
              onChangeText={setQuery}
              placeholder={t('admin.searchUsers')}
              style={styles.search}
              autoCapitalize="none"
            />
            <ChipSelector
              multiple={false}
              options={(['all', 'seller', 'moderator', 'admin'] as const).map((r) => ({
                value: r,
                label: r === 'all' ? t('common.all') : t(`roles.${r}`),
              }))}
              selected={[filter]}
              onChange={([v]) => setFilter((v ?? 'all') as typeof filter)}
            />
            {users.isLoading ? <LoadingState /> : null}
            {users.error && !users.data ? (
              <ErrorState error={users.error} onRetry={() => void users.refetch()} />
            ) : null}
          </View>
        }
        ListEmptyComponent={users.data ? <EmptyState icon="account-search-outline" title={t('admin.noUsers')} /> : null}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text variant="titleSmall" style={styles.flex}>
                {item.displayName || '—'}
              </Text>
              {!item.isActive ? <StatusPill label={t('admin.inactive')} tone="bad" /> : null}
            </View>
            <Text variant="bodySmall" style={styles.muted}>
              {item.email ?? item.phoneNumber ?? item.id}
            </Text>
            <Text variant="bodySmall">
              {(item.roles ?? []).map((r) => t(`roles.${r}`)).join(' · ')} · {formatDate(item.createdAt, language)}
            </Text>
            {item.id !== user?.uid ? (
              <View style={styles.row}>
                <Button
                  compact
                  onPress={() => setPending({ uid: item.id, kind: 'toggleModerator', roles: item.roles ?? ['buyer'] })}
                >
                  {(item.roles ?? []).includes('moderator') ? t('admin.removeModerator') : t('admin.makeModerator')}
                </Button>
                <Button
                  compact
                  textColor={item.isActive ? palette.danger : undefined}
                  onPress={() =>
                    setPending({
                      uid: item.id,
                      kind: item.isActive ? 'deactivate' : 'reactivate',
                      roles: item.roles ?? [],
                    })
                  }
                >
                  {item.isActive ? t('admin.deactivate') : t('admin.reactivateUser')}
                </Button>
              </View>
            ) : null}
          </View>
        )}
      />
      <ReasonDialog
        visible={pending !== null}
        title={t('admin.confirmUserAction')}
        confirmLabel={t('common.confirm')}
        destructive={pending?.kind === 'deactivate'}
        loading={setRoles.isPending || setActive.isPending}
        onDismiss={() => setPending(null)}
        onConfirm={(reason) => void confirm(reason)}
      />
      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice(null)} duration={3000}>
        {notice}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, flexGrow: 1 },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  search: { backgroundColor: palette.white },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: palette.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  flex: { flex: 1 },
  muted: { color: palette.muted },
});
