import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Platform, Text, UIManager, View } from 'react-native';
import { Pressable } from '@/components/ui';
import { catalogService } from '@/services/catalogService';
import { useTheme } from '@/hooks/useTheme';
import type { StitchingTypeSummary } from '@/types/catalog';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface SpecializationChecklistProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  error?: string;
}

/** What a tailor is good at (bridal lehengas, sherwanis, saree falls, etc.),
 * collected as a real checklist against the live catalog instead of a free
 * text field - this is what broadcast routing strictly matches orders
 * against (see PUT /admin/tailors/{id}/specializations and
 * find_eligible_tailors on the backend), so it needs to map onto the exact
 * ServiceSubCategory ids orders are actually placed against, not a
 * human-typed string that can never be matched programmatically.
 *
 * Grouped by category (Men/Women/Kids/Alterations) with each group
 * collapsed by default so a long catalog doesn't turn this into an
 * overwhelming wall of checkboxes - matches the "collapsed optional
 * add-on" pattern already used elsewhere in this app's forms. */
export function SpecializationChecklist({ selectedIds, onChange, error }: SpecializationChecklistProps) {
  const { colors } = useTheme();
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['catalog', 'admin-tree', 'specialization-checklist'],
    queryFn: () => catalogService.getAdminTree(),
    staleTime: 5 * 60 * 1000,
  });

  const categories = useMemo(() => {
    return (data?.categories ?? [])
      .filter((c) => c.is_active)
      .map((c) => {
        // A service can live directly under a category or under one of its
        // service lines (e.g. "Shirts" line under "Men Clothing") - flatten
        // both into one list of selectable leaf services per category, same
        // as StitchingTypeSummary already represents both shapes uniformly.
        const fromLines = c.service_lines.flatMap((l) => l.stitching_types);
        const services = [...c.direct_services, ...fromLines].filter((s) => s.is_active);
        return { id: c.id, name: c.name, services };
      })
      .filter((c) => c.services.length > 0);
  }, [data]);

  const toggleCategory = (categoryId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const toggleService = (service: StitchingTypeSummary) => {
    const id = Number(service.service_id);
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedCountInCategory = (services: StitchingTypeSummary[]) =>
    services.filter((s) => selectedIds.includes(Number(s.service_id))).length;

  if (isLoading) {
    return (
      <View className="py-6 items-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="py-4">
        <Text className="text-sm mb-2" style={{ color: colors.error ?? '#dc2626' }}>
          Couldn't load the service catalog.
        </Text>
        <Pressable onPress={() => refetch()}>
          <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-semibold" style={{ color: colors.text }}>
          Specialization <Text style={{ color: colors.error ?? '#dc2626' }}>*</Text>
        </Text>
        <Text className="text-xs" style={{ color: colors.textMuted }}>
          {selectedIds.length} selected
        </Text>
      </View>
      <Text className="text-xs mb-3" style={{ color: colors.textMuted }}>
        Select every garment type this tailor is genuinely good at - orders are routed strictly to matching
        tailors first, so accuracy here directly affects order quality.
      </Text>

      {categories.map((category) => {
        const expanded = expandedCategoryIds.has(category.id);
        const count = selectedCountInCategory(category.services);
        return (
          <View
            key={category.id}
            className="mb-2 rounded-xl border overflow-hidden"
            style={{ borderColor: colors.border }}
          >
            <Pressable
              onPress={() => toggleCategory(category.id)}
              className="flex-row items-center justify-between px-3 py-2.5"
              style={{ backgroundColor: colors.card }}
            >
              <View className="flex-row items-center flex-1">
                <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                  {category.name}
                </Text>
                {count > 0 ? (
                  <View
                    className="ml-2 px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: colors.primaryLight }}
                  >
                    <Text className="text-[10px] font-bold" style={{ color: colors.primary }}>
                      {count}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textMuted}
              />
            </Pressable>

            {expanded ? (
              <View className="px-3 pb-2">
                {category.services.map((service) => {
                  const id = Number(service.service_id);
                  const checked = selectedIds.includes(id);
                  return (
                    <Pressable
                      key={service.service_id}
                      onPress={() => toggleService(service)}
                      className="flex-row items-center py-2"
                    >
                      <Ionicons
                        name={checked ? 'checkbox' : 'square-outline'}
                        size={19}
                        color={checked ? colors.primary : colors.textMuted}
                      />
                      <Text className="text-sm ml-2.5" style={{ color: colors.text }}>
                        {service.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}

      {error ? (
        <Text className="text-xs mt-1" style={{ color: colors.error ?? '#dc2626' }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
