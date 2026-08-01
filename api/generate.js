import { GoogleGenAI } from '@google/genai';
import { requireAdmin } from './_lib/requireAdmin.js';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const admin = await requireAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

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
