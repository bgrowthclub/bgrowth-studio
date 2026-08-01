import { useState, useEffect } from 'react';
import AIBuilderSidebar from './AIBuilderSidebar';
import AIBuilderHeader from './AIBuilderHeader';
import CreatePage from './CreatePage';
import ProductDashboardView from './ProductDashboardView';
import ProductLibraryView from './ProductLibraryView';
import DashboardOverview from './DashboardOverview';
import AnalyticsView from './AnalyticsView';
import SettingsView from './SettingsView';
import { DigitalProduct, AICreditCost } from './types';
import { gasGetAIProducts, gasSaveAIProduct, gasDeleteAIProduct } from '../../lib/studioSync';

const SEEDED_PRODUCTS: DigitalProduct[] = [];

interface AIBuilderProps {
  ownerEmail?: string;
}

export function AIBuilder({ ownerEmail }: AIBuilderProps) {
  const [currentTab, setCurrentTab] = useState<string>('create');
  const [activeProduct, setActiveProduct] = useState<DigitalProduct | null>(null);
  const [credits, setCredits] = useState<number>(12450);

  const [creditCosts, setCreditCosts] = useState<AICreditCost[]>([
    { action: 'Initial Product Generation', cost: 150 },
    { action: 'SEO Strategy Audit', cost: 30 },
    { action: 'Full Language Translation', cost: 50 },
    { action: 'Aesthetic Layout Adjustments', cost: 40 },
  ]);

  const normalizeProduct = (p: any): DigitalProduct => ({
    ...p,
    status: p.status || 'Draft',
    isFavorite: p.isFavorite || false,
    versions: p.versions || [],
    analytics: {
      views: 0, downloads: 0, sales: 0, revenue: 0,
      conversionRate: 0, avgRating: 0, aiCreditsUsed: 0,
      ...(p.analytics || {}),
    },
    structure: {
      name: '', shortDescription: '', longDescription: '', summary: '',
      features: [], benefits: [], learningOutcomes: [], tags: [],
      keywords: [], categories: [], productType: 'Guide', version: '1.0',
      author: 'BGrowth Studio', language: 'English (US)',
      industry: 'Business Services', difficulty: 'Intermediate',
      estimatedCompletionTime: '1 Hour',
      ...(p.structure || {}),
    },
    analysis: {
      category: 'Guide', targetAudience: '', difficulty: 'Intermediate',
      industry: 'Business Services', productFormat: 'PDF',
      businessGoal: '', customerPainPoints: [], desiredOutcome: '',
      sellingOpportunities: [],
      ...(p.analysis || {}),
    },
    content: p.content || { document: { title: '', sections: [], conclusion: '' } },
    assets: {
      cover: { bgGradientStart: 'from-indigo-600', bgGradientEnd: 'to-indigo-950', textColor: 'text-white', accentColor: 'text-yellow-300', iconName: 'FileText', tagline: '' },
      pricing: { suggestedPrice: 29.99, priceRange: '$19 - $49', bundlePrice: 79.99 },
      mockups: [],
      ...(p.assets || {}),
    },
    marketing: {
      headline: '', subheadline: '', productDescription: '',
      salesCopy: '', cta: 'Buy Now', seoTitle: '', seoDescription: '',
      etsyListing: '', gumroadPitch: '', bgrowthPitch: '',
      ...(p.marketing || {}),
    },
  });

  const [products, setProducts] = useState<DigitalProduct[]>(() => {
    try {
      const saved = localStorage.getItem('bgrowth_studio_products_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((p: any) => p && p.id && !p.id.startsWith('seed_'))
            .map(normalizeProduct);
        }
      }
    } catch {
      // Clear corrupted data
      localStorage.removeItem('bgrowth_studio_products_v3');
    }
    return SEEDED_PRODUCTS;
  });

  // Load from GAS on mount
  useEffect(() => {
    gasGetAIProducts(ownerEmail ?? 'benterprisesusa@gmail.com').then(gasProducts => {
      if (gasProducts.length > 0) {
        const normalized = gasProducts.map(normalizeProduct);
        setProducts(normalized);
        localStorage.setItem('bgrowth_studio_products_v3', JSON.stringify(normalized));
      }
    });
  }, []);

  // Save to localStorage whenever products change
  useEffect(() => {
    localStorage.setItem('bgrowth_studio_products_v3', JSON.stringify(products));
  }, [products]);

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateProduct = async (prompt: string, productType?: string, blueprint?: any) => {
    setIsGenerating(true);
    const generationCost = creditCosts.find(c => c.action === 'Initial Product Generation')?.cost || 150;
    setCredits(prev => Math.max(0, prev - generationCost));

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, productType, blueprint }),
      });
      const data = await response.json();
      if (data.product) {
        const normalized = normalizeProduct(data.product);
        setProducts(prev => [normalized, ...prev]);
        setActiveProduct(normalized);
        setCurrentTab('product-dashboard');
        // Sync to GAS
        gasSaveAIProduct(ownerEmail ?? 'benterprisesusa@gmail.com', normalized);
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateProduct = (updated: DigitalProduct) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    setActiveProduct(updated);
    // Sync to GAS
    gasSaveAIProduct(ownerEmail ?? 'benterprisesusa@gmail.com', updated);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    if (activeProduct?.id === id) {
      setActiveProduct(null);
      setCurrentTab('create');
    }
    // Sync to GAS
    gasDeleteAIProduct(ownerEmail ?? 'benterprisesusa@gmail.com', id);
  };

  const handleSelectProduct = (product: DigitalProduct) => {
    setActiveProduct(product);
    setCurrentTab('product-dashboard');
  };

  const handleImproveProduct = async (product: DigitalProduct, instruction: string) => {
    try {
      const response = await fetch('/api/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, instruction }),
      });
      const data = await response.json();
      if (data.product) handleUpdateProduct(data.product);
    } catch (error) {
      console.error('Improve error:', error);
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-slate-50 font-sans">
      <AIBuilderSidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        products={products}
        credits={credits}
        onSelectProduct={handleSelectProduct}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AIBuilderHeader currentTab={currentTab} credits={credits} />

        <main className="flex flex-1 min-h-0 flex-col overflow-hidden">
          {currentTab === 'create' && (
            <CreatePage
              onGenerate={handleGenerateProduct}
              isGenerating={isGenerating}
              recentProducts={products}
              onSelectProduct={handleSelectProduct}
              credits={credits}
            />
          )}
          {currentTab === 'dashboard' && (
            <DashboardOverview
              products={products}
              credits={credits}
              onTabChange={setCurrentTab}
              onSelectProduct={handleSelectProduct}
            />
          )}
          {currentTab === 'products' && (
            <ProductLibraryView
              products={products}
              onSelectProduct={handleSelectProduct}
              onDeleteProduct={handleDeleteProduct}
              onToggleFavorite={(id) => {
                setProducts(prev => prev.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
              }}
              onCreateNew={() => setCurrentTab('create')}
            />
          )}
          {currentTab === 'product-dashboard' && activeProduct && (
            <ProductDashboardView
              product={activeProduct}
              ownerEmail={ownerEmail ?? 'benterprisesusa@gmail.com'}
              onBack={() => setCurrentTab('products')}
              onUpdateProduct={handleUpdateProduct}
              onImproveProduct={handleImproveProduct}
              isImproving={false}
              creditsCostConfigs={creditCosts}
            />
          )}
          {currentTab === 'analytics' && (
            <AnalyticsView products={products} />
          )}
          {currentTab === 'settings' && (
            <SettingsView
              creditCosts={creditCosts}
              onUpdateCreditCosts={setCreditCosts}
            />
          )}
        </main>
      </div>
    </div>
  );
}
