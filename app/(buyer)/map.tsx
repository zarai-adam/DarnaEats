import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { GREATER_TUNIS_CENTER, type LatLng } from '@shared/geo';
import { ErrorState, LoadingState, Screen, SellerCard } from '@/components';
import { useServiceAreas } from '@/features/catalog/api';
import { useApprovedSellers } from '@/features/sellers/api';
import { useLocalized } from '@/localization/useLocalized';
import { mapProvider, type MapCircle, type MapMarker } from '@/services/maps';
import { getApproximateBuyerLocation } from '@/services/maps/location';
import { palette, spacing } from '@/theme';

/** Discovery map: sellers appear as approximate areas, never exact homes. */
export default function MapScreen() {
  const { t, pick } = useLocalized();
  const sellers = useApprovedSellers();
  const areas = useServiceAreas(true);
  const [me, setMe] = useState<LatLng | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const { markers, circles } = useMemo(() => {
    const m: MapMarker[] = [];
    const c: MapCircle[] = [];
    for (const s of sellers.data ?? []) {
      if (s.approximateLatitude == null || s.approximateLongitude == null) continue;
      const shown = mapProvider.showApproximateSellerLocation({
        id: s.id,
        name: s.displayName,
        latitude: s.approximateLatitude,
        longitude: s.approximateLongitude,
      });
      m.push(shown.marker);
      c.push(shown.circle);
    }
    if (me) m.push(mapProvider.showBuyerLocation(me, t('map.you')));
    return { markers: m, circles: c };
  }, [sellers.data, me, t]);

  const sorted = useMemo(() => {
    const list = sellers.data ?? [];
    if (!me) return list;
    return [...list].sort((a, b) => {
      const da =
        a.approximateLatitude != null
          ? mapProvider.calculateApproximateDistance(me, {
              latitude: a.approximateLatitude,
              longitude: a.approximateLongitude ?? 0,
            })
          : 999;
      const dbb =
        b.approximateLatitude != null
          ? mapProvider.calculateApproximateDistance(me, {
              latitude: b.approximateLatitude,
              longitude: b.approximateLongitude ?? 0,
            })
          : 999;
      return da - dbb;
    });
  }, [sellers.data, me]);

  if (sellers.isLoading) return <LoadingState />;
  if (sellers.error && !sellers.data)
    return <ErrorState error={sellers.error} onRetry={() => void sellers.refetch()} />;

  const list = selected ? sorted.filter((s) => s.id === selected) : sorted;

  return (
    <Screen padded={false}>
      <View style={styles.mapWrap}>
        {mapProvider.renderMap({
          center: me ?? GREATER_TUNIS_CENTER,
          zoom: me ? 13 : 11,
          markers,
          circles,
          onMarkerPress: (id) => setSelected(id === 'me' ? null : id),
          height: 320,
          accessibilityLabel: t('map.title'),
        })}
      </View>
      <View style={styles.bar}>
        <Text variant="bodySmall" style={styles.muted}>
          {t('map.privacyNote')}
        </Text>
        <View style={styles.row}>
          <Button
            icon="crosshairs-gps"
            onPress={() =>
              void getApproximateBuyerLocation()
                .then(setMe)
                .catch(() => setMe(null))
            }
          >
            {t('map.useMyLocation')}
          </Button>
          {selected ? <Button onPress={() => setSelected(null)}>{t('map.showAll')}</Button> : null}
        </View>
      </View>
      <FlatList
        data={list}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => {
          const area = areas.data?.find((a) => a.id === item.serviceAreaId);
          return (
            <SellerCard
              seller={item}
              areaName={area ? pick(area, 'name') : undefined}
              onPress={() => router.push(`/kitchen/${item.id}`)}
            />
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrap: { padding: spacing.md, paddingBottom: 0 },
  bar: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  muted: { color: palette.muted },
});
