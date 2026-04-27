import { describe, expect, it } from "vitest";
import { createSidepanelHtml } from "../../../src/build/sidepanel-html";

describe("createSidepanelHtml", () => {
  it("emits the side panel script and stylesheet references", () => {
    const html = createSidepanelHtml(`<!doctype html>
<html>
  <head>
    <title>Panel</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>`);

    expect(html).toContain('href="./assets/sidepanel.css"');
    expect(html).toContain('src="./assets/sidepanel.js"');
    expect(html).not.toContain("./main.tsx");
  });
});
