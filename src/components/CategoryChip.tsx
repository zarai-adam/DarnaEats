import { Chip } from 'react-native-paper';
import { palette } from '@/theme';

export function CategoryChip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Chip
      icon={icon}
      selected={selected}
      showSelectedCheck={false}
      onPress={onPress}
      style={{
        backgroundColor: selected ? palette.terracotta : palette.white,
        borderColor: palette.border,
        borderWidth: 1,
        minHeight: 40,
        justifyContent: 'center',
      }}
      textStyle={{ color: selected ? palette.white : palette.text }}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      accessibilityLabel={label}
    >
      {label}
    </Chip>
  );
}
