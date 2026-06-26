export function discoverFeatures(knowledge) {
  const elements = Array.isArray(knowledge.elements) ? knowledge.elements : [];

  const buttons = elements.filter((el) => el.tag === "button");
  const links = elements.filter((el) => el.tag === "a");
  const inputs = elements.filter((el) => el.tag === "input");
  const textareas = elements.filter((el) => el.tag === "textarea");
  const selects = elements.filter((el) => el.tag === "select");

  const features = [];

  if (links.length > 0) {
    features.push({
      featureName: "Navigation Links",
      featureType: "Navigation",
      description:
        "Links available on the page that may navigate users to other pages or external resources.",
      elements: links,
      possibleTests: [
        "Verify each link is visible",
        "Verify each link has a valid href",
        "Verify each link navigates successfully",
        "Verify broken links are not present"
      ],
      priority: "High"
    });
  }

  if (buttons.length > 0) {
    features.push({
      featureName: "Button Actions",
      featureType: "Action",
      description: "Clickable button elements that may trigger user actions.",
      elements: buttons,
      possibleTests: [
        "Verify each button is visible",
        "Verify each button is clickable",
        "Verify button action produces expected result",
        "Verify disabled buttons cannot be clicked"
      ],
      priority: "High"
    });
  }

  if (inputs.length > 0 || textareas.length > 0 || selects.length > 0) {
    features.push({
      featureName: "Form Inputs",
      featureType: "Form",
      description:
        "Input fields, textareas, and select dropdowns available for user data entry.",
      elements: [...inputs, ...textareas, ...selects],
      possibleTests: [
        "Verify input fields are visible",
        "Verify input fields accept valid data",
        "Verify invalid data is handled correctly",
        "Verify required field validation",
        "Verify dropdown options can be selected"
      ],
      priority: "High"
    });
  }

  const searchElements = elements.filter((el) => {
    const combinedText = `${el.text} ${el.placeholder} ${el.name} ${el.id} ${el.ariaLabel}`.toLowerCase();
    return combinedText.includes("search");
  });

  if (searchElements.length > 0) {
    features.push({
      featureName: "Search Functionality",
      featureType: "Search",
      description: "Search-related UI elements detected on the page.",
      elements: searchElements,
      possibleTests: [
        "Verify search field is visible",
        "Verify search accepts text input",
        "Verify valid search returns matching results",
        "Verify invalid search shows empty or no result state"
      ],
      priority: "High"
    });
  }

  const loginElements = elements.filter((el) => {
    const combinedText = `${el.text} ${el.placeholder} ${el.name} ${el.id} ${el.ariaLabel} ${el.type}`.toLowerCase();

    return (
      combinedText.includes("login") ||
      combinedText.includes("sign in") ||
      combinedText.includes("email") ||
      combinedText.includes("password") ||
      combinedText.includes("username")
    );
  });

  if (loginElements.length > 0) {
    features.push({
      featureName: "Authentication",
      featureType: "Authentication",
      description: "Login or authentication-related elements detected on the page.",
      elements: loginElements,
      possibleTests: [
        "Verify login fields are visible",
        "Verify valid login flow",
        "Verify invalid credentials show error",
        "Verify empty fields show validation",
        "Verify password field masks input"
      ],
      priority: "Critical"
    });
  }

  const downloadElements = elements.filter((el) => {
    const combinedText = `${el.text} ${el.href} ${el.id} ${el.className} ${el.ariaLabel}`.toLowerCase();

    return (
      combinedText.includes("download") ||
      combinedText.includes("export") ||
      combinedText.includes("csv") ||
      combinedText.includes("excel") ||
      combinedText.includes("pdf")
    );
  });

  if (downloadElements.length > 0) {
    features.push({
      featureName: "Download / Export",
      featureType: "Download",
      description: "Download or export-related controls detected on the page.",
      elements: downloadElements,
      possibleTests: [
        "Verify download/export button is visible",
        "Verify file download starts after clicking",
        "Verify downloaded file has correct format",
        "Verify export works with filtered data"
      ],
      priority: "Medium"
    });
  }

  if (features.length === 0) {
    features.push({
      featureName: "Static Content Page",
      featureType: "Content",
      description:
        "No complex interactive features were detected. The page appears to be mostly static.",
      elements,
      possibleTests: [
        "Verify page loads successfully",
        "Verify title is correct",
        "Verify important content is visible",
        "Verify page has no broken links"
      ],
      priority: "Low"
    });
  }

  return {
    websiteUrl: knowledge.websiteUrl,
    currentUrl: knowledge.currentUrl,
    pageTitle: knowledge.pageTitle,
    totalElements: knowledge.totalElements,
    totalFeatures: features.length,
    features,
    discoveredAt: new Date().toISOString()
  };
}