import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { LIMITS } from '@shared/constants';
import { db } from '@/services/firebase/app';
import { fromDoc, fromDocOrNull } from '@/services/firebase/converters';
import { uploadImage } from '@/services/firebase/storage';
import type { Conversation, Message } from '@/types/models';
import { qk } from '../queryKeys';

export function conversationIdFor(buyerId: string, sellerId: string) {
  return `${buyerId}_${sellerId}`;
}

/**
 * Conversation list, live while the Messages tab is mounted (bounded to 30
 * docs). Unmounting the screen detaches the listener to control costs.
 */
export function useConversations(uid: string) {
  const [attempt, setAttempt] = useState(0);
  const key = `${uid}:${attempt}`;
  const [state, setState] = useState<{ key: string; data: Conversation[] | undefined; error: unknown }>({
    key: '',
    data: undefined,
    error: null,
  });
  useEffect(() => {
    if (!uid) return undefined;
    return onSnapshot(
      query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', uid),
        orderBy('updatedAt', 'desc'),
        limit(30),
      ),
      (snap) => setState({ key, data: snap.docs.map((d) => fromDoc<Conversation>(d)), error: null }),
      (error) => setState({ key, data: undefined, error }),
    );
  }, [uid, key]);
  const current = state.key === key;
  return {
    data: current ? state.data : state.data,
    error: current ? state.error : null,
    loading: !current,
    retry: () => setAttempt((n) => n + 1),
  };
}

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: qk.conversation(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => fromDocOrNull<Conversation>(await getDoc(doc(db, 'conversations', id!))),
  });
}

/** Latest 50 messages, live while the chat screen is open. */
export function useMessages(conversationId: string | undefined) {
  const [messages, setMessages] = useState<Message[] | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (!conversationId) return undefined;
    return onSnapshot(
      query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => {
        setMessages(snap.docs.map((d) => fromDoc<Message>(d)));
        setError(null);
      },
      setError,
    );
  }, [conversationId]);
  return { messages, error, loading: messages === undefined && !error };
}

export function useSendMessage(conversationId: string, uid: string) {
  return useMutation({
    mutationFn: async ({ text, imageUri }: { text: string; imageUri?: string }) => {
      const trimmed = text.trim().slice(0, LIMITS.maxMessageLength);
      const imagePath = imageUri ? await uploadImage(`chat/${conversationId}`, imageUri, { maxDimension: 1280 }) : null;
      if (!trimmed && !imagePath) return;
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: uid,
        text: trimmed,
        imagePath,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    },
  });
}

/** Resets my unread counter and marks the visible incoming messages read. */
export async function markConversationRead(convo: Conversation, uid: string, messages: Message[]) {
  const field = convo.buyerId === uid ? 'buyerUnread' : 'sellerUnread';
  if ((convo[field] ?? 0) > 0) await updateDoc(doc(db, 'conversations', convo.id), { [field]: 0 });
  const unread = messages.filter((m) => m.senderId !== uid && !m.isRead).slice(0, 20);
  await Promise.all(
    unread.map((m) => updateDoc(doc(db, 'conversations', convo.id, 'messages', m.id), { isRead: true })),
  );
}

/** Opens (or creates) the buyer's conversation with an approved seller. */
export function useStartConversation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      buyerId,
      buyerName,
      sellerId,
      sellerName,
    }: {
      buyerId: string;
      buyerName: string;
      sellerId: string;
      sellerName: string;
    }) => {
      const id = conversationIdFor(buyerId, sellerId);
      const ref = doc(db, 'conversations', id);
      try {
        const existing = await getDoc(ref);
        if (existing.exists()) return id;
      } catch {
        // Not readable yet because it does not exist; fall through to create.
      }
      await setDoc(ref, {
        buyerId,
        sellerId,
        participants: [buyerId, sellerId],
        buyerName: buyerName.slice(0, 80),
        sellerName: sellerName.slice(0, 80),
        orderId: null,
        lastMessageText: null,
        lastMessageAt: null,
        buyerUnread: 0,
        sellerUnread: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: (id) => void client.invalidateQueries({ queryKey: qk.conversation(id) }),
  });
}
