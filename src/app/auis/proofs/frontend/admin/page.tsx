import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/niuva/admin-shell";
import {
  AdminActionQueue,
  type AdminQueueScenario,
} from "@/features/admin/action-queue";
import {
  AdminOrdersList,
  type AdminOrdersScenario,
} from "@/features/admin/orders-list";
import {
  AdminProductsList,
  type AdminProductsScenario,
} from "@/features/admin/products-list";
import {
  AdminPortfolioList,
  type AdminPortfolioScenario,
} from "@/features/admin/portfolio-list";
import {
  AdminProductEditor,
} from "@/features/admin/product-editor";
import type { AdminProductEditorScenario } from "@/features/admin/product-editor-data";
import {
  AdminCustomRequestList,
  type AdminCustomRequestScenario,
} from "@/features/admin/custom-request-list";
import {
  AdminQuoteEditor,
} from "@/features/admin/quote-editor";
import type { AdminQuoteScenario } from "@/features/admin/quote-preview-data";
import type { AdminPreviewRole } from "@/features/admin/order-preview-data";
import {
  getAdminPreviewAccessLabel,
  getAdminPreviewRouteTarget,
  SignInView,
  type AdminPreviewState,
} from "@/features/admin/sign-in-view";

export const metadata: Metadata = {
  title: "Preview admin · Niuva",
  description: "Preview development untuk shell dan status akses admin Niuva.",
  robots: { follow: false, index: false },
};

const previewStates = ["auth-unavailable", "forbidden", "ready"] as const satisfies readonly AdminPreviewState[];
const queueScenarios = ["populated", "loading", "empty", "stale"] as const satisfies readonly AdminQueueScenario[];
const ordersScenarios = ["populated", "loading", "empty", "error"] as const satisfies readonly AdminOrdersScenario[];
const productsScenarios = ["populated", "loading", "empty", "error"] as const satisfies readonly AdminProductsScenario[];
const portfolioScenarios = ["populated", "loading", "empty", "error"] as const satisfies readonly AdminPortfolioScenario[];
const productEditorScenarios = ["ready", "loading", "empty", "error", "conflict"] as const satisfies readonly AdminProductEditorScenario[];
const customRequestScenarios = ["populated", "loading", "empty", "error"] as const satisfies readonly AdminCustomRequestScenario[];
const quoteScenarios = ["ready", "rule-missing", "loading", "empty", "error"] as const satisfies readonly AdminQuoteScenario[];
const previewModules = ["action-queue", "orders", "custom-print", "quotes", "products", "portfolio"] as const;
const previewRoles = ["OWNER", "ADMIN"] as const satisfies readonly AdminPreviewRole[];

type AdminPreviewModule = (typeof previewModules)[number];
type ProductPreviewView = "list" | "editor";

function getPreviewState(value: string | string[] | undefined): AdminPreviewState {
  const candidate = Array.isArray(value) ? undefined : value;

  return previewStates.includes(candidate as AdminPreviewState)
    ? (candidate as AdminPreviewState)
    : "auth-unavailable";
}

function getQueueScenario(value: string | string[] | undefined): AdminQueueScenario {
  const candidate = Array.isArray(value) ? undefined : value;

  return queueScenarios.includes(candidate as AdminQueueScenario)
    ? (candidate as AdminQueueScenario)
    : "populated";
}

function getOrdersScenario(value: string | string[] | undefined): AdminOrdersScenario {
  const candidate = Array.isArray(value) ? undefined : value;

  return ordersScenarios.includes(candidate as AdminOrdersScenario)
    ? (candidate as AdminOrdersScenario)
    : "populated";
}

function getProductsScenario(value: string | string[] | undefined): AdminProductsScenario {
  const candidate = Array.isArray(value) ? undefined : value;

  return productsScenarios.includes(candidate as AdminProductsScenario)
    ? (candidate as AdminProductsScenario)
    : "populated";
}

function getPortfolioScenario(value: string | string[] | undefined): AdminPortfolioScenario {
  const candidate = Array.isArray(value) ? undefined : value;

  return portfolioScenarios.includes(candidate as AdminPortfolioScenario)
    ? (candidate as AdminPortfolioScenario)
    : "populated";
}

function getProductEditorScenario(value: string | string[] | undefined): AdminProductEditorScenario {
  const candidate = Array.isArray(value) ? undefined : value;

  return productEditorScenarios.includes(candidate as AdminProductEditorScenario)
    ? (candidate as AdminProductEditorScenario)
    : "ready";
}

function getProductPreviewView(value: string | string[] | undefined): ProductPreviewView {
  return !Array.isArray(value) && value === "editor" ? "editor" : "list";
}

function getCustomRequestScenario(value: string | string[] | undefined): AdminCustomRequestScenario {
  const candidate = Array.isArray(value) ? undefined : value;

  return customRequestScenarios.includes(candidate as AdminCustomRequestScenario)
    ? (candidate as AdminCustomRequestScenario)
    : "populated";
}

function getQuoteScenario(value: string | string[] | undefined): AdminQuoteScenario {
  const candidate = Array.isArray(value) ? undefined : value;

  return quoteScenarios.includes(candidate as AdminQuoteScenario)
    ? (candidate as AdminQuoteScenario)
    : "ready";
}

function getPreviewModule(value: string | string[] | undefined): AdminPreviewModule {
  const candidate = Array.isArray(value) ? undefined : value;

  return previewModules.includes(candidate as AdminPreviewModule)
    ? (candidate as AdminPreviewModule)
    : "action-queue";
}

function getSelectedOrderReference(value: string | string[] | undefined): string | null {
  return Array.isArray(value) || typeof value !== "string" ? null : value;
}

function getSelectedCustomRequestReference(value: string | string[] | undefined): string | null {
  return Array.isArray(value) || typeof value !== "string" ? null : value;
}

function getSelectedQuoteReference(value: string | string[] | undefined): string | null {
  return Array.isArray(value) || typeof value !== "string" ? null : value;
}

function getInitialProductSearch(value: string | string[] | undefined): string {
  if (Array.isArray(value) || typeof value !== "string") return "";

  return value.slice(0, 120);
}

function getPreviewRole(value: string | string[] | undefined): AdminPreviewRole {
  const candidate = Array.isArray(value) ? undefined : value;

  return previewRoles.includes(candidate as AdminPreviewRole)
    ? (candidate as AdminPreviewRole)
    : "OWNER";
}

export default async function AdminPreviewPage({
  searchParams,
}: PageProps<"/auis/proofs/frontend/admin">) {
  const query = await searchParams;

  if (process.env.NODE_ENV !== "development" || query.preview !== "examples") {
    notFound();
  }

  const state = getPreviewState(query.state);
  const queueScenario = getQueueScenario(query.queue);
  const ordersScenario = getOrdersScenario(query.orders);
  const productsScenario = getProductsScenario(query.products);
  const portfolioScenario = getPortfolioScenario(query.portfolio);
  const productEditorScenario = getProductEditorScenario(query.editor);
  const productPreviewView = getProductPreviewView(query.view);
  const customRequestScenario = getCustomRequestScenario(query.custom);
  const quoteScenario = getQuoteScenario(query.quoteState);
  const activePreviewModule = getPreviewModule(query.module);
  const previewRole = getPreviewRole(query.role);
  const selectedOrderReference = getSelectedOrderReference(query.order);
  const selectedCustomRequestReference = getSelectedCustomRequestReference(query.request);
  const selectedQuoteReference = getSelectedQuoteReference(query.quote);
  const initialProductSearch = getInitialProductSearch(query.sku);

  return (
    <AdminShell
      accessLabel={getAdminPreviewAccessLabel(state)}
      activeModule={state === "ready" ? activePreviewModule : null}
      routeTarget={getAdminPreviewRouteTarget(state)}
    >
      {state !== "ready" ? <SignInView state={state} /> : null}
      {state === "ready" && activePreviewModule === "action-queue" ? <AdminActionQueue initialScenario={queueScenario} /> : null}
      {state === "ready" && activePreviewModule === "orders" ? (
        <AdminOrdersList
          initialRole={previewRole}
          initialScenario={ordersScenario}
          initialSelectedReference={selectedOrderReference}
        />
      ) : null}
      {state === "ready" && activePreviewModule === "custom-print" ? (
        <AdminCustomRequestList
          initialScenario={customRequestScenario}
          initialSelectedReference={selectedCustomRequestReference}
        />
      ) : null}
      {state === "ready" && activePreviewModule === "quotes" ? (
        <AdminQuoteEditor
          initialScenario={quoteScenario}
          initialSelectedReference={selectedQuoteReference}
        />
      ) : null}
      {state === "ready" && activePreviewModule === "products" ? (
        productPreviewView === "editor" ? (
          <AdminProductEditor
            initialScenario={productEditorScenario}
            initialSelectedSku={initialProductSearch || null}
          />
        ) : (
          <AdminProductsList
            initialScenario={productsScenario}
            initialSearch={initialProductSearch}
          />
        )
      ) : null}
      {state === "ready" && activePreviewModule === "portfolio" ? <AdminPortfolioList initialScenario={portfolioScenario} /> : null}
    </AdminShell>
  );
}
