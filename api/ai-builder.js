// Consolidated AI Builder backend — Vercel Hobby plan's 12-function limit;
// see the Serverless Function audit. Was three files (generate.js,
// generate-blueprint.js, improve.js); merged into one, routed by
// ?action=generate | generate-blueprint | improve. Each branch's prompt,
// Gemini integration, and mock-fallback logic is preserved verbatim from
// its original file — no behavior change.

import { GoogleGenAI } from '@google/genai';

// --- shared by generate ---
function applyChecklistBlueprint(product, blueprint, productType) {
  const resolvedType = blueprint?.overview?.type || productType || product.structure?.productType;
  const sections = blueprint?.structure?.checklistSections;

  if (resolvedType !== 'Checklist' || !Array.isArray(sections)) {
    return product;
  }

  const tasks = sections.map((section, sectionIndex) => ({
    id: `chk_${sectionIndex + 1}`,
    title: section?.title || `Section ${sectionIndex + 1}`,
    description: section?.description || '',
    subtasks: Array.isArray(section?.tasks)
      ? section.tasks.map((task, taskIndex) => typeof task === 'string' ? task : task?.label || task?.title || `Task ${taskIndex + 1}`)
      : [],
    tips: Array.isArray(section?.tips) ? section.tips : [],
    whyItMatters: section?.whyItMatters || '',
    bestPractices: Array.isArray(section?.bestPractices) ? section.bestPractices : [],
    warnings: Array.isArray(section?.warnings) ? section.warnings : [],
    notes: section?.notes || '',
  }));

  return {
    ...product,
    structure: {
      ...product.structure,
      productType: 'Checklist',
    },
    content: {
      ...product.content,
      checklist: { tasks },
    },
  };
}

function generateMockProduct(prompt, productType) {
  return {
    id: `prod_${Date.now()}`, status: 'Draft', isFavorite: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    prompt, creditsCost: 150,
    analysis: { category: productType || 'Guide', targetAudience: 'Business Professionals', difficulty: 'Intermediate', industry: 'Business Services', productFormat: 'PDF / Digital Download', businessGoal: 'Generate passive income', customerPainPoints: ['Lack of structured systems', 'Time constraints', 'Need for professional templates'], desiredOutcome: 'Professional digital product ready to sell', sellingOpportunities: ['Etsy', 'Gumroad', 'BGrowth Store'] },
    structure: { name: 'Premium Digital Product', shortDescription: 'A professional digital product for business growth', longDescription: `${prompt} - Comprehensive guide designed to help professionals achieve their goals. This product provides step-by-step guidance and professional frameworks. Perfect for solopreneurs and business owners.`, summary: 'Complete digital product with templates and guides', features: ['Professional design', 'Step-by-step guidance', 'Customizable templates', 'Instant download'], benefits: ['Save time', 'Look professional', 'Increase productivity'], learningOutcomes: ['Master the process', 'Build systems', 'Scale results'], estimatedCompletionTime: '2 Hours', difficulty: 'Intermediate', industry: 'Business Services', language: 'English (US)', productType: productType || 'Guide', version: '1.0', author: 'BGrowth Studio', tags: ['business', 'productivity', 'templates'], keywords: ['business', 'professional', 'guide'], categories: ['Business', 'Templates'] },
    content: { document: { title: prompt, sections: [{ heading: 'I. Introduction', body: 'Overview and getting started guide.' }, { heading: 'II. Implementation', body: 'Step-by-step implementation guide.' }], conclusion: 'Start using this product today to transform your business.' } },
    assets: { cover: { bgGradientStart: 'from-indigo-600', bgGradientEnd: 'to-indigo-950', textColor: 'text-white', accentColor: 'text-yellow-300', iconName: 'FileText', tagline: 'Professional Digital Product' }, pricing: { suggestedPrice: 29.99, priceRange: '$19.99 - $49.99', bundlePrice: 79.99 } },
    marketing: { headline: `Premium ${productType || 'Guide'}: ${prompt}`, subheadline: 'Professional templates for modern business owners', productDescription: `${prompt} - Everything you need to succeed.`, salesCopy: 'Get instant access today', cta: 'Download Now', seoTitle: prompt, seoDescription: `Professional ${productType || 'guide'} for business growth`, etsyListing: `${prompt} Template - Instant Download`, gumroadPitch: `${prompt} - Digital Product`, bgrowthPitch: `Premium ${productType || 'Guide'}: ${prompt}` },
    analytics: { views: 0, downloads: 0, sales: 0, revenue: 0, conversionRate: 0, avgRating: 0 }
  };
}

async function handleGenerate(req, res) {
  const { prompt, productType, blueprint } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({ product: applyChecklistBlueprint(generateMockProduct(prompt, productType), blueprint, productType) });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are a digital product creator at BGrowth Studio™. Create a complete digital product JSON for: "${prompt}". ${blueprint ? `Based on this blueprint: ${JSON.stringify(blueprint)}` : ''} Return only valid JSON with: analysis, structure, content, assets, marketing, analytics fields.`,
      config: { responseMimeType: 'application/json' }
    });
    const parsed = JSON.parse(response.text);
    return res.json({ product: applyChecklistBlueprint({ ...generateMockProduct(prompt, productType), ...parsed }, blueprint, productType) });
  } catch (error) {
    return res.json({ product: applyChecklistBlueprint(generateMockProduct(prompt, productType), blueprint, productType) });
  }
}

// --- shared by generate-blueprint ---
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

async function handleGenerateBlueprint(req, res) {
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

// --- improve ---
async function handleImprove(req, res) {
  const { product, instruction } = req.body;
  if (!product || !instruction) return res.status(400).json({ error: 'Product and instruction required.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.json({ product: { ...product, updatedAt: new Date().toISOString() } });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Improve this digital product based on instruction: "${instruction}". Current product: ${JSON.stringify(product)}. Return only the improved JSON.`,
      config: { responseMimeType: 'application/json' }
    });
    const parsed = JSON.parse(response.text);
    return res.json({ product: { ...product, ...parsed, updatedAt: new Date().toISOString() } });
  } catch {
    return res.json({ product: { ...product, updatedAt: new Date().toISOString() } });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const action = req.query.action;
  if (action === 'generate') return handleGenerate(req, res);
  if (action === 'generate-blueprint') return handleGenerateBlueprint(req, res);
  if (action === 'improve') return handleImprove(req, res);
  return res.status(400).json({ error: 'action must be "generate", "generate-blueprint", or "improve".' });
}
