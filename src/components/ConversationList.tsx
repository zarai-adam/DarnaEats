import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { Badge, List, Text } from 'react-native-paper';
import { useConversations } from '@/features/chat/api';
import { useLocalized } from '@/localization/useLocalized';
import type { Conversation } from '@/types/models';
import { formatDate } from '@/utils/format';
import { palette, spacing } from '@/theme';
import { Avatar } from './Avatar';
import { EmptyState, ErrorState, LoadingState } from './States';

export function ConversationList({ uid }: { uid: string }) {
  const { t, language } = useLocalized();
  const { data, error, loading, retry } = useConversations(uid);

  if (loading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;
  if (!data || data.length === 0) {
    return <EmptyState icon="chat-outline" title={t('chat.emptyTitle')} message={t('chat.emptyMessage')} />;
  }

  const renderItem = ({ item }: { item: Conversation }) => {
    const iAmBuyer = item.buyerId === uid;
    const otherName = iAmBuyer ? item.sellerName : item.buyerName;
    const unread = iAmBuyer ? item.buyerUnread : item.sellerUnread;
    return (
      <List.Item
        title={otherName || t('chat.unknownUser')}
        description={item.lastMessageText ?? t('chat.noMessagesYet')}
        descriptionNumberOfLines={1}
        onPress={() => router.push(`/chat/${item.id}`)}
        left={() => <Avatar name={otherName || '?'} size={44} />}
        right={() => (
          <View style={styles.meta}>
            <Text variant="bodySmall" style={styles.muted}>
              {formatDate(item.lastMessageAt ?? item.updatedAt, language)}
            </Text>
            {unread > 0 ? <Badge accessibilityLabel={t('chat.unreadCount', { count: unread })}>{unread}</Badge> : null}
          </View>
        )}
        style={styles.item}
        accessibilityLabel={`${otherName}. ${item.lastMessageText ?? ''}${unread > 0 ? `. ${t('chat.unreadCount', { count: unread })}` : ''}`}
      />
    );
  };

  return (
    <FlatList data={data} keyExtractor={(c) => c.id} renderItem={renderItem} contentContainerStyle={styles.list} />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.sm },
  item: { backgroundColor: palette.white, borderRadius: 12, marginBottom: spacing.sm, minHeight: 64 },
  meta: { alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  muted: { color: palette.muted },
});
