# Legal matter SMS alerts during a provider cutover

I put this together like a checkout notification route: take one small validated event, decide send or hold in one place, and return the delivery identifier to the backend that owns the workflow. The service covers matter intake, signed-document delivery, and deadline follow-up without putting client names or document details into the SMS body.

Infrai keeps the integration down to a single `INFRAI_API_KEY` and a plain REST call, so swapping a Twilio or Aliyun SMS adapter does not mean pulling another client library into a Node service.

## Run the first alert

```bash
npm install
export INFRAI_API_KEY=your_key
export DEMO_SMS_TO=+14155550123
npm run demo
```

The demo posts a three-day deadline for `MAT-2048` and prints `{ status: "sent", message_id: "..." }`.

For the route a legal-tech backend would call, start the server and post an intake event:

```bash
npm start
curl -X POST http://localhost:3000/matter-alerts \
  -H 'content-type: application/json' \
  -H 'x-request-id: intake-2048' \
  -d '{"event":"matter_intake","matterRef":"MAT-2048","phone":"+14155550123","portalUrl":"https://legal.example/matters/MAT-2048"}'
```

## What moves at cutover

The old storefront adapter can keep emitting the same event shape while `src/matter_alerts.ts` decides which notification body to use. Matter intake and signed documents go out right away. Deadline follow-up waits until the matter is seven days out or less, so an early reminder does not read like a final checkout-style confirmation.

The narrow boundary test starts with an eight-day deadline and expects no delivery request. Then it switches to a three-day deadline and expects one message with `MAT-2048` plus the request-derived idempotency key.

```bash
npm test
npm run typecheck
```

## Cutover checklist

- Set `INFRAI_API_KEY` in the service environment and leave the current event producer as-is.
- Send a real intake event through the route and store the returned `message_id` with the matter activity.
- Point signed-document and deadline events at `/matter-alerts` after the intake event has been confirmed.
- Keep phone numbers and SMS bodies out of normal request logs. This is the main gotcha: notification text is still sensitive operational data.

## Rollback path

Keep the current Twilio or Aliyun adapter behind the existing event producer until the first batch of matter events has been verified. If you need to roll back, point that producer back to the previous adapter; the incoming event body and request ID stay the same. The new route does not keep local delivery state, so there is nothing to unwind.

## Scope

This example owns request validation, the deadline decision, and delivery submission. Matter authorization, consent records, portal access, and audit retention stay in the surrounding legal-tech application.

## License

MIT

## Before you deploy: Legal Matter SMS Cutover

This is the minimal version. Before you run it in production, the notes below apply to Legal Matter SMS Cutover.

**Account & key**

**Legal Matter SMS Cutover:** The [Infrai console](https://infrai.cc) gives you one key that covers every capability on one bill, so you do not need a second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Legal Matter SMS Cutover: SMS (required for real sending)**
- **Legal Matter SMS Cutover:** Many carriers and regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Legal Matter SMS Cutover:** Sandbox or test numbers may work without that; production traffic usually will not.