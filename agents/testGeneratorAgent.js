import { getGroqClient, groqConfig } from "../config/groq.js";

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (match) {
      return JSON.parse(match[0]);
    }

    throw new Error("Groq response was not valid JSON");
  }
}

function reduceFeaturesForAI(featureDiscovery) {
  if (!featureDiscovery || !Array.isArray(featureDiscovery.features)) {
    return [];
  }

  return featureDiscovery.features.map((feature) => ({
    featureName: feature.featureName || "",
    featureType: feature.featureType || "",
    description: feature.description || "",
    priority: feature.priority || "",
    possibleTests: Array.isArray(feature.possibleTests)
      ? feature.possibleTests.slice(0, 10)
      : [],
    elements: Array.isArray(feature.elements)
      ? feature.elements.slice(0, 10).map((el) => ({
          tag: el.tag || "",
          text: el.text || "",
          placeholder: el.placeholder || "",
          type: el.type || "",
          name: el.name || "",
          id: el.id || "",
          ariaLabel: el.ariaLabel || "",
          href: el.href || ""
        }))
      : []
  }));
}

export async function generateTestCasesFromFeatures(featureDiscovery) {
  const groq = getGroqClient();

  const reducedFeatures = reduceFeaturesForAI(featureDiscovery);

  const prompt = `
You are ASEA, an Autonomous Software Engineering Agent.

Your task is to generate structured QA test cases from discovered website features.

Think like a senior QA engineer and test automation engineer.

Website:
${JSON.stringify(
    {
      websiteUrl: featureDiscovery.websiteUrl,
      currentUrl: featureDiscovery.currentUrl,
      pageTitle: featureDiscovery.pageTitle,
      totalElements: featureDiscovery.totalElements,
      totalFeatures: featureDiscovery.totalFeatures,
      features: reducedFeatures
    },
    null,
    2
  )}

Return ONLY valid JSON in this exact structure:

{
  "websiteUrl": "",
  "pageTitle": "",
  "totalFeatures": 0,
  "totalTestCases": 0,
  "testSuites": [
    {
      "featureName": "",
      "featureType": "",
      "priority": "",
      "testCases": [
        {
          "testCaseId": "",
          "title": "",
          "type": "",
          "priority": "",
          "preconditions": [],
          "steps": [],
          "expectedResult": "",
          "testData": [],
          "automationFeasibility": ""
        }
      ]
    }
  ],
  "qaSummary": "",
  "generatedAt": ""
}

Rules:
- type should be one of: "Positive", "Negative", "Validation", "UI", "Functional", "Security", "Boundary"
- priority should be one of: "Critical", "High", "Medium", "Low"
- automationFeasibility should be one of: "High", "Medium", "Low"
- Generate practical test cases that can later be converted to Playwright scripts
- Avoid vague test cases
- Use clear step-by-step actions
`;

  const response = await groq.chat.completions.create({
    model: groqConfig.model,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: groqConfig.temperature
  });

  const content = response.choices[0].message.content;
  const parsed = safeJsonParse(content);

  const testSuites = Array.isArray(parsed.testSuites) ? parsed.testSuites : [];

  let totalTestCases = 0;

  testSuites.forEach((suite) => {
    if (Array.isArray(suite.testCases)) {
      totalTestCases += suite.testCases.length;
    }
  });

  return {
    websiteUrl: parsed.websiteUrl || featureDiscovery.websiteUrl,
    pageTitle: parsed.pageTitle || featureDiscovery.pageTitle,
    totalFeatures: parsed.totalFeatures || featureDiscovery.totalFeatures,
    totalTestCases,
    testSuites,
    qaSummary:
      parsed.qaSummary ||
      "QA test case generation completed successfully.",
    generatedAt: parsed.generatedAt || new Date().toISOString()
  };
}