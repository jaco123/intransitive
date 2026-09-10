'use strict';

const assert = require('assert');
const inference = require('./ai-inference.js');

async function main() {
  const request = { history: [], turn: 'blue' };
  const operations = [0, 1, 2, 3].map(() => inference.request(request));
  const capacityError = await inference.request(request).then(
    () => null,
    (error) => error,
  );
  assert.ok(capacityError);
  assert.strictEqual(capacityError.message, 'AI inference is at capacity. Please try again shortly.');

  operations[0].cancel();
  const cancelled = await operations[0].catch((error) => error);
  assert.strictEqual(cancelled.code, 'AI_REQUEST_CANCELLED');

  const admittedAfterCancel = inference.request(request);
  inference.close();
  const shutdownError = await admittedAfterCancel.catch((error) => error);
  assert.ok(shutdownError, 'shutdown must reject admitted work');
  await Promise.all(operations.slice(1).map((operation) => operation.catch(() => null)));
  console.log('AI inference queue bound, cancellation release, and shutdown cleanup passed');
}

main()
  .catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  })
  .finally(() => inference.close());
