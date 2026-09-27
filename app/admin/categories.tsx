import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, HelperText, List, Switch, Text, TextInput } from 'react-native-paper';
import { slugify } from '@shared/text';
import { BottomSheet, ErrorState, LoadingState, Screen, StatusPill } from '@/components';
import { useSaveCatalogEntity } from '@/features/admin/api';
import { useCategories } from '@/features/catalog/api';
import { useLocalized } from '@/localization/useLocalized';
import type { Category } from '@/types/models';
import { errorMessage } from '@/utils/errors';
import { palette, spacing } from '@/theme';

const EMPTY = { nameAr: '', nameFr: '', slug: '', icon: 'food', isActive: true, sortOrder: 50 };

export default function CategoryManagement() {
  const { t, pick } = useLocalized();
  const categories = useCategories(true);
  const save = useSaveCatalogEntity();
  const [editing, setEditing] = useState<{ id?: string; data: typeof EMPTY } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (categories.isLoading) return <LoadingState />;
  if (!categories.data) return <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />;

  const open = (c?: Category) => {
    setError(null);
    setEditing(
      c
        ? {
            id: c.id,
            data: {
              nameAr: c.nameAr,
              nameFr: c.nameFr,
              slug: c.slug,
              icon: c.icon,
              isActive: c.isActive,
              sortOrder: c.sortOrder,
            },
          }
        : { data: { ...EMPTY } },
    );
  };
  const submit = async () => {
    if (!editing) return;
    try {
      const data = { ...editing.data, slug: editing.data.slug || slugify(editing.data.nameFr) };
      await save.mutateAsync({ collection: 'categories', ...(editing.id ? { id: editing.id } : {}), data });
      setEditing(null);
    } catch (e) {
      setError(errorMessage(e, t));
    }
  };
  const set = (patch: Partial<typeof EMPTY>) => setEditing((e) => (e ? { ...e, data: { ...e.data, ...patch } } : e));

  return (
    <Screen padded={false}>
      <FlatList
        data={categories.data}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Button mode="contained" icon="plus" onPress={() => open()} style={{ marginBottom: spacing.md }}>
            {t('admin.addCategory')}
          </Button>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        renderItem={({ item }) => (
          <List.Item
            title={pick(item, 'name')}
            description={`${item.slug} · #${item.sortOrder}`}
            left={(p) => <List.Icon {...p} icon={item.icon} />}
            right={() => (item.isActive ? null : <StatusPill label={t('admin.inactive')} tone="neutral" />)}
            onPress={() => open(item)}
            style={styles.item}
          />
        )}
      />
      <BottomSheet
        visible={editing !== null}
        onDismiss={() => setEditing(null)}
        title={editing?.id ? t('admin.editCategory') : t('admin.addCategory')}
        footer={
          <Button mode="contained" onPress={() => void submit()} loading={save.isPending}>
            {t('common.save')}
          </Button>
        }
      >
        {editing ? (
          <>
            <TextInput
              mode="outlined"
              label={t('admin.nameAr')}
              value={editing.data.nameAr}
              onChangeText={(v) => set({ nameAr: v })}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label={t('admin.nameFr')}
              value={editing.data.nameFr}
              onChangeText={(v) => set({ nameFr: v })}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label={t('admin.slug')}
              value={editing.data.slug}
              onChangeText={(v) => set({ slug: slugify(v) })}
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label={t('admin.icon')}
              value={editing.data.icon}
              onChangeText={(v) => set({ icon: v.trim() })}
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label={t('admin.sortOrder')}
              value={String(editing.data.sortOrder)}
              onChangeText={(v) => set({ sortOrder: Number(v.replace(/\D/g, '')) || 0 })}
              keyboardType="number-pad"
              style={styles.input}
            />
            <View style={styles.switchRow}>
              <Text variant="bodyLarge" style={styles.flex}>
                {t('admin.active')}
              </Text>
              <Switch value={editing.data.isActive} onValueChange={(v) => set({ isActive: v })} />
            </View>
            {error ? <HelperText type="error">{error}</HelperText> : null}
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg },
  item: { backgroundColor: palette.white, borderRadius: 12 },
  input: { backgroundColor: palette.white },
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  flex: { flex: 1 },
});
