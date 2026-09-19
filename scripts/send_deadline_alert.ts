import { dispatchMatterAlert } from "../src/matter_alerts.ts";

const phone = process.env.DEMO_SMS_TO;
if (!phone) throw new Error("DEMO_SMS_TO is required");

const result = await dispatchMatterAlert(
  {
    event: "deadline_follow_up",
    matterRef: "MAT-2048",
    phone,
    portalUrl: "https://legal.example/matters/MAT-2048",
    daysRemaining: 3,
  },
  `demo-MAT-2048-${new Date().toISOString().slice(0, 10)}`,
);

console.log(result);
