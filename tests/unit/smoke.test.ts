import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../src/sidepanel/App";

describe("workspace smoke test", () => {
  it("renders the side panel heading", () => {
    render(React.createElement(App));

    expect(
      screen.getByRole("heading", { name: "MultiVideo Side Panel" }),
    ).toBeTruthy();
  });
});
