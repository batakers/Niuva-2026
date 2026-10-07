import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
const mocks = vi.hoisted(() => ({ post: vi.fn(), navigate: vi.fn() }));
vi.mock("@/components/niuva/admin-auth-form", () => ({ postAdminAuth: mocks.post }));
vi.mock("@/components/niuva/admin-auth-navigation", () => ({ navigateAfterAdminAuth: mocks.navigate }));
import { AdminSecurityForm } from "@/components/niuva/admin-security-form";

beforeEach(() => { mocks.post.mockResolvedValue({}); });
it("keeps password inputs disabled until hydration attaches their change handlers", async () => {
  const element = <AdminSecurityForm />;
  const container = document.createElement("div");
  container.innerHTML = renderToString(element);
  document.body.append(container);
  const inputs = Array.from(container.querySelectorAll("input[type=password]"));
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    expect(inputs).toHaveLength(3);
    for (const input of inputs) expect(input).toBeDisabled();
    await act(async () => { root = hydrateRoot(container, element); });
    for (const input of inputs) expect(input).toBeEnabled();
  } finally {
    await act(async () => { root?.unmount(); });
    container.remove();
  }
});
it("returns to login for fresh MFA after changing the password", async () => {
  render(<AdminSecurityForm />);
  fireEvent.change(screen.getByLabelText("Password saat ini"), { target: { value: "Fixture-old-password!" } });
  expect(screen.getByLabelText("Password baru", { exact: true })).toHaveAttribute("minlength", "8");
  expect(screen.getByLabelText("Password baru", { exact: true })).toHaveAttribute("maxlength", "15");
  fireEvent.change(screen.getByLabelText("Password baru", { exact: true }), { target: { value: "Fixture-new!" } });
  fireEvent.change(screen.getByLabelText("Konfirmasi password baru"), { target: { value: "Fixture-new!" } });
  fireEvent.click(screen.getByRole("button", { name: "Ubah password" }));
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/admin/sign-in?flow=password-updated"));
  expect(mocks.post).toHaveBeenCalledWith("/change-password", { currentPassword: "Fixture-old-password!", newPassword: "Fixture-new!" });
});
