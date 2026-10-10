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
