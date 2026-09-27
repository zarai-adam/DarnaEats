import { useState } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { HelperText, TextInput, type TextInputProps } from 'react-native-paper';

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  numeric?: boolean;
  helper?: string;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'label' | 'error'>;

/** Keeps the raw text while typing decimals (e.g. "12.") and reports numbers upward. */
function NumericInput({
  value,
  onChange,
  ...rest
}: { value: unknown; onChange: (n: number) => void } & Omit<TextInputProps, 'value' | 'onChangeText'>) {
  const external = typeof value === 'number' && !Number.isNaN(value) ? String(value) : '';
  const [text, setText] = useState(external);
  const [lastExternal, setLastExternal] = useState(external);
  // Resync only when the form value changes from outside (e.g. form reset).
  if (external !== lastExternal) {
    setLastExternal(external);
    if (Number(text.replace(',', '.')) !== value) setText(external);
  }
  return (
    <TextInput
      {...rest}
      value={text}
      keyboardType="decimal-pad"
      onChangeText={(raw) => {
        const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
        setText(cleaned);
        onChange(cleaned === '' || cleaned === '.' ? Number.NaN : Number(cleaned));
      }}
    />
  );
}

/**
 * react-hook-form bound text input. Zod error messages are i18n keys, which
 * this component translates, so validation text is always localized.
 */
export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  numeric,
  helper,
  style,
  ...inputProps
}: Props<T>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => {
        const common = {
          mode: 'outlined' as const,
          label,
          onBlur,
          error: Boolean(error),
          accessibilityLabel: label,
          style: [{ backgroundColor: 'white' }, style],
          ...inputProps,
        };
        return (
          <View>
            {numeric ? (
              <NumericInput {...common} value={value} onChange={onChange} />
            ) : (
              <TextInput
                {...common}
                value={value === undefined || value === null ? '' : String(value)}
                onChangeText={onChange}
              />
            )}
            {error?.message || helper ? (
              <HelperText type={error ? 'error' : 'info'} visible accessibilityLiveRegion="polite">
                {error?.message ? t(error.message) : helper}
              </HelperText>
            ) : null}
          </View>
        );
      }}
    />
  );
}
