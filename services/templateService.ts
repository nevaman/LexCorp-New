import { supabase } from './supabaseClient';
import { Template } from '../types';

export const fetchTemplates = async (params: {
  organizationId: string;
  branchOfficeId?: string | null;
}) => {
  if (!params.organizationId) return [];

  let request = supabase
    .from('templates')
    .select('*')
    .eq('organization_id', params.organizationId);

  if (params.branchOfficeId) {
    request = request.or(
      `branch_office_id.is.null,branch_office_id.eq.${params.branchOfficeId}`
    );
  } else {
    request = request.eq('visibility', 'organization');
  }

  const { data, error } = await request.order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Template[];
};

export const saveTemplate = async (template: Template) => {
  const { data, error } = await supabase
    .from('templates')
    .upsert(template, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data as Template;
};

