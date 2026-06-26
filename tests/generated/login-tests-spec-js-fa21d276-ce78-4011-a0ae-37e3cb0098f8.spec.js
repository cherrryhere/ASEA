import { test, expect } from '@playwright/test';

test('page loads successfully', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await expect(page).toHaveURL('https://the-internet.herokuapp.com/login');
});

test('login with valid credentials', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.getByLabel('Username').fill('tomsmith');
  await page.getByLabel('Password').fill('SuperSecretPassword!');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL('https://the-internet.herokuapp.com/secure');
});

test('login with invalid credentials', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.getByLabel('Username').fill('invalid');
  await page.getByLabel('Password').fill('invalid');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Your username is invalid!')).toBeVisible();
});

test('login with empty fields', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Your username is invalid!')).toBeVisible();
});

test('password field is masked', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.getByLabel('Password').fill('password');
  const passwordInput = page.getByLabel('Password');
  await expect(passwordInput).toHaveAttribute('type', 'password');
});

test('links are not broken', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  const link = page.getByRole('link', { name: 'Elemental Selenium' });
  await link.click();
  const newPage = page.context().pages().find(page => page.url().includes('elementalselenium'))
  await expect(newPage).not.toBeNull();
});

test('links open in new tab/window', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  const link = page.getByRole('link', { name: 'Elemental Selenium' });
  await link.click();
  const newPage = page.context().pages().find(page => page.url().includes('elementalselenium'))
  await expect(newPage).not.toBeNull();
});

test('page title is correct', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await expect(page).toHaveTitle('The Internet');
});

test('page title is displayed', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await expect(page.locator('h2')).toContainText('Login Page');
});