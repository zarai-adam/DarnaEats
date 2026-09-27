import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, TextInput } from 'react-native-paper';
import { DishImage, EmptyState, PriceDisplay, QuantitySelector, Screen } from '@/components';
import { useLocalized } from '@/localization/useLocalized';
import { track } from '@/services/analytics';
import { cartTotals, useCartStore } from '@/store/cartStore';
import { palette, radius, spacing } from '@/theme';

export default function CartScreen() {
  const { t, pickSnapshot } = useLocalized();
  const { items, sellerName, sellerId, setQuantity, removeItem, setNotes, clear } = useCartStore();
  const totals = cartTotals(items);

  if (items.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="cart-outline"
          title={t('cart.emptyTitle')}
          message={t('cart.emptyMessage')}
          action={
            <Button mode="contained" onPress={() => router.replace('/home')}>
              {t('orders.browse')}
            </Button>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      padded={false}
      footer={
        <View style={styles.footer}>
          <View style={styles.between}>
            <Text variant="titleMedium">{t('cart.subtotal')}</Text>
            <PriceDisplay amount={totals.subtotal} />
          </View>
          <Text variant="bodySmall" style={styles.muted}>
            {t('cart.priceNote')}
          </Text>
          <Button
            mode="contained"
            onPress={() => {
              track('checkout_started', { seller_id: sellerId ?? '', items: items.length, value: totals.subtotal });
              router.push('/checkout');
            }}
            contentStyle={styles.btn}
          >
            {t('cart.checkout')}
          </Button>
        </View>
      }
    >
      <FlatList
        data={items}
        keyExtractor={(i) => i.dishId}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.between}>
            <Text
              variant="titleMedium"
              onPress={() => sellerId && router.push(`/kitchen/${sellerId}`)}
              accessibilityRole="link"
            >
              {sellerName}
            </Text>
            <Button onPress={clear} compact textColor={palette.danger}>
              {t('cart.clear')}
            </Button>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.thumb}>
                <DishImage uri={item.imageUrl} />
              </View>
              <View style={styles.flex}>
                <Text variant="titleSmall">{pickSnapshot({ ar: item.nameAr, fr: item.nameFr })}</Text>
                <PriceDisplay amount={item.subtotal} variant="bodyLarge" />
              </View>
              <IconButton
                icon="delete-outline"
                onPress={() => removeItem(item.dishId)}
                accessibilityLabel={t('cart.remove')}
              />
            </View>
            <View style={styles.between}>
              <QuantitySelector
                value={item.quantity}
                max={item.maxQuantity}
                onChange={(q) => setQuantity(item.dishId, q)}
              />
            </View>
            <TextInput
              mode="outlined"
              dense
              label={t('cart.itemNotes')}
              value={item.notes ?? ''}
              onChangeText={(v) => setNotes(item.dishId, v)}
              maxLength={300}
              style={styles.input}
            />
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, overflow: 'hidden' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1, gap: 2 },
  input: { backgroundColor: palette.white },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  btn: { minHeight: 50 },
  muted: { color: palette.muted },
});
