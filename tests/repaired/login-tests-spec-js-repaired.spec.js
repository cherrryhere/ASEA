import { test, expect } from '@playwright/test';

test('page loads successfully', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await expect(page).toHaveURL('https://the-internet.herokuapp.com/login');
});

test('successful login with valid credentials', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  const usernameInput = page.locator('#username');
  const passwordInput = page.locator('#password');
  const loginButton = page.locator('#login > button');
  await usernameInput.fill('tomsmith');
  await passwordInput.fill('SuperSecretPassword!');
  await loginButton.click();
  await expect(page).toHaveURL('https://the-internet.herokuapp.com/secure');
});

test('failed login with invalid credentials', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  const usernameInput = page.locator('#username');
  const passwordInput = page.locator('#password');
  const loginButton = page.locator('#login > button');
  await usernameInput.fill('invalid');
  await passwordInput.fill('invalid');
  await loginButton.click();
  await expect(page.locator('#flash')).toContainText('Your username is invalid!');
});

test('login form validation for empty fields', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  const loginButton = page.locator('#login > button');
  await loginButton.click();
  await expect(page.locator('#flash')).toContainText('Your username is invalid!');
});

test('navigation links are correctly redirecting to target pages', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  const githubLink = page.locator('text=Elemental Selenium');
  await githubLink.click();
  await expect(page).toHaveURL('https://the-internet.herokuapp.com/login');
});

test('navigation links are accessible and visible', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  const githubLink = page.locator('text=Elemental Selenium');
  await expect(githubLink).toBeVisible();
});

test('authentication with valid and invalid credentials', async ({ page }, testInfo) => {
  testInfo.setTimeout(60000);
  await page.goto('https://the-internet.herokuapp.com/login');
  const usernameInput = page.locator('#username');
  const passwordInput = page.locator('#password');
  const loginButton = page.locator('#login > button');
  await usernameInput.fill('tomsmith');
  await passwordInput.fill('SuperSecretPassword!');
  await loginButton.click();
  await expect(page).toHaveURL('https://the-internet.herokuapp.com/secure');
  await usernameInput.fill('invalid');
  await passwordInput.fill('invalid');
  await loginButton.click();
  await expect(page.locator('#flash')).toContainText('Your username is invalid!');
});

test('authentication with different user roles', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  const usernameInput = page.locator('#username');
  const passwordInput = page.locator('#password');
  const loginButton = page.locator('#login > button');
  await usernameInput.fill('tomsmith');
  await passwordInput.fill('SuperSecretPassword!');
  await loginButton.click();
  await expect(page).toHaveURL('https://the-internet.herokuapp.com/secure');
});