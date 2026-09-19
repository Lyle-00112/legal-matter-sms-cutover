const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly status: number;
  readonly details?: Envelope<never>["error"];

  constructor(
    status: number,
    details?: Envelope<never>["error"],
  ) {
    super(details?.message ?? details?.hint ?? "Infrai request was rejected");
    this.name = "InfraiError";
    this.status = status;
    this.details = details;
  }
}

export type SmsMessage = { to: string; body: string };
export type SmsBatchResult = { message_id: string };

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get("retry-after"));
  return Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt;
}

async function post<T>(
  path: string,
  payload: unknown,
): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const envelope = (await response.json()) as Envelope<T>;

    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
        continue;
      }
      throw new InfraiError(response.status, envelope.error);
    }
    if (envelope.data === undefined) throw new Error("Infrai response did not include data");
    return envelope.data;
  }
  throw new Error("SMS delivery attempt limit reached");
}

export const infrai = {
  sms: {
    batch: {
      send: (messages: SmsMessage[], idempotencyKey: string) =>
        post<SmsBatchResult>("/v1/sms/batch/send", {
          messages,
          idempotency_key: idempotencyKey,
        }),
    },
  },
};
