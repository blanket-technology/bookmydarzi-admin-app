import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Fragment, useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { Badge, BottomSheet, Button, Card, ConfirmModal, EmptyState, Header, Input, Loader, Pressable } from '@/components/ui';
import {
  useCatalogTree,
  useCreateCategoryMutation,
  useCreateServiceLineMutation,
  useCreateServiceMutation,
  useDeleteCategoryMutation,
  useDeleteServiceLineMutation,
  useDeleteServiceMutation,
  useUpdateCategoryMutation,
  useUpdateServiceLineMutation,
  useUpdateServiceMutation,
  useUploadCatalogImageMutation,
} from '@/features/catalog/hooks/useCatalog';
import { ServiceAddonsManagerSheet } from '@/features/catalog/components/ServiceAddonsManagerSheet';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { toast } from '@/store/toastStore';
import type { CategoryTree, ServiceLineTree, StitchingTypeSummary } from '@/types/catalog';
import { formatApiErrorDetail, formatCurrency } from '@/utils/errors';
import { optionalText } from '@/utils/forms';
import { requireAmountInput } from '@/utils/money';

type SheetKind = 'category' | 'service_line' | 'service' | null;

const CATEGORY_FORM = { name: '', description: '', image_url: '', display_order: '0', is_active: true };
const LINE_FORM = { name: '', description: '', image_url: '', display_order: '0', is_active: true, group_label: '' };
const SERVICE_FORM = {
  name: '',
  description: '',
  image_url: '',
  base_price: '0',
  // Delivery time is either whole days (most services) or, for a rush
  // alteration, a handful of hours (6hr/12hr) - only one is ever active;
  // deliveryUnit tracks which the form shows/submits.
  deliveryUnit: 'days' as 'days' | 'hours',
  estimated_delivery_days: '7',
  estimated_delivery_hours: '6',
  display_order: '0',
  is_premium: false,
  is_active: true,
  alteration_group: null as 'repair' | 'resize' | 'restyle' | null,
};

export default function CatalogScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const { data, isLoading, isError, error, refetch } = useCatalogTree();
  const uploadImageMutation = useUploadCatalogImageMutation();

  const createCategoryMutation = useCreateCategoryMutation();
  const updateCategoryMutation = useUpdateCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();
  const createLineMutation = useCreateServiceLineMutation();
  const updateLineMutation = useUpdateServiceLineMutation();
  const deleteLineMutation = useDeleteServiceLineMutation();
  const createServiceMutation = useCreateServiceMutation();
  const updateServiceMutation = useUpdateServiceMutation();
  const deleteServiceMutation = useDeleteServiceMutation();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sheetKind, setSheetKind] = useState<SheetKind>(null);
  const [categoryForm, setCategoryForm] = useState(CATEGORY_FORM);
  const [editingCategory, setEditingCategory] = useState<CategoryTree | null>(null);
  const [lineForm, setLineForm] = useState(LINE_FORM);
  const [editingLine, setEditingLine] = useState<ServiceLineTree | null>(null);
  const [lineParentCategoryId, setLineParentCategoryId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState(SERVICE_FORM);
  const [editingService, setEditingService] = useState<StitchingTypeSummary | null>(null);
  const [serviceParentCategoryId, setServiceParentCategoryId] = useState<string | null>(null);
  const [serviceParentCategoryName, setServiceParentCategoryName] = useState<string | null>(null);
  const [serviceParentLineId, setServiceParentLineId] = useState<string | null>(null);
  // Repair/Resize/Restyle grouping only means anything for a service under
  // Custom Alterations - every other category's services are a stitching
  // tier or product variant, not alteration work on an existing garment.
  const isAlterationsCategory = serviceParentCategoryName === 'Custom Alterations';

  const [addonsManagerVisible, setAddonsManagerVisible] = useState(false);

  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<CategoryTree | null>(null);
  const [deleteLineTarget, setDeleteLineTarget] = useState<ServiceLineTree | null>(null);
  const [deleteServiceTarget, setDeleteServiceTarget] = useState<StitchingTypeSummary | null>(null);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pickAndUploadImage = async (onDone: (url: string) => void) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Photo library permission is required');
      return;
    }
    // allowsEditing + aspect [1,1]: forces the OS's native crop UI to a
    // square before upload, matching the website catalog card's own
    // aspect-square rendering - without this, a wide source image (e.g. an
    // infographic-style banner) got silently cropped by the browser at
    // display time with no way for admin to control which part survived.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    uploadImageMutation.mutate(
      { uri: asset.uri, fileName: asset.fileName ?? undefined, mimeType: asset.mimeType ?? 'image/jpeg' },
      { onSuccess: (res) => onDone(res.url) },
    );
  };

  // ── Category handlers ──────────────────────────────────────────────────
  const openNewCategory = () => {
    setEditingCategory(null);
    setCategoryForm(CATEGORY_FORM);
    setSheetKind('category');
  };
  const openEditCategory = (category: CategoryTree) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description ?? '',
      image_url: category.image_url ?? '',
      display_order: String(category.display_order),
      is_active: category.is_active,
    });
    setSheetKind('category');
  };
  const handleSaveCategory = () => {
    if (!categoryForm.name.trim()) return;
    const payload = {
      name: categoryForm.name.trim(),
      description: optionalText(categoryForm.description, !!editingCategory),
      image_url: optionalText(categoryForm.image_url, !!editingCategory),
      display_order: Math.max(0, Number(categoryForm.display_order) || 0),
      is_active: categoryForm.is_active,
    };
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, payload }, { onSuccess: () => setSheetKind(null) });
    } else {
      createCategoryMutation.mutate(payload, { onSuccess: () => setSheetKind(null) });
    }
  };

  // ── Service line handlers ──────────────────────────────────────────────
  const openNewLine = (categoryId: string) => {
    setEditingLine(null);
    setLineParentCategoryId(categoryId);
    setLineForm(LINE_FORM);
    setSheetKind('service_line');
  };
  const openEditLine = (categoryId: string, line: ServiceLineTree) => {
    setEditingLine(line);
    setLineParentCategoryId(categoryId);
    setLineForm({
      name: line.name,
      description: line.description ?? '',
      image_url: line.image_url ?? '',
      display_order: String(line.display_order),
      is_active: line.is_active,
      group_label: line.group_label ?? '',
    });
    setSheetKind('service_line');
  };
  const handleSaveLine = () => {
    if (!lineForm.name.trim() || !lineParentCategoryId) return;
    const payload = {
      name: lineForm.name.trim(),
      category_id: lineParentCategoryId,
      description: optionalText(lineForm.description, !!editingLine),
      image_url: optionalText(lineForm.image_url, !!editingLine),
      display_order: Math.max(0, Number(lineForm.display_order) || 0),
      is_active: lineForm.is_active,
      group_label: optionalText(lineForm.group_label, !!editingLine),
    };
    if (editingLine) {
      updateLineMutation.mutate({ id: editingLine.id, payload }, { onSuccess: () => setSheetKind(null) });
    } else {
      createLineMutation.mutate(payload, { onSuccess: () => setSheetKind(null) });
    }
  };

  // ── Service handlers ────────────────────────────────────────────────────
  const openNewService = (categoryId: string, categoryName: string, lineId: string | null) => {
    setEditingService(null);
    setServiceParentCategoryId(categoryId);
    setServiceParentCategoryName(categoryName);
    setServiceParentLineId(lineId);
    setServiceForm(SERVICE_FORM);
    setSheetKind('service');
  };
  const openEditService = (categoryId: string, categoryName: string, lineId: string | null, service: StitchingTypeSummary) => {
    setEditingService(service);
    setServiceParentCategoryId(categoryId);
    setServiceParentCategoryName(categoryName);
    setServiceParentLineId(lineId);
    setServiceForm({
      name: service.name,
      description: service.description ?? '',
      image_url: service.image_url ?? '',
      base_price: String(service.base_price),
      deliveryUnit: service.estimated_delivery_hours ? 'hours' : 'days',
      estimated_delivery_days: String(service.estimated_delivery_days),
      estimated_delivery_hours: String(service.estimated_delivery_hours ?? 6),
      display_order: String(service.display_order),
      is_premium: service.is_premium,
      is_active: service.is_active,
      alteration_group: service.alteration_group ?? null,
    });
    setSheetKind('service');
  };
  const handleSaveService = () => {
    if (!serviceForm.name.trim() || !serviceParentCategoryId) return;
    // A blank or garbled price used to become 0 and create an active Rs 0 service.
    const price = requireAmountInput(serviceForm.base_price);
    if (!price || price.value === undefined) {
      if (price) toast.error('Enter the service price.');
      return;
    }
    const payload = {
      name: serviceForm.name.trim(),
      category_id: serviceParentCategoryId,
      service_line_id: serviceParentLineId ?? undefined,
      description: optionalText(serviceForm.description, !!editingService),
      image_url: optionalText(serviceForm.image_url, !!editingService),
      // The backend stores whole rupees.
      base_price: Math.round(price.value),
      estimated_delivery_days: Math.max(1, Number(serviceForm.estimated_delivery_days) || 7),
      // Only one of these is ever meaningful - the backend treats hours as
      // taking precedence over days whenever set (eta_service.py), so
      // switching back to "Days" mode explicitly sends hours=null to clear
      // any previously-set rush turnaround.
      estimated_delivery_hours:
        serviceForm.deliveryUnit === 'hours' ? Math.max(1, Number(serviceForm.estimated_delivery_hours) || 6) : null,
      display_order: Math.max(0, Number(serviceForm.display_order) || 0),
      is_premium: serviceForm.is_premium,
      is_active: serviceForm.is_active,
      alteration_group: isAlterationsCategory ? serviceForm.alteration_group : null,
    };
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.service_id, payload }, { onSuccess: () => setSheetKind(null) });
    } else {
      createServiceMutation.mutate(payload, { onSuccess: () => setSheetKind(null) });
    }
  };

  const categories = data?.categories ?? [];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Catalog"
        subtitle={`${categories.length} categories`}
        rightAction={
          <Pressable
            onPress={openNewCategory}
            hitSlop={8}
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-xl font-bold" style={{ color: colors.onPrimary }}>+</Text>
          </Pressable>
        }
      />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        {isLoading ? (
          <Loader message="Loading catalog..." />
        ) : isError ? (
          <EmptyState title="Failed to load catalog" description={formatApiErrorDetail(error)} actionLabel="Retry" onAction={() => refetch()} />
        ) : categories.length === 0 ? (
          <EmptyState icon="pricetags-outline" title="No categories yet" />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {categories.map((category) => {
              const isOpen = expanded.has(category.id);
              return (
                <Card key={category.id} className="mb-3">
                  <Pressable onPress={() => toggleExpand(category.id)} className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                      <Text className="font-bold ml-2" style={{ color: colors.text }}>
                        {category.name}
                      </Text>
                      {!category.is_active ? (
                        <Badge label="Inactive" backgroundColor="#fee2e2" color="#dc2626" />
                      ) : null}
                    </View>
                    <View className="flex-row" style={{ gap: 10 }}>
                      <Pressable onPress={() => openEditCategory(category)} hitSlop={8}>
                        <Ionicons name="create-outline" size={18} color={colors.primary} />
                      </Pressable>
                      <Pressable onPress={() => setDeleteCategoryTarget(category)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      </Pressable>
                    </View>
                  </Pressable>

                  {isOpen ? (
                    <View className="mt-3 pl-4 border-l" style={{ borderColor: colors.border }}>
                      {category.service_lines.map((line) => (
                        <View key={line.id} className="mb-3">
                          <View className="flex-row items-center justify-between">
                            <Text className="font-semibold text-sm" style={{ color: colors.text }}>
                              {line.name}
                            </Text>
                            <View className="flex-row" style={{ gap: 10 }}>
                              <Pressable onPress={() => openEditLine(category.id, line)} hitSlop={8}>
                                <Ionicons name="create-outline" size={15} color={colors.primary} />
                              </Pressable>
                              <Pressable onPress={() => setDeleteLineTarget(line)} hitSlop={8}>
                                <Ionicons name="trash-outline" size={15} color={colors.error} />
                              </Pressable>
                            </View>
                          </View>
                          {line.stitching_types.map((service) => (
                            <Pressable
                              key={service.service_id}
                              onPress={() => openEditService(category.id, category.name, line.id, service)}
                              className="flex-row items-center justify-between py-2 pl-3"
                            >
                              <Text className="text-sm flex-1" style={{ color: colors.textSecondary }}>
                                {service.name}
                              </Text>
                              <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                                {formatCurrency(service.base_price)}
                              </Text>
                            </Pressable>
                          ))}
                          <Pressable onPress={() => openNewService(category.id, category.name, line.id)} className="pl-3 py-1">
                            <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                              + Add Service
                            </Text>
                          </Pressable>
                        </View>
                      ))}

                      {category.direct_services.length > 0 ? (
                        <View className="mb-2">
                          <Text className="text-xs font-semibold uppercase mb-1" style={{ color: colors.textMuted }}>
                            Direct Services
                          </Text>
                          {category.direct_services.map((service) => (
                            <Pressable
                              key={service.service_id}
                              onPress={() => openEditService(category.id, category.name, null, service)}
                              className="flex-row items-center justify-between py-2"
                            >
                              <Text className="text-sm flex-1" style={{ color: colors.textSecondary }}>
                                {service.name}
                              </Text>
                              <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                                {formatCurrency(service.base_price)}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}

                      <View className="flex-row mt-1" style={{ gap: 16 }}>
                        <Pressable onPress={() => openNewLine(category.id)}>
                          <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                            + Add Service Line
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => openNewService(category.id, category.name, null)}>
                          <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                            + Add Direct Service
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </Card>
              );
            })}
            <View className="mb-6" />
          </ScrollView>
        )}
      </View>

      {/* Category sheet */}
      <BottomSheet
        visible={sheetKind === 'category'}
        onClose={() => setSheetKind(null)}
        title={editingCategory ? 'Edit Category' : 'New Category'}
        footer={
          <Button
            title={editingCategory ? 'Save Changes' : 'Create Category'}
            onPress={handleSaveCategory}
            loading={createCategoryMutation.isPending || updateCategoryMutation.isPending}
            disabled={!categoryForm.name.trim()}
            fullWidth
          />
        }
      >
        <Input label="Name" value={categoryForm.name} onChangeText={(t) => setCategoryForm((f) => ({ ...f, name: t }))} />
        <Input label="Description" value={categoryForm.description} onChangeText={(t) => setCategoryForm((f) => ({ ...f, description: t }))} multiline />
        <Input label="Image URL" value={categoryForm.image_url} onChangeText={(t) => setCategoryForm((f) => ({ ...f, image_url: t }))} autoCapitalize="none" />
        <Button
          title="Upload Image"
          variant="outline"
          className="mb-4"
          loading={uploadImageMutation.isPending}
          onPress={() => pickAndUploadImage((url) => setCategoryForm((f) => ({ ...f, image_url: url })))}
          fullWidth
        />
        <Input label="Display Order" value={categoryForm.display_order} onChangeText={(t) => setCategoryForm((f) => ({ ...f, display_order: t }))} keyboardType="number-pad" />
        <View className="flex-row items-center justify-between mb-4">
          <Text style={{ color: colors.text }}>Active</Text>
          <Switch value={categoryForm.is_active} onValueChange={(v) => setCategoryForm((f) => ({ ...f, is_active: v }))} trackColor={{ true: colors.primary }} />
        </View>
      </BottomSheet>

      {/* Service line sheet */}
      <BottomSheet
        visible={sheetKind === 'service_line'}
        onClose={() => setSheetKind(null)}
        title={editingLine ? 'Edit Service Line' : 'New Service Line'}
        footer={
          <Button
            title={editingLine ? 'Save Changes' : 'Create Service Line'}
            onPress={handleSaveLine}
            loading={createLineMutation.isPending || updateLineMutation.isPending}
            disabled={!lineForm.name.trim()}
            fullWidth
          />
        }
      >
        <Input label="Name" value={lineForm.name} onChangeText={(t) => setLineForm((f) => ({ ...f, name: t }))} />
        <Input label="Description" value={lineForm.description} onChangeText={(t) => setLineForm((f) => ({ ...f, description: t }))} multiline />
        <Input
          label="Group (optional)"
          value={lineForm.group_label}
          onChangeText={(t) => setLineForm((f) => ({ ...f, group_label: t }))}
          placeholder="e.g. Men, Women, Kids"
        />
        <Input label="Image URL" value={lineForm.image_url} onChangeText={(t) => setLineForm((f) => ({ ...f, image_url: t }))} autoCapitalize="none" />
        <Button
          title="Upload Image"
          variant="outline"
          className="mb-4"
          loading={uploadImageMutation.isPending}
          onPress={() => pickAndUploadImage((url) => setLineForm((f) => ({ ...f, image_url: url })))}
          fullWidth
        />
        <Input label="Display Order" value={lineForm.display_order} onChangeText={(t) => setLineForm((f) => ({ ...f, display_order: t }))} keyboardType="number-pad" />
        <View className="flex-row items-center justify-between mb-4">
          <Text style={{ color: colors.text }}>Active</Text>
          <Switch value={lineForm.is_active} onValueChange={(v) => setLineForm((f) => ({ ...f, is_active: v }))} trackColor={{ true: colors.primary }} />
        </View>
      </BottomSheet>

      {/* Service sheet */}
      <BottomSheet
        visible={sheetKind === 'service'}
        onClose={() => setSheetKind(null)}
        title={editingService ? 'Edit Service' : 'New Service'}
        footer={
          <Fragment>
            <Button
              title={editingService ? 'Save Changes' : 'Create Service'}
              onPress={handleSaveService}
              loading={createServiceMutation.isPending || updateServiceMutation.isPending}
              disabled={!serviceForm.name.trim()}
              fullWidth
            />
            {editingService ? (
              <Button
                title="Manage Add-ons"
                variant="outline"
                className="mt-3"
                onPress={() => setAddonsManagerVisible(true)}
                fullWidth
              />
            ) : null}
          </Fragment>
        }
      >
        <Input label="Name" value={serviceForm.name} onChangeText={(t) => setServiceForm((f) => ({ ...f, name: t }))} />
        <Input label="Description" value={serviceForm.description} onChangeText={(t) => setServiceForm((f) => ({ ...f, description: t }))} multiline />
        <Input label="Image URL" value={serviceForm.image_url} onChangeText={(t) => setServiceForm((f) => ({ ...f, image_url: t }))} autoCapitalize="none" />
        <Button
          title="Upload Image"
          variant="outline"
          className="mb-4"
          loading={uploadImageMutation.isPending}
          onPress={() => pickAndUploadImage((url) => setServiceForm((f) => ({ ...f, image_url: url })))}
          fullWidth
        />
        <Input label="Base Price (₹)" value={serviceForm.base_price} onChangeText={(t) => setServiceForm((f) => ({ ...f, base_price: t }))} keyboardType="number-pad" />
        <View className="mb-4">
          <Text className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
            Delivery Time
          </Text>
          <View className="flex-row" style={{ gap: 8 }}>
            {(['days', 'hours'] as const).map((unit) => {
              const selected = serviceForm.deliveryUnit === unit;
              return (
                <Pressable
                  key={unit}
                  onPress={() => setServiceForm((f) => ({ ...f, deliveryUnit: unit }))}
                  className="px-4 py-2.5 rounded-xl border items-center"
                  style={{
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primary : colors.surface,
                  }}
                >
                  <Text
                    className="text-xs font-semibold capitalize"
                    style={{ color: selected ? colors.onPrimary : colors.textSecondary }}
                  >
                    {unit}
                  </Text>
                </Pressable>
              );
            })}
            <View className="flex-1">
              {serviceForm.deliveryUnit === 'hours' ? (
                <Input
                  value={serviceForm.estimated_delivery_hours}
                  onChangeText={(t) => setServiceForm((f) => ({ ...f, estimated_delivery_hours: t }))}
                  keyboardType="number-pad"
                  placeholder="e.g. 6, 12, 24"
                />
              ) : (
                <Input
                  value={serviceForm.estimated_delivery_days}
                  onChangeText={(t) => setServiceForm((f) => ({ ...f, estimated_delivery_days: t }))}
                  keyboardType="number-pad"
                />
              )}
            </View>
          </View>
          <Text className="text-xs mt-1.5" style={{ color: colors.textSecondary }}>
            {serviceForm.deliveryUnit === 'hours'
              ? 'Rush turnaround (e.g. a 6-hour alteration) - shown to the customer as a same-day ETA.'
              : 'Whole-day turnaround, used for most services.'}
          </Text>
        </View>
        <Input label="Display Order" value={serviceForm.display_order} onChangeText={(t) => setServiceForm((f) => ({ ...f, display_order: t }))} keyboardType="number-pad" />
        {isAlterationsCategory ? (
          <View className="mb-4">
            <Text className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
              Alteration Type
            </Text>
            <View className="flex-row" style={{ gap: 8 }}>
              {(['repair', 'resize', 'restyle'] as const).map((group) => {
                const selected = serviceForm.alteration_group === group;
                return (
                  <Pressable
                    key={group}
                    onPress={() => setServiceForm((f) => ({ ...f, alteration_group: selected ? null : group }))}
                    className="flex-1 py-2.5 rounded-xl border items-center"
                    style={{
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary : colors.surface,
                    }}
                  >
                    <Text
                      className="text-xs font-semibold capitalize"
                      style={{ color: selected ? colors.onPrimary : colors.textSecondary }}
                    >
                      {group}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="text-xs mt-1.5" style={{ color: colors.textMuted }}>
              Controls which group this shows under on the customer app and website. Tap again to clear.
            </Text>
          </View>
        ) : null}
        <View className="flex-row items-center justify-between mb-2">
          <Text style={{ color: colors.text }}>Premium</Text>
          <Switch value={serviceForm.is_premium} onValueChange={(v) => setServiceForm((f) => ({ ...f, is_premium: v }))} trackColor={{ true: colors.primary }} />
        </View>
        <View className="flex-row items-center justify-between mb-4">
          <Text style={{ color: colors.text }}>Active</Text>
          <Switch value={serviceForm.is_active} onValueChange={(v) => setServiceForm((f) => ({ ...f, is_active: v }))} trackColor={{ true: colors.primary }} />
        </View>
      </BottomSheet>

      <ServiceAddonsManagerSheet
        visible={addonsManagerVisible}
        onClose={() => setAddonsManagerVisible(false)}
        serviceId={editingService?.service_id ?? null}
        serviceName={editingService?.name ?? ''}
      />

      <ConfirmModal
        visible={!!deleteCategoryTarget}
        title="Deactivate Category"
        message={`Deactivate "${deleteCategoryTarget?.name}"? This also deactivates all its service lines and services.`}
        confirmLabel="Deactivate"
        loading={deleteCategoryMutation.isPending}
        onConfirm={() => { if (deleteCategoryTarget) deleteCategoryMutation.mutate(deleteCategoryTarget.id); setDeleteCategoryTarget(null); }}
        onCancel={() => setDeleteCategoryTarget(null)}
      />
      <ConfirmModal
        visible={!!deleteLineTarget}
        title="Deactivate Service Line"
        message={`Deactivate "${deleteLineTarget?.name}"? This also deactivates its services.`}
        confirmLabel="Deactivate"
        loading={deleteLineMutation.isPending}
        onConfirm={() => { if (deleteLineTarget) deleteLineMutation.mutate(deleteLineTarget.id); setDeleteLineTarget(null); }}
        onCancel={() => setDeleteLineTarget(null)}
      />
      <ConfirmModal
        visible={!!deleteServiceTarget}
        title="Deactivate Service"
        message={`Deactivate "${deleteServiceTarget?.name}"?`}
        confirmLabel="Deactivate"
        loading={deleteServiceMutation.isPending}
        onConfirm={() => { if (deleteServiceTarget) deleteServiceMutation.mutate(deleteServiceTarget.service_id); setDeleteServiceTarget(null); }}
        onCancel={() => setDeleteServiceTarget(null)}
      />
    </View>
  );
}
