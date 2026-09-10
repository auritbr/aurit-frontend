import { useEffect, useRef } from "react";
import { Images, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { EvidenciaImagem } from "@/data/evidencias";

export interface NovaImagemEvidencia {
  id: string;
  file: File;
  previewUrl: string;
}
const MAX_FILES = 10;
const MAX_SIZE = 5 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export function EvidenciaImagensUploader({
  imagensAtuais,
  onRemoverAtual,
  novasImagens,
  onChangeNovas,
  disabled,
}: {
  imagensAtuais: EvidenciaImagem[];
  onRemoverAtual: (id: number) => void;
  novasImagens: NovaImagemEvidencia[];
  onChangeNovas: (images: NovaImagemEvidencia[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const latestRef = useRef(novasImagens);
  useEffect(() => {
    latestRef.current = novasImagens;
  }, [novasImagens]);
  useEffect(
    () => () =>
      latestRef.current.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl),
      ),
    [],
  );
  const choose = (files: FileList | null) => {
    if (!files) return;
    const slots = MAX_FILES - imagensAtuais.length - novasImagens.length;
    const valid: NovaImagemEvidencia[] = [];
    Array.from(files).forEach((file) => {
      if (valid.length >= slots) {
        toast.error(
          `É possível adicionar até ${MAX_FILES} imagens por registro.`,
        );
        return;
      }
      if (!TYPES.has(file.type)) {
        toast.error(`O formato da imagem '${file.name}' não é permitido.`);
        return;
      }
      if (file.size > MAX_SIZE) {
        toast.error(`A imagem '${file.name}' ultrapassa o limite de 5 MB.`);
        return;
      }
      valid.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    });
    onChangeNovas([...novasImagens, ...valid]);
    if (inputRef.current) inputRef.current.value = "";
  };
  const removeNew = (id: string) => {
    const image = novasImagens.find((item) => item.id === id);
    if (image) URL.revokeObjectURL(image.previewUrl);
    onChangeNovas(novasImagens.filter((item) => item.id !== id));
  };
  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => choose(e.target.files)}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="glassSecondary"
        className="h-9 gap-2 px-4"
        onClick={() => inputRef.current?.click()}
        disabled={
          disabled || imagensAtuais.length + novasImagens.length >= MAX_FILES
        }
      >
        <Upload className="h-4 w-4" />
        Selecionar fotografias
      </Button>
      <p className="text-[12px] text-muted-foreground">
        Até 10 imagens, com no máximo 5 MB cada, em JPEG, JPG, PNG ou WEBP.
      </p>
      {imagensAtuais.length + novasImagens.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Existing
            images={imagensAtuais}
            onRemove={onRemoverAtual}
            disabled={disabled}
          />
          {novasImagens.map((image) => (
            <figure
              key={image.id}
              className="attachment-file-glass relative overflow-hidden rounded-[13px]"
            >
              <img
                src={image.previewUrl}
                alt={image.file.name}
                className="aspect-[4/3] w-full object-cover"
              />
              <figcaption className="truncate px-2.5 py-2 text-[11px] text-muted-foreground">
                {image.file.name}
              </figcaption>
              <button
                type="button"
                onClick={() => removeNew(image.id)}
                disabled={disabled}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/50 bg-background/85 text-foreground shadow-sm"
                aria-label={`Remover ${image.file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </figure>
          ))}
        </div>
      )}
      {imagensAtuais.length + novasImagens.length === 0 && (
        <div className="flex items-center gap-2 rounded-[12px] border border-dashed border-border/70 px-4 py-6 text-[13px] text-muted-foreground">
          <Images className="h-4 w-4" />
          Nenhuma fotografia selecionada.
        </div>
      )}
    </div>
  );
}
function Existing({
  images,
  onRemove,
  disabled,
}: {
  images: EvidenciaImagem[];
  onRemove: (id: number) => void;
  disabled?: boolean;
}) {
  return (
    <>
      {images.map((image) => (
        <figure
          key={image.id}
          className="attachment-file-glass relative overflow-hidden rounded-[13px]"
        >
          {image.visualizacaoUrl ? (
            <img
              src={image.visualizacaoUrl}
              alt={image.nomeOriginal}
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center">
              <Images className="h-7 w-7 text-primary" />
            </div>
          )}
          <figcaption className="truncate px-2.5 py-2 text-[11px] text-muted-foreground">
            {image.nomeOriginal}
          </figcaption>
          <button
            type="button"
            onClick={() => onRemove(image.id)}
            disabled={disabled}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/50 bg-background/85"
            aria-label={`Remover ${image.nomeOriginal}`}
          >
            <X className="h-4 w-4" />
          </button>
        </figure>
      ))}
    </>
  );
}
