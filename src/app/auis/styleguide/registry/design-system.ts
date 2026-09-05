export type DesignSystemLayerId =
  | "foundation"
  | "primitives"
  | "core-components"
  | "motion-system"
  | "creative-components"
  | "decorative-effects"
  | "patterns"
  | "governance";

export type DesignSystemStatus =
  | "approved"
  | "implemented"
  | "review-required"
  | "candidate"
  | "restricted"
  | "planned";

export type RegistrySourceKind = "platform" | "dependency" | "owned" | "reference";

export type RegistrySourceStatus =
  | "approved"
  | "implemented"
  | "candidate"
  | "reference-only"
  | "restricted";

export interface DesignSystemLayer {
  boundary: string;
  id: DesignSystemLayerId;
  intent: string;
  items: readonly string[];
  number: string;
  owner: string;
  source: string;
  status: DesignSystemStatus;
  title: string;
}

export interface RegistrySource {
  boundary: string;
  id: string;
  kind: RegistrySourceKind;
  label: string;
  reference: string;
  role: string;
  status: RegistrySourceStatus;
}

export interface DesignSystemComponentGroup {
  boundary: string;
  id: string;
  items: readonly string[];
  layer: DesignSystemLayerId;
  label: string;
  source: string;
  status: DesignSystemStatus;
}

export interface DesignSystemPattern {
  boundary: string;
  id: string;
  label: string;
  items: readonly string[];
  source: string;
  status: DesignSystemStatus;
  visualReviewApprovedAt?: string;
}

export const designSystemMeta = {
  approvedAt: "2026-09-02",
  foundationVisualApprovedAt: "2026-09-03",
  motionSystemVersion: "1.0",
  motionSystemVisualApprovedAt: "2026-09-03",
  p0P1VisualApprovedAt: "2026-09-02",
  patternProofStatus: "approved-styleguide-only",
  patternProofVisualApprovedAt: "2026-09-03",
  productScreenPropagationAllowed: false,
  productScreenProofRoutes: ["/", "/project-brief"],
  productScreenProofStatus: "authorized-proof",
  productScreenProofVisualAcceptance: "pending-owner-review",
  scope: "styleguide-only",
  source: "src/app/auis/styleguide/registry/design-system.ts",
  status: "architecture-approved",
  version: "1.0",
} as const;

export const designSystemLayers = [
  {
    boundary: "Only approved semantic tokens and documented foundation roles may enter this layer.",
    id: "foundation",
    intent: "The visual language and measurable rules shared by every Niuva surface.",
    items: [
      "Typography",
      "Color",
      "Spacing",
      "Sizing",
      "Radius",
      "Border",
      "Shadow",
      "Opacity",
      "Z-index",
      "Breakpoints",
      "Motion tokens",
      "Iconography",
      "Density",
      "Semantic states",
    ],
    number: "01",
    owner: "AUiS foundation",
    source: "foundation/tokens.ts + Typography System v1.0",
    status: "approved",
    title: "Foundation",
  },
  {
    boundary: "Behavior and accessibility primitives only; no Niuva business meaning.",
    id: "primitives",
    intent: "Reliable anatomy, accessibility, focus, keyboard, and state behavior.",
    items: [
      "Native HTML baseline",
      "Base UI interaction primitives",
      "Accessibility contract",
      "Focus management",
      "Keyboard interaction",
      "State behavior",
      "Radix exception path",
    ],
    number: "02",
    owner: "components/ui bridge",
    source: "Native HTML + Base UI; Radix only for a documented gap",
    status: "implemented",
    title: "Primitives",
  },
  {
    boundary: "Source-owned UI contracts; the initial P0/P1 set is approved for styleguide proof, while new additions require a separate review.",
    id: "core-components",
    intent: "Reusable Niuva controls, composites, and interaction surfaces.",
    items: [
      "Niuva Button",
      "Niuva Input",
      "Niuva Select",
      "Niuva Card",
      "Niuva Dialog",
      "Niuva Tabs",
      "Niuva Navigation",
      "Niuva composites",
    ],
    number: "03",
    owner: "components/ui + components/niuva",
    source: "shadcn source distribution + Base UI + custom Niuva",
    status: "approved",
    title: "Core Components",
  },
  {
    boundary: "Approved CSS-first motion may clarify state or hierarchy, never become the only way to understand an action; a physics engine remains a separate candidate.",
    id: "motion-system",
    intent: "A restrained, accessible vocabulary for feedback and transitions.",
    items: [
      "Duration",
      "Easing",
      "Spring",
      "Enter / exit",
      "Hover",
      "Press",
      "Scroll",
      "Layout transition",
    ],
    number: "04",
    owner: "foundation motion tokens + recipe layer",
    source: "foundation/motion.ts + styleguide-scoped CSS custom properties; Motion remains a candidate engine",
    status: "approved",
    title: "Motion System",
  },
  {
    boundary: "Reference implementations must be adapted to Niuva evidence, tokens, accessibility, and performance rules.",
    id: "creative-components",
    intent: "Selective signature interactions that add meaning to a real Niuva story.",
    items: [
      "React Bits",
      "Animate UI",
      "Cult UI",
      "Aceternity",
      "Custom Niuva interactions",
    ],
    number: "05",
    owner: "creative review gate",
    source: "Reference-only sources; copied and owned when approved",
    status: "candidate",
    title: "Creative Components",
  },
  {
    boundary: "Exception-only layer; never required for comprehension, checkout completion, or admin operation.",
    id: "decorative-effects",
    intent: "Optional atmosphere for evidence-led moments, with static fallbacks.",
    items: [
      "Magic UI references",
      "React Bits backgrounds",
      "SVG effects",
      "CSS effects",
      "Gradient effects",
      "Noise / texture",
      "Grid / glow",
    ],
    number: "06",
    owner: "visual review + performance gate",
    source: "Reference catalog; no effect is official by default",
    status: "restricted",
    title: "Decorative Effects",
  },
  {
    boundary: "Patterns compose official components; the current four proofs are approved for styleguide-only use, remain route-owned, and do not create new tokens, primitives, or domain rules.",
    id: "patterns",
    intent: "Repeatable compositions for public, retail, checkout, and admin journeys.",
    items: [
      "Hero / case-study opener",
      "Product Card",
      "Product Gallery",
      "Checkout Summary",
      "Filter Bar / Search",
      "Site Navigation",
      "CTA sections",
      "Admin Action Queue",
    ],
    number: "07",
    owner: "route composition until repetition is proven",
    source: "Official components + Niuva content/journey evidence + styleguide proof",
    status: "approved",
    title: "Patterns",
  },
  {
    boundary: "Governance controls provenance, promotion, acceptance, and propagation boundaries.",
    id: "governance",
    intent: "Keep the system coherent as it grows without turning it into a library dump.",
    items: [
      "Registry and provenance",
      "Promotion states",
      "Accessibility matrix",
      "Motion / performance budget",
      "Visual proof and acceptance",
      "Changelog and deprecation",
    ],
    number: "08",
    owner: "Niuva design-system review",
    source: "design-system.ts + components.json + contract documentation",
    status: "implemented",
    title: "Governance",
  },
] as const satisfies readonly DesignSystemLayer[];

export const registrySources = [
  {
    boundary: "Semantic HTML remains the default when it provides the required behavior.",
    id: "native-html",
    kind: "platform",
    label: "Native HTML",
    reference: "platform baseline",
    role: "Semantic structure, form controls, links, and progressive enhancement.",
    status: "approved",
  },
  {
    boundary: "Primary primitive source for focus, keyboard, popup, and state behavior.",
    id: "base-ui",
    kind: "dependency",
    label: "Base UI",
    reference: "@base-ui/react",
    role: "Unstyled accessible interaction primitives.",
    status: "approved",
  },
  {
    boundary: "Source distribution, not a black-box runtime component dependency.",
    id: "shadcn",
    kind: "reference",
    label: "shadcn/ui",
    reference: "components.json · base-nova",
    role: "Core component source and compositional conventions.",
    status: "approved",
  },
  {
    boundary: "One icon vocabulary across primitives, composites, and patterns.",
    id: "lucide",
    kind: "dependency",
    label: "Lucide",
    reference: "lucide-react",
    role: "Consistent, named interface iconography.",
    status: "approved",
  },
  {
    boundary: "Niuva meaning and product context live here; business authority stays outside the component.",
    id: "custom-niuva",
    kind: "owned",
    label: "Custom Niuva",
    reference: "src/components/niuva",
    role: "Evidence, status, money, upload, timeline, and operator composites.",
    status: "implemented",
  },
  {
    boundary: "The CSS-first Motion System v1 is approved without this candidate runtime engine.",
    id: "motion",
    kind: "reference",
    label: "Motion",
    reference: "candidate engine · not installed",
    role: "Future spring, gesture, and layout recipes after a separate decision.",
    status: "candidate",
  },
  {
    boundary: "Candidate sources are copied, reviewed, and adapted; they are never imported wholesale.",
    id: "creative-catalog",
    kind: "reference",
    label: "Creative catalog",
    reference: "React Bits · Animate UI · Cult UI · Aceternity · Magic UI",
    role: "Reference implementations for selective interaction and effect proposals.",
    status: "reference-only",
  },
] as const satisfies readonly RegistrySource[];

export const designSystemComponentGroups = [
  {
    boundary: "No Niuva business semantics or domain rules.",
    id: "primitive-bridge",
    items: [
      "Button",
      "AuLink",
      "Input",
      "Icon",
      "Label",
      "Select",
      "Dialog",
      "Tabs",
      "Tooltip",
      "Dropdown menu",
    ],
    layer: "primitives",
    label: "Primitive bridge",
    source: "Native HTML + Base UI + shadcn source",
    status: "implemented",
  },
  {
    boundary: "Reusable anatomy and state contract approved for the styleguide; authoritative data arrives through props.",
    id: "core-ui",
    items: [
      "Niuva Button",
      "Niuva Input",
      "Niuva Select",
      "Niuva Card",
      "Niuva Dialog",
      "Niuva Tabs",
      "Niuva Navigation",
    ],
    layer: "core-components",
    label: "Core UI components",
    source: "Contract-only aliases; runtime modules are not implemented yet",
    status: "planned",
  },
  {
    boundary: "Niuva meaning without pricing, stock, payment, upload, or transition authority; the initial P0/P1 set is visually approved for the styleguide.",
    id: "niuva-composites",
    items: [
      "EvidenceCard",
      "FormField",
      "StatusNotice",
      "ActionQueueItem",
      "MoneySummary",
      "FileUploadField",
      "OrderStatusTimeline",
      "VariantSelector",
    ],
    layer: "core-components",
    label: "Niuva composites",
    source: "Custom source in src/components/niuva",
    status: "approved",
  },
] as const satisfies readonly DesignSystemComponentGroup[];

export const designSystemPatterns = [
  {
    boundary: "Route-owned until repeated evidence proves a stable reusable boundary.",
    id: "hero-case-study",
    items: ["Hero", "case-study opener", "evidence rail", "directional CTA"],
    label: "Hero / case-study opener",
    source: "Public narrative composition + styleguide proof",
    status: "approved",
    visualReviewApprovedAt: "2026-09-03",
  },
  {
    boundary: "Product information stays factual; availability and price come from server data.",
    id: "product-discovery",
    items: ["Product Card", "Product Gallery", "Filter Bar", "Search"],
    label: "Product discovery",
    source: "Retail journey composition + styleguide proof",
    status: "approved",
    visualReviewApprovedAt: "2026-09-03",
  },
  {
    boundary: "Summary presents server-provided values and recovery states; it never calculates totals.",
    id: "checkout-summary",
    items: ["Checkout Summary", "shipping choice", "payment handoff", "recovery state"],
    label: "Checkout Summary",
    source: "Checkout flow composition + styleguide proof",
    status: "approved",
    visualReviewApprovedAt: "2026-09-03",
  },
  {
    boundary: "Operator priority and state remain domain-owned; the UI presents the next safe action.",
    id: "admin-action-queue",
    items: ["Site Navigation", "Admin Action Queue", "detail handoff", "status notice"],
    label: "Admin Action Queue",
    source: "Admin operational composition + styleguide proof",
    status: "approved",
    visualReviewApprovedAt: "2026-09-03",
  },
] as const satisfies readonly DesignSystemPattern[];

export const designSystemPromotionStages = [
  {
    description: "Source or idea used to inform a proposal; it is not an implementation instruction.",
    label: "Reference",
    number: "01",
  },
  {
    description: "Adapted proposal with source, owner, accessibility, and performance notes.",
    label: "Candidate",
    number: "02",
  },
  {
    description: "Rendered in the named proof surface across the relevant states and breakpoints.",
    label: "Proof",
    number: "03",
  },
  {
    description: "Owner accepts the contract, visual behavior, fallback, and boundaries.",
    label: "Approved",
    number: "04",
  },
  {
    description: "Only after a separate scoped task may it enter product screens as official usage.",
    label: "Official",
    number: "05",
  },
] as const;

export const designSystemGuardrails = [
  "Every component has a named owner, source/provenance, anatomy, states, and showcase requirement.",
  "Accessibility is a cross-layer contract: semantics, focus, keyboard, contrast, reduced motion, and recovery are testable.",
  "Motion v1 prioritizes transform/opacity, short purposeful durations, static fallbacks, and reduced-motion compatibility.",
  "Patterns compose official components; they do not introduce page-specific tokens or hidden domain logic.",
  "Creative components and decorative effects need a static fallback and cannot be required to complete a workflow.",
  "Global product-screen propagation remains disabled; scoped mapping is enabled only after a named proof receives owner approval.",
] as const;
