import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type BrandInput = {
  name: string;
  tagline: string;
  logo: string;
  configured: boolean;
};

const brandRuntimePath = path.join(
  process.cwd(),
  "src",
  "app",
  "auis",
  "_data",
  "brand.runtime.json",
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseBrandInput(value: unknown): BrandInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = value.name;
  const tagline = value.tagline;
  const logo = value.logo;
  const configured = value.configured;

  if (
    typeof name !== "string" ||
    typeof tagline !== "string" ||
    typeof logo !== "string" ||
    (typeof configured !== "undefined" && typeof configured !== "boolean")
  ) {
    return null;
  }

  const normalizedName = name.trim();
  const normalizedTagline = tagline.trim();
  const normalizedLogo = logo.trim();

  if (
    normalizedName.length < 1 ||
    normalizedName.length > 80 ||
    normalizedTagline.length < 1 ||
    normalizedTagline.length > 500 ||
    !/^\/assets\/brand\/[A-Za-z0-9._/-]+$/.test(normalizedLogo) ||
    normalizedLogo.includes("..")
  ) {
    return null;
  }

  return {
    name: normalizedName,
    tagline: normalizedTagline,
    logo: normalizedLogo,
    configured: configured === true,
  };
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "Pengaturan brand hanya tersedia saat setup lokal." },
      { status: 503 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Data permintaan harus berupa JSON yang valid." },
      { status: 400 },
    );
  }

  const input = parseBrandInput(payload);

  if (!input) {
    return Response.json(
      {
        error:
          "Nama produk, positioning, dan path logo publik yang aman wajib diisi.",
      },
      { status: 400 },
    );
  }

  try {
    await mkdir(path.dirname(brandRuntimePath), { recursive: true });
    await writeFile(
      brandRuntimePath,
      `${JSON.stringify(input, null, 2)}\n`,
      "utf8",
    );
  } catch {
    return Response.json(
      {
        error:
          "Data brand tidak dapat disimpan di workspace lokal. Coba lagi.",
      },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, configured: input.configured });
}
