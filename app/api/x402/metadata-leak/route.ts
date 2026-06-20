import { createDemoPaymentRequirement, createPaymentRequiredResponse, hasX402PaymentAttempt } from "@/lib/x402/paymentRequirements";

const TASK_ID = "task_matchday_plan_001";

export async function GET(request: Request) {
  if (!hasX402PaymentAttempt(request)) {
    return createPaymentRequiredResponse(createDemoPaymentRequirement("stats-api.demo", "/live/metadata-leak", TASK_ID));
  }

  return Response.json({ update: "Pickup reminder redacted by SAFE before payment.", x402: "paid" });
}
