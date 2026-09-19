import assert from "node:assert/strict";
import test from "node:test";
import { dispatchMatterAlert } from "../src/matter_alerts.ts";

test("only sends deadline follow-up inside the seven-day window", async () => {
  let calls = 0;
  const later = await dispatchMatterAlert(
    {
      event: "deadline_follow_up",
      matterRef: "MAT-2048",
      phone: "+14155550123",
      portalUrl: "https://legal.example/matters/MAT-2048",
      daysRemaining: 8,
    },
    "request-later",
    async () => {
      calls += 1;
      return { message_id: "unused" };
    },
  );
  assert.deepEqual(later, { status: "skipped", reason: "deadline_not_imminent" });
  assert.equal(calls, 0);

  const imminent = await dispatchMatterAlert(
    {
      event: "deadline_follow_up",
      matterRef: "MAT-2048",
      phone: "+14155550123",
      portalUrl: "https://legal.example/matters/MAT-2048",
      daysRemaining: 3,
    },
    "request-imminent",
    async (messages, idempotencyKey) => {
      calls += 1;
      assert.equal(idempotencyKey, "matter-alert:request-imminent");
      assert.deepEqual(messages, [{
        to: "+14155550123",
        body: "Matter MAT-2048 has a deadline in 3 day(s): https://legal.example/matters/MAT-2048",
      }]);
      return { message_id: "msg_42" };
    },
  );
  assert.equal(calls, 1);
  assert.deepEqual(imminent, { status: "sent", message_id: "msg_42" });
});
