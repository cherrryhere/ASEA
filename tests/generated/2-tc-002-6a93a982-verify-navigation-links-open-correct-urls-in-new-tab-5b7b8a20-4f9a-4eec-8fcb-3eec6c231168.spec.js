import { test, expect } from "@playwright/test";

test("Verify navigation links open correct URLs in new tabs", async ({ page, context }) => {
  // Step 0: Navigate to the login page
  await page.goto("https://the-internet.herokuapp.com/login");
  await expect(page).toHaveURL(/\/login$/);

  // Step 1: Click the GitHub link and verify new tab URL
  const githubLink = page.locator('a[href="https://github.com/tourdedave/the-internet"]');
  await expect(githubLink).toBeVisible();
  const [githubPage] = await Promise.all([
    context.waitForEvent("page"),
    githubLink.click(),
  ]);
  await githubPage.waitForLoadState("domcontentloaded");
  await expect(githubPage).toHaveURL("https://github.com/tourdedave/the-internet");

  // Step 2: Click the Elemental Selenium link and verify new tab URL
  const elementalLink = page.getByRole("link", { name: "Elemental Selenium" });
  await expect(elementalLink).toBeVisible();
  const [elementalPage] = await Promise.all([
    context.waitForEvent("page"),
    elementalLink.click(),
  ]);
  await elementalPage.waitForLoadState("domcontentloaded");
  await expect(elementalPage).toHaveURL("http://elementalselenium.com/");

  // Cleanup: close the newly opened pages
  await githubPage.close();
  await elementalPage.close();
});