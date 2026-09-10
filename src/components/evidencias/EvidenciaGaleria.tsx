import { Images } from "lucide-react";
export interface ImagemGaleria {
  id: number;
  nome: string;
  url?: string;
}
export function EvidenciaGaleria({ imagens }: { imagens: ImagemGaleria[] }) {
  if (!imagens.length)
    return (
      <p className="text-[13px] text-muted-foreground">
        Nenhuma fotografia anexada.
      </p>
    );
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {imagens.map((image) =>
        image.url ? (
          <a
            key={image.id}
            href={image.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group overflow-hidden rounded-[13px] border border-border/60 bg-background/60"
          >
            <img
              src={image.url}
              alt={image.nome}
              className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]"
            />
            <p className="truncate px-2.5 py-2 text-[11px] text-muted-foreground">
              {image.nome}
            </p>
          </a>
        ) : (
          <div
            key={image.id}
            className="flex aspect-[4/3] flex-col items-center justify-center rounded-[13px] border border-border/60 bg-muted/30 p-3"
          >
            <Images className="h-7 w-7 text-primary" />
            <span className="mt-2 line-clamp-2 text-center text-[11px] text-muted-foreground">
              {image.nome}
            </span>
          </div>
        ),
      )}
    </div>
  );
}
