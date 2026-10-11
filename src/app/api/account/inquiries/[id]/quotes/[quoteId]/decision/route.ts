/** Proposal decisions are handled by the WhatsApp administrator and client. */
export async function POST(request: Request, context: Readonly<{ params: Promise<{ id: string; quoteId: string }> }>) {
  void request;
  void context;
  return Response.json({ error: { code: "B2B_RETIRED", message: "Pembahasan proposal dilanjutkan bersama tim Niuva melalui WhatsApp." } }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
