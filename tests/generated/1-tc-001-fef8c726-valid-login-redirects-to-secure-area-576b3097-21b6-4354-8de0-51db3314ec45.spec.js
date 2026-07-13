import { test, expect } from "@playwright/test";

test("TC-001-fef8c726: Valid login redirects to secure area", async ({ page }) => {
  // Navigate to the login page
  await page.goto("https://the-internet.herokuapp.com/login");

  // Locate username field and verify visibility
  const usernameField = page.getByLabel("Username");
  await expect(usernameField).toBeVisible();

  // Enter username
  await usernameField.fill("validUser");
  await expect(usernameField).toHaveValue("validUser");

  // Locate password field and verify visibility
  const passwordField = page.getByLabel("Password");
  await expect(passwordField).toBeVisible();

  // Enter password
  await passwordField.fill("ValidPass123!");
  // Password field shows masked characters; we verify it has a value without exposing it
  await expect(passwordField).toHaveValue("ValidPass123!");

  // Locate and click the Login button
  const loginButton = page.getByRole("button", { name: "Login" });
  await expect(loginButton).toBeVisible();
  await loginButton.click();

  // Verify navigation to secure area over HTTPS
  await expect(page).toHaveURL(/\/secure$/);
  await expect(page).toHaveURL(/https:/);

  // Verify welcome message is displayed
  const successMessage = page.getByText("You logged into a secure area!");
  await expect(successMessage).toBeVisible();

  // Verify heading of the secure area page
  const heading = page.getByRole("heading", { name: "Secure Area" });
  await expect(heading).toBeVisible();
});