import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConvertConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceLabel: string;
  targetLabel: string;
  onConfirm: () => void;
}

export function ConvertConfirmDialog({
  open,
  onOpenChange,
  sourceLabel,
  targetLabel,
  onConfirm,
}: ConvertConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Converter em {targetLabel.toLowerCase()}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Os dados disponíveis no cadastro de {sourceLabel.toLowerCase()}{" "}
            serão utilizados para criar o novo registro em {targetLabel}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Confirmar conversão
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
