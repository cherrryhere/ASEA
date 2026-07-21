import { test, expect } from "@playwright/test";

test("Valid Login redirects to Secure Area", async ({ page }) => {
  // Navigate to login page
  await page.goto("https://the-internet.herokuapp.com/login");

  // Ensure username field is visible
  const usernameField = page.getByLabel("Username");
  await expect(usernameField).toBeVisible();

  // Step 1: Enter username
  await usernameField.fill("validUser");
  await expect(usernameField).toHaveValue("validUser");

  // Ensure password field is visible
  const passwordField = page.getByLabel("Password");
  await expect(passwordField).toBeVisible();

  // Step 2: Enter password
  await passwordField.fill("ValidPass123");
  await expect(passwordField).toHaveValue("ValidPass123");

  // Step 3: Click Login button
  const loginButton = page.getByRole("button", { name: "Login" });
  await expect(loginButton).toBeVisible();
  await loginButton.click();

  // Step 4: Verify redirection to secure area
  await expect(page).toHaveURL(/\/secure/);
  const secureHeader = page.getByRole("heading", { name: "Secure Area" });
  await expect(secureHeader).toBeVisible();

  // Verify welcome flash message is displayed
  const flashMessage = page.locator("#flash");
  await expect(flashMessage).toBeVisible();
  await expect(flashMessage).toContainText("You logged into a secure area");
});