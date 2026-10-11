/** Retired intake boundary. Do not read the body, authenticate, or create records. */
export async function POST(request: Request) {
  void request;
  return Response.json({ error: { code: "B2B_RETIRED", message: "Hubungi tim Niuva melalui WhatsApp dari halaman layanan." } }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
