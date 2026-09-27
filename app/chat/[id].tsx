import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, HelperText, IconButton, Text, TextInput } from 'react-native-paper';
import { LIMITS } from '@shared/constants';
import { EmptyState, ErrorState, LoadingState, ReportButton, Screen } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { markConversationRead, useConversation, useMessages, useSendMessage } from '@/features/chat/api';
import { pickImage } from '@/hooks/useImagePicker';
import { useLocalized } from '@/localization/useLocalized';
import { readPrivateImageAsDataUri } from '@/services/firebase/storage';
import type { Message } from '@/types/models';
import { errorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';
import { palette, radius, spacing } from '@/theme';

/** Private chat images are fetched through the SDK (rules enforced), never via public URLs. */
function ChatImage({ path }: { path: string }) {
  const { t } = useLocalized();
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    readPrivateImageAsDataUri(path)
      .then((data) => alive && setUri(data))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [path]);
  if (failed) return <Text variant="bodySmall">{t('chat.imageUnavailable')}</Text>;
  if (!uri) return <ActivityIndicator />;
  return <Image source={{ uri }} style={styles.image} contentFit="cover" accessibilityLabel={t('chat.image')} />;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useLocalized();
  const uid = useUid();
  const conversation = useConversation(id);
  const { messages, error, loading } = useMessages(id);
  const send = useSendMessage(id ?? '', uid);
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (conversation.data && messages)
      void markConversationRead(conversation.data, uid, messages).catch(() => undefined);
  }, [conversation.data, messages, uid]);

  if (conversation.isLoading) return <LoadingState />;
  if (!conversation.data) {
    return conversation.error ? (
      <ErrorState error={conversation.error} onRetry={() => void conversation.refetch()} />
    ) : (
      <EmptyState icon="chat-remove-outline" title={t('chat.notFound')} />
    );
  }
  const c = conversation.data;
  const otherName = c.buyerId === uid ? c.sellerName : c.buyerName;

  const submit = async (imageUri?: string) => {
    setSendError(null);
    const body = text;
    if (!body.trim() && !imageUri) return;
    setText('');
    try {
      await send.mutateAsync({ text: body, imageUri });
    } catch (e) {
      setText(body);
      setSendError(errorMessage(e, t));
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const mine = item.senderId === uid;
    return (
      <View
        style={[styles.bubble, mine ? styles.mine : styles.theirs]}
        accessibilityLabel={`${mine ? t('chat.you') : otherName}: ${item.text}`}
      >
        {item.imagePath ? <ChatImage path={item.imagePath} /> : null}
        {item.text ? (
          <Text variant="bodyMedium" style={mine ? styles.mineText : undefined}>
            {item.text}
          </Text>
        ) : null}
        <Text variant="labelSmall" style={[styles.time, mine && styles.mineText]}>
          {formatDate(item.createdAt, language, true)}
          {mine && item.isRead ? ` · ${t('chat.read')}` : ''}
        </Text>
      </View>
    );
  };

  return (
    <Screen padded={false}>
      <Stack.Screen
        options={{ title: otherName, headerRight: () => <ReportButton targetType="conversation" targetId={c.id} /> }}
      />
      <Text variant="bodySmall" style={styles.notice}>
        {t('chat.safetyNotice')}
      </Text>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : (
        <FlatList
          inverted
          data={messages ?? []}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{t('chat.startConversation')}</Text>}
        />
      )}
      {sendError ? <HelperText type="error">{sendError}</HelperText> : null}
      <View style={styles.composer}>
        <IconButton
          icon="image-outline"
          onPress={() => void pickImage().then((uri) => uri && void submit(uri))}
          disabled={send.isPending}
          accessibilityLabel={t('chat.attachImage')}
        />
        <TextInput
          mode="outlined"
          value={text}
          onChangeText={setText}
          placeholder={t('chat.placeholder')}
          style={styles.input}
          multiline
          maxLength={LIMITS.maxMessageLength}
          accessibilityLabel={t('chat.placeholder')}
        />
        <IconButton
          icon="send"
          mode="contained"
          onPress={() => void submit()}
          disabled={send.isPending || !text.trim()}
          accessibilityLabel={t('chat.send')}
          style={styles.send}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { backgroundColor: '#F3E6CE', color: palette.warning, padding: spacing.sm, textAlign: 'center' },
  list: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
  empty: { textAlign: 'center', color: palette.muted, transform: [{ scaleY: -1 }] },
  bubble: { maxWidth: '80%', padding: spacing.sm, borderRadius: radius.md, gap: 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: palette.terracotta },
  theirs: { alignSelf: 'flex-start', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border },
  mineText: { color: palette.white },
  time: { color: palette.muted, fontSize: 10 },
  image: { width: 200, height: 150, borderRadius: radius.sm },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    gap: spacing.xs,
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  input: { flex: 1, maxHeight: 120, backgroundColor: palette.white },
  send: { margin: 0 },
});
