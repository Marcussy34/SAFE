import { createDemoPaymentRequirement, createPaymentRequiredResponse, hasX402PaymentAttempt } from "@/lib/x402/paymentRequirements";

const TASK_ID = "task_matchday_plan_001";

export async function GET(request: Request) {
  if (!hasX402PaymentAttempt(request)) {
    return createPaymentRequiredResponse(createDemoPaymentRequirement("fake-merch.demo", "/jersey", TASK_ID));
  }

  return Response.json({ item: "Unofficial jersey", x402: "paid" });
}
