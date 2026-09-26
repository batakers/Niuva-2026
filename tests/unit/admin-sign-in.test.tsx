import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ClerkState = "loading" | "loaded" | "failed" | "degraded";

const clerkMocks = vi.hoisted(() => ({
  state: "loaded" as ClerkState,
}));

type ControlProps = Readonly<{ children?: ReactNode }>;
type ClerkAppearance = Readonly<{
  elements: Readonly<{
    formButtonPrimary: Readonly<{ boxShadow: string; minHeight: string }>;
    formFieldInput: Readonly<{ minHeight: string }>;
    socialButtonsBlockButton: Readonly<{ boxShadow: string; minHeight: string }>;
  }>;
  options: Readonly<{ elevation: string }>;
  variables: Readonly<Readonly<{ colorPrimary: string }>>;
}>;
type SignInProps = Readonly<{
  forceRedirectUrl: string;
  path: string;
  routing: string;
  withSignUp: boolean;
  appearance: ClerkAppearance;
}>;

vi.mock("@clerk/nextjs", () => ({
  ClerkDegraded: ({ children }: ControlProps) =>
    clerkMocks.state === "degraded" ? <>{children}</> : null,
  ClerkFailed: ({ children }: ControlProps) =>
    clerkMocks.state === "failed" ? <>{children}</> : null,
  ClerkLoaded: ({ children }: ControlProps) =>
    clerkMocks.state === "loaded" ? <>{children}</> : null,
  ClerkLoading: ({ children }: ControlProps) =>
    clerkMocks.state === "loading" ? <>{children}</> : null,
  SignIn: ({ appearance, forceRedirectUrl, path, routing, withSignUp }: SignInProps) => (
    <div
      data-testid="clerk-sign-in"
      data-appearance-elevation={appearance.options.elevation}
      data-primary-button-shadow={appearance.elements.formButtonPrimary.boxShadow}
      data-form-button-min-height={appearance.elements.formButtonPrimary.minHeight}
      data-form-input-min-height={appearance.elements.formFieldInput.minHeight}
      data-social-button-shadow={appearance.elements.socialButtonsBlockButton.boxShadow}
      data-primary={appearance.variables.colorPrimary}
      data-force-redirect-url={forceRedirectUrl}
      data-path={path}
      data-routing={routing}
      data-with-sign-up={String(withSignUp)}
    />
  ),
}));

import AdminSignInPage from "@/app/admin/sign-in/page";

beforeEach(() => {
  clerkMocks.state = "loaded";
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_example");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin sign-in", () => {
  it("renders a visible loading state while Clerk initializes", () => {
    clerkMocks.state = "loading";

    render(<AdminSignInPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Memuat layanan login");
    expect(screen.queryByTestId("clerk-sign-in")).not.toBeInTheDocument();
  });

  it("preserves the existing SignIn route and redirect props after Clerk loads", () => {
    render(<AdminSignInPage />);

    const signIn = screen.getByTestId("clerk-sign-in");
    expect(signIn).toHaveAttribute("data-path", "/admin/sign-in");
    expect(signIn).toHaveAttribute("data-routing", "path");
    expect(signIn).toHaveAttribute("data-force-redirect-url", "/admin");
    expect(signIn).toHaveAttribute("data-with-sign-up", "false");
  });

  it("passes the Niuva appearance contract to Clerk", () => {
    render(<AdminSignInPage />);

    const signIn = screen.getByTestId("clerk-sign-in");
    expect(signIn).toHaveAttribute("data-appearance-elevation", "flush");
    expect(signIn).toHaveAttribute("data-primary", "var(--primary)");
    expect(signIn).toHaveAttribute("data-form-button-min-height", "44px");
    expect(signIn).toHaveAttribute("data-form-input-min-height", "44px");
    expect(signIn).toHaveAttribute("data-primary-button-shadow", "none !important");
    expect(signIn).toHaveAttribute("data-social-button-shadow", "none !important");
  });

  it.each(["failed", "degraded"] as const)(
    "renders a recoverable alert instead of a blank card when Clerk is %s",
    (state) => {
      clerkMocks.state = state;

      render(<AdminSignInPage />);

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Layanan login belum dapat dimuat.",
      );
      expect(screen.getByRole("link", { name: "Coba lagi" })).toHaveAttribute(
        "href",
        "/admin/sign-in",
      );
      expect(screen.queryByTestId("clerk-sign-in")).not.toBeInTheDocument();
    },
  );

  it("keeps the existing safe fallback when Clerk is not configured", () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");

    render(<AdminSignInPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Login admin belum tersedia.",
    );
    expect(screen.queryByTestId("clerk-sign-in")).not.toBeInTheDocument();
  });
});
