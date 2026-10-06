import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ post: vi.fn(), navigate: vi.fn() }));
vi.mock("@/components/niuva/admin-auth-form", () => ({ postAdminAuth: mocks.post }));
vi.mock("@/components/niuva/admin-auth-navigation", () => ({ navigateAfterAdminAuth: mocks.navigate }));
import { AdminSecurityForm } from "@/components/niuva/admin-security-form";

beforeEach(() => { mocks.post.mockResolvedValue({}); });
it("returns to login for fresh MFA after changing the password", async () => {
  render(<AdminSecurityForm />);
  fireEvent.change(screen.getByLabelText("Password saat ini"), { target: { value: "Fixture-old-password!" } });
  fireEvent.change(screen.getByLabelText("Password baru", { exact: true }), { target: { value: "Fixture-new-password!" } });
  fireEvent.change(screen.getByLabelText("Konfirmasi password baru"), { target: { value: "Fixture-new-password!" } });
  fireEvent.click(screen.getByRole("button", { name: "Ubah password" }));
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/admin/sign-in?flow=password-updated"));
  expect(mocks.post).toHaveBeenCalledWith("/change-password", { currentPassword: "Fixture-old-password!", newPassword: "Fixture-new-password!" });
});
