import { createDemoPaymentRequirement, createPaymentRequiredResponse, hasX402PaymentAttempt } from "@/lib/x402/paymentRequirements";

const TASK_ID = "task_matchday_plan_001";

export async function GET(request: Request) {
  if (!hasX402PaymentAttempt(request)) {
    return createPaymentRequiredResponse(createDemoPaymentRequirement("transit-api.demo", "/route/stadium", TASK_ID));
  }

  return Response.json({ route: "Metro M2 to Stadium Gate B", etaMinutes: 18, x402: "paid" });
}
