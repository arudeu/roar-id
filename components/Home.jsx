"use client";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CircleAlert, Search } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import PATPreview from "./previews/PATPreview";
import CreativePreview from "./previews/CreativePreview";
import { useDebouncedValue } from "@/lib/hooks";
import { cleanSitecoreId, detectPageType, fetchSitecoreItem, formatFetchedAt } from "@/lib/sitecore";

const MODE_LABELS = {
  inbox: "Inbox",
  overlay: "Overlay",
  toaster: "Toaster",
  rewardtiles: "Reward Tiles",
  mpp: "MPP",
  pat: "PAT",
  creative: "Creative",
};

export default function Home() {
  const [id, setId] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [error, setError] = useState("");
  const [data, setData] = useState(null); // { fieldMap, itemMap, fetchedAt }
  const [viewMode, setViewMode] = useState("inbox");

  const debouncedId = useDebouncedValue(cleanSitecoreId(id), 500);

  useEffect(() => {
    if (!debouncedId) {
      setStatus("idle");
      setData(null);
      setError("");
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    setError("");
    fetchSitecoreItem(debouncedId, { signal: controller.signal })
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
  }, [debouncedId]);

  const fieldMap = useMemo(() => data?.fieldMap ?? {}, [data]);
  const detection = useMemo(
    () => detectPageType(fieldMap, data?.itemMap),
    [fieldMap, data],
  );

  // Pick the right default mode whenever a new item loads.
  useEffect(() => {
    setViewMode(detection.modes[0]);
  }, [detection.type, data]);

  const dateTimeToday = formatFetchedAt(data?.fetchedAt);
  const sourceKey = data ? String(data.fetchedAt.getTime()) : "none";
  const isMPP = detection.isMPP;
  const isPAT = detection.isPAT;

  const previews = {
    inbox: <InboxPreview fieldMap={fieldMap} dateTimeToday={dateTimeToday} isMPP={isMPP} isPAT={isPAT} />,
    overlay: <OverlayPreview fieldMap={fieldMap} isMPP={isMPP} isPAT={isPAT} />,
    toaster: <ToasterPreview fieldMap={fieldMap} isMPP={isMPP} isPAT={isPAT} />,
    rewardtiles: <RewardTilesPreview fieldMap={fieldMap} isMPP={isMPP} isPAT={isPAT} />,
    mpp: <MPPPreview fieldMap={fieldMap} isPAT={isPAT} />,
    pat: <PATPreview fieldMap={fieldMap} isPAT={isPAT} />,
    creative: <CreativePreview fieldMap={fieldMap} />,
  };

  const activeMode = detection.modes.includes(viewMode) ? viewMode : detection.modes[0];

  return (
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
      <section aria-label="HTML check">
        <Check fieldMap={fieldMap} viewMode={activeMode} sourceKey={sourceKey} />
      </section>

      <section
        aria-label="Preview"
        className="space-y-4 lg:sticky lg:top-[4.25rem] lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:pr-1"
      >
        <div className="space-y-1.5">
          <Label htmlFor="sitecore-id">Sitecore ID:</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="sitecore-id"
              className="pl-9"
              placeholder="Enter Sitecore ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={status === "error" || undefined}
            />
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
              <p className="text-sm text-muted-foreground">Fetching data for: {debouncedId}</p>
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
                Fetched data for: {debouncedId}
              </p>
              <div
                key={activeMode}
                className="rounded-lg border bg-white p-4 text-[#212529]"
                aria-label={`${MODE_LABELS[activeMode]} preview`}
              >
                {previews[activeMode]}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
