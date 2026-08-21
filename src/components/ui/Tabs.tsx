import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useTheme } from '@/hooks/useTheme';

export interface TabItem {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}

// Horizontal scrollable segmented-control-style tab bar for multi-tab detail
// screens (Tailor Detail, and any future screen needing the same pattern —
// see BMD-Admin web's WorkspaceHero tabs, which this mirrors).
export const Tabs = ({ tabs, activeTab, onChange }: TabsProps) => {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="flex-row"
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 10 }}
      style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            haptic="selection"
            className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full"
            style={{ backgroundColor: active ? colors.primary : colors.background }}
          >
            {tab.icon ? (
              <Ionicons name={tab.icon} size={14} color={active ? '#fff' : colors.textSecondary} />
            ) : null}
            <Text
              className="text-xs font-semibold"
              style={{ color: active ? '#fff' : colors.textSecondary }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};
