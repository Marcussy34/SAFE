import { createDemoPaymentRequirement, createPaymentRequiredResponse, hasX402PaymentAttempt } from "@/lib/x402/paymentRequirements";

const TASK_ID = "task_matchday_plan_001";

export async function GET(request: Request) {
  if (!hasX402PaymentAttempt(request)) {
    return createPaymentRequiredResponse(createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", TASK_ID));
  }

  return Response.json({ match: "Argentina vs Japan", minute: 72, score: "2-1", x402: "paid" });
}
