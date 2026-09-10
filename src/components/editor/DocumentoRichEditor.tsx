import { useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  Eraser,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Unlink,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { VariavelDecoration } from "@/components/editor/variavelDecoration";
import { VariaveisPicker } from "@/components/editor/VariaveisPicker";
import type { VariavelDocumento } from "@/data/modeloDocumento";

/**
 * Editor de documentos institucionais da Aurit.
 *
 * Mantém o conteúdo como HTML (compatível com a substituição de variáveis e
 * a geração de PDF no backend) e limpa estilos incompatíveis ao colar textos
 * do Word ou do Google Docs.
 */
export function useDocumentoEditor(
  value: string,
  onChange: (html: string) => void,
  editable = true,
) {
  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        code: false,
        horizontalRule: false,
        blockquote: false,
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
      }),
      Placeholder.configure({
        placeholder: "Digite ou cole o conteúdo do documento...",
      }),
      VariavelDecoration,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "documento-folha-conteudo focus:outline-none",
        "aria-label": "Conteúdo do documento",
        role: "textbox",
        "aria-multiline": "true",
      },
      // Cola preservando estrutura básica e descartando estilos/classes do Word.
      transformPastedHTML: (html) => limparHtmlColado(html),
    },
    onUpdate: ({ editor: instancia }) => onChange(instancia.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const atual = editor.getHTML();
    const proximo = value || "";
    if (proximo !== atual && (!proximo || proximo !== "<p></p>")) {
      editor.commands.setContent(proximo, { emitUpdate: false });
    }
    // Sincroniza apenas quando o conteúdo carregado externamente muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  return editor;
}

/** Remove CSS, classes do Word, fontes e marcações inseguras do HTML colado. */
export function limparHtmlColado(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<\/?(?:o:p|w:[^>]+|xml|meta|link|style|script|font|iframe|object|embed)[^>]*>/gi,
      "",
    )
    .replace(/<\/?span[^>]*>/gi, "")
    .replace(
      /\s(?:style|class|lang|dir|width|height|align|bgcolor|color|face|size|id)="[^"]*"/gi,
      "",
    )
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/<p>\s*<\/p>/gi, "");
}

interface ToolbarButtonProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

function ToolbarButton({
  label,
  icon: Icon,
  onClick,
  active,
  disabled,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="glassGhost"
          size="icon"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            "h-8 w-8 rounded-[10px] text-muted-foreground",
            active && "bg-primary/12 text-primary ring-1 ring-primary/30",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function Divisor() {
  return <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-border/70" />;
}

export interface DocumentoRichEditorProps {
  editor: Editor | null;
  variaveis: VariavelDocumento[];
  carregandoVariaveis?: boolean;
  /** Mensagem exibida no popover quando não há tipo de documento selecionado. */
  avisoVariaveis?: string;
  readOnly?: boolean;
  className?: string;
}

export function DocumentoRichEditor({
  editor,
  variaveis,
  carregandoVariaveis,
  avisoVariaveis,
  readOnly,
  className,
}: DocumentoRichEditorProps) {
  if (!editor) {
    return (
      <div className="documento-folha flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
        Carregando editor...
      </div>
    );
  }

  const estrutura = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : "p";

  const aplicarEstrutura = (valor: string) => {
    if (valor === "p") editor.chain().focus().setParagraph().run();
    else
      editor
        .chain()
        .focus()
        .setHeading({ level: Number(valor.replace("h", "")) as 1 | 2 | 3 })
        .run();
  };

  const inserirLink = () => {
    const atual = editor.getAttributes("link")?.href as string | undefined;
    const url = window.prompt(
      "Informe o endereço do link:",
      atual || "https://",
    );
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  };

  const inserirVariavel = (chave: string) => {
    editor.chain().focus().insertContent(chave).run();
  };

  return (
    <div className={cn("space-y-3", className)}>
      {!readOnly && (
        <div
          role="toolbar"
          aria-label="Ferramentas de formatação do documento"
          className="editor-toolbar-glass flex items-center gap-1 overflow-x-auto rounded-[14px] p-1.5"
        >
          <ToolbarButton
            label="Desfazer"
            icon={Undo2}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          />
          <ToolbarButton
            label="Refazer"
            icon={Redo2}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          />
          <Divisor />
          <ToolbarButton
            label="Negrito"
            icon={Bold}
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            label="Itálico"
            icon={Italic}
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            label="Sublinhado"
            icon={UnderlineIcon}
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <ToolbarButton
            label="Tachado"
            icon={Strikethrough}
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          />
          <Divisor />
          <Select value={estrutura} onValueChange={aplicarEstrutura}>
            <SelectTrigger
              aria-label="Estrutura do texto"
              className="h-8 w-[132px] shrink-0 rounded-[10px] border-border/70 bg-background/60 text-[12.5px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="p">Parágrafo</SelectItem>
              <SelectItem value="h1">Título 1</SelectItem>
              <SelectItem value="h2">Título 2</SelectItem>
              <SelectItem value="h3">Título 3</SelectItem>
            </SelectContent>
          </Select>
          <Divisor />
          <ToolbarButton
            label="Alinhar à esquerda"
            icon={AlignLeft}
            active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          />
          <ToolbarButton
            label="Centralizar"
            icon={AlignCenter}
            active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          />
          <ToolbarButton
            label="Alinhar à direita"
            icon={AlignRight}
            active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          />
          <ToolbarButton
            label="Justificar"
            icon={AlignJustify}
            active={editor.isActive({ textAlign: "justify" })}
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          />
          <Divisor />
          <ToolbarButton
            label="Lista com marcadores"
            icon={List}
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            label="Lista numerada"
            icon={ListOrdered}
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <Divisor />
          <ToolbarButton
            label="Inserir link"
            icon={LinkIcon}
            active={editor.isActive("link")}
            onClick={inserirLink}
          />
          <ToolbarButton
            label="Remover link"
            icon={Unlink}
            disabled={!editor.isActive("link")}
            onClick={() => editor.chain().focus().unsetLink().run()}
          />
          <Divisor />
          <ToolbarButton
            label="Limpar formatação"
            icon={Eraser}
            onClick={() =>
              editor.chain().focus().unsetAllMarks().clearNodes().run()
            }
          />
          <Divisor />
          <VariaveisPicker
            variaveis={variaveis}
            carregando={carregandoVariaveis}
            aviso={avisoVariaveis}
            onInserir={inserirVariavel}
            trigger={
              <Button
                type="button"
                variant="glassSecondary"
                className="h-8 shrink-0 gap-1.5 rounded-[10px] px-2.5 text-[12.5px] font-medium"
                aria-label="Inserir variável no documento"
              >
                <Braces className="h-3.5 w-3.5" aria-hidden />
                Variáveis
              </Button>
            }
          />
        </div>
      )}

      <div className="documento-folha-area">
        <div className="documento-folha">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
