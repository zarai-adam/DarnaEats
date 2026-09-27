import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, List, Switch, Text, TextInput } from 'react-native-paper';
import { slugify } from '@shared/text';
import { BottomSheet, ErrorState, LoadingState, Screen, SectionHeader, StatusPill } from '@/components';
import { useSaveCatalogEntity } from '@/features/admin/api';
import { useCities, useGovernorates, useServiceAreas } from '@/features/catalog/api';
import { useLocalized } from '@/localization/useLocalized';
import type { City, Governorate, ServiceArea } from '@/types/models';
import { errorMessage } from '@/utils/errors';
import { palette, spacing } from '@/theme';

type Editing =
  | { kind: 'governorates'; id?: string; data: { nameAr: string; nameFr: string; slug: string; isActive: boolean } }
  | {
      kind: 'cities';
      id?: string;
      data: { nameAr: string; nameFr: string; slug: string; isActive: boolean; governorateId: string };
    }
  | {
      kind: 'serviceAreas';
      id?: string;
      data: {
        nameAr: string;
        nameFr: string;
        isActive: boolean;
        cityId: string;
        governorateId: string;
        approximateLatitude: number;
        approximateLongitude: number;
      };
    };

/**
 * Supported locations. Future governorates (Sfax, Sousse...) exist but stay
 * inactive, and therefore invisible in the marketplace, until enabled here.
 */
export default function LocationManagement() {
  const { t, pick } = useLocalized();
  const governorates = useGovernorates(true);
  const cities = useCities(true);
  const areas = useServiceAreas(true);
  const save = useSaveCatalogEntity();
  const [selectedGov, setSelectedGov] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (governorates.isLoading || cities.isLoading || areas.isLoading) return <LoadingState />;
  if (!governorates.data) return <ErrorState error={governorates.error} onRetry={() => void governorates.refetch()} />;

  const quickToggle = (g: Governorate) =>
    save.mutate({
      collection: 'governorates',
      id: g.id,
      data: { nameAr: g.nameAr, nameFr: g.nameFr, slug: g.slug, isActive: !g.isActive },
    });

  const submit = async () => {
    if (!editing) return;
    setError(null);
    try {
      const data =
        'slug' in editing.data
          ? { ...editing.data, slug: editing.data.slug || slugify(editing.data.nameFr) }
          : editing.data;
      await save.mutateAsync({ collection: editing.kind, ...(editing.id ? { id: editing.id } : {}), data });
      setEditing(null);
    } catch (e) {
      setError(errorMessage(e, t));
    }
  };

  const govCities = (cities.data ?? []).filter((c) => c.governorateId === selectedGov);
  const editArea = (a: ServiceArea) =>
    setEditing({
      kind: 'serviceAreas',
      id: a.id,
      data: {
        nameAr: a.nameAr,
        nameFr: a.nameFr,
        isActive: a.isActive,
        cityId: a.cityId,
        governorateId: a.governorateId,
        approximateLatitude: a.approximateLatitude,
        approximateLongitude: a.approximateLongitude,
      },
    });
  const editCity = (c: City) =>
    setEditing({
      kind: 'cities',
      id: c.id,
      data: { nameAr: c.nameAr, nameFr: c.nameFr, slug: c.slug, isActive: c.isActive, governorateId: c.governorateId },
    });

  const setData = (patch: Record<string, unknown>) =>
    setEditing((e) => (e ? ({ ...e, data: { ...e.data, ...patch } } as Editing) : e));

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="bodySmall" style={styles.muted}>
          {t('admin.locationsIntro')}
        </Text>
        <SectionHeader title={t('location.governorates')} />
        {governorates.data.map((g) => (
          <List.Item
            key={g.id}
            title={pick(g, 'name')}
            description={g.isActive ? t('admin.enabled') : t('admin.disabled')}
            onPress={() => setSelectedGov(g.id === selectedGov ? null : g.id)}
            right={() => (
              <Switch
                value={g.isActive}
                onValueChange={() => quickToggle(g)}
                accessibilityLabel={`${pick(g, 'name')}: ${t('admin.active')}`}
              />
            )}
            style={[styles.item, selectedGov === g.id && styles.selected]}
          />
        ))}
        {selectedGov ? (
          <>
            <SectionHeader
              title={t('location.cities')}
              actionLabel={t('admin.add')}
              onAction={() =>
                setEditing({
                  kind: 'cities',
                  data: { nameAr: '', nameFr: '', slug: '', isActive: true, governorateId: selectedGov },
                })
              }
            />
            {govCities.map((c) => (
              <View key={c.id}>
                <List.Item
                  title={pick(c, 'name')}
                  onPress={() => editCity(c)}
                  right={() => (c.isActive ? null : <StatusPill label={t('admin.inactive')} />)}
                  style={styles.item}
                />
                {(areas.data ?? [])
                  .filter((a) => a.cityId === c.id)
                  .map((a) => (
                    <List.Item
                      key={a.id}
                      title={`↳ ${pick(a, 'name')}`}
                      description={`${a.approximateLatitude.toFixed(2)}, ${a.approximateLongitude.toFixed(2)}`}
                      onPress={() => editArea(a)}
                      right={() => (a.isActive ? null : <StatusPill label={t('admin.inactive')} />)}
                      style={styles.subItem}
                    />
                  ))}
                <Button
                  compact
                  onPress={() =>
                    setEditing({
                      kind: 'serviceAreas',
                      data: {
                        nameAr: '',
                        nameFr: '',
                        isActive: true,
                        cityId: c.id,
                        governorateId: selectedGov,
                        approximateLatitude: 36.8,
                        approximateLongitude: 10.18,
                      },
                    })
                  }
                >
                  {t('admin.addArea')}
                </Button>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
      <BottomSheet
        visible={editing !== null}
        onDismiss={() => setEditing(null)}
        title={t('admin.editLocation')}
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
              onChangeText={(v) => setData({ nameAr: v })}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label={t('admin.nameFr')}
              value={editing.data.nameFr}
              onChangeText={(v) => setData({ nameFr: v })}
              style={styles.input}
            />
            {editing.kind === 'serviceAreas' ? (
              <>
                <TextInput
                  mode="outlined"
                  label={t('admin.latitude')}
                  value={String(editing.data.approximateLatitude)}
                  onChangeText={(v) => setData({ approximateLatitude: Number(v) || 0 })}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label={t('admin.longitude')}
                  value={String(editing.data.approximateLongitude)}
                  onChangeText={(v) => setData({ approximateLongitude: Number(v) || 0 })}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
                <Text variant="bodySmall" style={styles.muted}>
                  {t('admin.approxCoordinatesNote')}
                </Text>
              </>
            ) : null}
            <View style={styles.switchRow}>
              <Text variant="bodyLarge" style={styles.flex}>
                {t('admin.active')}
              </Text>
              <Switch value={editing.data.isActive} onValueChange={(v) => setData({ isActive: v })} />
            </View>
            {error ? <HelperText type="error">{error}</HelperText> : null}
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xs },
  item: { backgroundColor: palette.white, borderRadius: 12 },
  selected: { borderWidth: 2, borderColor: palette.deepBlue },
  subItem: { backgroundColor: palette.white, borderRadius: 12, marginStart: spacing.lg },
  input: { backgroundColor: palette.white },
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  flex: { flex: 1 },
  muted: { color: palette.muted },
});
