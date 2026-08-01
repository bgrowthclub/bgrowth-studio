import React, { useState } from 'react';
import {
  Sparkles,
  ClipboardList,
  Calendar,
  Calculator as CalcIcon,
  BookOpen,
  FileText,
  Globe,
  Plus,
  ArrowRight,
  RefreshCw,
  MoreHorizontal,
  Lightbulb,
  CheckCircle2,
  X,
  Play,
  HelpCircle,
  Edit2,
  Save,
  ArrowLeft,
  DollarSign,
  AlertTriangle,
  BadgeAlert,
  Coins,
  Cpu,
  BookmarkCheck,
  Percent,
  CheckCircle,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DigitalProduct, ProductType } from './types';
import ProductLayoutPreview from './ProductLayoutPreview';

interface CreatePageProps {
  onGenerate: (prompt: string, type?: string, blueprint?: any) => Promise<void>;
  isGenerating: boolean;
  recentProducts: DigitalProduct[];
  onSelectProduct: (product: DigitalProduct) => void;
  credits: number;
}

const POPULAR_CATEGORIES = [
  {
    type: 'Checklist' as ProductType,
    title: 'Checklists',
    description: 'Step-by-step checklists for any process.',
    icon: ClipboardList,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  },
  {
    type: 'Planner' as ProductType,
    title: 'Planners',
    description: 'Organize, plan and achieve your goals.',
    icon: Calendar,
    color: 'text-blue-600 bg-blue-50 border-blue-100',
  },
  {
    type: 'Calculator' as ProductType,
    title: 'Calculators',
    description: 'Smart calculators for business and finance.',
    icon: CalcIcon,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  },
  {
    type: 'Course' as ProductType,
    title: 'Courses',
    description: 'Complete courses with lessons and modules.',
    icon: BookOpen,
    color: 'text-amber-600 bg-amber-50 border-amber-100',
  },
  {
    type: 'Resource' as ProductType,
    title: 'Resources',
    description: 'Documents, guides and helpful resources.',
    icon: FileText,
    color: 'text-pink-600 bg-pink-50 border-pink-100',
  },
  {
    type: 'Web Page' as ProductType,
    title: 'Web Pages',
    description: 'Landing pages and web content.',
    icon: Globe,
    color: 'text-teal-600 bg-teal-50 border-teal-100',
  }
];

const SUGGESTIONS = [
  "Create a Notary Service Checklist for Mobile Notary professionals",
  "Design a Freelancer Pricing Calculator for software developers",
  "Build a 30-Day Social Media Content Planner for digital marketing agencies",
  "Generate an SOP Guide for small warehouse shipping compliance",
  "Create an Online Course Outline for intro to machine learning"
];

const STEPS_PIPELINE = [
  { id: 'analysis', label: 'AI Product Analysis', desc: 'Decoding target audience, difficulty & pain points' },
  { id: 'strategy', label: 'Product Strategy Mapping', desc: 'Engineering structural features & learning outcomes' },
  { id: 'content', label: 'Digital Content Generation', desc: 'Compiling core checklists, templates or guides' },
  { id: 'assets', label: 'Visual Cover & Asset Design', desc: 'Styling high-impact cover layouts and mockup rules' },
  { id: 'marketing', label: 'Marketing Copy Generator', desc: 'Writing high-converting sales letters and FAQs' },
  { id: 'seo', label: 'SEO Metadata Structuring', desc: 'Optimizing keywords, title tags and open graph info' },
  { id: 'marketplace', label: 'Marketplace Integration', desc: 'Preparing listings for BGrowth Store, Etsy & Gumroad' },
  { id: 'packaging', label: 'BGrowth Package Compilation', desc: 'Assembling white-label file bundle structure' }
];

const BLUEPRINT_LOADER_STEPS = [
  "Analyzing concept requirements & category...",
  "Setting target audience and difficulty level...",
  "Designing core learning milestones & structures...",
  "Mapping marketing copy & monetization strategy...",
  "Running quality positioning review..."
];

export default function CreatePage({ onGenerate, isGenerating, recentProducts, onSelectProduct, credits }: CreatePageProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [currentPipelineIndex, setCurrentPipelineIndex] = useState(0);

  // Blueprint states
  const [activeBlueprint, setActiveBlueprint] = useState<any | null>(null);
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [blueprintLoaderStep, setBlueprintLoaderStep] = useState(0);
  const [isEditingBlueprint, setIsEditingBlueprint] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'structure' | 'marketing' | 'monetization' | 'review'>('overview');

  // Blueprint editable fields
  const [bpName, setBpName] = useState('');
  const [bpType, setBpType] = useState('');
  const [bpIndustry, setBpIndustry] = useState('');
  const [bpAudience, setBpAudience] = useState('');
  const [bpDifficulty, setBpDifficulty] = useState('');
  const [bpLanguage, setBpLanguage] = useState('');
  const [bpEstTime, setBpEstTime] = useState('');
  const [bpProblem, setBpProblem] = useState('');
  const [bpOutcome, setBpOutcome] = useState('');
  const [bpSellingPrice, setBpSellingPrice] = useState(29.99);

  // Suggestion badge state
  const [titleApplied, setTitleApplied] = useState(false);
  const [blueprintError, setBlueprintError] = useState<string | null>(null);
  const PROMPT_MAX_CHARS = 1000;

  // Rotate suggestions index
  const [suggestionOffset, setSuggestionOffset] = useState(0);

  // Active suggestions to display
  const displayedSuggestions = SUGGESTIONS.slice(suggestionOffset, suggestionOffset + 4);
  if (displayedSuggestions.length < 4) {
    displayedSuggestions.push(...SUGGESTIONS.slice(0, 4 - displayedSuggestions.length));
  }

  const handleNextSuggestions = () => {
    setSuggestionOffset((prev) => (prev + 1) % SUGGESTIONS.length);
  };

  // Phase 1: Submit Prompt to Get Product Blueprint
  const handleGenerateBlueprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGeneratingBlueprint(true);
    setBlueprintLoaderStep(0);

    const stepInterval = setInterval(() => {
      setBlueprintLoaderStep(prev => {
        if (prev < BLUEPRINT_LOADER_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1200);

    try {
      setBlueprintError(null);
      const safePrompt = prompt.length > PROMPT_MAX_CHARS ? prompt.slice(0, PROMPT_MAX_CHARS) : prompt;

      const response = await fetch('/api/generate-blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: safePrompt, productType: selectedType })
      });

      if (!response.ok) {
        throw new Error(`Erro do servidor: ${response.status}`);
      }

      if (!response.ok) throw new Error(`Erro do servidor: ${response.status}`);
      const data = await response.json();
      const bp = data.blueprint || data; // fallback: sometimes returns directly
      if (bp && bp.overview) {
        setActiveBlueprint(bp);

        // Populate editable form values
        setBpName(bp.overview?.name || '');
        setBpType(bp.overview?.type || selectedType || 'Checklist');
        setBpIndustry(bp.overview?.industry || '');
        setBpAudience(bp.overview?.targetAudience || '');
        setBpDifficulty(bp.overview?.difficultyLevel || 'Intermediate');
        setBpLanguage(bp.overview?.language || 'English (US)');
        setBpEstTime(bp.overview?.estimatedCompletionTime || '1-2 Hours');
        setBpProblem(bp.customerGoal?.problemSolved || '');
        setBpOutcome(bp.customerGoal?.expectedOutcome || '');
        setBpSellingPrice(bp.monetizationStrategy?.sellingPrice || 29.99);
        setTitleApplied(false);
      } else {
        throw new Error(data.error || "Blueprint response invalid");
      }
    } catch (error) {
      console.error("Blueprint generation error:", error);
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      setBlueprintError(`Não foi possível gerar o Blueprint. ${msg}. Verifique sua conexão ou tente um prompt menor.`);
    } finally {
      clearInterval(stepInterval);
      setIsGeneratingBlueprint(false);
    }
  };

  // Save editable blueprint fields back into active blueprint state
  const handleSaveBlueprintEdits = () => {
    if (!activeBlueprint) return;
    const updated = {
      ...activeBlueprint,
      overview: {
        ...activeBlueprint.overview,
        name: bpName,
        type: bpType,
        industry: bpIndustry,
        targetAudience: bpAudience,
        difficultyLevel: bpDifficulty,
        language: bpLanguage,
        estimatedCompletionTime: bpEstTime
      },
      customerGoal: {
        ...activeBlueprint.customerGoal,
        problemSolved: bpProblem,
        expectedOutcome: bpOutcome
      },
      monetizationStrategy: {
        ...activeBlueprint.monetizationStrategy,
        sellingPrice: Number(bpSellingPrice)
      }
    };
    setActiveBlueprint(updated);
    setIsEditingBlueprint(false);
  };

  // Phase 2: Final Approved Blueprint Generation
  const handleFinalApprovedGenerate = async () => {
    if (!activeBlueprint) return;

    // Trigger pipeline progression animation simulation
    setCurrentPipelineIndex(0);
    const interval = setInterval(() => {
      setCurrentPipelineIndex((prev) => {
        if (prev < STEPS_PIPELINE.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 1500);

    try {
      await onGenerate(prompt, selectedType, activeBlueprint);
      setActiveBlueprint(null); // Reset blueprint state
    } finally {
      clearInterval(interval);
    }
  };

  // Auto-apply title suggestion
  const handleApplyTitleSuggestion = () => {
    if (!activeBlueprint) return;
    const suggestedTitle = activeBlueprint.qualityReview?.betterTitles || bpName;
    setBpName(suggestedTitle);
    setTitleApplied(true);
    setActiveBlueprint(prev => ({
      ...prev,
      overview: {
        ...prev.overview,
        name: suggestedTitle
      }
    }));
  };

  // IF INTERACTIVE BLUEPRINT STAGE IS ACTIVE, RENDER IT
  if (activeBlueprint) {
    const bp = activeBlueprint;
    const structureData = bp.structure || {};

    return (
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 scrollbar-thin">
        {/* Back navigation & Stage Indicator */}
        <div className="max-w-5xl mx-auto flex items-center justify-between mb-6">
          <button
            onClick={() => setActiveBlueprint(null)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Prompter</span>
          </button>
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>Product Blueprint Validation Stage</span>
          </div>
        </div>

        {/* Blueprint Overview Panel */}
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl border border-slate-800 p-8 text-white mb-8 relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mt-20 -mr-20"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">Pre-Generation Blueprint Plan</span>
              <h2 className="text-2xl font-black tracking-tight">{bpName}</h2>
              <p className="text-xs text-slate-400 font-medium mt-1.5 max-w-2xl leading-relaxed">
                Review and customize the strategy layout below before triggering the final compilation. AI will construct content elements matching your exact adjustments.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsEditingBlueprint(!isEditingBlueprint)}
                className={`px-4 py-2.5 rounded-xl border font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  isEditingBlueprint 
                    ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700' 
                    : 'bg-white/10 text-white border-white/10 hover:bg-white/15'
                }`}
              >
                {isEditingBlueprint ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>Cancel Editing</span>
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4" />
                    <span>Edit Blueprint</span>
                  </>
                )}
              </button>
              <button
                onClick={handleFinalApprovedGenerate}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wide flex items-center gap-2 shadow-lg shadow-indigo-950/40 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-white fill-indigo-200" />
                <span>Generate Product</span>
              </button>
            </div>
          </div>
        </div>

        {/* Outer Split Layout */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Main Blueprint Workspace Area (Tabbed) */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            {/* Elegant Horizontal Tab Bar */}
            <div className="bg-white rounded-2xl border border-slate-100 p-1.5 flex flex-wrap gap-1 shadow-sm">
              <button
                onClick={() => { setActiveTab('overview'); setIsEditingBlueprint(false); }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'overview' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Overview & Goal</span>
              </button>
              <button
                onClick={() => { setActiveTab('structure'); setIsEditingBlueprint(false); }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'structure' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Product Structure</span>
              </button>
              <button
                onClick={() => { setActiveTab('marketing'); setIsEditingBlueprint(false); }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'marketing' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Marketing & Assets</span>
              </button>
              <button
                onClick={() => { setActiveTab('monetization'); setIsEditingBlueprint(false); }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'monetization' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Monetization Stage</span>
              </button>
              <button
                onClick={() => { setActiveTab('review'); setIsEditingBlueprint(false); }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ml-auto relative ${
                  activeTab === 'review' ? 'bg-amber-500 text-white font-bold' : 'text-amber-600 hover:bg-amber-50 bg-amber-50/40 border border-dashed border-amber-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Quality Review</span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
              </button>
            </div>

            {/* Editing Warning banner */}
            {isEditingBlueprint && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between text-amber-800 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>You are currently in **Edit Blueprint** mode. Click "Save Changes" to apply modifications.</span>
                </div>
                <button
                  onClick={handleSaveBlueprintEdits}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            )}

            {/* TAB CONTENT 1: OVERVIEW & GOAL */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Product Characteristics card */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-5">
                  <h3 className="font-bold text-slate-800 text-xs tracking-tight border-b border-slate-50 pb-3 block">
                    Product Metadata Specifications
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Product Name</span>
                      {isEditingBlueprint ? (
                        <input
                          type="text"
                          value={bpName}
                          onChange={(e) => setBpName(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/25 text-xs bg-slate-50 text-slate-700 font-medium"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-800 block mt-1">{bpName}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Product Category Type</span>
                      {isEditingBlueprint ? (
                        <select
                          value={bpType}
                          onChange={(e) => setBpType(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/25 text-xs bg-slate-50 text-slate-700 font-medium"
                        >
                          <option value="Checklist">Checklist</option>
                          <option value="Planner">Planner</option>
                          <option value="Course">Course</option>
                          <option value="Calculator">Calculator</option>
                          <option value="Guide">Guide</option>
                          <option value="SOP">SOP</option>
                        </select>
                      ) : (
                        <span className="text-xs font-bold text-slate-800 block mt-1">{bpType}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Primary Target Industry</span>
                      {isEditingBlueprint ? (
                        <input
                          type="text"
                          value={bpIndustry}
                          onChange={(e) => setBpIndustry(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/25 text-xs bg-slate-50 text-slate-700 font-medium"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-800 block mt-1">{bpIndustry}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Target Customer Audience</span>
                      {isEditingBlueprint ? (
                        <input
                          type="text"
                          value={bpAudience}
                          onChange={(e) => setBpAudience(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/25 text-xs bg-slate-50 text-slate-700 font-medium"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-800 block mt-1">{bpAudience}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Difficulty Level</span>
                      {isEditingBlueprint ? (
                        <select
                          value={bpDifficulty}
                          onChange={(e) => setBpDifficulty(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/25 text-xs bg-slate-50 text-slate-700 font-medium"
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                          <option value="Expert">Expert</option>
                        </select>
                      ) : (
                        <span className="text-xs font-bold text-slate-800 block mt-1">{bpDifficulty}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Content Language</span>
                      {isEditingBlueprint ? (
                        <input
                          type="text"
                          value={bpLanguage}
                          onChange={(e) => setBpLanguage(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/25 text-xs bg-slate-50 text-slate-700 font-medium"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-800 block mt-1">{bpLanguage}</span>
                      )}
                    </div>

                    <div className="col-span-2">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Est. Completion & Setup Time</span>
                      {isEditingBlueprint ? (
                        <input
                          type="text"
                          value={bpEstTime}
                          onChange={(e) => setBpEstTime(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/25 text-xs bg-slate-50 text-slate-700 font-medium"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-800 block mt-1">{bpEstTime}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customer Goal card */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-5">
                  <h3 className="font-bold text-slate-800 text-xs tracking-tight border-b border-slate-50 pb-3 block">
                    Customer Goal Alignment
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Problem Solved</span>
                      {isEditingBlueprint ? (
                        <textarea
                          value={bpProblem}
                          onChange={(e) => setBpProblem(e.target.value)}
                          rows={3}
                          className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/25 text-xs bg-slate-50 text-slate-700 font-medium resize-none leading-relaxed"
                        />
                      ) : (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                          {bpProblem}
                        </p>
                      )}
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Who It Is Engineered For</span>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                        {bp.customerGoal?.whoFor || bpAudience}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Why It Matters</span>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium font-sans">
                        {bp.customerGoal?.whyMatters || "Offers high conversion white-label elements allowing rapid deployment to commercial streams."}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Expected Outcome</span>
                      {isEditingBlueprint ? (
                        <textarea
                          value={bpOutcome}
                          onChange={(e) => setBpOutcome(e.target.value)}
                          rows={3}
                          className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/25 text-xs bg-slate-50 text-slate-700 font-medium resize-none leading-relaxed"
                        />
                      ) : (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                          {bpOutcome}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: STRUCTURE & CONTENT PLAN */}
            {activeTab === 'structure' && (
              <div className="flex flex-col gap-6">
                
                {/* Content Plan Estimates Grid Card */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-800 text-xs tracking-tight border-b border-slate-50 pb-3 mb-4 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-indigo-600" />
                    <span>Estimated Content Plan Outline Metrics</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-3 bg-slate-50/50 border border-slate-50 rounded-xl text-center">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Est. Pages</span>
                      <span className="font-extrabold text-slate-800 text-base block mt-1">
                        {bp.contentPlan?.pages || 8}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50/50 border border-slate-50 rounded-xl text-center">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Est. Sections</span>
                      <span className="font-extrabold text-slate-800 text-base block mt-1">
                        {bp.contentPlan?.sections || 3}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50/50 border border-slate-50 rounded-xl text-center">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Est. Tasks</span>
                      <span className="font-extrabold text-slate-800 text-base block mt-1">
                        {bp.contentPlan?.tasks || 12}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50/50 border border-slate-50 rounded-xl text-center">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Est. Lessons</span>
                      <span className="font-extrabold text-slate-800 text-base block mt-1">
                        {bp.contentPlan?.lessons || 0}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50/50 border border-slate-50 rounded-xl text-center col-span-2 md:col-span-1">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Reading Time</span>
                      <span className="font-extrabold text-slate-800 text-base block mt-1">
                        {bp.contentPlan?.readingTime || "30-45m"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Structure Visualizer Card */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-800 text-xs tracking-tight border-b border-slate-50 pb-3 mb-4 flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-indigo-600" />
                    <span>Proposed Component Hierarchy</span>
                  </h3>

                  {/* Checklist Structure */}
                  {structureData.checklistSections && (
                    <div className="space-y-6">
                      {(structureData.checklistSections ?? []).map((sect: any, sIdx: number) => (
                        <div key={sIdx} className="border border-slate-100 rounded-2xl p-5 bg-slate-50/30">
                          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2 mb-3">
                            <span className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-[10px]">
                              {sIdx + 1}
                            </span>
                            {sect.title}
                          </h4>
                          <ul className="space-y-2">
                            {(sect.tasks ?? []).map((tsk: string, tIdx: number) => (
                              <li key={tIdx} className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                                <CheckCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                                <span>{tsk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Course Structure */}
                  {structureData.courseModules && (
                    <div className="space-y-6">
                      {(structureData.courseModules ?? []).map((mod: any, mIdx: number) => (
                        <div key={mIdx} className="border border-slate-100 rounded-2xl p-5 bg-slate-50/30">
                          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2 mb-3">
                            <span className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-[10px]">
                              {mIdx + 1}
                            </span>
                            {mod.title}
                          </h4>
                          <ul className="space-y-2 pl-7 list-disc">
                            {(mod.lessons ?? []).map((les: string, lIdx: number) => (
                              <li key={lIdx} className="text-xs text-slate-600 font-medium">
                                {les}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Planner Structure */}
                  {(structureData.plannerDaily || structureData.plannerWeekly || structureData.plannerMonthly) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {structureData.plannerDaily && (
                        <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/30">
                          <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            <span>Daily Modules</span>
                          </h4>
                          <ul className="space-y-2 list-inside list-disc">
                            {(structureData.plannerDaily ?? []).map((item: string, idx: number) => (
                              <li key={idx} className="text-xs text-slate-600 font-medium leading-relaxed">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {structureData.plannerWeekly && (
                        <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/30">
                          <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                            <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Weekly Metrics</span>
                          </h4>
                          <ul className="space-y-2 list-inside list-disc">
                            {(structureData.plannerWeekly ?? []).map((item: string, idx: number) => (
                              <li key={idx} className="text-xs text-slate-600 font-medium leading-relaxed">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {structureData.plannerMonthly && (
                        <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/30">
                          <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                            <Coins className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Monthly Milestones</span>
                          </h4>
                          <ul className="space-y-2 list-inside list-disc">
                            {(structureData.plannerMonthly ?? []).map((item: string, idx: number) => (
                              <li key={idx} className="text-xs text-slate-600 font-medium leading-relaxed">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Calculator Structure */}
                  {structureData.inputs && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/40">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-2">Inputs Config</span>
                          <ul className="space-y-1.5">
                            {(structureData.inputs ?? []).map((inp: any, idx: number) => (
                              <li key={idx} className="text-xs text-slate-600 font-semibold flex items-center justify-between">
                                <span>{inp.label}</span>
                                <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono text-[10px]">defaultValue: {inp.defaultValue}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/40">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-2">Outputs & Logic</span>
                          <p className="text-xs text-slate-700 font-bold mb-3 font-mono bg-slate-100 px-3 py-1.5 rounded-lg">
                            Formula: {structureData.formulas || "N/A"}
                          </p>
                          <ul className="space-y-1">
                            {(structureData.outputs ?? []).map((out: any, idx: number) => (
                              <li key={idx} className="text-xs text-slate-600 font-semibold flex justify-between">
                                <span>{out.label}</span>
                                <span className="text-slate-400 font-mono text-[9px]">{out.formula}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Guide Chapters */}
                  {structureData.guideChapters && (
                    <div className="space-y-6">
                      {(structureData.guideChapters ?? []).map((chap: any, cIdx: number) => (
                        <div key={cIdx} className="border border-slate-100 rounded-2xl p-5 bg-slate-50/30">
                          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2 mb-3">
                            <span className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-[10px]">
                              {cIdx + 1}
                            </span>
                            {chap.title}
                          </h4>
                          <ul className="space-y-2 pl-7 list-disc">
                            {chap.topics && chap.topics.map((top: string, tIdx: number) => (
                              <li key={tIdx} className="text-xs text-slate-600 font-medium">
                                {top}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fallback Empty */}
                  {!structureData.checklistSections && !structureData.courseModules && !structureData.plannerDaily && !structureData.inputs && !structureData.guideChapters && (
                    <p className="text-xs text-slate-400 italic text-center py-6">
                      Standard blueprint layout strategy is planned. Structure outlines will compile dynamically.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: ASSETS & SEO */}
            {activeTab === 'marketing' && (
              <div className="flex flex-col gap-6">
                
                {/* Visual Assets Preview */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-800 text-xs tracking-tight border-b border-slate-50 pb-3 mb-4">
                    Generated Core Assets Plan
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50/50 border border-slate-100/50 rounded-2xl">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-1">Visual Cover</span>
                      <p className="text-xs text-slate-700 font-bold">{bp.generatedAssets?.cover || "Elegant minimalist layout with gradient theme overlays"}</p>
                    </div>

                    <div className="p-4 bg-slate-50/50 border border-slate-100/50 rounded-2xl">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-1">Product Icon Style</span>
                      <p className="text-xs text-slate-700 font-bold flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-[10px]">
                          {bp.generatedAssets?.productIcon || "Sparkles"}
                        </span>
                        <span>Lucide Glyph Accent</span>
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50/50 border border-slate-100/50 rounded-2xl col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">SaaS & Landing Web Banners</span>
                      <p className="text-xs text-slate-700 font-bold">Headline Proposal:</p>
                      <blockquote className="italic text-xs text-slate-500 border-l-2 border-indigo-300 pl-2 mt-1 leading-relaxed">
                        "{bp.marketingPackage?.salesCopy || "Get the professional blueprint instantly."}"
                      </blockquote>
                    </div>

                    <div className="p-4 bg-slate-50/50 border border-slate-100/50 rounded-2xl col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Mockups Compilation List</span>
                      <div className="flex flex-wrap gap-2">
                        {(bp.generatedAssets?.mockups ?? []).map((mock: string, idx: number) => (
                          <span key={idx} className="bg-white border border-slate-100 px-3 py-1 rounded-xl text-xs font-semibold text-slate-600">
                            {mock}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Listing Marketing Descriptions */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-800 text-xs tracking-tight border-b border-slate-50 pb-3 mb-4">
                    SaaS & Marketplace Listing Plan
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Etsy Listing Suggestion</span>
                      <p className="text-xs text-slate-700 font-semibold mt-1">{bp.marketingPackage?.etsyListing || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Gumroad Pitch Copy</span>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{bp.marketingPackage?.gumroadListing || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">BGrowth Store Copy Plan</span>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{bp.marketingPackage?.bgrowthListing || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: MONETIZATION & RESOURCES */}
            {activeTab === 'monetization' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Monetization Strategy card */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-5">
                  <h3 className="font-bold text-slate-800 text-xs tracking-tight border-b border-slate-50 pb-3 block">
                    Product Pricing & Upsells
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Recommended Selling Price</span>
                      {isEditingBlueprint ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={bpSellingPrice}
                            onChange={(e) => setBpSellingPrice(Number(e.target.value))}
                            className="w-24 px-3 py-1 rounded-lg border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/25 text-xs bg-slate-50 text-slate-700 font-mono font-bold"
                          />
                        </div>
                      ) : (
                        <span className="text-base font-extrabold text-slate-800 block mt-1">
                          ${bpSellingPrice}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Bundle Opportunities</span>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed font-semibold">
                        {bp.monetizationStrategy?.bundleOpportunities || "N/A"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Upsells Strategy</span>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed font-semibold">
                        {bp.monetizationStrategy?.upsells || "N/A"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Cross-sells Strategy</span>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed font-semibold">
                        {bp.monetizationStrategy?.crossSells || "N/A"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Subscription Hooks</span>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed font-semibold">
                        {bp.monetizationStrategy?.subscriptionOpportunities || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Resource consumption details */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-5">
                  <h3 className="font-bold text-slate-800 text-xs tracking-tight border-b border-slate-50 pb-3 block">
                    AI Creation Resource Estimates
                  </h3>

                  <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-50/50 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                        <Coins className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">AI Credits Required</span>
                        <span className="font-bold text-slate-800 text-xs block">
                          {bp.aiResources?.creditsRequired || 150} credits
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Est. Generation Time</span>
                        <span className="font-bold text-slate-800 text-xs block">
                          {bp.aiResources?.estGenerationTime || "10-15 seconds"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Engine APIs Invoked</span>
                        <span className="font-bold text-slate-800 text-xs block font-mono">
                          {bp.aiResources?.apisUsed || "Gemini-3.5-Flash Core Content API"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 5: QUALITY REVIEW POSITIONING */}
            {activeTab === 'review' && (
              <div className="flex flex-col gap-6">
                
                {/* Audit Checklist Card */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <div className="flex items-start justify-between border-b border-slate-50 pb-4 mb-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-xs tracking-tight">
                        AI Quality Positioning Audit
                      </h3>
                      <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                        Automatic optimization scan detected multiple ways to increase perceived pricing.
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-600 font-bold text-[9px] uppercase tracking-wider">
                      Scan Completed
                    </span>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Suggestion 1: Better Title */}
                    <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-800 text-xs block">Title Optimization Detected</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Original title can be elevated to appeal to high-ticket corporate clients.
                          </p>
                          <div className="mt-2 text-xs font-semibold text-slate-800 bg-white/80 border border-slate-100 px-3 py-1 rounded-lg inline-block">
                            Suggested Title: <strong className="text-indigo-600 font-bold">"{bp.qualityReview?.betterTitles || bpName}"</strong>
                          </div>
                        </div>
                      </div>
                      <button
                        disabled={titleApplied}
                        onClick={handleApplyTitleSuggestion}
                        className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                          titleApplied
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                        }`}
                      >
                        {titleApplied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Title Applied</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Apply Suggestion</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Positioning Strategy */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-1">Better Market Positioning</span>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {bp.qualityReview?.betterPositioning || "Focus sales pitches specifically around legal risk reduction and professional accountability standard checks. This enables charging up to 3x standard DIY rates."}
                      </p>
                    </div>

                    {/* Possible Format Optimization */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-1">Recommended Product Format</span>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {bp.qualityReview?.betterProductFormat || "Package as a Modular editable Notion template link combined with custom ready-to-print operational checklist PDF booklets."}
                      </p>
                    </div>

                    {/* Missing Information checks */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-1">Missing Requirements Scanned</span>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>All core parameters successfully specified in the prompt profile.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Validation & AI Resources Sidebar Panel */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Live Visual Layout Mockup */}
            <ProductLayoutPreview
              bp={bp}
              bpName={bpName}
              bpType={bpType}
              bpSellingPrice={bpSellingPrice}
            />
            
            {/* Approval Screen Card */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col">
              <h3 className="font-bold text-slate-800 text-xs tracking-tight border-b border-slate-50 pb-3 mb-4">
                Blueprint Approval
              </h3>

              <div className="space-y-4">
                <div className="p-3.5 bg-slate-50/50 rounded-2xl border border-slate-50 text-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Estimated Launch Price</span>
                  <span className="text-2xl font-black text-indigo-600 block mt-1 font-mono">${bpSellingPrice}</span>
                  <p className="text-[9px] text-slate-400 font-medium mt-1">Suggested pricing based on industry benchmarking scans.</p>
                </div>

                <div className="space-y-2 border-t border-slate-50 pt-4">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>AI Credits Est:</span>
                    <span className="text-slate-800 font-bold">{bp.aiResources?.creditsRequired || 150}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Structure Depth:</span>
                    <span className="text-slate-800 font-bold">12 submodules</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Language Outlets:</span>
                    <span className="text-slate-800 font-bold">{bpLanguage}</span>
                  </div>
                </div>

                {isEditingBlueprint ? (
                  <button
                    onClick={handleSaveBlueprintEdits}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Blueprint Edits</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingBlueprint(true)}
                    className="w-full py-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4 text-slate-400" />
                    <span>Edit Blueprint Options</span>
                  </button>
                )}

                <button
                  onClick={handleFinalApprovedGenerate}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-white fill-indigo-200" />
                  <span>Generate Approved Product</span>
                </button>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">Architect Pro Tip</span>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Editing the **Target Customer Audience** inside the blueprint helps focus search indexing keywords when publishing to marketplaces like Etsy and BGrowth Store.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 scrollbar-thin">
      
      {/* Title Header exactly as Mockup */}
      <div className="text-center max-w-2xl mx-auto mt-4 mb-8">
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-2">
          Create with AI <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse fill-indigo-100" />
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
          Describe what you want to create and AI will design your digital product blueprint for validation and launch.
        </p>
      </div>

      {/* Main Input Prompter Card exactly as Mockup */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-100 p-8 shadow-sm shadow-slate-100 mb-10 relative overflow-hidden">
        
        {/* Subtle Decorative Aura */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/40 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <form onSubmit={handleGenerateBlueprint} className="relative">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 shrink-0">
              <Sparkles className="w-5 h-5 fill-indigo-100" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-slate-800 tracking-tight">
                What would you like to create today?
              </label>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Example: "Create a Notary Service Checklist for Mobile Notary professionals"
              </span>
            </div>
          </div>

          {/* Prompt Entry Box */}
          <div className="mb-5">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={PROMPT_MAX_CHARS}
              placeholder="Describe your digital product concept..."
              className={`w-full h-32 px-5 py-4 rounded-2xl border bg-slate-50/30 text-slate-700 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all resize-none leading-relaxed ${prompt.length >= PROMPT_MAX_CHARS ? 'border-amber-300 focus:border-amber-400' : 'border-slate-100 focus:border-indigo-600'}`}
            />
            <div className="flex items-center justify-between mt-1.5 px-1">
              <span className={`text-[10px] font-medium ${prompt.length >= PROMPT_MAX_CHARS ? 'text-amber-500' : 'text-slate-400'}`}>
                {prompt.length >= PROMPT_MAX_CHARS
                  ? '⚠ Limite atingido — prompts menores geram melhores resultados'
                  : `${prompt.length} / ${PROMPT_MAX_CHARS} caracteres`}
              </span>
            </div>
            {blueprintError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>{blueprintError}</span>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-50 pt-5">
            {/* AI cost and model label */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold">
                gemini-3.5-flash
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Est. Cost: <strong className="text-indigo-600 font-bold">150 credits</strong>
              </span>
            </div>

            {/* Selection indicator of category */}
            {selectedType && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                <span>Filter: {selectedType}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedType(undefined)} />
              </div>
            )}

            {/* Launch button */}
            <button
              type="submit"
              disabled={isGeneratingBlueprint || !prompt.trim()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-md shadow-indigo-100 transition-all"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>Create Product Blueprint</span>
            </button>
          </div>
        </form>

        {/* Dynamic Try these pills as in mockup */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-50 pt-5 text-xs text-slate-500">
          <span className="font-semibold text-slate-600 shrink-0">Try these:</span>
          {displayedSuggestions.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => setPrompt(sug)}
              className="px-3 py-1.5 rounded-full border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 text-slate-600 hover:text-indigo-600 font-medium transition-all text-[11px] cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-slate-400 hover:text-indigo-600" />
              {sug.replace("Create a ", "").replace("Design a ", "").replace("Build a ", "").replace("Generate an ", "").substring(0, 32)}...
            </button>
          ))}
          <button
            onClick={handleNextSuggestions}
            className="px-3 py-1.5 rounded-full border border-dashed border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-600 font-bold transition-all text-[11px] flex items-center gap-1 ml-auto cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>More ideas</span>
          </button>
        </div>
      </div>

      {/* Popular Creations Categories Grid */}
      <div className="max-w-4xl mx-auto mb-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">Popular Creations</h3>
            <p className="text-[10px] text-slate-400 font-medium -mt-0.5">
              Start with an idea or let AI build everything for you.
            </p>
          </div>
          <button className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-0.5">
            <span>View all templates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {POPULAR_CATEGORIES.map((cat, idx) => {
            const IconComponent = cat.icon;
            const isSelected = selectedType === cat.type;
            return (
              <div
                key={idx}
                onClick={() => setSelectedType(isSelected ? undefined : cat.type)}
                className={`bg-white rounded-2xl border p-4 text-center cursor-pointer transition-all hover:shadow-md hover:border-indigo-200 flex flex-col items-center justify-center ${
                  isSelected ? 'border-indigo-600 ring-2 ring-indigo-600/10' : 'border-slate-100'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-3 ${cat.color}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <span className="font-bold text-slate-800 text-xs tracking-tight block">
                  {cat.title}
                </span>
                <span className="text-[9px] text-slate-400 leading-tight block mt-1 line-clamp-2 px-1">
                  {cat.description}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Creations (Match exactly Recent drafts list in image) */}
      <div className="max-w-4xl mx-auto mb-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">Recent Creations</h3>
            <p className="text-[10px] text-slate-400 font-medium -mt-0.5">
              Your recently created products and drafts.
            </p>
          </div>
          <button className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-0.5">
            <span>View all products</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <Lightbulb className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">No creations yet. Type an idea above to start!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {recentProducts.map((p) => {
              const productType = p?.structure?.productType ?? 'Guide';
              const categoryDetails = POPULAR_CATEGORIES.find(c => c.type === productType) || POPULAR_CATEGORIES[0];
              const IconComp = categoryDetails.icon;

              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProduct(p)}
                  className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer flex items-center gap-3.5 group relative"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${categoryDetails.color}`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-bold text-slate-800 text-xs truncate group-hover:text-indigo-600 transition-colors">
                      {p?.structure?.name ?? 'Untitled'}
                    </h4>
                    <span className="text-[9px] font-semibold text-slate-400 tracking-wide uppercase block mt-0.5">
                      {productType}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      Updated recently
                    </span>
                  </div>
                  <button className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer shrink-0">
                    <MoreHorizontal className="w-4.5 h-4.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Heavy Lifting Bottom Banner exactly as Mockup */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Sparkles className="w-4 h-4 fill-indigo-100" />
          </div>
          <div>
            <span className="font-bold text-slate-800 text-xs block">AI does the heavy lifting. You stay in control.</span>
            <p className="text-[10px] text-slate-400 font-medium">
              AI will generate a visual Product Blueprint for your approval before compiling active content packages.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowHowItWorks(true)}
          className="px-4 py-1.5 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/20 text-slate-600 hover:text-indigo-600 text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>How it works</span>
        </button>
      </div>

      {/* BLUEPRINT GENERATION MODAL LOADER */}
      <AnimatePresence>
        {isGeneratingBlueprint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-slate-100 w-full max-w-md p-8 shadow-2xl relative overflow-hidden text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 animate-spin mx-auto mb-5 border border-indigo-100">
                <RefreshCw className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center justify-center gap-1.5">
                <span>AI Blueprint Planner In Action</span>
                <Sparkles className="w-4 h-4 text-indigo-600 animate-bounce" />
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1 mb-6">
                Creating dynamic planning modules & vetting customer goal alignment
              </p>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-3">
                {BLUEPRINT_LOADER_STEPS.map((stepStr, idx) => {
                  const isDone = idx < blueprintLoaderStep;
                  const isActive = idx === blueprintLoaderStep;
                  return (
                    <div key={idx} className={`flex items-center gap-2.5 text-xs font-semibold ${isActive ? 'text-indigo-600' : isDone ? 'text-slate-700 opacity-80' : 'text-slate-300'}`}>
                      {isDone ? (
                        <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                      ) : isActive ? (
                        <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin shrink-0"></div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-200 shrink-0"></div>
                      )}
                      <span>{stepStr}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL PRODUCT GENERATION MODAL LOADER */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-slate-100 w-full max-w-xl p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
                <div
                  className="h-full bg-indigo-600 transition-all duration-1000 ease-out"
                  style={{ width: `${((currentPipelineIndex + 1) / STEPS_PIPELINE.length) * 100}%` }}
                ></div>
              </div>

              <div className="flex items-center gap-3 mb-6 mt-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 animate-spin">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
                    <span>AI Product Builder™ In Action</span>
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-bounce" />
                  </h3>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Compiling your approved blueprint specifications into retail packages
                  </span>
                </div>
              </div>

              {/* Steps lists */}
              <div className="space-y-3.5 mb-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-50">
                {STEPS_PIPELINE.map((step, idx) => {
                  const isActive = idx === currentPipelineIndex;
                  const isDone = idx < currentPipelineIndex;

                  return (
                    <div
                      key={step.id}
                      className={`flex items-start gap-3 transition-all ${
                        isActive ? 'opacity-100' : isDone ? 'opacity-75' : 'opacity-40'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                        ) : isActive ? (
                          <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-200"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className={`text-xs block font-bold tracking-tight ${
                          isActive ? 'text-indigo-600 font-extrabold' : 'text-slate-700'
                        }`}>
                          {step.label}
                        </span>
                        {isActive && (
                          <p className="text-[9px] text-slate-500 font-medium leading-relaxed animate-pulse">
                            {step.desc}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-slate-400 font-semibold text-center uppercase tracking-wider leading-relaxed">
                Please wait. Compiling your custom landing page, PDF document copies & marketplaces.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HOW IT WORKS DIAGRAM OVERLAY */}
      <AnimatePresence>
        {showHowItWorks && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-100 w-full max-w-2xl p-8 shadow-2xl relative">
              <button
                onClick={() => setShowHowItWorks(false)}
                className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Play className="w-5 h-5 text-indigo-600 fill-indigo-100" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">AI Product Builder™ Pipeline</h3>
                  <span className="text-[10px] text-slate-400 block font-medium">How a single prompt becomes a white-label retail bundle</span>
                </div>
              </div>

              {/* Horizontal steps flow */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-50 text-center">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-1">Phase 1</span>
                  <span className="font-bold text-slate-800 text-xs block">AI Vetting & Analysis</span>
                  <p className="text-[9px] text-slate-500 mt-1">Automatically determines category, target audiences, and main customer friction points.</p>
                </div>
                <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-50 text-center">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-1">Phase 2</span>
                  <span className="font-bold text-slate-800 text-xs block">Content & Strategy</span>
                  <p className="text-[9px] text-slate-500 mt-1">Fleshes out complete guides, step checklists, planners, quizzes or custom formula tools.</p>
                </div>
                <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-50 text-center">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-1">Phase 3</span>
                  <span className="font-bold text-slate-800 text-xs block">Launch & Marketplaces</span>
                  <p className="text-[9px] text-slate-500 mt-1">Generates cover styles, sales pitch emails, social copy and listings for Etsy, Gumroad & Shopify.</p>
                </div>
              </div>

              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-xs text-slate-500 leading-relaxed text-center font-medium">
                "BGrowth Studio converts abstract concepts into fully complete commercial products. Simply tweak, price, and export!"
              </div>

              <button
                onClick={() => setShowHowItWorks(false)}
                className="w-full mt-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all"
              >
                Let's Build Something
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
