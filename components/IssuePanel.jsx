"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  WandSparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FIELD_LABELS } from "@/lib/fields";

export const SEVERITY_ICON = {
  error: { Icon: CircleAlert, className: "text-destructive" },
  warning: { Icon: TriangleAlert, className: "text-warning" },
  info: { Icon: Info, className: "text-[#1b8fb0]" },
};

function IssueRow({ issue, active, onSelect, onFix }) {
  const { Icon, className } = SEVERITY_ICON[issue.severity];
  const ref = useRef(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(issue)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(issue);
        }
      }}
      aria-current={active ? "true" : undefined}
      className={cn(
        "group flex w-full items-start gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50",
        active && "border-primary bg-accent",
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", className)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="font-semibold">{issue.title}</span>
          <span className="font-mono text-[11px] text-muted-foreground">
            Ln {issue.line}, Col {issue.col}
          </span>
        </div>
        <p className="text-[13px] leading-snug text-muted-foreground">{issue.message}</p>
      </div>
      {issue.fix && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onFix(issue);
              }}
            >
              <WandSparkles /> Fix
            </Button>
          </TooltipTrigger>
          <TooltipContent>Apply the suggested fix</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export default function IssuePanel({
  issues,
  summary,
  activeId,
  onSelect,
  onStep,
  onFix,
  onFixAll,
  fixableCount,
  hasContent,
}) {
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(true);

  const visible = useMemo(
    () => (filter === "all" ? issues : issues.filter((i) => i.severity === filter)),
    [issues, filter],
  );
  const groups = useMemo(() => {
    const map = new Map();
    visible.forEach((i) => map.set(i.field, [...(map.get(i.field) || []), i]));
    return [...map.entries()];
  }, [visible]);

  const position = visible.findIndex((i) => i.id === activeId);
  const clean = hasContent && summary.total === 0;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <h6 className="m-0 mr-1 text-sm font-bold">Issues</h6>
        {clean ? (
          <Badge variant="success">
            <CircleCheck /> No issues found
          </Badge>
        ) : (
          <>
            <Badge variant="error">{summary.error} errors</Badge>
            <Badge variant="warning">{summary.warning} warnings</Badge>
            {summary.info > 0 && <Badge variant="info">{summary.info} tips</Badge>}
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          {fixableCount > 0 && (
            <Button size="sm" variant="default" onClick={onFixAll}>
              <WandSparkles /> Fix {fixableCount} auto-fixable
            </Button>
          )}
          <span className="px-1 font-mono text-xs text-muted-foreground tabular-nums">
            {visible.length ? `${position >= 0 ? position + 1 : "–"} / ${visible.length}` : "0 / 0"}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="outline"
                disabled={!visible.length}
                onClick={() => onStep(-1, visible)}
                aria-label="Previous issue"
              >
                <ChevronUp />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous issue (Alt + ↑)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="outline"
                disabled={!visible.length}
                onClick={() => onStep(1, visible)}
                aria-label="Next issue"
              >
                <ChevronDown />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next issue (Alt + ↓)</TooltipContent>
          </Tooltip>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            disabled={summary.total === 0}
          >
            {open ? "Hide" : "Show"}
          </Button>
        </div>
      </div>

      {open && summary.total > 0 && (
        <>
          <div className="border-b px-3 py-2">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="h-8">
                <TabsTrigger value="all">All {summary.total}</TabsTrigger>
                <TabsTrigger value="error">Errors {summary.error}</TabsTrigger>
                <TabsTrigger value="warning">Warnings {summary.warning}</TabsTrigger>
                {summary.info > 0 && <TabsTrigger value="info">Tips {summary.info}</TabsTrigger>}
              </TabsList>
            </Tabs>
          </div>
          <div className="max-h-[32vh] overflow-y-auto px-2 py-2">
            {groups.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted-foreground">Nothing in this category.</p>
            )}
            {groups.map(([field, list]) => (
              <section key={field} className="mb-2 last:mb-0">
                <h6 className="sticky top-0 z-[1] mb-0.5 bg-card px-2 py-1 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  {FIELD_LABELS[field] || field} · {list.length}
                </h6>
                {list.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    active={issue.id === activeId}
                    onSelect={onSelect}
                    onFix={onFix}
                  />
                ))}
              </section>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
