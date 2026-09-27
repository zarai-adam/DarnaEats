import { Text } from 'react-native-paper';
import { Screen, SectionHeader } from '@/components';
import { useLocalized } from '@/localization/useLocalized';

/** In-app terms & privacy summary (full texts are maintained by the operator; see PRIVACY.md). */
export default function LegalScreen() {
  const { t } = useLocalized();
  const sections = ['marketplace', 'sellers', 'food', 'payments', 'privacy', 'data', 'moderation', 'contact'] as const;
  return (
    <Screen scroll>
      {sections.map((key) => (
        <SectionHeaderBlock key={key} title={t(`legal.sections.${key}.title`)} body={t(`legal.sections.${key}.body`)} />
      ))}
    </Screen>
  );
}

function SectionHeaderBlock({ title, body }: { title: string; body: string }) {
  return (
    <>
      <SectionHeader title={title} />
      <Text variant="bodyMedium" style={{ lineHeight: 22 }}>
        {body}
      </Text>
    </>
  );
}
