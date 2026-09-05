import type { Metadata } from "next";
import Link from "next/link";

type ScreenScope = "MVP" | "DEFERRED";

type BlockKind =
  | "nav"
  | "hero"
  | "media"
  | "content"
  | "form"
  | "list"
  | "filters"
  | "summary"
  | "status"
  | "timeline"
  | "table"
  | "actions"
  | "footer"
  | "auth";

type WireframeBlock = Readonly<{
  kind: BlockKind;
  label: string;
  detail?: string;
}>;

type WireframeScreen = Readonly<{
  id: string;
  number: string;
  title: string;
  route: string;
  audience: string;
  scope: ScreenScope;
  goal: string;
  primary: string;
  next: string;
  states: readonly string[];
  mobile: string;
  blocks: readonly WireframeBlock[];
}>;

const blockStyle: Record<BlockKind, string> = {
  nav: "flex min-h-9 items-center justify-between border border-dashed border-zinc-500 bg-white px-2.5 py-1.5",
  hero: "min-h-24 border-2 border-zinc-900 bg-zinc-50 p-3",
  media: "min-h-24 border-2 border-zinc-800 bg-zinc-200 p-3",
  content: "min-h-16 border border-zinc-400 bg-white p-2.5",
  form: "min-h-16 border border-dashed border-zinc-700 bg-zinc-50 p-2.5",
  list: "min-h-20 border border-zinc-500 bg-zinc-100 p-2.5",
  filters: "flex min-h-9 items-center gap-2 border border-zinc-500 bg-zinc-100 px-2.5 py-1.5",
  summary: "min-h-16 border border-zinc-800 bg-zinc-100 p-2.5",
  status: "min-h-14 border-l-4 border-zinc-950 bg-zinc-200 p-2.5",
  timeline: "min-h-20 border border-dashed border-zinc-600 bg-white p-2.5",
  table: "min-h-24 border border-zinc-900 bg-white p-2.5",
  actions: "min-h-14 border-2 border-zinc-950 bg-zinc-900 p-2.5 text-white",
  footer: "min-h-10 border-t border-zinc-500 bg-zinc-100 p-2",
  auth: "min-h-24 border-2 border-zinc-900 bg-white p-4",
};

const blockMarker: Record<BlockKind, string> = {
  nav: "N",
  hero: "H",
  media: "X",
  content: "C",
  form: "F",
  list: "L",
  filters: "≡",
  summary: "S",
  status: "!",
  timeline: "T",
  table: "▦",
  actions: "A",
  footer: "B",
  auth: "ID",
};

const wireframeScreens: readonly WireframeScreen[] = [
  {
    id: "homepage",
    number: "01",
    title: "Homepage",
    route: "/",
    audience: "Public, B2B, retail",
    scope: "MVP",
    goal: "Menjelaskan posisi Niuva dan mengarahkan tiga entry paths.",
    primary: "Diskusikan Proyek",
    next: "Project Brief atau jalur Custom 3D Print / Shop",
    states: ["published", "loading", "no published project", "CTA failure"],
    mobile: "Copy hero lebih dahulu, lalu evidence dan tiga jalur bertumpuk.",
    blocks: [
      { kind: "nav", label: "Header", detail: "Logo, navigation, Diskusikan Proyek" },
      {
        kind: "hero",
        label: "Idea -> Design -> Prototype -> Finished Product",
        detail: "Positioning dan outcome sebelum teknologi",
      },
      { kind: "media", label: "Real project evidence", detail: "X-box sampai media disetujui" },
      {
        kind: "actions",
        label: "Three entry paths",
        detail: "Diskusikan Proyek | Custom 3D Print | Shop",
      },
      { kind: "content", label: "Capabilities and process", detail: "Links ke Services dan Projects" },
      { kind: "footer", label: "Contact and legal", detail: "Next step dengan ekspektasi human follow-up" },
    ],
  },
  {
    id: "services",
    number: "02",
    title: "Services",
    route: "/services",
    audience: "Public, B2B",
    scope: "MVP",
    goal: "Menjelaskan capability berdasarkan outcome yang dibantu.",
    primary: "Explore service",
    next: "Project proof atau Project Brief",
    states: ["published", "loading", "empty capability", "proof unavailable"],
    mobile: "Empat capability menjadi satu kolom dengan outcome sebelum detail.",
    blocks: [
      { kind: "nav", label: "Public header", detail: "Context tetap terhubung ke tiga entry paths" },
      { kind: "hero", label: "Capability overview", detail: "Masalah yang dapat dibantu Niuva" },
      { kind: "content", label: "Product development", detail: "Outcome dan linked evidence" },
      { kind: "content", label: "Design and engineering", detail: "Outcome dan linked evidence" },
      { kind: "content", label: "Prototyping and manufacturing", detail: "Outcome dan linked evidence" },
      { kind: "content", label: "Custom 3D print", detail: "Outcome dan linked evidence" },
      { kind: "actions", label: "Related next step", detail: "Lihat project atau kirim brief" },
    ],
  },
  {
    id: "projects",
    number: "03",
    title: "Projects / Case Studies",
    route: "/projects",
    audience: "Public, B2B",
    scope: "MVP",
    goal: "Memberi bukti B2B yang dapat dipindai berdasarkan konteks.",
    primary: "Open project",
    next: "Project Detail",
    states: ["published projects", "loading", "empty", "no filter match", "request failure"],
    mobile: "Featured project menjadi opener vertikal; metadata mendahului action.",
    blocks: [
      { kind: "nav", label: "Public header", detail: "Projects aktif, CTA tetap tersedia" },
      { kind: "hero", label: "Case-study introduction", detail: "Outcome dan konteks sebelum gallery" },
      { kind: "filters", label: "Service or category filter", detail: "Hanya jika didukung data nyata" },
      { kind: "media", label: "Featured project", detail: "Bukti utama dengan title dan outcome" },
      { kind: "list", label: "Project proof list", detail: "Rows dengan context, image, dan detail link" },
      { kind: "footer", label: "Related next step", detail: "Project Brief" },
    ],
  },
  {
    id: "project-detail",
    number: "04",
    title: "Project Detail",
    route: "/projects/:slug",
    audience: "Public, B2B",
    scope: "MVP",
    goal: "Membuat konteks, challenge, process, dan result dapat dipercaya.",
    primary: "Discuss a similar project",
    next: "Project Brief dengan konteks yang lebih siap",
    states: ["published", "loading", "not found", "private project", "asset restricted"],
    mobile: "Narrative tetap context -> challenge -> process -> result -> CTA.",
    blocks: [
      { kind: "nav", label: "Public header", detail: "Back to projects dan CTA" },
      { kind: "hero", label: "Project opener", detail: "Title, role, short outcome" },
      { kind: "content", label: "Context and challenge", detail: "Mengapa proyek ini dikerjakan" },
      { kind: "timeline", label: "Process decisions", detail: "Sequence, trade-off, dan evidence" },
      { kind: "media", label: "Evidence gallery", detail: "Caption dekat dengan media" },
      { kind: "summary", label: "Result and related service", detail: "Next step ke Project Brief" },
    ],
  },
  {
    id: "project-brief",
    number: "05",
    title: "Project Brief / Request Quote",
    route: "/project-brief",
    audience: "B2B",
    scope: "MVP",
    goal: "Mengumpulkan brief yang cukup untuk review operator tanpa instant quote.",
    primary: "Kirim brief untuk ditinjau",
    next: "Reference ID dan human follow-up",
    states: ["default", "field error", "upload pending", "server failure", "success reference ID"],
    mobile: "Satu kolom; consent sebelum submit; next steps berada setelah form.",
    blocks: [
      { kind: "nav", label: "Public header", detail: "Ekspektasi review, bukan harga instan" },
      { kind: "hero", label: "Brief context", detail: "Goal dan response expectation" },
      { kind: "form", label: "Contact", detail: "Name, Company optional, Email, WhatsApp" },
      { kind: "form", label: "Project context", detail: "Goal, Current stage, Description" },
      { kind: "form", label: "Scope and reference", detail: "Target quantity, deadline, file/reference" },
      { kind: "form", label: "Consent", detail: "Confidentiality acknowledgment" },
      { kind: "actions", label: "Submit", detail: "Success menampilkan reference ID dan WhatsApp route" },
    ],
  },
  {
    id: "shop",
    number: "06",
    title: "Shop",
    route: "/shop",
    audience: "Retail/B2C",
    scope: "MVP",
    goal: "Membantu memilih ready-made product berdasarkan stock dan price.",
    primary: "Open product",
    next: "Product Detail atau Cart",
    states: ["catalog loading", "published", "empty", "no category match", "request failure"],
    mobile: "Category/filter tetap mudah dicapai tanpa menghalangi discovery.",
    blocks: [
      { kind: "nav", label: "Commerce header", detail: "Shop, Custom 3D Print, Cart" },
      { kind: "hero", label: "Shop introduction", detail: "Ready-made catalog context" },
      { kind: "filters", label: "Category controls", detail: "Visible label dan result count" },
      { kind: "list", label: "Product listing", detail: "Name, image, price, stock signal" },
      { kind: "summary", label: "Cart summary", detail: "Tidak menjadi satu-satunya cart access" },
      { kind: "footer", label: "Help and legal", detail: "Guest checkout expectation" },
    ],
  },
  {
    id: "product-detail",
    number: "07",
    title: "Product Detail",
    route: "/shop/:slug",
    audience: "Retail/B2C",
    scope: "MVP",
    goal: "Menyediakan keputusan pembelian lengkap sebelum item masuk cart.",
    primary: "Add to cart",
    next: "Cart dengan hasil mutation yang diumumkan",
    states: ["available", "out of stock", "variant unavailable", "cart pending", "not found"],
    mobile: "Title, price, variant, quantity, action sebelum detail tambahan.",
    blocks: [
      { kind: "nav", label: "Commerce header", detail: "Cart tetap terlihat" },
      { kind: "media", label: "Product gallery", detail: "Material dan context, bukan image-only UI" },
      { kind: "hero", label: "Product decision panel", detail: "Title, price, stock" },
      { kind: "form", label: "Variant and quantity", detail: "Selected state dan bounded quantity" },
      { kind: "actions", label: "Add to cart", detail: "Pending, success, dan failure state" },
      { kind: "content", label: "Product notes", detail: "Shipping atau purchase notes" },
    ],
  },
  {
    id: "cart",
    number: "08",
    title: "Cart",
    route: "/cart",
    audience: "Retail/B2C",
    scope: "MVP",
    goal: "Memeriksa item, quantity, stock, dan subtotal sebelum checkout.",
    primary: "Proceed to checkout",
    next: "Guest Checkout",
    states: ["populated", "empty", "quantity pending", "stock conflict", "price revalidation"],
    mobile: "Item rows menjadi labeled blocks; summary tetap dekat dengan checkout.",
    blocks: [
      { kind: "nav", label: "Commerce header", detail: "Continue shopping tersedia" },
      { kind: "hero", label: "Cart context", detail: "Jumlah item dan recovery guidance" },
      { kind: "list", label: "Cart items", detail: "Identity, variant, quantity, price, row actions" },
      { kind: "status", label: "Stock or price warning", detail: "Blocking reason tidak hanya warna" },
      { kind: "summary", label: "Order subtotal", detail: "Server revalidation sebelum checkout" },
      { kind: "actions", label: "Checkout action", detail: "Disabled hanya dengan alasan yang jelas" },
    ],
  },
  {
    id: "checkout",
    number: "09",
    title: "Checkout",
    route: "/checkout",
    audience: "Retail/B2C",
    scope: "MVP",
    goal: "Menyelesaikan pembelian sebagai guest dengan rate dan total authoritative.",
    primary: "Pay with Midtrans",
    next: "Order Status",
    states: ["validation", "rates loading", "rates unavailable", "payment pending", "payment failed"],
    mobile: "Contact -> address -> Biteship rate -> summary -> payment.",
    blocks: [
      { kind: "nav", label: "Checkout header", detail: "Guest checkout, no account required" },
      { kind: "form", label: "Contact and shipping address", detail: "Visible labels dan grouped fields" },
      { kind: "list", label: "Biteship shipping options", detail: "Loading, unavailable, selected rate" },
      { kind: "summary", label: "Order summary", detail: "Item, shipping, total setelah revalidation" },
      { kind: "actions", label: "Midtrans payment transition", detail: "Payment pending tidak boleh double submit" },
      { kind: "status", label: "Confirmation or recovery", detail: "Payment success, failure, atau retry" },
    ],
  },
  {
    id: "custom-print-landing",
    number: "10",
    title: "Custom 3D Print Landing",
    route: "/custom-print",
    audience: "Retail/B2C, B2B",
    scope: "MVP",
    goal: "Menjelaskan custom print dan mengatur ekspektasi operator review.",
    primary: "Start custom print request",
    next: "Custom Print Request",
    states: ["published", "loading", "upload unavailable", "unsupported file guidance"],
    mobile: "Expectation setting dan input checklist hadir sebelum CTA.",
    blocks: [
      { kind: "nav", label: "Public/commerce header", detail: "Link ke Shop dan Project Brief" },
      { kind: "hero", label: "What custom print is for", detail: "Use case, bukan janji instant price" },
      { kind: "timeline", label: "Review -> Slice -> Quote -> Produce", detail: "Readable without animation" },
      { kind: "content", label: "Input and file checklist", detail: "Format dan constraints sebagai text" },
      { kind: "summary", label: "Price expectation", detail: "Geometry price perlu operator review" },
      { kind: "actions", label: "Begin request", detail: "CTA menjelaskan flow yang dimulai" },
    ],
  },
  {
    id: "custom-print-request",
    number: "11",
    title: "Custom Print Request",
    route: "/custom-print/request",
    audience: "Retail/B2C, B2B",
    scope: "MVP",
    goal: "Mengumpulkan file private dan konfigurasi minimum untuk operator review.",
    primary: "Submit custom print request",
    next: "Operator review lalu Quote Review",
    states: ["no file", "upload pending", "unsupported type", "validation error", "submitted"],
    mobile: "Upload status tetap terlihat; configuration mengikuti satu urutan logis.",
    blocks: [
      { kind: "nav", label: "Custom-print header", detail: "Back to expectation setting" },
      { kind: "form", label: "Private file upload", detail: "Type, size, progress, replace, remove" },
      { kind: "status", label: "File status", detail: "private upload state, tidak ada public URL permanen" },
      { kind: "form", label: "Configuration", detail: "Material, color, quantity, scale/dimensions" },
      { kind: "form", label: "Contact and notes", detail: "Contact details dan optional reference" },
      { kind: "actions", label: "Submit request", detail: "Expectation summary dan retry recovery" },
    ],
  },
  {
    id: "quote-review",
    number: "12",
    title: "Quote Review",
    route: "/quote/:token",
    audience: "Customer",
    scope: "MVP",
    goal: "Memberi keputusan accept atau decline atas quote immutable.",
    primary: "Accept quote",
    next: "Payment atau contact untuk clarification",
    states: ["valid", "expired", "already accepted", "declined", "invalid token"],
    mobile: "Scope dan assumptions mendahului total serta decision action.",
    blocks: [
      { kind: "nav", label: "Secure quote header", detail: "Reference dan expiry" },
      { kind: "hero", label: "Quote scope", detail: "Item/service, material, quantity" },
      { kind: "content", label: "Verified assumptions", detail: "Weight, duration, shipping assumptions" },
      { kind: "summary", label: "Price breakdown", detail: "Currency, subtotal, total" },
      { kind: "actions", label: "Accept or decline", detail: "Decline membutuhkan confirmation" },
      { kind: "status", label: "Quote status", detail: "Expired, revoked, pending payment, recovery" },
    ],
  },
  {
    id: "order-status",
    number: "13",
    title: "Order Status",
    route: "/orders/:token",
    audience: "Customer",
    scope: "MVP",
    goal: "Menunjukkan public order status tanpa internal operator notes.",
    primary: "Complete next public action",
    next: "Shipping payment, tracking, atau contact",
    states: ["paid", "production", "ready to ship", "completed", "token expired"],
    mobile: "Current status pertama, lalu timeline dan next action.",
    blocks: [
      { kind: "nav", label: "Secure status header", detail: "Reference dan contact access" },
      { kind: "status", label: "Current order status", detail: "Text status, tidak bergantung pada warna" },
      { kind: "timeline", label: "Public timeline", detail: "Retail dan custom-print progression" },
      { kind: "summary", label: "Items or custom scope", detail: "Customer-safe details only" },
      { kind: "actions", label: "Next public action", detail: "Payment, tracking, atau recovery" },
      { kind: "footer", label: "Help contact", detail: "Expired token dan not-found recovery" },
    ],
  },
  {
    id: "admin-action-queue",
    number: "14",
    title: "Admin Action Queue",
    route: "/admin",
    audience: "Owner/Admin",
    scope: "MVP",
    goal: "Mengarahkan operator ke keputusan berikutnya yang paling penting.",
    primary: "Open next action",
    next: "Relevant admin detail or valid transition",
    states: ["populated", "empty queue", "stale data", "permission denied", "action conflict"],
    mobile: "Queue rows stacked; urgent count dan primary action tetap terlihat.",
    blocks: [
      { kind: "nav", label: "Authenticated admin shell", detail: "Action Queue, Orders, Custom Print, Products, Portfolio" },
      { kind: "hero", label: "Operational context", detail: "Urgent, aging, dan exception summary" },
      { kind: "filters", label: "Queue segments", detail: "Filter tidak menyembunyikan urgent count" },
      { kind: "list", label: "Prioritized action rows", detail: "Brief, quote, paid order, measurement, stock" },
      { kind: "status", label: "Exceptions", detail: "Failed action dan stale record" },
      { kind: "actions", label: "Operator action", detail: "Focus kembali ke row setelah selesai" },
    ],
  },
  {
    id: "admin-orders",
    number: "15",
    title: "Admin Orders",
    route: "/admin/orders",
    audience: "Owner/Admin",
    scope: "MVP",
    goal: "Mengelola order retail dan custom sesuai state machine.",
    primary: "Open order detail",
    next: "Allowed transition dan audit history",
    states: ["loading", "populated", "empty", "invalid transition", "update pending"],
    mobile: "Table rows menjadi labeled summary cards dengan state dekat action.",
    blocks: [
      { kind: "nav", label: "Admin shell", detail: "Orders aktif dan navigation rail" },
      { kind: "filters", label: "Search and filters", detail: "Type, status, age, exception" },
      { kind: "table", label: "Orders table", detail: "Reference, customer, type, payment/shipping, status" },
      { kind: "content", label: "Selected order detail", detail: "Drawer atau route detail" },
      { kind: "actions", label: "Valid transition", detail: "Reason dan conflict recovery" },
      { kind: "timeline", label: "Audit history", detail: "Operator dan timestamp" },
    ],
  },
  {
    id: "admin-custom-print",
    number: "16",
    title: "Admin Custom Print Review",
    route: "/admin/custom-print",
    audience: "Owner/Admin",
    scope: "MVP",
    goal: "Memeriksa file private, memvalidasi slicing, dan mengirim quote.",
    primary: "Send quote",
    next: "Customer Quote Review",
    states: ["new request", "file unavailable", "missing slicer input", "quote draft", "quote sent"],
    mobile: "Context dan file status mendahului pricing; preview quote berada di akhir.",
    blocks: [
      { kind: "nav", label: "Admin custom-print shell", detail: "Request list dan review context" },
      { kind: "summary", label: "Request and customer context", detail: "Reference, contact, configuration" },
      { kind: "media", label: "private file access", detail: "Authorized status dan invalid-file recovery" },
      { kind: "form", label: "Verified slicer inputs", detail: "Weight, duration, material, quantity" },
      { kind: "form", label: "Deterministic pricing inputs", detail: "No instant geometry price" },
      { kind: "summary", label: "Immutable quote preview", detail: "Breakdown, assumptions, expiry" },
      { kind: "actions", label: "Operator action bar", detail: "Save draft, send, valid transition" },
    ],
  },
  {
    id: "admin-products",
    number: "17",
    title: "Admin Products & Stock",
    route: "/admin/products",
    audience: "Owner/Admin",
    scope: "MVP",
    goal: "Mengelola catalog, variant, price, stock, dan publish state.",
    primary: "Save product or stock change",
    next: "Updated catalog state dan audit context",
    states: ["populated", "empty", "unsaved changes", "stock conflict", "permission denied"],
    mobile: "Product identity dan stock mendahului metadata sekunder.",
    blocks: [
      { kind: "nav", label: "Admin catalog shell", detail: "Products aktif, create action tersedia" },
      { kind: "filters", label: "Search and product filters", detail: "SKU, publish state, stock" },
      { kind: "table", label: "Product list", detail: "Product, SKU, variant, price, stock, publish" },
      { kind: "form", label: "Product editor", detail: "Identity, description, media, variant" },
      { kind: "form", label: "Stock adjustment", detail: "Quantity dan reason" },
      { kind: "actions", label: "Save and publish", detail: "Unsaved warning, validation, conflict" },
    ],
  },
  {
    id: "admin-portfolio",
    number: "18",
    title: "Admin Portfolio",
    route: "/admin/portfolio",
    audience: "Owner/Admin",
    scope: "MVP",
    goal: "Mengelola project proof tanpa membocorkan client material.",
    primary: "Save draft or publish",
    next: "Public Projects / Project Detail setelah permission valid",
    states: ["draft", "missing content", "missing alt text", "permission blocked", "publish failure"],
    mobile: "Editor mengikuti narrative order; permission checklist sebelum publish.",
    blocks: [
      { kind: "nav", label: "Admin portfolio shell", detail: "Portfolio list dan create/edit" },
      { kind: "list", label: "Project list", detail: "Draft dan published state" },
      { kind: "form", label: "Narrative editor", detail: "Title, outcome, context, challenge, process, result" },
      { kind: "media", label: "Media manager", detail: "Upload state, caption, alt text" },
      { kind: "status", label: "Client/publication permission", detail: "Blocked until permission is valid" },
      { kind: "actions", label: "Preview, save, publish", detail: "Preview bukan satu-satunya status signal" },
    ],
  },
  {
    id: "admin-sign-in",
    number: "19",
    title: "Admin Sign-in",
    route: "/admin/sign-in",
    audience: "Owner/Admin",
    scope: "MVP",
    goal: "Menyediakan akses Clerk-backed ke operations shell.",
    primary: "Sign in",
    next: "Admin Action Queue",
    states: ["default", "provider error", "unauthorized role", "inactive user", "success redirect"],
    mobile: "Single centered task dengan recovery/support context yang singkat.",
    blocks: [
      { kind: "auth", label: "Clerk sign-in", detail: "Provider-managed identity and credential fields" },
      { kind: "status", label: "Role boundary", detail: "Owner/Admin only; no open admin registration" },
      { kind: "actions", label: "Sign-in and recovery", detail: "Error dekat field, focus tetap terlihat" },
    ],
  },
  {
    id: "customer-account",
    number: "20",
    title: "Customer Account Access",
    route: "/account",
    audience: "Customer",
    scope: "DEFERRED",
    goal: "Memetakan future login/register tanpa mengubah guest checkout.",
    primary: "Deferred decision",
    next: "Revisit after MVP evidence",
    states: ["signed out", "invalid credential", "new account", "verification pending"],
    mobile: "Placeholder saja; tidak ada customer account flow pada MVP.",
    blocks: [
      { kind: "auth", label: "Customer login/register placeholder", detail: "Deferred, not implemented" },
      { kind: "content", label: "Potential account value", detail: "Recovery dan order history untuk fase berikutnya" },
      { kind: "status", label: "Guest checkout remains", detail: "Shop, Cart, Checkout tetap usable tanpa account" },
    ],
  },
];

function WireframeBlock({ block }: { block: WireframeBlock }) {
  return (
    <div className={blockStyle[block.kind]} data-wireframe-block={block.kind}>
      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className="flex size-5 shrink-0 items-center justify-center border border-current text-[10px] font-bold leading-none"
        >
          {blockMarker[block.kind]}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold leading-4">{block.label}</p>
          {block.detail ? (
            <p className="mt-1 text-[11px] leading-4 text-zinc-600">{block.detail}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ScreenFrame({ screen }: { screen: WireframeScreen }) {
  const scopeLabel = screen.scope === "MVP" ? "MVP" : "Deferred";

  return (
    <article
      className="flex h-full flex-col border-2 border-zinc-950 bg-white"
      data-wireframe-screen={screen.id}
      data-wireframe-scope={screen.scope.toLowerCase()}
    >
      <header className="border-b-2 border-zinc-950 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-zinc-500">
              SCREEN {screen.number}
            </p>
            <h2 className="mt-1 text-lg font-bold leading-tight">{screen.title}</h2>
          </div>
          <span className="shrink-0 border border-zinc-950 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
            {scopeLabel}
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-zinc-600">
          {screen.route} / {screen.audience}
        </p>
      </header>

      <div
        className="space-y-2 p-3"
        aria-label={screen.title + " wireframe"}
      >
        {screen.blocks.map((block, index) => (
          <WireframeBlock key={screen.id + "-" + block.kind + "-" + index} block={block} />
        ))}
      </div>

      <div className="mt-auto border-t border-zinc-300 p-3">
        <dl className="space-y-2 text-[11px] leading-4">
          <div>
            <dt className="font-bold uppercase tracking-[0.1em] text-zinc-500">Job</dt>
            <dd className="mt-0.5">{screen.goal}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-[0.1em] text-zinc-500">Primary action</dt>
            <dd className="mt-0.5">{screen.primary}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-[0.1em] text-zinc-500">Next state</dt>
            <dd className="mt-0.5">{screen.next}</dd>
          </div>
        </dl>

        <details className="mt-3 border-t border-dashed border-zinc-400 pt-2">
          <summary className="cursor-pointer text-[11px] font-bold underline underline-offset-2">
            States and responsive note
          </summary>
          <div className="mt-2 space-y-2 text-[11px] leading-4 text-zinc-600">
            <p>
              <span className="font-bold text-zinc-900">States:</span>{" "}
              {screen.states.join(" / ")}
            </p>
            <p>
              <span className="font-bold text-zinc-900">Mobile:</span> {screen.mobile}
            </p>
          </div>
        </details>
      </div>
    </article>
  );
}

export const metadata: Metadata = {
  title: "Niuva MVP Wireframes",
  description:
    "Annotated low-fi wireframe board untuk 20 surface Niuva MVP dan deferred scope.",
};

export default function WireframesPage() {
  return (
    <main
      className="min-h-screen bg-zinc-100 text-zinc-950"
      data-wireframe-board
      data-wireframe-approved-at="2026-09-03"
      data-wireframe-count={wireframeScreens.length}
      data-wireframe-grayscale="true"
      data-wireframe-status="approved-mvp-architecture"
    >
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-zinc-950 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        href="#wireframe-canvas"
      >
        Skip to wireframe canvas
      </a>

      <div className="mx-auto max-w-[1800px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="border-b-2 border-zinc-950 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
              Niuva / AUiS / Wireframes
            </p>
            <Link
              className="border border-zinc-950 bg-white px-3 py-2 text-xs font-bold underline underline-offset-2 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2"
              href="/auis/styleguide"
            >
              Kembali ke style guide
            </Link>
          </div>

          <div className="mt-8 max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-600">
              Annotated low-fi / MVP architecture approved
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-6xl">
              Niuva MVP Wireframe Board
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-700 sm:text-lg">
              Satu peta untuk 20 surface: 18 key screens dari PRD, Admin
              Sign-in sebagai kebutuhan MVP, dan Customer Account Access sebagai
              deferred boundary. Board ini mengunci flow dan state setelah
              approval arsitektur, bukan visual final.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="border-2 border-zinc-950 bg-white p-4">
              <p className="text-3xl font-bold">18</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-600">
                PRD key screens / MVP
              </p>
            </div>
            <div className="border-2 border-zinc-950 bg-zinc-900 p-4 text-white">
              <p className="text-3xl font-bold">1</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-300">
                Admin Sign-in / MVP
              </p>
            </div>
            <div className="border-2 border-zinc-950 bg-zinc-200 p-4">
              <p className="text-3xl font-bold">1</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-600">
                Customer Account / Deferred
              </p>
            </div>
          </div>
        </header>

        <section className="border-b border-zinc-400 py-6" aria-labelledby="board-boundary">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h2 id="board-boundary" className="text-xl font-bold">
                Review boundary
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-700">
                Grayscale dipakai agar hierarchy, content priority, recovery,
                dan responsive behavior dapat dinilai tanpa tertarik pada
                palette, font treatment, motion, atau dekorasi. Tidak ada screen
                pada board ini yang otomatis menjadi product-screen approval.
              </p>
            </div>
            <div className="border border-zinc-950 bg-white p-4 text-sm leading-6 lg:max-w-md">
              <p className="font-bold">MVP rule</p>
              <p className="mt-1 text-zinc-700">
                Customer checkout tetap guest. Admin registration tidak menjadi
                public form. Customer account access tetap deferred.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-zinc-400 py-6" aria-labelledby="flow-map">
          <h2 id="flow-map" className="text-xl font-bold">
            Flow map
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="border border-zinc-500 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                Public / B2B
              </p>
              <p className="mt-2 text-sm leading-6">
                {"Homepage -> Services -> Projects -> Project Detail -> Project Brief"}
              </p>
            </div>
            <div className="border border-zinc-500 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                Retail
              </p>
              <p className="mt-2 text-sm leading-6">
                {"Shop -> Product Detail -> Cart -> Guest Checkout -> Order Status"}
              </p>
            </div>
            <div className="border border-zinc-500 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                Custom print
              </p>
              <p className="mt-2 text-sm leading-6">
                {"Landing -> Request -> Operator Review -> Quote Review -> Production"}
              </p>
            </div>
            <div className="border border-zinc-500 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                Operations
              </p>
              <p className="mt-2 text-sm leading-6">
                {"Admin Sign-in -> Action Queue -> Orders / Custom Print / Catalog / Portfolio"}
              </p>
            </div>
          </div>
        </section>

        <section id="wireframe-canvas" className="scroll-mt-6 py-8" aria-labelledby="canvas-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="canvas-heading" className="text-2xl font-bold">
                20 annotated surfaces
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Setiap frame memuat job, primary action, next state, state coverage,
                dan catatan mobile.
              </p>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
              MVP architecture approved / visual proof pending
            </p>
          </div>

          <div className="mt-6 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {wireframeScreens.map((screen) => (
              <ScreenFrame key={screen.id} screen={screen} />
            ))}
          </div>
        </section>

        <section className="border-t-2 border-zinc-950 py-8" aria-labelledby="next-gate">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
                Next gate
              </p>
              <h2 id="next-gate" className="mt-2 text-2xl font-bold">
                Approve the map before polishing the screens
              </h2>
            </div>
            <div className="border border-zinc-500 bg-white p-5 text-sm leading-6">
              <p>
                Approval owner mencakup inventory 20 surface, batas MVP versus
                deferred, primary job setiap screen, journey, field, state,
                responsive order, dan accessibility constraint.
              </p>
              <p className="mt-3">
                Approval board ini belum menyetujui homepage atau project brief
                secara visual, belum mengaktifkan propagation luas, dan belum
                menyetujui Creative atau Decorative Effects.
              </p>
              <p className="mt-3 font-bold">
                Selanjutnya pilih satu vertical slice untuk
                higher-fidelity proof dengan Foundation, Primitives, dan Core
                Components yang sudah approved.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
