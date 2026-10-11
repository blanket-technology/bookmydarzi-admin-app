// Pure-logic tests, run with Node's built-in runner (no extra dependencies):
//   npm test
// They import the real source modules (TypeScript is stripped by Node 22+).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AxiosError } from 'axios';

globalThis.__DEV__ = false;

const { parseApiError, getUserFacingMessage, isTransientApiError, formatMoney, formatCurrency } = await import(
  '../../src/utils/errors.ts'
);
const { optionalText } = await import('../../src/utils/forms.ts');
const { allowedPaymentStatusOptions } = await import('../../src/constants/paymentStatus.ts');

const axiosError = (status, data, code = 'ERR_BAD_REQUEST') =>
  new AxiosError(`Request failed with status code ${status}`, code, {}, {}, { status, data });

test('an axios error shows the backend message, not "Request failed with status code"', () => {
  const err = axiosError(400, { error: 'OTP_INVALID', message: 'Invalid OTP. 2 attempt(s) remaining.' });
  assert.equal(parseApiError(err).message, 'Invalid OTP. 2 attempt(s) remaining.');
});

test('validation errors surface the first field message', () => {
  const err = axiosError(422, { detail: [{ msg: 'Password must contain at least one uppercase letter' }] });
  assert.equal(getUserFacingMessage(err), 'Password must contain at least one uppercase letter');
});

test('server errors are friendly and carry a short support reference', () => {
  const message = getUserFacingMessage(axiosError(500, { request_id: 'abcdef123456' }));
  assert.match(message, /Something went wrong on our side/);
  assert.match(message, /Ref: abcdef12/);
  assert.doesNotMatch(message, /500|status code/);
});

test('rate limiting has its own message', () => {
  assert.equal(getUserFacingMessage(axiosError(429, {})), 'Too many attempts. Please wait a moment and try again.');
});

test('transient failures (network, 5xx, 429) never mean "session invalid"', () => {
  assert.ok(isTransientApiError(new AxiosError('Network Error', 'ERR_NETWORK')));
  assert.ok(isTransientApiError(axiosError(503, {})));
  assert.ok(isTransientApiError(axiosError(429, {})));
  assert.ok(!isTransientApiError(axiosError(401, { message: 'Invalid token' })));
});

test('optionalText: clearing while editing sends "", creating omits the field', () => {
  assert.equal(optionalText('   ', true), '');
  assert.equal(optionalText('   ', false), undefined);
  assert.equal(optionalText(' hello ', false), 'hello');
});

test('payment status corrections mirror the backend transition rules', () => {
  assert.deepEqual(allowedPaymentStatusOptions('success').map((o) => o.value), ['refunded']);
  assert.deepEqual(allowedPaymentStatusOptions('initiated').map((o) => o.value), ['success', 'failed']);
  assert.equal(allowedPaymentStatusOptions('refunded').length, 0);
});

test('money formatting never drops paise on payouts or refunds', () => {
  assert.equal(formatMoney(259.35), '₹259.35');
  assert.equal(formatMoney(399.5), '₹399.50');
  assert.equal(formatCurrency(500), '₹500');
  assert.equal(formatCurrency(12.5), '₹12.50');
});

const { buildBridgeTasks, buildTailorTasks } = await import('../../src/features/tasks/fieldTasks.ts');
const { workflowPhaseIndex, tailorBucket, OFF_PATH_STATUSES } = await import('../../src/features/orders/workflow.ts');

const order = (over) => ({ order_id: String(over.order_id ?? Math.random()), status: 'order_placed', items: [], ...over });

test('bridge tasks only include legs claimed by that employee', () => {
  const orders = [
    order({ order_id: 'a', status: 'pickup_pending', assigned_employee_id: '7' }),
    order({ order_id: 'b', status: 'pickup_pending', assigned_employee_id: '8' }),
    order({ order_id: 'c', status: 'out_for_delivery', delivery_employee_id: '7', remaining_amount: 450 }),
    order({ order_id: 'd', status: 'picked_up', assigned_employee_id: '7' }),
    order({ order_id: 'e', status: 'delivered', delivery_employee_id: '7' }),
  ];
  const tasks = buildBridgeTasks(orders, 7);
  assert.deepEqual(tasks.map((t) => [t.order.order_id, t.kind]), [
    ['c', 'deliver'],
    ['d', 'handover'],
    ['a', 'pickup'],
  ]);
  assert.equal(tasks[0].collectAmount, 450);
});

test('bridge tasks are empty when the user id is unknown', () => {
  const orders = [order({ status: 'pickup_pending', assigned_employee_id: '7' })];
  assert.equal(buildBridgeTasks(orders, undefined).length, 0);
  assert.equal(buildBridgeTasks(orders, null).length, 0);
});

test('tailor tasks rank actionable work before waiting orders', () => {
  const orders = [
    order({ order_id: 'w', status: 'ready_for_dispatch' }),
    order({ order_id: 's', status: 'cloth_received_by_tailor' }),
    order({ order_id: 'p', status: 'stitching_started' }),
    order({ order_id: 'x', status: 'completed' }),
  ];
  assert.deepEqual(buildTailorTasks(orders).map((t) => t.order.order_id), ['s', 'p', 'w']);
});

test('workflow phases and tailor buckets cover the lifecycle', () => {
  assert.equal(workflowPhaseIndex('pickup_pending'), 2);
  assert.equal(workflowPhaseIndex('final_check'), 3);
  assert.equal(workflowPhaseIndex('cancelled'), -1);
  assert.ok(OFF_PATH_STATUSES.has('cancelled'));
  assert.equal(tailorBucket('cloth_received_by_tailor'), 'todo');
  assert.equal(tailorBucket('in_progress'), 'stitching');
  assert.equal(tailorBucket('ready_for_dispatch'), 'ready');
  assert.equal(tailorBucket('delivered'), 'done');
});

// ---------------------------------------------------------------- order rules matrix
const { computeOrderRules } = await import('../../src/features/orders/orderRules.ts');

const rules = (role, status, over = {}) =>
  computeOrderRules({ role, userId: 7, order: { status, tailor_id: '3', assigned_employee_id: null, delivery_employee_id: null, remaining_amount: 0, ...over } });
const ids = (role, status, over) => rules(role, status, over).actions.map((a) => a.id);

test('tailor: only the next stitching step, nothing else', () => {
  assert.deepEqual(ids('tailor', 'cloth_received_by_tailor'), ['stitching_started']);
  assert.deepEqual(ids('tailor', 'stitching_started'), ['in_progress']);
  assert.deepEqual(ids('tailor', 'in_progress'), ['final_check']);
  assert.deepEqual(ids('tailor', 'final_check'), ['ready_for_dispatch']);
  assert.deepEqual(ids('tailor', 'at_tailor_for_repair'), ['complete_repair']);
  for (const s of ['tailor_assigned', 'pickup_pending', 'picked_up', 'ready_for_dispatch', 'out_for_delivery', 'delivered', 'completed']) {
    assert.deepEqual(ids('tailor', s), [], s);
  }
});

test('bridge pickup leg: confirm pickup, measurements and add-ons only while collecting', () => {
  const mine = { assigned_employee_id: '7' };
  assert.deepEqual(ids('employee', 'pickup_pending', mine), ['confirm_pickup', 'manage_measurement', 'add_addon']);
  assert.deepEqual(ids('employee', 'picked_up', mine), ['hand_to_tailor', 'manage_measurement', 'add_addon']);
  assert.deepEqual(ids('employee', 'tailor_assigned', mine), ['schedule_pickup']);
  // the pickup leg is finished once the cloth is with the tailor
  for (const s of ['cloth_received_by_tailor', 'stitching_started', 'in_progress', 'final_check', 'ready_for_dispatch']) {
    assert.deepEqual(ids('employee', s, mine), [], s);
  }
});

test('bridge never sees update-measurement or add-ons at the delivery stage', () => {
  // the pickup employee whose order is now out for delivery with someone else
  const pickupEmployee = { assigned_employee_id: '7', delivery_employee_id: '9', remaining_amount: 450 };
  assert.deepEqual(ids('employee', 'out_for_delivery', pickupEmployee), []);
  assert.equal(rules('employee', 'out_for_delivery', pickupEmployee).canEditMeasurements, false);
  // the delivery employee
  const courier = { assigned_employee_id: '8', delivery_employee_id: '7', remaining_amount: 450 };
  const r = rules('employee', 'out_for_delivery', courier);
  assert.deepEqual(r.actions.map((a) => a.id), ['collect_cod', 'refuse_delivery', 'view_payment']);
  assert.equal(r.canEditMeasurements, false);
  assert.equal(r.canAddAddons, false);
  assert.equal(r.isCodCollectionRequired, true);
});

test('delivery: collect first when money is due, otherwise mark delivered', () => {
  const courier = { delivery_employee_id: '7' };
  assert.equal(rules('employee', 'out_for_delivery', { ...courier, remaining_amount: 100 }).actions[0].id, 'collect_cod');
  assert.equal(rules('employee', 'out_for_delivery', { ...courier, remaining_amount: 0 }).actions[0].id, 'complete');
  // another employee holds the delivery leg
  assert.deepEqual(ids('employee', 'out_for_delivery', { delivery_employee_id: '9' }), []);
});

test('bridge claims unclaimed work and cannot act on someone else\'s leg', () => {
  assert.deepEqual(ids('employee', 'order_placed', { tailor_id: null }), ['accept', 'reject']);
  assert.deepEqual(ids('employee', 'tailor_assigned', { assigned_employee_id: null }), ['accept']);
  assert.deepEqual(ids('employee', 'pickup_pending', { assigned_employee_id: '8' }), []);
  assert.equal(rules('employee', 'pickup_pending', { assigned_employee_id: '8' }).canEditMeasurements, false);
});

test('hand to tailor is blocked until a tailor is assigned', () => {
  const a = rules('employee', 'picked_up', { assigned_employee_id: '7', tailor_id: null }).actions;
  assert.equal(a.find((x) => x.id === 'hand_to_tailor').disabledReason, 'needTailor');
  assert.ok(a.some((x) => x.id === 'assign_tailor'));
});

test('admin: leads with assign tailor, measurements only before stitching, no add-ons', () => {
  const noTailor = rules('admin', 'broadcasted', { tailor_id: null }).actions;
  assert.equal(noTailor[0].id, 'assign_tailor');
  assert.equal(noTailor[0].tone, 'primary');
  assert.ok(!noTailor.some((a) => a.id === 'add_addon'));

  assert.ok(ids('admin', 'cloth_received_by_tailor').includes('update_measurement'));
  for (const s of ['stitching_started', 'in_progress', 'final_check', 'ready_for_dispatch', 'out_for_delivery', 'delivered']) {
    assert.ok(!ids('admin', s).includes('update_measurement'), s);
  }
  assert.ok(ids('admin', 'stitching_started').includes('in_progress'));
  assert.ok(ids('admin', 'out_for_delivery', { remaining_amount: 10 }).includes('collect_cod'));
  assert.ok(!ids('admin', 'delivered').includes('cancel'));
  assert.ok(ids('admin', 'delivered').includes('correct_status'));
  assert.deepEqual(ids('admin', 'completed'), ['view_payment']);
  assert.deepEqual(ids('admin', 'cancelled'), ['view_payment']);
});

test('order placed: accept comes first for admin', () => {
  const a = rules('admin', 'order_placed', { tailor_id: null }).actions;
  assert.equal(a[0].id, 'accept');
  assert.equal(a[0].tone, 'primary');
});

test('unknown roles get nothing', () => {
  assert.deepEqual(ids('user', 'out_for_delivery'), []);
  assert.deepEqual(ids(undefined, 'order_placed'), []);
});

// ---------------------------------------------------------------- due dates
const { getDueInfo, isDueRelevant } = await import('../../src/utils/dueDate.ts');

test('due date tone and days are calendar-day based and timezone-stable', () => {
  const now = new Date(2026, 9, 11, 23, 30); // 11 Oct, late evening local
  assert.deepEqual(
    ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-14', '2026-10-20'].map((d) => getDueInfo(d, now).tone),
    ['overdue', 'today', 'soon', 'ok', 'ok'],
  );
  assert.equal(getDueInfo('2026-10-14', now).daysLeft, 3);
  assert.equal(getDueInfo('2026-10-08', now).daysLeft, -3);
  assert.equal(getDueInfo(null, now), null);
  assert.equal(getDueInfo('not a date', now), null);
});

test('due dates stop mattering once the garment is delivered or the order is closed', () => {
  assert.equal(isDueRelevant('stitching_started'), true);
  assert.equal(isDueRelevant('out_for_delivery'), true);
  for (const s of ['delivered', 'completed', 'cancelled', 'inspection_window']) assert.equal(isDueRelevant(s), false, s);
});

test('cancelled and returned orders are not counted in the tailor Done tab', () => {
  assert.equal(tailorBucket('cancelled'), 'closed');
  assert.equal(tailorBucket('returned'), 'closed');
  assert.equal(tailorBucket('inspection_window'), 'done');
});
