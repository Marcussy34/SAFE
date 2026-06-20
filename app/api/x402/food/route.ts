import { createDemoPaymentRequirement, createPaymentRequiredResponse, hasX402PaymentAttempt } from "@/lib/x402/paymentRequirements";

const TASK_ID = "task_matchday_plan_001";

export async function GET(request: Request) {
  if (!hasX402PaymentAttempt(request)) {
    return createPaymentRequiredResponse(createDemoPaymentRequirement("food-voucher.demo", "/voucher/halftime", TASK_ID));
  }

  return Response.json({ voucher: "Halftime meal voucher", value: "5% off", x402: "paid" });
}
