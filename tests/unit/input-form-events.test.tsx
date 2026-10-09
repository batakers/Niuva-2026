import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { NativeInput as Input } from "@/components/ui/input";

it("keeps input changes available to the surrounding native form", () => {
  const onChange = vi.fn();
  render(<form onChange={onChange}><label htmlFor="tariff-rate">Tarif bahan</label><Input id="tariff-rate" name="rate" defaultValue="1100" /></form>);
  fireEvent.change(screen.getByRole("textbox", { name: "Tarif bahan" }), { target: { value: "1200" } });
  expect(onChange).toHaveBeenCalledOnce();
  expect(screen.getByRole("textbox", { name: "Tarif bahan" })).toHaveValue("1200");
});

it("updates the native reset value when server defaults are refreshed", () => {
  const { rerender } = render(<form><Input aria-label="Pencarian Admin" defaultValue="order lama" /><button type="reset">Reset formulir</button></form>);
  rerender(<form><Input aria-label="Pencarian Admin" defaultValue="" /><button type="reset">Reset formulir</button></form>);
  fireEvent.click(screen.getByRole("button", { name: "Reset formulir" }));
  expect(screen.getByRole("textbox", { name: "Pencarian Admin" })).toHaveValue("");
});
