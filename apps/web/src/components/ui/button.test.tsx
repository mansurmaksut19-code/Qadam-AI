import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("exposes loading and disabled state without changing its label", () => {
    render(<Button loading>Анализируем договор</Button>);

    const button = screen.getByRole("button", { name: "Анализируем договор" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("supports an explicit submit type and full-width layout", () => {
    render(
      <Button type="submit" fullWidth>
        Проверить договор
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Проверить договор" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveClass("button--full");
  });
});
