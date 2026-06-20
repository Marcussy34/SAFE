import {
  createDemoPaymentRequirement,
  createPaymentRequiredResponse,
  hasX402PaymentAttempt,
  withDemoPaymentAmount
} from "@/lib/x402/paymentRequirements";

const TASK_ID = "task_matchday_plan_001";

export async function GET(request: Request) {
  const requirement = withDemoPaymentAmount(
    createDemoPaymentRequirement("stats-api.demo", "/live/premium-feed", TASK_ID),
    0.5
  );

  if (!hasX402PaymentAttempt(request)) {
    return createPaymentRequiredResponse(requirement);
  }

  return Response.json({ feed: "Premium tactical feed", priceUsdc: 0.5, x402: "paid" });
}
