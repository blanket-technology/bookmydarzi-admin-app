export interface AdminDashboardUsers {
  total?: number;
  active?: number;
}

export interface AdminDashboardEmployees {
  total?: number;
  active?: number;
}

export interface AdminDashboardOrders {
  total?: number;
  today?: number;
  pending?: number;
  pending_assignment?: number;
  delivered?: number;
  cancelled?: number;
}

export interface AdminDashboardRevenue {
  total?: number;
  today?: number;
  this_week?: number;
  this_month?: number;
}

export interface AdminDashboardPayments {
  successful?: number;
}

export interface AdminDashboardTailors {
  active?: number;
  available?: number;
  busy?: number;
}

/** Shape returned by GET /admin/dashboard */
export interface AdminDashboardApiResponse {
  users?: AdminDashboardUsers;
  employees?: AdminDashboardEmployees;
  orders?: AdminDashboardOrders;
  revenue?: AdminDashboardRevenue;
  payments?: AdminDashboardPayments;
  tailors?: AdminDashboardTailors;
}

export interface DashboardStats {
  total_orders?: number;
  active_orders?: number;
  pending_orders?: number;
  completed_orders?: number;
  total_revenue?: number;
  monthly_revenue?: number;
  revenue?: number;
  total_users?: number;
  total_customers?: number;
  total_tailors?: number;
  active_tailors?: number;
  total_staff?: number;
  total_employees?: number;
  [key: string]: number | string | undefined;
}

export interface RevenueChartPoint {
  label: string;
  value: number;
  month?: string;
  revenue?: number;
}

export interface DashboardOrderItem {
  order_id: string;
  order_code?: string;
  customer_name?: string;
  service_name?: string;
  status: string;
  amount?: number;
  final_amount?: number;
  created_at?: string;
  priority?: string;
}

export interface DashboardCustomerItem {
  id?: string;
  user_id?: string;
  full_name?: string;
  email?: string;
  mobile?: string;
  created_at?: string;
  orders_count?: number;
}

export interface DashboardTailorItem {
  tailor_id: string;
  user_id?: string;
  full_name?: string;
  specialization?: string;
  rating?: number;
  is_available?: boolean;
  active_orders?: number;
}

export interface DashboardAssignmentItem {
  order_id: string;
  order_code?: string;
  tailor_name?: string;
  customer_name?: string;
  priority?: string;
  status?: string;
  due_date?: string;
}

export interface DashboardResponse {
  users?: AdminDashboardUsers;
  employees?: AdminDashboardEmployees;
  orders?: AdminDashboardOrders;
  revenue?: AdminDashboardRevenue;
  payments?: AdminDashboardPayments;
  tailors?: AdminDashboardTailors;
  welcome?: {
    admin_name?: string;
    greeting?: string;
  };
  statistics?: DashboardStats;
  stats?: DashboardStats;
  revenue_chart?: RevenueChartPoint[];
  pending_orders?: DashboardOrderItem[];
  recent_orders?: DashboardOrderItem[];
  priority_assignments?: DashboardAssignmentItem[];
  latest_customers?: DashboardCustomerItem[];
  active_tailors?: DashboardTailorItem[];
  active_tailors_list?: DashboardTailorItem[];
  [key: string]: unknown;
}
