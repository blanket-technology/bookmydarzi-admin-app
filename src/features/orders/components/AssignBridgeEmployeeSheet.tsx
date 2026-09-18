import { Text } from 'react-native';
import { BottomSheet, EmptyState, Pressable } from '@/components/ui';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import type { BridgeEmployeeListItem } from '@/types/orders';

/** Shared by both the pickup and delivery manual-assign actions - same
 * picker UI, different title/onAssign passed in by the parent screen.
 * Offline employees are shown (so staff can see the full team) but disabled
 * - the backend's assign_bridge_service._validate_employee_for_assignment
 * hard-rejects assigning someone offline, so selecting them here would only
 * fail server-side; disabling them up front avoids that dead-end tap. */
export const AssignBridgeEmployeeSheet = ({
  visible,
  onClose,
  title,
  employees,
  onAssign,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  employees: BridgeEmployeeListItem[];
  onAssign: (employeeId: string) => void;
}) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      {employees.length === 0 ? (
        <EmptyState
          icon="bicycle-outline"
          title={t('assignBridgeEmployee.noEmployees')}
          description={t('assignBridgeEmployee.noEmployeesBody')}
        />
      ) : (
        employees.map((employee) => {
          const offline = !employee.is_online;
          return (
            <Pressable
              key={employee.employee_id}
              onPress={() => {
                if (offline) return;
                onAssign(employee.employee_id);
              }}
              disabled={offline}
              className="py-3 border-b"
              style={{ borderColor: colors.border, opacity: offline ? 0.45 : 1 }}
            >
              <Text className="font-semibold" style={{ color: colors.text }}>
                {employee.full_name || `Employee #${employee.employee_id}`}
              </Text>
              <Text className="text-sm" style={{ color: colors.textSecondary }}>
                {offline ? t('assignBridgeEmployee.offline') : t('assignBridgeEmployee.online')}
              </Text>
            </Pressable>
          );
        })
      )}
    </BottomSheet>
  );
};
