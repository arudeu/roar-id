"use client";
<<<<<<< HEAD
import React, { useState, useEffect } from "react";
=======
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CircleAlert, Search } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
>>>>>>> 8623917 (Updated overall look and improved code logic)
import Check from "./Check";
import InboxPreview from "./previews/InboxPreview";
import OverlayPreview from "./previews/OverlayPreview";
import ToasterPreview from "./previews/ToasterPreview";
import RewardTilesPreview from "./previews/RewardTilesPreview";
import MPPPreview from "./previews/MPPPreview";
import PATPreview from "./previews/PATPreview";
import CreativePreview from "./previews/CreativePreview";
<<<<<<< HEAD

export default function HomeClient({ setFieldMap }) {
  const [url, setURL] = useState("");
  const [fields, setFields] = useState([]);
  const [dateTimeToday, setDateToday] = useState("");
  const [viewMode, setViewMode] = useState("inbox");
  const [isMPP, setIsMPP] = useState(false);
  const [isPAT, setIsPAT] = useState(false);
  const [isCreative, setIsCreative] = useState(false);
  const [creativeFields, setCreativeFields] = useState([]);

  const fetchData = async () => {
    const base = process.env.NEXT_PUBLIC_API_BASE;
    const accessId = process.env.NEXT_PUBLIC_API_ACCESS_ID;
    try {
      const newUrl = url.replace(/[{}]/g, "");
      const res = await fetch(
        `${base}/${newUrl}?depth=2&lang=en-US&culture=en-US&environment=prod&x-bwin-accessid=${accessId}&source=prod`,
      );
      const text = await res.text();
      const xml = new DOMParser().parseFromString(text, "application/xml");

      const extracted = Array.from(xml.querySelectorAll("field")).map((n) => ({
        key: n.getAttribute("key"),
        html: n.textContent,
      }));

      const itemExtracted = Array.from(xml.querySelectorAll("item")).map(
        (item) => {
          const fields = Array.from(item.querySelectorAll("field"));

          return fields.reduce((obj, field) => {
            const key = field.getAttribute("key");
            const value = field.textContent.trim();
            obj[key] = value;
            return obj;
          }, {});
        },
      );

      const formattedDate = new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

      const newMap = Object.fromEntries(extracted.map((f) => [f.key, f.html]));
      const itemMap = Object.fromEntries(
        itemExtracted.map((f) => [
          f.alt, // map key
          { ...f },
        ]),
      );
      setFields(extracted);
      setFieldMap(newMap);
      setCreativeFields(itemMap);
      setDateToday(formattedDate);

      const mppFields = [
        "detaileddescription",
        "image",
        "imageheadline",
        "promotiontitle",
        "showtacs",
        "tactitle",
        "termsandconditions",
        "visibleinlist",
      ];
      const patFields = [
        "allowedlabels",
        "allowedlanguages",
        "assetsroot",
        "carouselbackgroundimage",
        "firstslabimage",
        "fulltermsandconditions",
        "image",
        "keytermsandconditions",
        "manualdatapoints",
        "playnow",
        "prizemessage",
        "prizes",
        "promocreatedate",
        "promodisplayenddate",
        "promoenddate",
        "promoid",
        "promoname",
        "promostartdate",
        "promoteaserinfo",
        "promotype",
        "slabimage",
        "stepimage",
        "steps",
        "teaserimage",
        "transactiondescription",
      ];
      const creativeFields = [
        "height",
        "width",
        "dimensions",
        "extension",
        "mediahash",
        "mime type",
        "size",
        "blob",
        "alt",
      ];

      setIsMPP(mppFields.every((key) => key in newMap));
      setIsPAT(patFields.every((key) => key in newMap));
      const allValid = Object.values(itemMap).every((item) =>
        creativeFields.every((key) => key in item),
      );

      setIsCreative(allValid);
      console.log(itemMap);
      console.log(newMap);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    if (url) fetchData();
  }, [url]);

  useEffect(() => {
    if (isMPP) {
      setViewMode("mpp");
    } else if (isPAT) {
      setViewMode("pat");
    } else if (isCreative) {
      setViewMode("creative");
    } else {
      setViewMode("inbox");
    }
  }, [isMPP, isPAT, isCreative]);

  const fieldMap = Object.fromEntries(fields.map((f) => [f.key, f.html]));

  const previews = {
    inbox: (
      <InboxPreview
        fieldMap={fieldMap}
        dateTimeToday={dateTimeToday}
        isMPP={isMPP}
        isPAT={isPAT}
      />
    ),
    overlay: <OverlayPreview fieldMap={fieldMap} isMPP={isMPP} isPAT={isPAT} />,
    toaster: <ToasterPreview fieldMap={fieldMap} isMPP={isMPP} isPAT={isPAT} />,
    rewardtiles: (
      <RewardTilesPreview fieldMap={fieldMap} isMPP={isMPP} isPAT={isPAT} />
    ),
    mpp: <MPPPreview fieldMap={fieldMap} isPAT={isPAT} />,
    pat: <PATPreview fieldMap={fieldMap} isPAT={isMPP} />,
    creative: <CreativePreview fieldMap={fieldMap} />,
  };

  return (
    <div className="container-fluid">
      <div className="row mt-5">
        <div className="col-6">
          <Check fieldMap={fieldMap} viewMode={viewMode} />
        </div>

        <div className="col-6">
          {/* Input */}
          <div className="mb-3">
            <label className="fw-bold">Sitecore ID:</label>
            <input
              className="form-control"
              placeholder="Enter Sitecore ID"
              value={url}
              onChange={(e) => setURL(e.target.value)}
            />
          </div>

          {/* Toggle View Mode */}
          <div className="btn-group mb-3">
            {[
              // show only these if neither MPP nor PAT is allowed
              ...(!isMPP && !isPAT && !isCreative
                ? ["inbox", "overlay", "toaster", "rewardtiles"]
                : []),

              // show MPP when allowed
              ...(isMPP ? ["mpp"] : []),

              // show PAT when allowed
              ...(isPAT ? ["pat"] : []),

              // show Creative when allowed
              ...(isCreative ? ["creative"] : []),
            ].map((mode) => (
              <button
                key={mode}
                type="button"
                className={`btn btn-outline-secondary ${
                  viewMode === mode ? "active" : ""
                }`}
                onClick={() => setViewMode(mode)}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Preview Display */}
          <div>
            <span className="fw-bold">Preview:</span>
            {url ? (
              fields.length > 0 ? (
                <>
                  <p className="text-muted">Fetching data for: {url}</p>
                  {previews[viewMode]}
                </>
              ) : (
                <p className="text-muted">Loading...</p>
              )
            ) : (
              <p className="text-muted">No Sitecore ID entered</p>
            )}
          </div>
        </div>
      </div>
=======
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
>>>>>>> 8623917 (Updated overall look and improved code logic)
    </div>
  );
}
