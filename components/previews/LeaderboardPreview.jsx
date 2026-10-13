"use client";

import { useMemo, useState } from "react";
import { Clock, Trophy } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatSitecoreDate, getImageSrc, isImageUrl, parsePrizes, parseSteps } from "@/lib/pat";
import { cn } from "@/lib/utils";
import Rich from "./Rich";

const VISIBLE_PRIZES = 4;

function PrizeTable({ rows, caption }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, VISIBLE_PRIZES);

  return (
    <div>
      {caption && <p className="mb-2 text-sm font-bold">{caption}</p>}
      <ul className="m-0 list-none overflow-hidden rounded-lg border p-0 text-sm">
        <li className="flex items-center justify-between bg-muted px-3 py-2 text-xs font-bold text-muted-foreground uppercase">
          <span>Winning Bracket</span>
          <span>Prize</span>
        </li>
        {shown.map((row, i) => (
          <li key={i} className={cn("flex items-center justify-between gap-3 border-t px-3 py-2.5", i % 2 && "bg-muted/30")}>
            <span className="font-semibold">{row.label}</span>
            <span className="text-right">{row.prize}</span>
          </li>
        ))}
      </ul>
      {rows.length > VISIBLE_PRIZES && (
        <Button type="button" variant="ghost" size="sm" className="mx-auto mt-1 flex" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "View Less" : "View More"}
        </Button>
      )}
    </div>
  );
}

// Promohub detail page for a leaderboard promotion (Sitecore template "leaderboard").
export default function LeaderboardPreview({ fieldMap }) {
  const { steps } = useMemo(() => parseSteps(fieldMap.steps), [fieldMap.steps]);
  const prizes = useMemo(() => parsePrizes(fieldMap.prizes), [fieldMap.prizes]);
  const extraPrizes = useMemo(() => parsePrizes(fieldMap.additionalprizes), [fieldMap.additionalprizes]);

  const image = getImageSrc(fieldMap.image) || getImageSrc(fieldMap.teaserimage);
  const start = formatSitecoreDate(fieldMap.promostartdate);
  const end = formatSitecoreDate(fieldMap.promoenddate);
  const duration = start && end ? `${start} - ${end}` : start || end;

  return (
    <div className="mx-auto my-2 max-w-xl space-y-5">
      {image && <img src={image} alt={fieldMap.promoname || "Promotion"} className="block h-auto w-full rounded-lg" />}

      {/* Header */}
      <header className="space-y-2">
        <h2 className="m-0 text-2xl leading-tight font-bold">{fieldMap.promoname}</h2>
        <p className="m-0 flex items-center gap-2 text-sm font-semibold text-[#63656a]">
          <Trophy className="size-4 text-[#d4b962]" /> Leaderboard
        </p>
        {duration && (
          <p className="m-0 flex items-center gap-2 text-xs text-[#63656a]">
            <Clock className="size-3.5" /> Duration: {duration}
          </p>
        )}
      </header>

      {/* Overview */}
      {fieldMap.promoteaserinfo && <p className="m-0 text-[#63656a]">{fieldMap.promoteaserinfo}</p>}

      {/* How it works */}
      {steps.length > 0 && (
        <section className="space-y-3">
          <h3 className="m-0 text-lg font-bold">How it works</h3>
          <ul className="m-0 list-none space-y-3 p-0">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                {isImageUrl(step.title) ? (
                  <img src={step.title} alt="" className="mt-0.5 size-6 shrink-0" />
                ) : (
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#d4b962] text-xs font-bold text-black">
                    {i + 1}
                  </span>
                )}
                <div className="min-w-0 text-sm text-[#63656a]">
                  {step.title && !isImageUrl(step.title) && (
                    <span className="mr-1 font-bold text-[#212529] uppercase">{step.title}</span>
                  )}
                  <Rich html={step.text} className="inline" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Dummy opt in */}
      <Button type="button" className="w-full">
        OPT IN
      </Button>

      {/* More details */}
      {fieldMap.winupto && (
        <section className="space-y-1">
          <h3 className="m-0 text-lg font-bold">More details</h3>
          <p className="m-0 text-sm text-[#63656a]">{fieldMap.winupto}</p>
        </section>
      )}

      {/* Prize list / ranking */}
      <Tabs defaultValue="prizes">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prizes">Prize List</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
        </TabsList>
        <TabsContent value="prizes" className="mt-3 space-y-4">
          <p className="m-0 text-sm text-[#63656a]">Prizes are determined by overall ranking.</p>
          {prizes.length ? (
            <PrizeTable rows={prizes} />
          ) : (
            <p className="m-0 text-sm text-muted-foreground">No prizes were found in the Prizes field.</p>
          )}
          {extraPrizes.length > 0 && <PrizeTable rows={extraPrizes} caption="Additional prizes" />}
        </TabsContent>
        <TabsContent value="ranking" className="mt-3">
          <p className="m-0 text-sm text-muted-foreground">Player rankings appear here once the promotion is live.</p>
        </TabsContent>
      </Tabs>

      {fieldMap.promoid && (
        <p className="m-0 text-sm text-[#63656a]">
          Promotion Code: <span className="font-semibold text-[#212529]">{fieldMap.promoid}</span>
        </p>
      )}

      {/* Terms and conditions */}
      <Accordion type="single" collapsible defaultValue="tnc" className="rounded-md border px-3">
        <AccordionItem value="tnc">
          <AccordionTrigger>Terms and Conditions</AccordionTrigger>
          <AccordionContent>
            <Rich html={fieldMap.fulltermsandconditions} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
