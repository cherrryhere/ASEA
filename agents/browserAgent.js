import { chromium } from "playwright";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
import { playwrightConfig } from "../config/playwright.js";
import { logInfo, logError } from "../utils/logger.js";

export async function inspectWebsite(websiteUrl) {
  let browser;

  try {
    logInfo("Launching browser...");

    browser = await chromium.launch({
      headless: playwrightConfig.headless
    });

    const page = await browser.newPage({
      viewport: playwrightConfig.viewport
    });

    logInfo(`Opening website: ${websiteUrl}`);

    await page.goto(websiteUrl, {
      waitUntil: "domcontentloaded",
      timeout: playwrightConfig.timeout
    });

    await fs.ensureDir("screenshots");
    await fs.ensureDir("storage");

    const screenshotPath = `screenshots/home-${uuidv4()}.png`;

    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    const pageTitle = await page.title();
    const currentUrl = page.url();

    const elements = await page.evaluate(() => {
      const selectors = ["button", "a", "input", "textarea", "select"];

      return selectors.flatMap((selector) =>
        Array.from(document.querySelectorAll(selector)).map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: (el.innerText || el.textContent || "").trim(),
          placeholder: el.getAttribute("placeholder") || "",
          type: el.getAttribute("type") || "",
          name: el.getAttribute("name") || "",
          id: el.id || "",
          className: typeof el.className === "string" ? el.className : "",
          ariaLabel: el.getAttribute("aria-label") || "",
          href: el.getAttribute("href") || ""
        }))
      );
    });

    const knowledge = {
      websiteUrl,
      currentUrl,
      pageTitle,
      screenshotPath,
      totalElements: elements.length,
      elements,
      inspectedAt: new Date().toISOString()
    };

    await fs.writeJson("storage/appKnowledge.json", {
      websites: [knowledge]
    }, { spaces: 2 });

    logInfo("Website knowledge saved successfully.");

    await browser.close();

    return knowledge;
  } catch (error) {
    logError("Browser Agent failed.", error);

    if (browser) {
      await browser.close();
    }

    throw error;
  }
}