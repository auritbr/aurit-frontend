import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * Destaca discretamente os placeholders de variáveis ({{grupo.campo}}) dentro
 * do editor, sem alterar o HTML salvo — a chave enviada ao backend permanece
 * exatamente igual ao texto digitado/inserido.
 */
const PADRAO = /\{\{\s*[a-zA-Z0-9_.]+\s*\}\}/g;

function decorar(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (!node.isText || !node.text) return;
    const texto: string = node.text;
    PADRAO.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PADRAO.exec(texto)) !== null) {
      decorations.push(
        Decoration.inline(
          pos + match.index,
          pos + match.index + match[0].length,
          {
            class: "documento-variavel-token",
          },
        ),
      );
    }
  });
  return DecorationSet.create(doc, decorations);
}

export const VariavelDecoration = Extension.create({
  name: "variavelDecoration",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("variavelDecoration"),
        state: {
          init: (_config, { doc }) => decorar(doc),
          apply: (tr, old) => (tr.docChanged ? decorar(tr.doc) : old),
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
