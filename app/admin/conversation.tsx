import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ErrorState, LoadingState, Screen } from '@/components';
import { useLocalized } from '@/localization/useLocalized';
import { api } from '@/services/firebase/callables';
import { formatDate } from '@/utils/format';
import { palette, radius, spacing } from '@/theme';

/** Report-scoped, audited read-only view of a conversation. */
export default function InspectConversation() {
  const { conversationId, reportId } = useLocalSearchParams<{ conversationId: string; reportId: string }>();
  const { t, language } = useLocalized();
  const convo = useQuery({
    queryKey: ['admin', 'inspect', conversationId, reportId],
    enabled: Boolean(conversationId && reportId),
    queryFn: () => api.adminInspectConversation({ conversationId: conversationId!, reportId: reportId! }),
    staleTime: Infinity,
    gcTime: 0,
  });
  if (convo.isLoading) return <LoadingState />;
  if (!convo.data) return <ErrorState error={convo.error} onRetry={() => void convo.refetch()} />;
  const data = convo.data;
  return (
    <Screen padded={false}>
      <Text variant="bodySmall" style={styles.notice}>
        {t('admin.inspectNotice')}
      </Text>
      <FlatList
        data={data.messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        renderItem={({ item }) => (
          <View style={[styles.msg, item.senderId === data.sellerId ? styles.seller : styles.buyer]}>
            <Text variant="labelSmall">
              {item.senderId === data.sellerId ? t('admin.sellerLabel') : t('admin.buyerLabel')} ·{' '}
              {formatDate(item.createdAt, language, true)}
            </Text>
            <Text variant="bodyMedium">
              {item.text}
              {item.hasImage ? ' [📷]' : ''}
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { backgroundColor: '#F3E6CE', color: palette.warning, padding: spacing.sm, textAlign: 'center' },
  content: { padding: spacing.lg },
  msg: { padding: spacing.sm, borderRadius: radius.sm, maxWidth: '85%', gap: 2 },
  seller: { alignSelf: 'flex-end', backgroundColor: '#E3E8CF' },
  buyer: { alignSelf: 'flex-start', backgroundColor: palette.white },
});
