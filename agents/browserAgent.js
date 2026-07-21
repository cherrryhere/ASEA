import { chromium } from "playwright";
import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const STORAGE_DIRECTORY = "storage";
const SCREENSHOTS_DIRECTORY = "screenshots";
const KNOWLEDGE_FILE_PATH = "storage/appKnowledge.json";

const DEFAULT_NAVIGATION_TIMEOUT = 60000;
const MAX_NAVIGATION_ATTEMPTS = 3;

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function validateWebsiteUrl(websiteUrl) {
  try {
    const parsedUrl = new URL(websiteUrl);

    if (
      parsedUrl.protocol !== "http:" &&
      parsedUrl.protocol !== "https:"
    ) {
      throw new Error(
        "Only http and https URLs are supported."
      );
    }

    return parsedUrl.toString();
  } catch (error) {
    throw new Error(
      `Invalid website URL: ${error.message}`
    );
  }
}

async function delay(milliseconds) {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function navigateWithRetry(
  page,
  websiteUrl
) {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= MAX_NAVIGATION_ATTEMPTS;
    attempt += 1
  ) {
    try {
      console.log(
        `🌐 Navigation attempt ${attempt}/${MAX_NAVIGATION_ATTEMPTS}: ${websiteUrl}`
      );

      const response = await page.goto(
        websiteUrl,
        {
          waitUntil: "domcontentloaded",
          timeout:
            DEFAULT_NAVIGATION_TIMEOUT
        }
      );

      await page.waitForTimeout(1500);

      return {
        success: true,
        attempt,
        responseStatus:
          response?.status() ?? null,
        responseOk:
          response?.ok() ?? null
      };
    } catch (error) {
      lastError = error;

      console.warn(
        `⚠️ Navigation attempt ${attempt} failed: ${error.message}`
      );

      if (
        attempt <
        MAX_NAVIGATION_ATTEMPTS
      ) {
        await delay(2000 * attempt);
      }
    }
  }

  try {
    console.log(
      "⚠️ Trying fallback navigation with waitUntil: commit"
    );

    const response = await page.goto(
      websiteUrl,
      {
        waitUntil: "commit",
        timeout:
          DEFAULT_NAVIGATION_TIMEOUT
      }
    );

    await page.waitForTimeout(2500);

    return {
      success: true,
      attempt:
        MAX_NAVIGATION_ATTEMPTS + 1,
      fallbackUsed: true,
      responseStatus:
        response?.status() ?? null,
      responseOk:
        response?.ok() ?? null
    };
  } catch (fallbackError) {
    throw new Error(
      `Website navigation failed after ${MAX_NAVIGATION_ATTEMPTS} attempts. Last error: ${
        lastError?.message ||
        fallbackError.message
      }`
    );
  }
}

async function collectPageKnowledge(
  page,
  websiteUrl,
  navigationResult
) {
  return page.evaluate(
    ({
      websiteUrl,
      navigationResult
    }) => {
      function text(value) {
        return String(value ?? "")
          .replace(/\s+/g, " ")
          .trim();
      }

      function getAttributes(element) {
        const attributes = {};

        for (
          const attribute of
          Array.from(element.attributes || [])
        ) {
          attributes[attribute.name] =
            attribute.value;
        }

        return attributes;
      }

      function buildSelector(element) {
        if (!element) {
          return "";
        }

        if (element.id) {
          return `#${CSS.escape(
            element.id
          )}`;
        }

        const testId =
          element.getAttribute(
            "data-testid"
          );

        if (testId) {
          return `[data-testid="${testId}"]`;
        }

        const name =
          element.getAttribute("name");

        if (name) {
          return `${element.tagName.toLowerCase()}[name="${name}"]`;
        }

        const placeholder =
          element.getAttribute(
            "placeholder"
          );

        if (placeholder) {
          return `${element.tagName.toLowerCase()}[placeholder="${placeholder}"]`;
        }

        const ariaLabel =
          element.getAttribute(
            "aria-label"
          );

        if (ariaLabel) {
          return `${element.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`;
        }

        const tagName =
          element.tagName.toLowerCase();

        const classNames =
          Array.from(
            element.classList || []
          )
            .filter(Boolean)
            .slice(0, 3);

        if (classNames.length > 0) {
          return `${tagName}.${classNames
            .map((className) =>
              CSS.escape(className)
            )
            .join(".")}`;
        }

        return tagName;
      }

      function mapElement(
        element,
        index
      ) {
        return {
          index: index + 1,
          tagName:
            element.tagName.toLowerCase(),

          type:
            element.getAttribute(
              "type"
            ) || "",

          id: element.id || "",

          name:
            element.getAttribute(
              "name"
            ) || "",

          text:
            text(
              element.innerText ||
                element.textContent
            ),

          value:
            element.value || "",

          placeholder:
            element.getAttribute(
              "placeholder"
            ) || "",

          ariaLabel:
            element.getAttribute(
              "aria-label"
            ) || "",

          role:
            element.getAttribute(
              "role"
            ) || "",

          href:
            element.href || "",

          action:
            element.action || "",

          method:
            element.method || "",

          selector:
            buildSelector(element),

          visible:
            Boolean(
              element.offsetWidth ||
              element.offsetHeight ||
              element.getClientRects()
                .length
            ),

          disabled:
            Boolean(element.disabled),

          required:
            Boolean(element.required),

          attributes:
            getAttributes(element)
        };
      }

      const interactiveElements =
        Array.from(
          document.querySelectorAll(
            [
              "a",
              "button",
              "input",
              "select",
              "textarea",
              "form",
              "[role]",
              "[onclick]"
            ].join(",")
          )
        ).map(mapElement);

      const links = Array.from(
        document.querySelectorAll("a")
      ).map(mapElement);

      const buttons = Array.from(
        document.querySelectorAll(
          'button, input[type="button"], input[type="submit"], input[type="reset"]'
        )
      ).map(mapElement);

      const inputs = Array.from(
        document.querySelectorAll(
          "input, textarea, select"
        )
      ).map(mapElement);

      const forms = Array.from(
        document.querySelectorAll("form")
      ).map((form, index) => ({
        ...mapElement(form, index),

        fields: Array.from(
          form.querySelectorAll(
            "input, textarea, select, button"
          )
        ).map(mapElement)
      }));

      const headings = Array.from(
        document.querySelectorAll(
          "h1, h2, h3, h4, h5, h6"
        )
      ).map((heading, index) => ({
        index: index + 1,
        level:
          heading.tagName.toLowerCase(),
        text: text(
          heading.innerText ||
            heading.textContent
        )
      }));

      const metaDescription =
        document
          .querySelector(
            'meta[name="description"]'
          )
          ?.getAttribute("content") ||
        "";

      return {
        websiteUrl,
        finalUrl: window.location.href,

        pageTitle: document.title || "",

        metaDescription,

        language:
          document.documentElement.lang ||
          "",

        bodyText: text(
          document.body?.innerText || ""
        ).slice(0, 15000),

        headings,

        elements:
          interactiveElements,

        links,

        buttons,

        inputs,

        forms,

        totalElements:
          interactiveElements.length,

        totalLinks: links.length,

        totalButtons: buttons.length,

        totalInputs: inputs.length,

        totalForms: forms.length,

        navigation:
          navigationResult,

        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },

        inspectedAt:
          new Date().toISOString()
      };
    },
    {
      websiteUrl,
      navigationResult
    }
  );
}

export async function inspectWebsite(
  websiteUrl
) {
  const validatedUrl =
    validateWebsiteUrl(websiteUrl);

  await fs.ensureDir(
    STORAGE_DIRECTORY
  );

  await fs.ensureDir(
    SCREENSHOTS_DIRECTORY
  );

  let browser = null;

  try {
    console.log(
      "✅ Launching browser..."
    );

    browser = await chromium.launch({
      headless: true
    });

    const context =
      await browser.newContext({
        viewport: {
          width: 1440,
          height: 900
        },

        ignoreHTTPSErrors: true,

        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"
      });

    const page =
      await context.newPage();

    page.setDefaultTimeout(
      DEFAULT_NAVIGATION_TIMEOUT
    );

    page.setDefaultNavigationTimeout(
      DEFAULT_NAVIGATION_TIMEOUT
    );

    page.on(
      "console",
      (message) => {
        if (
          message.type() === "error"
        ) {
          console.warn(
            "Browser console error:",
            message.text()
          );
        }
      }
    );

    page.on(
      "pageerror",
      (error) => {
        console.warn(
          "Page JavaScript error:",
          error.message
        );
      }
    );

    page.on(
      "requestfailed",
      (request) => {
        console.warn(
          "Request failed:",
          request.url(),
          request.failure()?.errorText ||
            ""
        );
      }
    );

    console.log(
      `✅ Opening website: ${validatedUrl}`
    );

    const navigationResult =
      await navigateWithRetry(
        page,
        validatedUrl
      );

    let knowledge;

    try {
      knowledge =
        await collectPageKnowledge(
          page,
          validatedUrl,
          navigationResult
        );
    } catch (error) {
      throw new Error(
        `Website opened, but page inspection failed: ${error.message}`
      );
    }

    const screenshotId = uuidv4();

    const screenshotPath = path.join(
      SCREENSHOTS_DIRECTORY,
      `inspection-${screenshotId}.png`
    );

    try {
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        timeout:
          DEFAULT_NAVIGATION_TIMEOUT
      });
    } catch (error) {
      console.warn(
        "Screenshot generation failed:",
        error.message
      );
    }

    const completeKnowledge = {
      ...knowledge,
      screenshotPath:
        await fs.pathExists(
          screenshotPath
        )
          ? screenshotPath
          : null
    };

    await fs.writeJson(
      KNOWLEDGE_FILE_PATH,
      completeKnowledge,
      {
        spaces: 2
      }
    );

    console.log(
      "✅ Website knowledge saved successfully."
    );

    return completeKnowledge;
  } catch (error) {
    console.error(
      "Browser Agent Error:",
      error
    );

    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}