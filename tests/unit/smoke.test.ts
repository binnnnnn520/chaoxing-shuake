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

  it("declares the permissions required by the side panel runtime", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), "public/manifest.json"), "utf8")
    ) as {
      permissions?: string[];
      host_permissions?: string[];
      content_scripts?: unknown[];
    };

    expect(manifest.permissions ?? []).toEqual([
      "sidePanel",
      "storage",
      "tabs",
      "scripting"
    ]);
    expect(manifest.host_permissions).toEqual(["<all_urls>"]);
    expect(manifest.content_scripts).toBeUndefined();
  });
});
