import { Text } from 'react-native';
import { BottomSheet, EmptyState, Pressable } from '@/components/ui';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import type { BridgeEmployeeListItem } from '@/types/orders';

/** Shared by both the pickup and delivery manual-assign actions - same
 * picker UI, different title/onAssign passed in by the parent screen.
 * Deliberately does NOT filter out offline employees (unlike
 * AssignTailorSheet's is_available filter): the whole point of this manual
 * override is to force an assignment when the automatic broadcast already
 * failed to find anyone, including because nobody was online - see
 * assign_bridge_service.py's _validate_employee_for_assignment on the
 * backend for the same reasoning. */
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
        employees.map((employee) => (
          <Pressable
            key={employee.employee_id}
            onPress={() => onAssign(employee.employee_id)}
            className="py-3 border-b"
            style={{ borderColor: colors.border }}
          >
            <Text className="font-semibold" style={{ color: colors.text }}>
              {employee.full_name || `Employee #${employee.employee_id}`}
            </Text>
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              {employee.is_online ? t('assignBridgeEmployee.online') : t('assignBridgeEmployee.offline')}
            </Text>
          </Pressable>
        ))
      )}
    </BottomSheet>
  );
};
