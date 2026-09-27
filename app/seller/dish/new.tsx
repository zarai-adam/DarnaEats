import { router } from 'expo-router';
import { Screen } from '@/components';
import { useUid } from '@/features/auth/AuthProvider';
import { DishForm } from '@/features/dishes/DishForm';

export default function NewDish() {
  const uid = useUid();
  return (
    <Screen scroll>
      <DishForm uid={uid} onSaved={() => router.back()} />
    </Screen>
  );
}
