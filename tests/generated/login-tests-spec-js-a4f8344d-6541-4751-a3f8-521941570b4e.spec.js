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

test('password masking', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.getByLabel('Password').fill('password');
  const passwordInput = page.getByLabel('Password');
  await expect(passwordInput).toHaveAttribute('type', 'password');
});

test('link redirects to correct URL', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.getByRole('link', { name: 'Elemental Selenium' }).click();
  const [newPage] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('link', { name: 'Elemental Selenium' }).click(),
  ]);
  await expect(newPage).toHaveURL('https://elementalselenium.com/');
});

test('link opens in new tab/window', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.getByRole('link', { name: 'Elemental Selenium' }).click({ modifiers: ['Ctrl'] });
  const [newPage] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('link', { name: 'Elemental Selenium' }).click({ modifiers: ['Ctrl'] }),
  ]);
  await expect(newPage).toHaveURL('https://elementalselenium.com/');
});

test('form submission with valid data', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.getByLabel('Username').fill('tomsmith');
  await page.getByLabel('Password').fill('SuperSecretPassword!');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL('https://the-internet.herokuapp.com/secure');
});

test('form submission with invalid data', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.getByLabel('Username').fill('invalid');
  await page.getByLabel('Password').fill('invalid');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Your username is invalid!')).toBeVisible();
});

test('form field validation', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Your username is invalid!')).toBeVisible();
});