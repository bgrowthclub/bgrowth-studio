export type ContentType =
  | 'Article'
  | 'Guide'
  | 'Tutorial'
  | 'Documentation'
  | 'FAQ'
  | 'Release Notes'
  | 'Changelog'
  | 'Glossary'
  | 'Troubleshooting'
  | 'Video'
  | 'Resource'
  | 'Announcement'
  | 'Case Study'
  | 'Template'
  | 'Checklist'
  | 'Planner'
  | 'Calculator';

export type PublishStatus = 'Draft' | 'In Review' | 'Approved' | 'Scheduled' | 'Published' | 'Archived';
export type VisibilityType = 'Public' | 'Private' | 'Unlisted';
export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Expert';
export type AuthorType = 'Internal' | 'Guest' | 'AI Generated' | 'Verified';

export type AttachmentType =
  | 'PDF' | 'ZIP' | 'DOCX' | 'XLSX' | 'Image'
  | 'Template' | 'Checklist' | 'Planner' | 'Calculator'
  | 'Business System' | 'External Link';

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: AttachmentType;
  url: string;
}

export interface Author {
  id: string;
  name: string;
  avatar: string;
  role: string;
  type: AuthorType;
  bio: string;
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
}

export interface RelatedContentItem {
  id: string;
  title: string;
  type: 'Article' | 'Download' | 'Template' | 'Product' | 'Business System' | 'Video' | 'Academy Course' | 'Journey';
  url: string;
}

export interface CtaBlockData {
  id: string;
  type: 'Download Free Checklist' | 'Open Business System' | 'Become a Member' | 'Start Learning' | 'View Related Guide';
  title: string;
  description: string;
  buttonText: string;
  linkUrl: string;
}

export interface ContentBlock {
  id: string;
  type:
    | 'paragraph' | 'heading' | 'image' | 'gallery' | 'video'
    | 'quote' | 'callout' | 'checklist' | 'faq' | 'comparison'
    | 'table' | 'download' | 'cta' | 'divider' | 'code' | 'embed';
  data: any;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: string;
  contentType: ContentType;
  category: string;
  industry: string;
  language: 'pt' | 'en';
  difficulty: DifficultyLevel;
  readingTime: string;
  tags: string[];
  authorId: string;
  lastUpdated: string;

  seo: {
    title: string;
    metaDescription: string;
    canonicalUrl: string;
    ogImage: string;
    schemaType: string;
    index: boolean;
    follow: boolean;
  };

  blocks: ContentBlock[];
  attachments: Attachment[];
  relatedContent: RelatedContentItem[];

  featuredOptions: {
    featured: boolean;
    featuredOnHomepage: boolean;
    featuredOnCategory: boolean;
    trending: boolean;
    editorsPick: boolean;
  };

  publishing: {
    slug: string;
    status: PublishStatus;
    visibility: VisibilityType;
    publishDate: string;
    scheduleDate: string;
    futureWebsiteUrl: string;
    publicationNotes: string;
    // Release flow (Portal migration 0054), set by the server only.
    reviewedBy?: string | null;
    approvedBy?: string | null;
    scheduledAt?: string | null;
    publishedAt?: string | null;
  };
}
