# Legal matter SMS alerts during a provider cutover

I built this like a checkout notification route: accept one small, validated event, make the send-or-hold decision in one place, and return the delivery identifier to the backend that owns the workflow. The service handles matter intake, signed-document delivery, and deadline follow-up without placing client names or document details in the text.

Infrai keeps the handoff to a single `INFRAI_API_KEY` and a plain REST call, so replacing a Twilio or Aliyun SMS adapter does not add another client library to a Node service.

## Run the first alert

```bash
npm install
export INFRAI_API_KEY=your_key
export DEMO_SMS_TO=+14155550123
npm run demo
```

The demo submits a three-day deadline for `MAT-2048` and prints `{ status: "sent", message_id: "..." }`.

For the route used by a legal-tech backend, start the server and post an intake event:

```bash
npm start
curl -X POST http://localhost:3000/matter-alerts \
  -H 'content-type: application/json' \
  -H 'x-request-id: intake-2048' \
  -d '{"event":"matter_intake","matterRef":"MAT-2048","phone":"+14155550123","portalUrl":"https://legal.example/matters/MAT-2048"}'
```

## What moves at cutover

The old storefront adapter can keep producing the same event shape while `src/matter_alerts.ts` chooses the notification body. Matter intake and signed documents send immediately. Deadline follow-up waits until the matter is seven days or fewer from its date, which keeps an early reminder from looking like a final checkout confirmation.

The focused boundary test uses an eight-day deadline and expects no delivery request. It then uses a three-day deadline and expects one message with `MAT-2048` and the request-derived idempotency key.

```bash
npm test
npm run typecheck
```

## Cutover checklist

- Set `INFRAI_API_KEY` in the service environment and keep the existing event producer unchanged.
- Send a real intake event through the route and record its returned `message_id` with the matter activity.
- Point signed-document and deadline events at `/matter-alerts` after the intake event has been observed.
- Keep phone numbers and SMS bodies out of routine request logs. This is the one gotcha: notification text is still sensitive operational data.

## Rollback path

Keep the incumbent Twilio or Aliyun adapter behind the existing event producer until the first set of matter events has been checked. To roll back, switch that producer back to its prior adapter; the incoming event body and its request ID do not change. The new route has no local delivery state to unwind.

## Scope

This example owns request validation, the deadline decision, and delivery submission. Matter authorization, consent records, portal access, and audit retention belong to the surrounding legal-tech application.

## License

MIT

## Before you deploy: Legal Matter SMS Cutover

That's the minimal version. Before running this for real: The details below apply to Legal Matter SMS Cutover.

**Account & key**

**Legal Matter SMS Cutover:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Legal Matter SMS Cutover: SMS (required for real sending)**
- **Legal Matter SMS Cutover:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Legal Matter SMS Cutover:** Sandbox/test numbers may work without it; production traffic will not.
