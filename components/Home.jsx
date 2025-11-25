"use client";
import React, { useState, useEffect } from "react";
import Check from "./Check";
import InboxPreview from "./previews/InboxPreview";
import OverlayPreview from "./previews/OverlayPreview";
import ToasterPreview from "./previews/ToasterPreview";
import RewardTilesPreview from "./previews/RewardTilesPreview";
import MPPPreview from "./previews/MPPPreview";
import PATPreview from "./previews/PATPreview";

export default function HomeClient({ setFieldMap }) {
  const [url, setURL] = useState("");
  const [fields, setFields] = useState([]);
  const [dateTimeToday, setDateToday] = useState("");
  const [viewMode, setViewMode] = useState("inbox");
  const [isMPP, setIsMPP] = useState(false);
  const [isPAT, setIsPAT] = useState(false);

  const fetchData = async () => {
    const base = process.env.NEXT_PUBLIC_API_BASE;
    const accessId = process.env.NEXT_PUBLIC_API_ACCESS_ID;
    try {
      const newUrl = url.replace(/[{}]/g, "");
      const res = await fetch(
        `${base}/${newUrl}?depth=2&lang=en-US&culture=en-US&environment=prod&x-bwin-accessid=${accessId}&source=prod`
      );
      const text = await res.text();
      const xml = new DOMParser().parseFromString(text, "application/xml");

      const extracted = Array.from(xml.querySelectorAll("field")).map((n) => ({
        key: n.getAttribute("key"),
        html: n.textContent,
      }));

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
      setFields(extracted);
      setFieldMap(newMap);
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

      setIsMPP(mppFields.every((key) => key in newMap));
      setIsPAT(patFields.every((key) => key in newMap));
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
    } else {
      setViewMode("inbox"); // or whatever your default is
    }
  }, [isMPP, isPAT]);

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
              ...(!isMPP && !isPAT
                ? ["inbox", "overlay", "toaster", "rewardtiles"]
                : []),

              // show MPP when allowed
              ...(isMPP ? ["mpp"] : []),

              // show PAT when allowed
              ...(isPAT ? ["pat"] : []),
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
    </div>
  );
}
