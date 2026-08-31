import { sfUploadAsset } from "./data.functions";

export async function uploadEventAsset(
  reservaId: string,
  kind: "logo" | "bg" | "template" | "comprovativo",
  file: File,
): Promise<string> {
  const buf = await file.arrayBuffer();
  // Convert ArrayBuffer → base64 (chunked, evita stack overflow para ficheiros grandes)
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  const base64 = btoa(binary);
  const res = await sfUploadAsset({
    data: {
      reservaId, kind,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      base64,
    },
  });
  return res.url;
}
