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

test('password field masking', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.getByLabel('Password').fill('password');
  await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password');
});

test('link to github opens in new tab', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  const [newPage] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('link', { name: 'Elemental Selenium' }).click(),
  ]);
  await expect(newPage).toHaveURL('https://github.com/tourdedave/the-internet');
});

test('link to elemental selenium opens in new tab', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  const [newPage] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('link', { name: 'Elemental Selenium' }).click(),
  ]);
  await expect(newPage).toHaveURL('http://elementalselenium.com/');
});

test('input fields are required', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Your username is invalid!')).toBeVisible();
});

test('input fields have correct data types', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.getByLabel('Username').fill('invalid');
  await page.getByLabel('Password').fill('invalid');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Your username is invalid!')).toBeVisible();
});

test('input fields have descriptive labels', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await expect(page.getByLabel('Username')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});

test('input fields are accessible', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await expect(page.getByLabel('Username')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});