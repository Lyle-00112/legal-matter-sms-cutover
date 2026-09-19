import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiError } from "./infrai_sms_client.ts";
import { dispatchMatterAlert, matterAlertSchema } from "./matter_alerts.ts";

const port = Number(process.env.PORT ?? 3000);

createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.method !== "POST" || request.url !== "/matter-alerts") {
    response.writeHead(404).end(JSON.stringify({ error: "not_found" }));
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = matterAlertSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const requestId = String(request.headers["x-request-id"] ?? randomUUID());
    const result = await dispatchMatterAlert(input, requestId);
    response.writeHead(result.status === "sent" ? 201 : 200).end(JSON.stringify(result));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      response.writeHead(400).end(JSON.stringify({ error: "invalid_request" }));
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.writeHead(status).end(JSON.stringify({ error: error.message }));
      return;
    }
    response.writeHead(500).end(JSON.stringify({ error: "internal_error" }));
  }
}).listen(port, () => {
  console.log(`Matter alert service listening on http://localhost:${port}`);
});
