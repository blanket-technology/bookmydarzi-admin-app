import type {
  AdminDashboardApiResponse,
  AdminDashboardEmployees,
  AdminDashboardOrders,
  AdminDashboardPayments,
  AdminDashboardRevenue,
  AdminDashboardTailors,
  AdminDashboardUsers,
  DashboardAssignmentItem,
  DashboardCustomerItem,
  DashboardOrderItem,
  DashboardResponse,
  DashboardStats,
  DashboardTailorItem,
  RevenueChartPoint,
} from '@/types/dashboard';
import { formatCurrency } from '@/utils/errors';

export interface DashboardStatItem {
  title: string;
  value: string | number;
  icon:
    | 'receipt-outline'
    | 'time-outline'
    | 'wallet-outline'
    | 'people-outline'
    | 'cut-outline'
    | 'briefcase-outline'
    | 'checkmark-circle-outline'
    | 'pulse-outline';
  color: string;
}

const EMPTY_PLACEHOLDER = '--';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const num = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const formatCount = (value: number | undefined): string | number =>
  value === undefined ? EMPTY_PLACEHOLDER : value;

const formatMoney = (value: number | undefined): string =>
  value === undefined ? EMPTY_PLACEHOLDER : formatCurrency(value);

const hasAdminDashboardFields = (obj: Record<string, unknown>) =>
  Boolean(obj.users ?? obj.orders ?? obj.revenue ?? obj.payments);

const hasLegacyDashboardFields = (obj: Record<string, unknown>) =>
  Boolean(
    obj.statistics ??
      obj.stats ??
      obj.welcome ??
      ((Array.isArray(obj.recent_orders) && obj.recent_orders.length > 0) ||
        (Array.isArray(obj.revenue_chart) && obj.revenue_chart.length > 0)),
  );

/** Unwrap common API envelope shapes onto a single dashboard payload object. */
export const unwrapDashboardPayload = (raw: unknown): Record<string, unknown> | null => {
  if (raw == null) return null;
  if (!isRecord(raw)) return null;

  if (hasAdminDashboardFields(raw) || hasLegacyDashboardFields(raw)) {
    return raw;
  }

  const firstLevel = raw.data ?? raw.results ?? raw.dashboard ?? raw.payload;
  if (isRecord(firstLevel)) {
    if (hasAdminDashboardFields(firstLevel) || hasLegacyDashboardFields(firstLevel)) {
      return firstLevel;
    }

    const secondLevel = firstLevel.data ?? firstLevel.results ?? firstLevel.dashboard;
    if (isRecord(secondLevel)) {
      return secondLevel;
    }

    return firstLevel;
  }

  return raw;
};

const parseUsers = (source: unknown): AdminDashboardUsers | undefined => {
  if (!isRecord(source)) return undefined;
  return {
    total: num(source.total),
    active: num(source.active),
  };
};

const parseEmployees = (source: unknown): AdminDashboardEmployees | undefined => {
  if (!isRecord(source)) return undefined;
  return {
    total: num(source.total),
    active: num(source.active),
  };
};

const parseOrders = (source: unknown): AdminDashboardOrders | undefined => {
  if (!isRecord(source)) return undefined;
  const byStatusRaw = source.by_status;
  const by_status: Record<string, number> | undefined = isRecord(byStatusRaw)
    ? Object.fromEntries(
        Object.entries(byStatusRaw).map(([k, v]) => [k, num(v) ?? 0]),
      )
    : undefined;
  return {
    total: num(source.total),
    today: num(source.today),
    pending: num(source.pending),
    pending_assignment: num(source.pending_assignment),
    pending_pickup: num(source.pending_pickup),
    out_for_delivery: num(source.out_for_delivery),
    delivered: num(source.delivered),
    cancelled: num(source.cancelled),
    by_status,
  };
};

const parseRevenue = (source: unknown): AdminDashboardRevenue | undefined => {
  if (!isRecord(source)) return undefined;
  return {
    total: num(source.total),
    today: num(source.today),
    this_week: num(source.this_week),
    this_month: num(source.this_month),
    online: num(source.online),
    cod: num(source.cod),
  };
};

const parsePayments = (source: unknown): AdminDashboardPayments | undefined => {
  if (!isRecord(source)) return undefined;
  return {
    successful: num(source.successful),
  };
};

const parseTailors = (source: unknown): AdminDashboardTailors | undefined => {
  if (!isRecord(source)) return undefined;
  return {
    active: num(source.active),
    available: num(source.available),
    busy: num(source.busy),
  };
};

const buildStatisticsFromApi = (api: AdminDashboardApiResponse): DashboardStats => ({
  total_orders: api.orders?.total,
  pending_orders: api.orders?.pending,
  completed_orders: api.orders?.delivered,
  total_users: api.users?.total,
  total_customers: api.users?.total,
  total_employees: api.employees?.total,
  total_revenue: api.revenue?.total,
  monthly_revenue: api.revenue?.this_month,
  revenue: api.revenue?.total,
});

export const buildRevenueChartData = (
  revenue?: AdminDashboardRevenue,
): RevenueChartPoint[] => {
  if (!revenue) return [];

  const points: RevenueChartPoint[] = [
    { label: 'Today', value: revenue.today ?? 0 },
    { label: 'Week', value: revenue.this_week ?? 0 },
    { label: 'Month', value: revenue.this_month ?? 0 },
    { label: 'Total', value: revenue.total ?? 0 },
  ];

  return points.some((point) => point.value > 0) ? points : points;
};

export const normalizeDashboardResponse = (raw: unknown): DashboardResponse => {
  const payload = unwrapDashboardPayload(raw);

  if (!payload) {
    return {
      users: undefined,
      orders: undefined,
      revenue: undefined,
      payments: undefined,
      statistics: {},
      stats: {},
      revenue_chart: [],
      pending_orders: [],
      recent_orders: [],
      priority_assignments: [],
      latest_customers: [],
      active_tailors: [],
      active_tailors_list: [],
    };
  }

  const users = parseUsers(payload.users);
  const employees = parseEmployees(payload.employees);
  const orders = parseOrders(payload.orders);
  const revenue = parseRevenue(payload.revenue);
  const payments = parsePayments(payload.payments);
  const tailors = parseTailors(payload.tailors);

  const apiResponse: AdminDashboardApiResponse = {
    users,
    employees,
    orders,
    revenue,
    payments,
    tailors,
  };
  const statistics = buildStatisticsFromApi(apiResponse);

  const pendingOrdersField = payload.pending_orders;
  const pending_orders: DashboardOrderItem[] = Array.isArray(pendingOrdersField)
    ? asArray<DashboardOrderItem>(pendingOrdersField)
    : asArray<DashboardOrderItem>(payload.pending_orders_list);

  const activeTailorsField = payload.active_tailors;
  const active_tailors: DashboardTailorItem[] = Array.isArray(activeTailorsField)
    ? asArray<DashboardTailorItem>(activeTailorsField)
    : asArray<DashboardTailorItem>(payload.active_tailors_list);

  const welcome = isRecord(payload.welcome)
    ? {
        admin_name:
          typeof payload.welcome.admin_name === 'string'
            ? payload.welcome.admin_name
            : undefined,
        greeting:
          typeof payload.welcome.greeting === 'string' ? payload.welcome.greeting : undefined,
      }
    : undefined;

  const revenue_chart =
    users || orders || revenue || payments
      ? buildRevenueChartData(revenue)
      : asArray<RevenueChartPoint>(payload.revenue_chart ?? payload.revenue_trend);

  return {
    ...apiResponse,
    welcome,
    statistics,
    stats: statistics,
    revenue_chart,
    pending_orders,
    recent_orders: asArray<DashboardOrderItem>(payload.recent_orders),
    priority_assignments: asArray<DashboardAssignmentItem>(payload.priority_assignments),
    latest_customers: asArray<DashboardCustomerItem>(
      payload.latest_customers ?? payload.customers,
    ),
    active_tailors,
    active_tailors_list: active_tailors,
  };
};

export const isDashboardResponseValid = (raw: unknown): boolean => {
  const payload = unwrapDashboardPayload(raw);
  if (!payload) return false;
  return hasAdminDashboardFields(payload) || hasLegacyDashboardFields(payload);
};

/**
 * Maps existing stat cards to the admin dashboard API fields.
 * `includeRevenue` — revenue is financial data restricted to superadmin;
 * pass false to omit the Revenue card for the plain admin role.
 */
export const parseDashboardStats = (
  data?: DashboardResponse | null,
  includeRevenue = true,
): DashboardStatItem[] => {
  const users = data?.users;
  const employees = data?.employees;
  const orders = data?.orders;
  const revenue = data?.revenue;
  const tailors = data?.tailors;

  const cards: DashboardStatItem[] = [
    {
      title: 'Total Orders',
      value: formatCount(orders?.total),
      icon: 'receipt-outline',
      color: '#8b5cf6',
    },
    {
      title: "Today's Orders",
      value: formatCount(orders?.today),
      icon: 'pulse-outline',
      color: '#f59e0b',
    },
    {
      title: 'Total Users',
      value: formatCount(users?.total),
      icon: 'people-outline',
      color: '#3b82f6',
    },
    {
      title: 'Active Tailors',
      value: formatCount(tailors?.active),
      icon: 'cut-outline',
      color: '#ec4899',
    },
    {
      title: 'Total Employees',
      value: formatCount(employees?.total),
      icon: 'briefcase-outline',
      color: '#6366f1',
    },
    {
      title: 'Pending Orders',
      value: formatCount(orders?.pending),
      icon: 'time-outline',
      color: '#f97316',
    },
    {
      title: 'Delivered Orders',
      value: formatCount(orders?.delivered),
      icon: 'checkmark-circle-outline',
      color: '#22c55e',
    },
  ];

  if (includeRevenue) {
    cards.splice(5, 0, {
      title: 'Revenue',
      value: formatMoney(revenue?.total),
      icon: 'wallet-outline',
      color: '#10b981',
    });
  }

  return cards;
};

export const formatDashboardCount = (
  value: number | undefined,
  suffix = '',
): string => {
  if (value === undefined) return EMPTY_PLACEHOLDER;
  return suffix ? `${value} ${suffix}` : String(value);
};
