import { z } from "zod";
import { infrai, type SmsBatchResult, type SmsMessage } from "./infrai_sms_client.ts";

const phone = z.string().regex(/^\+[1-9]\d{7,14}$/);

export const matterAlertSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("matter_intake"),
    matterRef: z.string().min(1).max(32),
    phone,
    portalUrl: z.string().url(),
  }).strict(),
  z.object({
    event: z.literal("signed_document"),
    matterRef: z.string().min(1).max(32),
    phone,
    portalUrl: z.string().url(),
  }).strict(),
  z.object({
    event: z.literal("deadline_follow_up"),
    matterRef: z.string().min(1).max(32),
    phone,
    portalUrl: z.string().url(),
    daysRemaining: z.number().int().min(0).max(365),
  }).strict(),
]);

export type MatterAlert = z.infer<typeof matterAlertSchema>;
export type AlertDecision =
  | { action: "send"; body: string }
  | { action: "skip"; reason: "deadline_not_imminent" };

export function decideMatterAlert(input: MatterAlert): AlertDecision {
  if (input.event === "matter_intake") {
    return { action: "send", body: `Matter ${input.matterRef} is open. Review intake: ${input.portalUrl}` };
  }
  if (input.event === "signed_document") {
    return { action: "send", body: `Signed document ready for ${input.matterRef}: ${input.portalUrl}` };
  }
  if (input.daysRemaining > 7) return { action: "skip", reason: "deadline_not_imminent" };
  return {
    action: "send",
    body: `Matter ${input.matterRef} has a deadline in ${input.daysRemaining} day(s): ${input.portalUrl}`,
  };
}

export type DispatchResult =
  | { status: "sent"; message_id: string }
  | { status: "skipped"; reason: "deadline_not_imminent" };

type SendSms = (messages: SmsMessage[], idempotencyKey: string) => Promise<SmsBatchResult>;

export async function dispatchMatterAlert(
  input: MatterAlert,
  requestId: string,
  sendSms: SendSms = infrai.sms.batch.send,
): Promise<DispatchResult> {
  const decision = decideMatterAlert(input);
  if (decision.action === "skip") return { status: "skipped", reason: decision.reason };

  const sent = await sendSms(
    [{ to: input.phone, body: decision.body }],
    `matter-alert:${requestId}`,
  );
  return { status: "sent", message_id: sent.message_id };
}
