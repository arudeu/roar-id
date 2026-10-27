"use client";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CircleAlert, RefreshCw, Search } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Check from "./Check";
import InboxPreview from "./previews/InboxPreview";
import OverlayPreview from "./previews/OverlayPreview";
import ToasterPreview from "./previews/ToasterPreview";
import RewardTilesPreview from "./previews/RewardTilesPreview";
import MPPPreview from "./previews/MPPPreview";
import MPPv2Preview from "./previews/MPPv2Preview";
import PATPreview from "./previews/PATPreview";
import LeaderboardPreview from "./previews/LeaderboardPreview";
import PromohubTilePreview from "./previews/PromohubTilePreview";
import CreativePreview from "./previews/CreativePreview";
import { useDebouncedValue } from "@/lib/hooks";
import { cleanSitecoreId, detectPageType, fetchSitecoreItem, formatFetchedAt, isMppTemplate } from "@/lib/sitecore";
import { detectBrand } from "@/lib/brands";
import { extractMppV2Fields } from "@/lib/mppv2";

const MODE_LABELS = {
  inbox: "Inbox",
  overlay: "Overlay",
  toaster: "Toaster",
  rewardtiles: "Reward Tiles",
  mpp: "MPP",
  mppv2: "MPP v2",
  pat: "PAT",
  promohub: "Promohub Tile",
  creative: "Creative",
};

export default function Home() {
  const [id, setId] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [error, setError] = useState("");
  const [data, setData] = useState(null); // { fieldMap, itemMap, fetchedAt }
  const [viewMode, setViewMode] = useState("inbox");

  const cleanedId = cleanSitecoreId(id);
  const debouncedId = useDebouncedValue(cleanedId, 500);
  // The ID actually being fetched: follows typing (debounced), or jumps ahead when Load is pressed.
  const [fetchId, setFetchId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => setFetchId(debouncedId), [debouncedId]);

  const load = () => {
    if (!cleanedId) return;
    setFetchId(cleanedId);
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    if (!fetchId) {
      setStatus("idle");
      setData(null);
      setError("");
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    setError("");
    fetchSitecoreItem(fetchId, { signal: controller.signal })
      .then((result) => {
        setData(result);
        setStatus("ready");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Error fetching data:", err);
        setData(null);
        setError(err.message || "Something went wrong while fetching.");
        setStatus("error");
        toast.error("Couldn't load that item", { id: "fetch-error", description: err.message });
      });
    return () => controller.abort();
  }, [fetchId, reloadKey]);

  const fieldMap = useMemo(() => data?.fieldMap ?? {}, [data]);
  const detection = useMemo(
    () => detectPageType(fieldMap, data?.itemMap, data?.creatives, data?.template),
    [fieldMap, data],
  );

  // Pick the right default mode whenever a new item loads.
  useEffect(() => {
    setViewMode(detection.modes[0]);
  }, [detection.type, data]);

  // MPP (mobilepromotion) items: the path says which site and product the promotion is for, which
  // decides where CTA links point and which colours the CTA buttons use.
  const isMppItem = isMppTemplate(data?.template);
  const brand = useMemo(() => (isMppItem ? detectBrand(data?.path) : null), [isMppItem, data]);

  // MPP v2: the text fields of the page's items go to the checker (values as authored in Sitecore).
  const mppv2Tree = data?.mppv2?.tree ?? null;
  const mppv2Fields = useMemo(() => (mppv2Tree ? extractMppV2Fields(mppv2Tree) : null), [mppv2Tree]);

  const dateTimeToday = formatFetchedAt(data?.fetchedAt);
  const sourceKey = data ? String(data.fetchedAt.getTime()) : "none";
  const isMPP = detection.isMPP;
  const isPAT = detection.isPAT;

  const previews = {
    inbox: <InboxPreview fieldMap={fieldMap} dateTimeToday={dateTimeToday} isMPP={isMPP} isPAT={isPAT} />,
    overlay: <OverlayPreview fieldMap={fieldMap} isMPP={isMPP} isPAT={isPAT} />,
    toaster: <ToasterPreview fieldMap={fieldMap} isMPP={isMPP} isPAT={isPAT} />,
    rewardtiles: <RewardTilesPreview fieldMap={fieldMap} isMPP={isMPP} isPAT={isPAT} />,
    mpp: <MPPPreview fieldMap={fieldMap} isPAT={isPAT} brand={brand} />,
    // Renders the item's whole tree (page + its separately fetched folders), not the flat field map.
    mppv2: <MPPv2Preview tree={mppv2Tree} loadNotes={data?.mppv2?.loadNotes} />,
    pat: detection.isLeaderboard ? (
      <LeaderboardPreview fieldMap={fieldMap} />
    ) : (
      <PATPreview fieldMap={fieldMap} isPAT={isPAT} />
    ),
    promohub: <PromohubTilePreview fieldMap={fieldMap} />,
    creative: <CreativePreview creatives={data?.creatives ?? []} />,
  };

  const activeMode = detection.modes.includes(viewMode) ? viewMode : detection.modes[0];
  // A leaderboard is a PAT page, but its checker has different fields.
  const checkMode = activeMode === "pat" && detection.isLeaderboard ? "leaderboard" : activeMode;
  const isMppV2 = activeMode === "mppv2";

  return (
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
      <section aria-label="HTML check">
        <Check
          fieldMap={isMppV2 ? (mppv2Fields?.values ?? {}) : fieldMap}
          fieldDefs={isMppV2 ? (mppv2Fields?.defs ?? []) : undefined}
          viewMode={checkMode}
          sourceKey={sourceKey}
          title={MODE_LABELS[activeMode]}
          brand={isMppV2 ? null : brand}
        />
      </section>

      <section
        aria-label="Preview"
        className="space-y-4 lg:sticky lg:top-[4.25rem] lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:pr-1"
      >
        <div className="space-y-1.5">
          <Label htmlFor="sitecore-id">Sitecore ID:</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="sitecore-id"
                className="pl-9"
                placeholder="Enter Sitecore ID or DirectLink URL"
                value={id}
                onChange={(e) => setId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={status === "error" || undefined}
              />
            </div>
            <Button
              type="button"
              onClick={load}
              disabled={!cleanedId || status === "loading"}
              aria-busy={status === "loading"}
              className="min-w-28"
            >
              <RefreshCw className={status === "loading" ? "animate-spin" : undefined} />
              {status === "loading" ? "Loading…" : status === "ready" ? "Reload" : "Load"}
            </Button>
          </div>
        </div>

        {status === "ready" && (
          <Tabs value={activeMode} onValueChange={setViewMode}>
            <TabsList>
              {detection.modes.map((mode) => (
                <TabsTrigger key={mode} value={mode} className="px-4">
                  {MODE_LABELS[mode]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        <div>
          <span className="text-sm font-bold">Preview:</span>
          {status === "idle" && (
            <p className="mt-1 text-sm text-muted-foreground">No Sitecore ID entered</p>
          )}
          {status === "loading" && (
            <div className="mt-2 space-y-2" aria-busy="true">
              <p className="text-sm text-muted-foreground">Fetching data for: {fetchId}</p>
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-48 w-full" />
            </div>
          )}
          {status === "error" && (
            <Alert variant="destructive" className="mt-2">
              <CircleAlert />
              <AlertTitle>Couldn't load that item</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {status === "ready" && (
            <>
              <p className="mt-1 mb-2 text-sm text-muted-foreground">
                Fetched data for: {fetchId}
              </p>
              {isMppItem && (
                <p className="mb-2 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  {brand ? (
                    <>
                      <span>
                        Detected from path: <strong>{brand.name}</strong> · {brand.domain} · {brand.categoryLabel}
                        {!brand.categoryDetected && " (product not in path, using default colours)"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        CTA
                        <span
                          className="inline-block size-3.5 rounded-sm border"
                          style={{ backgroundColor: brand.bg }}
                          aria-hidden="true"
                        />
                        {brand.bg} · text {brand.fg === "#ffffff" ? "white" : "black"}
                      </span>
                    </>
                  ) : (
                    <span>Couldn&apos;t match the site in this item&apos;s path to a known brand, so CTAs are left as they are.</span>
                  )}
                </p>
              )}
              {isMppV2 ? (
                // MPP v2 draws its own light preview box under its visitor switch.
                <div key={activeMode}>{previews[activeMode]}</div>
              ) : (
                <div
                  key={activeMode}
                  className="theme-light preview-font rounded-lg border bg-white p-4 text-[#212529]"
                  aria-label={`${MODE_LABELS[activeMode]} preview`}
                >
                  {previews[activeMode]}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
