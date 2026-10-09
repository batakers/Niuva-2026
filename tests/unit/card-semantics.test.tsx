import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Card, CardContent } from "@/components/ui/card";

it("preserves a named section landmark when an operational panel uses Card", () => {
  render(<Card as="section" aria-labelledby="order-summary"><CardContent><h2 id="order-summary">Ringkasan order</h2><p>Order sedang diproses.</p></CardContent></Card>);
  expect(screen.getByRole("region", { name: "Ringkasan order" })).toHaveTextContent("Order sedang diproses.");
});
