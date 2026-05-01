import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a value stored in `supplier_transactions.proof_url` to a viewable URL.
 *
 * - If the value is already a full http(s) URL (legacy entries from when the
 *   supplier-proofs bucket was public), return it as-is.
 * - Otherwise treat it as a storage path inside the private `supplier-proofs`
 *   bucket and return a short-lived signed URL.
 *
 * Returns null when no URL can be produced.
 */
export async function resolveSupplierProofUrl(
  proofValue: string | null | undefined,
  expiresInSeconds = 300
): Promise<string | null> {
  if (!proofValue) return null;
  if (/^https?:\/\//i.test(proofValue)) return proofValue;

  const { data, error } = await supabase.storage
    .from("supplier-proofs")
    .createSignedUrl(proofValue, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
