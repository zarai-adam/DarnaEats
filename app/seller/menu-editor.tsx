import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Checkbox, HelperText, Text, TextInput } from 'react-native-paper';
import { schedulableDates, tunisDateKey } from '@shared/time';
import { ChipSelector, ErrorState, LoadingState, Screen, SectionHeader } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { useMyDishes } from '@/features/dishes/api';
import { useDeleteMenu, useMenu, useMyMenus, useSaveMenu, type MenuInput } from '@/features/menus/api';
import type { Dish, Menu } from '@/types/models';
import { useLocalized } from '@/localization/useLocalized';
import { errorMessage } from '@/utils/errors';
import { formatDateKey } from '@/utils/format';
import { palette, spacing } from '@/theme';

export default function MenuEditor() {
  const params = useLocalSearchParams<{ id?: string }>();
  const uid = useUid();
  const dishes = useMyDishes(uid);
  const myMenus = useMyMenus(uid);
  // Default to editing today's menu if it already exists.
  const todayId = `${uid}_${tunisDateKey()}`;
  const menuId = params.id ?? (myMenus.data?.some((m) => m.id === todayId) ? todayId : undefined);
  const menu = useMenu(menuId);
  const save = useSaveMenu(uid);
  const remove = useDeleteMenu(uid);

  if (dishes.isLoading || myMenus.isLoading || (menuId && menu.isLoading)) return <LoadingState />;
  if (dishes.error && !dishes.data) return <ErrorState error={dishes.error} onRetry={() => void dishes.refetch()} />;

  return (
    <MenuForm
      key={menuId ?? 'new'}
      uid={uid}
      menuId={menuId}
      initial={menu.data ?? null}
      dishes={dishes.data ?? []}
      otherMenus={myMenus.data ?? []}
      saving={save.isPending}
      onSave={(input) => save.mutateAsync({ id: menuId, input }).then(() => router.back())}
      onDelete={menuId ? () => void remove.mutateAsync(menuId).then(() => router.back()) : undefined}
    />
  );
}

function MenuForm({
  menuId,
  initial,
  dishes,
  otherMenus,
  saving,
  onSave,
  onDelete,
}: {
  uid: string;
  menuId: string | undefined;
  initial: Menu | null;
  dishes: Dish[];
  otherMenus: Menu[];
  saving: boolean;
  onSave: (input: MenuInput) => Promise<void>;
  onDelete?: () => void;
}) {
  const { t, language, pick } = useLocalized();
  const [date, setDate] = useState(initial?.date ?? tunisDateKey());
  const [titleAr, setTitleAr] = useState(initial?.titleAr ?? 'قائمة اليوم');
  const [titleFr, setTitleFr] = useState(initial?.titleFr ?? 'Menu du jour');
  const [descriptionAr, setDescriptionAr] = useState(initial?.descriptionAr ?? '');
  const [descriptionFr, setDescriptionFr] = useState(initial?.descriptionFr ?? '');
  const [selected, setSelected] = useState<string[]>(initial?.dishIds ?? []);
  const [error, setError] = useState<string | null>(null);

  const existingForDate = otherMenus.find((m) => m.date === date && m.id !== menuId);
  const activeDishes = dishes.filter((d) => d.isActive && !d.isHidden);

  const persist = async (status: 'published' | 'draft') => {
    setError(null);
    if (selected.length === 0) {
      setError(t('sellerMenu.selectDishes'));
      return;
    }
    if (existingForDate) {
      setError(t('sellerMenu.dateTaken'));
      return;
    }
    try {
      await onSave({
        date,
        titleAr: titleAr.trim().slice(0, 80),
        titleFr: titleFr.trim().slice(0, 80),
        descriptionAr: descriptionAr.trim(),
        descriptionFr: descriptionFr.trim(),
        dishIds: selected.slice(0, 20),
        status,
      });
    } catch (e) {
      setError(errorMessage(e, t));
    }
  };

  return (
    <Screen scroll>
      <SectionHeader title={t('sellerMenu.date')} />
      <ChipSelector
        multiple={false}
        options={schedulableDates().map((d) => ({ value: d, label: formatDateKey(d, language) }))}
        selected={[date]}
        onChange={([d]) => d && !menuId && setDate(d)}
      />
      <TextInput
        mode="outlined"
        label={t('sellerMenu.titleAr')}
        value={titleAr}
        onChangeText={setTitleAr}
        maxLength={80}
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label={t('sellerMenu.titleFr')}
        value={titleFr}
        onChangeText={setTitleFr}
        maxLength={80}
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label={t('sellerMenu.descriptionAr')}
        value={descriptionAr}
        onChangeText={setDescriptionAr}
        multiline
        maxLength={500}
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label={t('sellerMenu.descriptionFr')}
        value={descriptionFr}
        onChangeText={setDescriptionFr}
        multiline
        maxLength={500}
        style={styles.input}
      />

      <SectionHeader title={t('sellerMenu.dishes')} />
      {activeDishes.length === 0 ? <Text style={styles.muted}>{t('sellerMenu.noActiveDishes')}</Text> : null}
      {activeDishes.map((d) => {
        const on = selected.includes(d.id);
        return (
          <View key={d.id} style={styles.dishRow}>
            <Checkbox.Android
              status={on ? 'checked' : 'unchecked'}
              onPress={() => setSelected((s) => (on ? s.filter((x) => x !== d.id) : [...s, d.id]))}
              accessibilityLabel={pick(d, 'name')}
            />
            <Text
              variant="bodyLarge"
              style={styles.flex}
              onPress={() => setSelected((s) => (on ? s.filter((x) => x !== d.id) : [...s, d.id]))}
            >
              {pick(d, 'name')}
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              {t('sellerMenu.quantity', { count: d.availableQuantity })}
            </Text>
          </View>
        );
      })}

      {error ? <HelperText type="error">{error}</HelperText> : null}
      <Button
        mode="contained"
        icon="publish"
        onPress={() => void persist('published')}
        loading={saving}
        disabled={saving}
        contentStyle={styles.btn}
      >
        {t('sellerMenu.publish')}
      </Button>
      <Button mode="outlined" onPress={() => void persist('draft')} disabled={saving} contentStyle={styles.btn}>
        {t('sellerMenu.saveDraft')}
      </Button>
      {onDelete ? (
        <Button textColor={palette.danger} icon="delete-outline" onPress={onDelete}>
          {t('sellerMenu.delete')}
        </Button>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: palette.white },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: palette.white,
    borderRadius: 12,
    paddingEnd: spacing.md,
    minHeight: 52,
  },
  flex: { flex: 1 },
  btn: { minHeight: 48 },
  muted: { color: palette.muted },
});
