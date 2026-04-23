import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../src/sidepanel/App";

describe("workspace smoke test", () => {
  it("renders the side panel heading", () => {
    render(React.createElement(App));

    const heading = screen.getByRole("heading", {
      level: 1,
      name: "MultiVideo Side Panel"
    });

    expect(heading.tagName).toBe("H1");
    expect(heading.textContent).toBe("MultiVideo Side Panel");
    expect(screen.getByRole("main").firstElementChild).toBe(heading);
  });

  it("keeps the bootstrap manifest scoped to the side-panel shell", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), "public/manifest.json"), "utf8")
    ) as {
      permissions?: string[];
      host_permissions?: string[];
      content_scripts?: unknown[];
    };

    expect(manifest.permissions ?? []).toEqual([]);
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.content_scripts).toBeUndefined();
  });
});
