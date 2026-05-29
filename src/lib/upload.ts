import { supabase } from "@/integrations/supabase/client";

export async function uploadEventAsset(
  reservaId: string,
  kind: "logo" | "bg" | "template",
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${reservaId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("event-assets")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("event-assets").getPublicUrl(path);
  return data.publicUrl;
}
