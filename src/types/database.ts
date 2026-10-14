/**
 * ARISERA Platform - Definisi Tipe Database & Entitas Sistem
 * Mendefinisikan schema untuk 14 entitas arsitektur inti platform CMS Arisera.
 */

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

export type BusinessCategory =
  | 'kuliner'
  | 'fashion'
  | 'kosmetik'
  | 'elektronik'
  | 'jasa'
  | 'retail'
  | 'portofolio'
  | 'lainnya';

export type PublishStatus = 'draft' | 'published' | 'archived';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export type PlanTier = 'starter' | 'pro' | 'enterprise';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan_tier?: PlanTier;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  invited_by?: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  token: string;
  created_at: string;
  expires_at: string;
}

export interface SaaSPlanLimits {
  tier: PlanTier;
  name: string;
  maxWebsites: number;
  maxPagesPerWebsite: number;
  maxProducts: number;
  maxStorageMB: number;
  maxMembers: number;
  customDomainEnabled: boolean;
  googleSyncEnabled: boolean;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  size?: number;
  modifiedTime?: string;
}

export interface GoogleSheetInfo {
  id: string;
  name: string;
  sheets: { id: number; title: string; rowCount?: number }[];
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_email?: string;
  created_at: string;
  user?: UserProfile;
}

export interface WebsiteThemeSettings {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: string;
  logoUrl?: string;
  faviconUrl?: string;
}

export interface Website {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  business_category: BusinessCategory;
  description?: string;
  whatsapp_number?: string;
  whatsapp_message_template?: string;
  status: PublishStatus;
  theme_settings: WebsiteThemeSettings;
  custom_domain?: string;
  subdomain: string;
  is_domain_verified: boolean;
  published_version_id?: string;
  created_at: string;
  updated_at: string;
}

export interface WebsiteDomain {
  id: string;
  website_id: string;
  domain: string;
  is_primary: boolean;
  is_verified: boolean;
  verification_token: string;
  dns_records: {
    type: 'CNAME' | 'A' | 'TXT';
    name: string;
    value: string;
    status: 'pending' | 'verified' | 'failed';
  }[];
  created_at: string;
}

export interface Page {
  id: string;
  website_id: string;
  title: string;
  slug: string;
  is_homepage: boolean;
  display_order?: number;
  status?: 'published' | 'draft';
  seo_title?: string;
  seo_description?: string;
  og_image?: string;
  current_draft_version_id?: string;
  created_at: string;
  updated_at: string;
}

export type ComponentBlockType =
  | 'header'
  | 'hero'
  | 'text'
  | 'image'
  | 'gallery'
  | 'features'
  | 'product_grid'
  | 'product_featured'
  | 'testimonials'
  | 'whatsapp_cta'
  | 'contact'
  | 'footer';

export interface VisualComponentBlock {
  id: string;
  type: ComponentBlockType;
  order: number;
  content: Record<string, any>;
  styles: Record<string, any>;
  is_hidden?: boolean;
}

export interface PageVersion {
  id: string;
  page_id: string;
  version_number: number;
  components: VisualComponentBlock[];
  is_published: boolean;
  created_by: string;
  created_at: string;
}

export interface WebsiteTemplate {
  id: string;
  name: string;
  category: BusinessCategory;
  description: string;
  thumbnail_url: string;
  preset_pages: {
    title: string;
    slug: string;
    is_homepage: boolean;
    components: VisualComponentBlock[];
  }[];
  default_theme: WebsiteThemeSettings;
  created_at: string;
}

export interface ProductCategory {
  id: string;
  website_id: string;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  website_id: string;
  category_id?: string;
  name: string;
  slug: string;
  sku?: string;
  description: string;
  price: number;
  sale_price?: number;
  stock_quantity: number;
  is_available: boolean;
  images: string[];
  attributes?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: string;
  workspace_id: string;
  website_id?: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  url: string;
  source: 'local_storage' | 'supabase_storage' | 'google_drive';
  external_id?: string;
  created_at: string;
}

export interface PublishingVersion {
  id: string;
  website_id: string;
  version_tag: string;
  notes?: string;
  published_by: string;
  snapshot_data: {
    website?: Website;
    pages?: Page[];
    page_versions?: PageVersion[];
    categories?: ProductCategory[];
    products?: Product[];
    components?: VisualComponentBlock[];
    all_page_components?: Record<string, VisualComponentBlock[]>;
    [key: string]: any;
  };
  created_at: string;
}

export interface ContactSubmission {
  id: string;
  website_id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  target_type: 'website' | 'page' | 'product' | 'workspace' | 'domain' | 'media';
  target_id: string;
  metadata?: Record<string, any>;
  created_at: string;
}
