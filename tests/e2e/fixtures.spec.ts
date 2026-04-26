import { expect, test } from "@playwright/test";

test("fixture pages expose video elements", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/direct-link.html");
  await expect(page.locator("video")).toBeVisible();

  await page.goto("http://127.0.0.1:4173/webpage-link.html");
  await expect(page.locator("video")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
});
