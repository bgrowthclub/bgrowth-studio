import { GoogleGenAI } from '@google/genai';

function generateMockBlueprint(prompt, productType) {
  const type = productType || (prompt.toLowerCase().includes('checklist') ? 'Checklist' : 
    prompt.toLowerCase().includes('course') ? 'Course' : 
    prompt.toLowerCase().includes('planner') ? 'Planner' : 
    prompt.toLowerCase().includes('calculator') ? 'Calculator' : 'Guide');

  // Build structure based on type so preview renders correctly
  let structure = {};
  if (type === 'Checklist') {
    structure = { checklistSections: [
      { title: "Phase 1: Preparation", tasks: ["Review all requirements", "Gather necessary documents", "Verify client information", "Confirm appointment details"] },
      { title: "Phase 2: Execution", tasks: ["Complete primary tasks", "Document all steps", "Verify compliance", "Get required signatures"] },
      { title: "Phase 3: Follow-up", tasks: ["Send confirmation", "File documentation", "Update records", "Request feedback"] }
    ]};
  } else if (type === 'Planner') {
    structure = {
      plannerDaily: ["Morning review & goal setting", "Focus work block (2-3 hours)", "Client follow-ups", "Admin tasks", "End of day review"],
      plannerWeekly: ["Set weekly priorities", "Review progress", "Plan next week", "Team check-in"],
      plannerMonthly: ["Monthly revenue review", "Set new goals", "Evaluate systems"]
    };
  } else if (type === 'Calculator') {
    structure = {
      inputs: [
        { label: "Base Price ($)", key: "basePrice", defaultValue: 100 },
        { label: "Overhead Cost ($)", key: "overhead", defaultValue: 20 },
        { label: "Profit Margin (%)", key: "margin", defaultValue: 30 }
      ],
      formulas: "basePrice - overhead + (basePrice * margin / 100)",
      calculationOutputs: [{ label: "Net Price", formulaKey: "netPrice", prefix: "$" }]
    };
  } else if (type === 'Course') {
    structure = { courseModules: [
      { title: "Module 1: Foundation", description: "Core concepts and getting started", lessons: [
        { title: "Lesson 1.1: Introduction", content: "Overview of key concepts" },
        { title: "Lesson 1.2: Setup", content: "Getting your workspace ready" }
      ]},
      { title: "Module 2: Implementation", description: "Step-by-step execution", lessons: [
        { title: "Lesson 2.1: Core Process", content: "Main implementation steps" },
        { title: "Lesson 2.2: Best Practices", content: "Professional standards" }
      ]}
    ]};
  } else {
    structure = { guideChapters: [
      { title: "Chapter 1: Foundation", topics: ["Core concepts", "Getting started", "Key principles"] },
      { title: "Chapter 2: Implementation", topics: ["Step-by-step process", "Best practices", "Common pitfalls"] }
    ]};
  }

  return {
    overview: { name: prompt.trim() || "Premium Digital Product Blueprint", type, industry: "Professional Business Services", targetAudience: "Solopreneurs and Entrepreneurs", difficultyLevel: "Intermediate", language: "English (US)", estimatedCompletionTime: "1-2 Hours" },
    customerGoal: { problemSolved: `Lack of standardized ${type.toLowerCase()} templates for ${prompt}`, whoFor: "Professionals who want to automate their business", whyMatters: "Provides high-perceived-value frameworks that establish authority", expectedOutcome: "A fully branded, retail-ready digital product" },
    structure,
    contentPlan: { pages: 10, sections: 4, tasks: 12, lessons: 8, readingTime: "45 Minutes" },
    generatedAssets: { cover: "Professional gradient cover", thumbnail: "Clean thumbnail design", productIcon: type === 'Checklist' ? 'CheckSquare' : type === 'Course' ? 'BookOpen' : type === 'Calculator' ? 'Calculator' : 'FileText', mockups: ["Laptop mockup", "PDF mockup"], websiteBanner: "Banner layout", socialMediaImages: ["LinkedIn image", "Twitter image"] },
    marketingPackage: { productDescription: `${prompt} - A comprehensive digital product`, salesCopy: "Transform your business today", cta: "Get Instant Access", seoMetaDescription: `Professional ${type} for business growth`, etsyListing: `${prompt} Template`, gumroadListing: `${prompt} - Digital Download`, bgrowthListing: `Premium ${type}: ${prompt}` },
    aiResources: { creditsRequired: 150, estGenerationTime: "10-15 seconds", apisUsed: "Gemini AI" },
    monetizationStrategy: { sellingPrice: 29.99, bundleOpportunities: "Bundle with related templates", upsells: "Premium version with more content", crossSells: "Complementary products", subscriptionOpportunities: "Monthly membership" },
    qualityReview: { missingInformation: "None", possibleImprovements: "Add more specific examples", betterTitles: `Premium ${prompt} System`, betterPositioning: "Position as time-saving solution", betterProductFormat: "Consider interactive PDF format" }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { prompt, productType } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({ blueprint: generateMockBlueprint(prompt, productType) });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are the Lead Product Architect at BGrowth Studio™. Create a detailed Product Blueprint JSON for: "${prompt}". Product type: ${productType || 'Auto-detect'}. Return only valid JSON with these fields: overview, customerGoal, structure, contentPlan, generatedAssets, marketingPackage, aiResources, monetizationStrategy, qualityReview.`,
      config: { responseMimeType: 'application/json' }
    });
    const parsed = JSON.parse(response.text);
    return res.json({ blueprint: parsed });
  } catch (error) {
    return res.json({ blueprint: generateMockBlueprint(prompt, productType) });
  }
}
