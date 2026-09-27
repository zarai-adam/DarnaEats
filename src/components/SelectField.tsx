import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { HelperText, List, TextInput } from 'react-native-paper';
import { BottomSheet } from './BottomSheet';

/** Picker that opens a searchable-free bottom sheet list (good for < 50 options). */
export function SelectField<V extends string>({
  label,
  value,
  options,
  onChange,
  error,
  disabled,
}: {
  label: string;
  value: V | '' | null | undefined;
  options: { value: V; label: string }[];
  onChange: (value: V) => void;
  error?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? t('common.select')}`}
        accessibilityState={{ disabled }}
      >
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            label={label}
            value={current?.label ?? ''}
            placeholder={t('common.select')}
            editable={false}
            disabled={disabled}
            error={Boolean(error)}
            right={<TextInput.Icon icon="menu-down" />}
            style={{ backgroundColor: 'white' }}
          />
        </View>
      </Pressable>
      {error ? <HelperText type="error">{error}</HelperText> : null}
      <BottomSheet visible={open} onDismiss={() => setOpen(false)} title={label}>
        {options.map((option) => (
          <List.Item
            key={option.value}
            title={option.label}
            onPress={() => {
              onChange(option.value);
              setOpen(false);
            }}
            left={(props) => (
              <List.Icon {...props} icon={option.value === value ? 'radiobox-marked' : 'radiobox-blank'} />
            )}
            accessibilityRole="radio"
            accessibilityState={{ checked: option.value === value }}
            style={{ minHeight: 48 }}
          />
        ))}
      </BottomSheet>
    </View>
  );
}
