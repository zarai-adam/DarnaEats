import { useTranslation } from 'react-i18next';
import { Searchbar } from 'react-native-paper';
import { palette } from '@/theme';

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onFocus,
  autoFocus,
  editable = true,
}: {
  value: string;
  onChangeText?: (text: string) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
  autoFocus?: boolean;
  editable?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Searchbar
      value={value}
      onChangeText={onChangeText ?? (() => undefined)}
      onSubmitEditing={onSubmit}
      onFocus={onFocus}
      autoFocus={autoFocus}
      editable={editable}
      placeholder={t('search.placeholder')}
      accessibilityLabel={t('search.placeholder')}
      style={{ backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border }}
      returnKeyType="search"
      maxLength={80}
    />
  );
}
