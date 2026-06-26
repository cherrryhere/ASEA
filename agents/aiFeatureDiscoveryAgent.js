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

function reduceElementsForAI(elements) {
  if (!Array.isArray(elements)) return [];

  return elements.slice(0, 80).map((el) => ({
    tag: el.tag || "",
    text: el.text || "",
    placeholder: el.placeholder || "",
    type: el.type || "",
    name: el.name || "",
    id: el.id || "",
    ariaLabel: el.ariaLabel || "",
    href: el.href || ""
  }));
}

export async function discoverFeaturesWithAI(knowledge) {
  const groq = getGroqClient();

  const reducedElements = reduceElementsForAI(knowledge.elements);

  const prompt = `
You are ASEA, an Autonomous Software Engineering Agent.

Your task is to analyze extracted UI elements from a webpage and identify the actual software features present on the page.

Think like a senior QA engineer.

Website Information:
${JSON.stringify(
    {
      websiteUrl: knowledge.websiteUrl,
      currentUrl: knowledge.currentUrl,
      pageTitle: knowledge.pageTitle,
      totalElements: knowledge.totalElements,
      elements: reducedElements
    },
    null,
    2
  )}

Identify features such as:
- Authentication
- Navigation
- Search
- Forms
- Tables
- Dashboard Cards
- Reports
- Download / Export
- Upload
- Filters
- Sorting
- Pagination
- User Actions
- Static Content

Return ONLY valid JSON in this exact structure:

{
  "websiteUrl": "",
  "currentUrl": "",
  "pageTitle": "",
  "totalElements": 0,
  "totalFeatures": 0,
  "features": [
    {
      "featureName": "",
      "featureType": "",
      "description": "",
      "priority": "",
      "elements": [],
      "possibleTests": []
    }
  ],
  "aiSummary": "",
  "discoveredAt": ""
}

Rules:
- priority must be one of: "Critical", "High", "Medium", "Low"
- elements should contain only UI elements relevant to that feature
- possibleTests should be practical QA test ideas
- If the page is mostly static, identify it as Static Content
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

  return {
    websiteUrl: parsed.websiteUrl || knowledge.websiteUrl,
    currentUrl: parsed.currentUrl || knowledge.currentUrl,
    pageTitle: parsed.pageTitle || knowledge.pageTitle,
    totalElements: parsed.totalElements || knowledge.totalElements,
    totalFeatures: Array.isArray(parsed.features) ? parsed.features.length : 0,
    features: Array.isArray(parsed.features) ? parsed.features : [],
    aiSummary: parsed.aiSummary || "AI feature discovery completed.",
    discoveredAt: parsed.discoveredAt || new Date().toISOString()
  };
}