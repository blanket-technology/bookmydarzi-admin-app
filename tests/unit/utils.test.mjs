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
