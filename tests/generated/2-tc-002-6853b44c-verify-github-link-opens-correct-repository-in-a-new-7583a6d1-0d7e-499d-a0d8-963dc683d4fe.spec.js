import { test, expect } from "@playwright/test";

test("TC-002-6853b44c: Verify GitHub link opens correct repository in a new tab", async ({ page }) => {
  // Step 1: Navigate to the login page
  await page.goto("https://the-internet.herokuapp.com/login");

  // Step 2: Locate the GitHub link
  const githubLink = page.locator('a[href="https://github.com/tourdedave/the-internet"]');
  await expect(githubLink).toBeVisible();
  await expect(githubLink).toBeEnabled();

  // Step 3: Click the GitHub link and capture the new tab
  const [newPage] = await Promise.all([
    page.context().waitForEvent("page"),
    githubLink.click(),
  ]);

  // Step 4: Wait for the new page to load
  await newPage.waitForLoadState("load");

  // Step 5: Verify the URL of the new tab
  await expect(newPage).toHaveURL("https://github.com/tourdedave/the-internet");
});