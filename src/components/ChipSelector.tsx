import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, Text } from 'react-native-paper';
import { palette, spacing } from '@/theme';

interface Option<V extends string> {
  value: V;
  label: string;
}

/** Accessible multi- or single-select chip group. */
export function ChipSelector<V extends string>({
  label,
  options,
  selected,
  onChange,
  multiple = true,
  error,
}: {
  label?: string;
  options: Option<V>[];
  selected: V[];
  onChange: (next: V[]) => void;
  multiple?: boolean;
  error?: string;
}) {
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="titleSmall" accessibilityRole="header">
          {label}
        </Text>
      ) : null}
      <View style={styles.row}>
        {options.map((option) => {
          const isOn = selected.includes(option.value);
          return (
            <Chip
              key={option.value}
              selected={isOn}
              onPress={() => {
                if (!multiple) return onChange([option.value]);
                return onChange(isOn ? selected.filter((v) => v !== option.value) : [...selected, option.value]);
              }}
              style={[styles.chip, isOn && styles.chipOn]}
              textStyle={isOn ? styles.textOn : undefined}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: isOn }}
              accessibilityLabel={option.label}
            >
              {option.label}
            </Chip>
          );
        })}
      </View>
      {error ? <HelperText type="error">{error}</HelperText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: '#E3E8CF', borderColor: palette.olive },
  textOn: { color: palette.oliveDark },
});
