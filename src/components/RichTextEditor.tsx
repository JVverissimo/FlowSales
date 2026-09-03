import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Underline, List, ListOrdered, Quote, Eraser,
  AlignLeft, AlignCenter, AlignRight, Undo, Redo, Heading1, Heading2,
} from "lucide-react";

export interface RichTextEditorHandle {
  insertText: (text: string) => void;
  focus: () => void;
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, Props>(
  ({ value, onChange, placeholder, minHeight = 220 }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);

    // Sync value into DOM only when it differs (avoid caret jumps while typing)
    useEffect(() => {
      const el = editorRef.current;
      if (!el) return;
      if (el.innerHTML !== value) el.innerHTML = value || "";
    }, [value]);

    const exec = (cmd: string, arg?: string) => {
      editorRef.current?.focus();
      document.execCommand(cmd, false, arg);
      onChange(editorRef.current?.innerHTML ?? "");
    };

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
          // append at end
          el.innerHTML += text;
        } else {
          document.execCommand("insertText", false, text);
        }
        onChange(el.innerHTML);
      },
      focus: () => editorRef.current?.focus(),
    }));

    const btn = (icon: React.ReactNode, action: () => void, title: string) => (
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={title} onMouseDown={(e) => e.preventDefault()} onClick={action}>
        {icon}
      </Button>
    );

    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-muted/40 border-b border-border">
          {btn(<Heading1 className="h-3.5 w-3.5" />, () => exec("formatBlock", "H2"), "Título")}
          {btn(<Heading2 className="h-3.5 w-3.5" />, () => exec("formatBlock", "H3"), "Subtítulo")}
          {btn(<span className="text-xs font-medium">P</span>, () => exec("formatBlock", "P"), "Parágrafo")}
          <span className="w-px h-5 bg-border mx-1" />
          {btn(<Bold className="h-3.5 w-3.5" />, () => exec("bold"), "Negrito")}
          {btn(<Italic className="h-3.5 w-3.5" />, () => exec("italic"), "Itálico")}
          {btn(<Underline className="h-3.5 w-3.5" />, () => exec("underline"), "Sublinhado")}
          <span className="w-px h-5 bg-border mx-1" />
          {btn(<List className="h-3.5 w-3.5" />, () => exec("insertUnorderedList"), "Lista")}
          {btn(<ListOrdered className="h-3.5 w-3.5" />, () => exec("insertOrderedList"), "Lista numerada")}
          {btn(<Quote className="h-3.5 w-3.5" />, () => exec("formatBlock", "BLOCKQUOTE"), "Citação")}
          <span className="w-px h-5 bg-border mx-1" />
          {btn(<AlignLeft className="h-3.5 w-3.5" />, () => exec("justifyLeft"), "Alinhar à esquerda")}
          {btn(<AlignCenter className="h-3.5 w-3.5" />, () => exec("justifyCenter"), "Centralizar")}
          {btn(<AlignRight className="h-3.5 w-3.5" />, () => exec("justifyRight"), "Alinhar à direita")}
          <span className="w-px h-5 bg-border mx-1" />
          {btn(<Undo className="h-3.5 w-3.5" />, () => exec("undo"), "Desfazer")}
          {btn(<Redo className="h-3.5 w-3.5" />, () => exec("redo"), "Refazer")}
          {btn(<Eraser className="h-3.5 w-3.5" />, () => exec("removeFormat"), "Limpar formatação")}
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
          onBlur={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
          className="prose prose-sm max-w-none p-3 text-sm leading-relaxed focus:outline-none [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-2 [&_h3]:text-base [&_h3]:font-semibold [&_p]:my-1 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
          data-placeholder={placeholder}
          style={{ minHeight }}
        />
      </div>
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";
