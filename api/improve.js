import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', '*');

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
