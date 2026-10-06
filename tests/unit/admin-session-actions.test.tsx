import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ post: vi.fn(), navigate: vi.fn() }));
vi.mock("@/components/niuva/admin-auth-form", () => ({ postAdminAuth: mocks.post }));
vi.mock("@/components/niuva/admin-auth-navigation", () => ({ navigateAfterAdminAuth: mocks.navigate }));
import { AdminSessionActions } from "@/components/niuva/admin-session-actions";

it("keeps server-rendered logout disabled until the click handler is available", () => {
  const element = document.createElement("div");
  element.innerHTML = renderToString(<AdminSessionActions showLogout />);
  expect(element.querySelector("button")).toBeDisabled();
});
it("waits for logout to finish before leaving the authenticated document", async () => {
  let finish: (() => void) | undefined;
  mocks.post.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  render(<AdminSessionActions showLogout />);
  fireEvent.click(screen.getByRole("button", { name: /^Keluar$/ }));
  expect(screen.getByRole("button", { name: "Keluar…" })).toBeDisabled();
  expect(mocks.navigate).not.toHaveBeenCalled();
  finish!();
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/admin/sign-in"));
});
