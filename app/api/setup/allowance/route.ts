import {
  buildCreateFixedDelegationTransaction,
  buildInitSubscriptionAuthorityTransaction,
  getWalletAllowanceStatus,
  type WalletAllowanceAction
} from "@/lib/solana/walletAllowanceSetup";

interface AllowanceSetupBody {
  action?: WalletAllowanceAction;
  ownerAddress?: string;
  amountAtomicUnits?: string;
  expiryTs?: string;
  nonce?: string;
}

function badRequest(error: string, status = 400) {
  return Response.json({ error }, { status });
}

function isAction(value: unknown): value is WalletAllowanceAction {
  return value === "initSubscriptionAuthority" || value === "createFixedDelegation";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function GET(request: Request) {
  const ownerAddress = new URL(request.url).searchParams.get("owner");

  if (!ownerAddress) {
    return badRequest("Missing owner query parameter.");
  }

  try {
    return Response.json({ status: await getWalletAllowanceStatus(ownerAddress) });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Unable to load allowance status.");
  }
}

export async function POST(request: Request) {
  let body: AllowanceSetupBody;

  try {
    body = (await request.json()) as AllowanceSetupBody;
  } catch {
    return badRequest("Malformed JSON body.");
  }

  const ownerAddress = stringValue(body.ownerAddress);

  if (!ownerAddress) {
    return badRequest("Body must include ownerAddress.");
  }

  if (!isAction(body.action)) {
    return badRequest("Body action must be initSubscriptionAuthority or createFixedDelegation.");
  }

  const options = {
    ownerAddress,
    amountAtomicUnits: stringValue(body.amountAtomicUnits),
    expiryTs: stringValue(body.expiryTs),
    nonce: stringValue(body.nonce)
  };

  try {
    const transaction =
      body.action === "initSubscriptionAuthority"
        ? await buildInitSubscriptionAuthorityTransaction(options)
        : await buildCreateFixedDelegationTransaction(options);

    return Response.json({ transaction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to build allowance transaction.";
    const status = message.includes("Initialize the subscription authority") ? 409 : 400;
    return badRequest(message, status);
  }
}
