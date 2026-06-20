import { runWorldCupAgentScenario } from "@/lib/agent/worldCupAgent";

export async function POST() {
  try {
    const result = await runWorldCupAgentScenario();
    return Response.json(result);
  } catch {
    return Response.json({ error: "Agent scenario failed." }, { status: 500 });
  }
}
