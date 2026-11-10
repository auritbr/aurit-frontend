import { Capacitor, registerPlugin } from "@capacitor/core";

const nativeFiles = registerPlugin<{
  save(options: {
    name: string;
    mimeType: string;
    data: string;
  }): Promise<void>;
}>("AuritFileDownload");

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function downloadFile(blob: Blob, filename: string) {
  if (Capacitor.getPlatform() === "android") {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () =>
        reject(reader.error ?? new Error("Não foi possível ler o arquivo."));
      reader.readAsDataURL(blob);
    });
    await nativeFiles.save({
      name: filename,
      mimeType: blob.type.split(";")[0] || "application/octet-stream",
      data: dataUrl.slice(dataUrl.indexOf(",") + 1),
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
