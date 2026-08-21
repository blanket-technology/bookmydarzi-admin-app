import { useMemo } from 'react';
import { ORDER_STATUS } from '@/constants/orderStatus';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';

// There is no real earnings/payout ledger for either role today (see
// app/models/bridge_profile.py's own comment: "Earnings fields are manually
// admin-entered; no payout/incentive calculation exists yet" — and tailors
// have no earnings column at all). This derives an honest, clearly-labeled
// summary from the role's own completed orders instead of inventing numbers
// no backend actually tracks. useOrders already auto-scopes to "my orders"
// per role (tailor -> GET /orders/my-orders, employee -> GET /admin/orders
// with employee_id forced to the caller's own id).
const SUMMARY_LIMIT = 100;

export const useMyEarningsSummary = () => {
  const { user } = useAuth();
  const role = String(user?.role ?? '').toLowerCase();
  const enabled = role === 'tailor' || role === 'employee';

  const { data, isLoading, isError, refetch } = useOrders(
    { status: ORDER_STATUS.COMPLETED, limit: SUMMARY_LIMIT, page: 1 },
    enabled,
  );

  const summary = useMemo(() => {
    const orders = data?.orders ?? [];
    const totalValue = orders.reduce((sum, o) => sum + (o.final_amount ?? o.amount ?? 0), 0);
    return {
      completedCount: data?.total ?? orders.length,
      // Sum only covers the fetched page — flagged via `isPartial` rather
      // than silently understating a high-volume account's total.
      totalValue,
      isPartial: (data?.total ?? 0) > orders.length,
      sampledCount: orders.length,
    };
  }, [data]);

  return { ...summary, isLoading, isError, refetch, enabled };
};
