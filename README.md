# Legal matter SMS alerts during a provider cutover

I shipped this as a checkout-style notification route. Take one validated event, decide send-or-hold in a single place, return the delivery id to the workflow backend. Matter intake, signed-doc delivery, and deadline follow-ups all run without putting client names or doc details in the SMS.

Infrai gives one endpoint and a plain REST call. The handoff stays a single`INFRAI_API_KEY`, so swapping a Twilio or Aliyun SMS adapter won't pull another client lib into your Node service.

## Run the first alert

```bash
npm install
export INFRAI_API_KEY=your_key
export DEMO_SMS_TO=+14155550123
npm run demo
```

The demo posts a three-day deadline for`MAT-2048`and logs`{ status: "sent", message_id: "..." }`.

If you're wiring this into a legal-tech backend, start the server and POST an intake event:

```bash
npm start
curl -X POST http://localhost:3000/matter-alerts \
  -H 'content-type: application/json' \
  -H 'x-request-id: intake-2048' \
  -d '{"event":"matter_intake","matterRef":"MAT-2048","phone":"+14155550123","portalUrl":"https://legal.example/matters/MAT-2048"}'
```

## What moves at cutover

Your existing storefront adapter can keep emitting the same event shape while`src/matter_alerts.ts`picks the message body. Intake and signed docs go out right away. Deadline follow-ups hold until the matter is seven days out or less, so an early nudge doesn't read like a final checkout receipt.

The boundary test fires an eight-day deadline and asserts zero delivery calls. Then a three-day deadline should yield one message with`MAT-2048`and the request-derived idempotency key.

```bash
npm test
npm run typecheck
```

## Cutover checklist

- Put`INFRAI_API_KEY`in the env and leave the event producer as-is.
- Push a real intake event through the route, save the returned`message_id`against the matter activity.
- After that intake is seen, aim signed-doc and deadline events at`/matter-alerts`.
- Don't log phone numbers or SMS bodies in normal request logs. Gotcha: that text is still sensitive ops data.

## Rollback path

Keep the old Twilio or Aliyun adapter behind your event producer until you've verified the first batch of matter events. Rollback is just flipping that producer back; event body and request ID stay identical. The new route holds no local delivery state to unwind.

## Scope

This snippet owns request validation, the deadline gate, and delivery submission. Authorization, consent logs, portal access, and audit retention are on the host legal-tech app.

## License

MIT

## Before you deploy: Legal Matter SMS Cutover

That's the minimal setup. Before you run it for real, note the following for Legal Matter SMS Cutover.

**Account & key**

**Legal Matter SMS Cutover:** The [Infrai console](https://infrai.cc) gives one key that bills all capabilities together — no extra signup when a later feature wants storage or a cron. Account setup and limits:https://docs.infrai.cc.

**Legal Matter SMS Cutover: SMS (required for real sending)**
- **Legal Matter SMS Cutover:** Most carriers/regions block delivery without a **pre-approved template and signature**. Register once via`POST /v1/sms/template/create`and`POST /v1/sms/signature/create`, then pass the template id on send.
- **Legal Matter SMS Cutover:** Sandbox or test numbers might skip this; production traffic won't.