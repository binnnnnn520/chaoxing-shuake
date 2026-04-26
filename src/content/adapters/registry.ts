import { createHtml5Adapter } from "./html5";
import type { PageAdapter } from "./types";

export function getPageAdapter(doc: Document): PageAdapter | null {
  const html5Adapter = createHtml5Adapter(doc);

  return html5Adapter.canHandle() ? html5Adapter : null;
}
