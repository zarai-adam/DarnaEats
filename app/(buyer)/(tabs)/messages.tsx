import { ConversationList, Screen } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';

export default function BuyerMessages() {
  const uid = useUid();
  return (
    <Screen padded={false}>
      <ConversationList uid={uid} />
    </Screen>
  );
}
