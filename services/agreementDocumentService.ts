import { supabase } from './supabaseClient';
import { AgreementDocument } from '../types';

const BUCKET = 'agreement-documents';

const buildPublicUrl = (path: string) => {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

export const listAgreementDocuments = async (
  agreementId: string
): Promise<AgreementDocument[]> => {
  if (!agreementId) return [];
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(agreementId, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) throw error;

  return (
    data?.map((item) => {
      const path = `${agreementId}/${item.name}`;
      return {
        name: item.name,
        path,
        size: item.metadata?.size ?? 0,
        mimeType: item.metadata?.mimetype ?? null,
        createdAt: item.created_at ?? null,
        url: buildPublicUrl(path),
      };
    }) ?? []
  );
};

export const uploadAgreementDocument = async ({
  agreementId,
  file,
}: {
  agreementId: string;
  file: File;
}): Promise<AgreementDocument> => {
  if (!agreementId) {
    throw new Error('Agreement id is required for uploads.');
  }
  const fileName = `${Date.now()}-${file.name}`;
  const path = `${agreementId}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false });

  if (error) throw error;

  return {
    name: fileName,
    originalName: file.name,
    path,
    size: file.size,
    mimeType: file.type,
    createdAt: new Date().toISOString(),
    url: buildPublicUrl(path),
  };
};

export const deleteAgreementDocument = async (
  agreementId: string,
  storedFileName: string
) => {
  const path = `${agreementId}/${storedFileName}`;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
};

