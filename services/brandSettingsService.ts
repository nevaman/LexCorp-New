import { supabase } from './supabaseClient';
import { BrandSettings } from '../types';

const BUCKET = 'brand-assets';

export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  companyName: 'LexCorp',
  primaryColor: '#f97316',
  fontFamily: 'DM Sans',
  tone: 'Professional, firm, and concise.',
  logoUrl: null,
  logoPath: null,
};

const buildPublicUrl = (path: string | null) => {
  if (!path) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

export const fetchBrandSettings = async (
  organizationId: string
): Promise<BrandSettings> => {
  if (!organizationId) return DEFAULT_BRAND_SETTINGS;
  const { data, error } = await supabase
    .from('brand_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return DEFAULT_BRAND_SETTINGS;
  }

  return {
    companyName: data.company_name ?? DEFAULT_BRAND_SETTINGS.companyName,
    primaryColor: data.primary_color ?? DEFAULT_BRAND_SETTINGS.primaryColor,
    fontFamily: data.font_family ?? DEFAULT_BRAND_SETTINGS.fontFamily,
    tone: data.tone ?? DEFAULT_BRAND_SETTINGS.tone,
    logoUrl: data.logo_url ?? buildPublicUrl(data.logo_path),
    logoPath: data.logo_path ?? null,
  };
};

export const saveBrandSettings = async (
  organizationId: string,
  settings: BrandSettings
): Promise<BrandSettings> => {
  if (!organizationId) throw new Error('Organization id is required.');

  const payload = {
    organization_id: organizationId,
    company_name: settings.companyName,
    primary_color: settings.primaryColor,
    font_family: settings.fontFamily,
    tone: settings.tone,
    logo_url: settings.logoUrl,
    logo_path: settings.logoPath,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('brand_settings')
    .upsert(payload, { onConflict: 'organization_id' })
    .select()
    .single();

  if (error) throw error;

  return {
    companyName: data.company_name,
    primaryColor: data.primary_color,
    fontFamily: data.font_family,
    tone: data.tone,
    logoUrl: data.logo_url ?? buildPublicUrl(data.logo_path),
    logoPath: data.logo_path ?? null,
  };
};

export const uploadBrandLogo = async (
  organizationId: string,
  file: File
): Promise<{ path: string; url: string }> => {
  if (!organizationId) throw new Error('Organization id is required.');
  if (!file.type.includes('png')) {
    throw new Error('Logo must be a PNG file.');
  }

  const fileName = `${organizationId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, { upsert: true });

  if (error) throw error;

  const url = buildPublicUrl(fileName);
  if (!url) {
    throw new Error('Unable to generate logo URL.');
  }

  return { path: fileName, url };
};

