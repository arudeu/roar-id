"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { html } from "@codemirror/lang-html";
import { Decoration, EditorView } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";
import { lintGutter, setDiagnostics } from "@codemirror/lint";
import { monokaiInit } from "@uiw/codemirror-theme-monokai";

import { Skeleton } from "@/components/ui/skeleton";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => <Skeleton className="h-24 w-full rounded-md bg-[#272822]" />,
});

/** Highlights the issue you jumped to (range + its line). Pass null to clear. */
export const setActiveIssue = StateEffect.define();

const activeIssueField = StateField.define({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects) {
      if (!e.is(setActiveIssue)) continue;
      if (!e.value) return Decoration.none;
      const len = tr.state.doc.length;
      const from = Math.min(e.value.from, len);
      const to = Math.min(e.value.to, len);
      const line = tr.state.doc.lineAt(from);
      const ranges = [Decoration.line({ class: "cm-issue-active-line" }).range(line.from)];
      if (to > from) ranges.push(Decoration.mark({ class: "cm-issue-active" }).range(from, to));
      return Decoration.set(ranges, true);
    }
    return tr.docChanged ? Decoration.none : deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const theme = monokaiInit({
  settings: { caret: "#c6c6c6", fontFamily: "Fira Code, monospace" },
});

export default function CodeField({
  field,
  value,
  onChange,
  issues,
  analyzedValue,
  compact = false,
  placeholder,
  height = "200px",
  onView,
}) {
  const [view, setView] = useState(null);

  const extensions = useMemo(
    () => [
      html(),
      EditorView.lineWrapping,
      activeIssueField,
      ...(compact ? [] : [lintGutter()]),
    ],
    [compact],
  );

  // Push the current issues into the editor as diagnostics: this draws the
  // coloured underline, the gutter marker and the hover card (with a Fix button).
  useEffect(() => {
    if (!view) return;
    const doc = view.state.doc.toString();
    if (doc !== analyzedValue) return; // stale; positions would be wrong
    const diagnostics = issues
      .filter((i) => i.to <= doc.length)
      .map((issue) => ({
        from: issue.from,
        to: issue.to,
        severity: issue.severity,
        source: issue.title,
        message: issue.message,
        actions: issue.fix
          ? [
              {
                name: "Fix",
                apply(v) {
                  if (v.state.doc.toString() !== analyzedValue) return;
                  v.dispatch({
                    changes: issue.fix.map((e) => ({ from: e.from, to: e.to, insert: e.insert })),
                  });
                },
              },
            ]
          : undefined,
      }));
    view.dispatch(setDiagnostics(view.state, diagnostics));
  }, [view, issues, analyzedValue]);

  return (
    <div
      data-field={field}
      className="overflow-hidden rounded-md border border-[#3c3c3c] shadow-xs transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/40"
    >
      <CodeMirror
        value={value}
        height={compact ? undefined : height}
        minHeight={compact ? "38px" : undefined}
        maxHeight={compact ? "120px" : undefined}
        theme={theme}
        placeholder={placeholder}
        extensions={extensions}
        basicSetup={{
          lineNumbers: !compact,
          foldGutter: false,
          highlightActiveLine: !compact,
          highlightActiveLineGutter: !compact,
          autocompletion: false,
        }}
        onChange={onChange}
        onCreateEditor={(v) => {
          setView(v);
          onView?.(field, v);
        }}
      />
    </div>
  );
}
