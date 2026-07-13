import { v4 as uuidv4 } from "uuid";
import {
  getGroqClient,
  groqConfig
} from "../config/groq.js";

function cleanText(value) {
  return String(value ?? "").trim();
}

function removeMarkdownCodeFences(value) {
  let content = cleanText(value);

  content = content.replace(
    /^```(?:json|javascript|js)?\s*/i,
    ""
  );

  content = content.replace(
    /\s*```$/i,
    ""
  );

  return content.trim();
}

function extractGroqResponseText(response) {
  return cleanText(
    response?.choices?.[0]?.message?.content ||
      response?.choices?.[0]?.text ||
      ""
  );
}

function normalizeFeature(feature, index) {
  if (typeof feature === "string") {
    return {
      featureId: `FEATURE-${index + 1}`,
      name: cleanText(feature),
      description: cleanText(feature),
      type: "general",
      selectors: []
    };
  }

  const featureName =
    cleanText(
      feature?.name ||
        feature?.title ||
        feature?.featureName ||
        feature?.feature ||
        feature?.label ||
        feature?.description
    ) || `Feature ${index + 1}`;

  const selectors = [];

  const possibleSelectors = [
    feature?.selector,
    feature?.cssSelector,
    feature?.locator,
    feature?.id,
    feature?.nameAttribute
  ];

  possibleSelectors.forEach((selector) => {
    const cleanSelector = cleanText(selector);

    if (cleanSelector) {
      selectors.push(cleanSelector);
    }
  });

  if (Array.isArray(feature?.selectors)) {
    feature.selectors.forEach((selector) => {
      const cleanSelector = cleanText(selector);

      if (cleanSelector) {
        selectors.push(cleanSelector);
      }
    });
  }

  return {
    featureId:
      cleanText(
        feature?.featureId ||
          feature?.id
      ) || `FEATURE-${index + 1}`,

    name: featureName,

    description:
      cleanText(
        feature?.description ||
          feature?.purpose ||
          feature?.summary ||
          featureName
      ),

    type:
      cleanText(
        feature?.type ||
          feature?.category ||
          feature?.featureType ||
          "general"
      ),

    selectors: [...new Set(selectors)],

    url:
      cleanText(
        feature?.url ||
          feature?.href ||
          ""
      ),

    metadata: feature
  };
}

function collectFeatures(featureDiscoveryData) {
  const collectedFeatures = [];
  const visited = new WeakSet();

  function visit(value) {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    if (visited.has(value)) {
      return;
    }

    visited.add(value);

    const looksLikeFeature =
      value.featureName ||
      value.featureId ||
      value.name ||
      value.title ||
      value.feature ||
      value.selector ||
      value.type;

    const looksLikeContainer =
      value.features ||
      value.discoveredFeatures ||
      value.aiFeatures ||
      value.featureDiscovery ||
      value.data ||
      value.result ||
      value.categories ||
      value.groups;

    if (looksLikeFeature && !looksLikeContainer) {
      collectedFeatures.push(value);
      return;
    }

    const possibleCollections = [
      value.features,
      value.discoveredFeatures,
      value.aiFeatures,
      value.featureDiscovery,
      value.categories,
      value.groups,
      value.items,
      value.data,
      value.result
    ];

    possibleCollections.forEach(visit);
  }

  visit(featureDiscoveryData);

  const normalizedFeatures =
    collectedFeatures.map(normalizeFeature);

  const uniqueFeatures = [];
  const seen = new Set();

  normalizedFeatures.forEach((feature) => {
    const signature = [
      feature.name.toLowerCase(),
      feature.type.toLowerCase(),
      feature.description.toLowerCase()
    ].join("|");

    if (!seen.has(signature)) {
      seen.add(signature);
      uniqueFeatures.push(feature);
    }
  });

  return uniqueFeatures;
}

function extractFirstJsonObject(content) {
  const cleanContent =
    removeMarkdownCodeFences(content);

  const firstBrace =
    cleanContent.indexOf("{");

  if (firstBrace === -1) {
    return null;
  }

  let depth = 0;
  let insideString = false;
  let escaped = false;

  for (
    let index = firstBrace;
    index < cleanContent.length;
    index += 1
  ) {
    const character = cleanContent[index];

    if (insideString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === "\\") {
        escaped = true;
        continue;
      }

      if (character === "\"") {
        insideString = false;
      }

      continue;
    }

    if (character === "\"") {
      insideString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
    }

    if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return cleanContent.slice(
          firstBrace,
          index + 1
        );
      }
    }
  }

  return null;
}

function safelyParseTestCase(content) {
  const jsonObject =
    extractFirstJsonObject(content);

  if (!jsonObject) {
    throw new Error(
      "No complete JSON object was found in the Groq response."
    );
  }

  return JSON.parse(jsonObject);
}

function normalizeSteps(steps) {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps
    .map((step, index) => {
      if (typeof step === "string") {
        return {
          stepNumber: index + 1,
          action: cleanText(step),
          expectedResult: ""
        };
      }

      return {
        stepNumber:
          Number(
            step?.stepNumber ||
              step?.step ||
              step?.number ||
              index + 1
          ),

        action:
          cleanText(
            step?.action ||
              step?.instruction ||
              step?.description ||
              ""
          ),

        expectedResult:
          cleanText(
            step?.expectedResult ||
              step?.expected ||
              step?.result ||
              ""
          )
      };
    })
    .filter((step) => step.action);
}

function normalizePreconditions(preconditions) {
  if (Array.isArray(preconditions)) {
    return preconditions
      .map(cleanText)
      .filter(Boolean);
  }

  const cleanPrecondition =
    cleanText(preconditions);

  return cleanPrecondition
    ? [cleanPrecondition]
    : [];
}

function normalizeGeneratedTestCase({
  testCase,
  feature,
  index,
  generationSource,
  generationError
}) {
  const title =
    cleanText(
      testCase?.title ||
        testCase?.testTitle ||
        testCase?.name ||
        testCase?.scenario
    ) ||
    `Verify ${feature.name}`;

  return {
    testCaseId:
      cleanText(
        testCase?.testCaseId ||
          testCase?.id
      ) ||
      `TC-${String(index + 1).padStart(
        3,
        "0"
      )}-${uuidv4().slice(0, 8)}`,

    featureId: feature.featureId,
    featureName: feature.name,

    title,

    description:
      cleanText(
        testCase?.description ||
          testCase?.objective ||
          `Verify that ${feature.name} works correctly.`
      ),

    type:
      cleanText(
        testCase?.type ||
          testCase?.testType ||
          testCase?.category ||
          "functional"
      ),

    priority:
      cleanText(
        testCase?.priority ||
          "Medium"
      ),

    preconditions:
      normalizePreconditions(
        testCase?.preconditions ||
          testCase?.prerequisites
      ),

    testData:
      testCase?.testData &&
      typeof testCase.testData === "object"
        ? testCase.testData
        : {},

    steps:
      normalizeSteps(
        testCase?.steps ||
          testCase?.testSteps
      ),

    expectedResult:
      cleanText(
        testCase?.expectedResult ||
          testCase?.expectedOutcome ||
          testCase?.expected ||
          `${feature.name} should behave as expected without errors.`
      ),

    selectors:
      Array.isArray(feature.selectors)
        ? feature.selectors
        : [],

    generationSource,
    generationError:
      generationError || null
  };
}

function createFallbackTestCase({
  feature,
  index,
  generationError
}) {
  const lowerName =
    feature.name.toLowerCase();

  const isLoginFeature =
    lowerName.includes("login") ||
    lowerName.includes("authentication") ||
    lowerName.includes("sign in");

  const isFormFeature =
    lowerName.includes("form") ||
    lowerName.includes("input") ||
    lowerName.includes("submit");

  const isNavigationFeature =
    lowerName.includes("navigation") ||
    lowerName.includes("link") ||
    lowerName.includes("menu");

  let steps = [
    {
      stepNumber: 1,
      action: "Open the target website.",
      expectedResult:
        "The website should load successfully."
    },
    {
      stepNumber: 2,
      action:
        `Locate the ${feature.name} feature.`,
      expectedResult:
        `${feature.name} should be visible and available.`
    },
    {
      stepNumber: 3,
      action:
        `Interact with the ${feature.name} feature.`,
      expectedResult:
        `${feature.name} should respond correctly.`
    }
  ];

  let expectedResult =
    `${feature.name} should work correctly without displaying unexpected errors.`;

  if (isLoginFeature) {
    steps = [
      {
        stepNumber: 1,
        action: "Open the login page.",
        expectedResult:
          "The login page should load successfully."
      },
      {
        stepNumber: 2,
        action:
          "Enter valid credentials in the username and password fields.",
        expectedResult:
          "The credentials should be accepted in the fields."
      },
      {
        stepNumber: 3,
        action: "Click the login button.",
        expectedResult:
          "The user should be authenticated and redirected successfully."
      }
    ];

    expectedResult =
      "The user should be logged in successfully with valid credentials.";
  } else if (isFormFeature) {
    steps = [
      {
        stepNumber: 1,
        action:
          "Open the page containing the form.",
        expectedResult:
          "The form should be visible."
      },
      {
        stepNumber: 2,
        action:
          "Enter valid data into all required fields.",
        expectedResult:
          "The data should appear correctly in the fields."
      },
      {
        stepNumber: 3,
        action:
          "Submit the form.",
        expectedResult:
          "The form should be submitted successfully."
      }
    ];

    expectedResult =
      "The form should accept valid information and submit successfully.";
  } else if (isNavigationFeature) {
    steps = [
      {
        stepNumber: 1,
        action: "Open the target website.",
        expectedResult:
          "The website should load successfully."
      },
      {
        stepNumber: 2,
        action:
          `Click the ${feature.name} navigation element.`,
        expectedResult:
          "The navigation action should be triggered."
      },
      {
        stepNumber: 3,
        action:
          "Verify the destination page.",
        expectedResult:
          "The correct page should be displayed."
      }
    ];

    expectedResult =
      "The navigation element should open the correct destination.";
  }

  return normalizeGeneratedTestCase({
    testCase: {
      title:
        `Verify ${feature.name}`,
      description:
        `Functional validation for ${feature.name}.`,
      type: "functional",
      priority: "Medium",
      preconditions: [
        "The website is available.",
        "The browser is open."
      ],
      testData: {},
      steps,
      expectedResult
    },
    feature,
    index,
    generationSource: "fallback",
    generationError
  });
}

function buildPrompt(feature) {
  return `
You are a senior QA engineer.

Create exactly one functional software test case for the following website feature.

FEATURE:
${JSON.stringify(feature, null, 2)}

Return exactly one JSON object.

Required JSON structure:

{
  "title": "Test case title",
  "description": "Purpose of the test",
  "type": "functional",
  "priority": "High, Medium, or Low",
  "preconditions": [
    "Precondition 1"
  ],
  "testData": {},
  "steps": [
    {
      "stepNumber": 1,
      "action": "Action to perform",
      "expectedResult": "Expected result for the step"
    }
  ],
  "expectedResult": "Overall expected result"
}

MANDATORY RULES:

1. Return only one JSON object.
2. Do not return a JSON array.
3. Do not use Markdown code fences.
4. Do not include comments.
5. Do not include explanations.
6. Use valid JSON double quotes.
7. Do not include trailing commas.
8. Keep the response concise.
9. Never combine valid and invalid login scenarios in one test case.
10. Ensure every string is properly closed.
`.trim();
}

async function generateOneTestCaseWithGroq(
  feature
) {
  const groq = getGroqClient();

  const response =
    await groq.chat.completions.create({
      model: groqConfig.model,
      temperature:
        groqConfig.temperature ?? 0.2,
      max_tokens: Math.min(
        groqConfig.maxTokens ?? 4096,
        2500
      ),
      messages: [
        {
          role: "system",
          content:
            "You are a QA test-case generator. Return one valid JSON object only."
        },
        {
          role: "user",
          content: buildPrompt(feature)
        }
      ]
    });

  const rawContent =
    extractGroqResponseText(response);

  if (!rawContent) {
    throw new Error(
      "Groq returned an empty test-case response."
    );
  }

  return safelyParseTestCase(rawContent);
}

export async function generateTestCasesFromFeatures(
  featureDiscoveryData
) {
  const features =
    collectFeatures(featureDiscoveryData);

  if (features.length === 0) {
    throw new Error(
      "No features were found for test-case generation."
    );
  }

  const generatedTestCases = [];

  for (
    let index = 0;
    index < features.length;
    index += 1
  ) {
    const feature = features[index];

    try {
      const aiTestCase =
        await generateOneTestCaseWithGroq(
          feature
        );

      const normalizedTestCase =
        normalizeGeneratedTestCase({
          testCase: aiTestCase,
          feature,
          index,
          generationSource: "groq",
          generationError: null
        });

      if (
        normalizedTestCase.steps.length === 0
      ) {
        throw new Error(
          "Groq test case did not contain usable test steps."
        );
      }

      generatedTestCases.push(
        normalizedTestCase
      );
    } catch (error) {
      console.warn(
        `Test-case fallback used for "${feature.name}":`,
        error.message
      );

      generatedTestCases.push(
        createFallbackTestCase({
          feature,
          index,
          generationError: error.message
        })
      );
    }
  }

  const groqGeneratedCount =
    generatedTestCases.filter(
      (testCase) =>
        testCase.generationSource === "groq"
    ).length;

  const fallbackGeneratedCount =
    generatedTestCases.filter(
      (testCase) =>
        testCase.generationSource ===
        "fallback"
    ).length;

  return {
    success: true,
    totalFeatures: features.length,
    totalTestCases:
      generatedTestCases.length,
    groqGeneratedCount,
    fallbackGeneratedCount,

    testCases: generatedTestCases,

    generatedTestCases,

    features,

    generatedAt:
      new Date().toISOString()
  };
}