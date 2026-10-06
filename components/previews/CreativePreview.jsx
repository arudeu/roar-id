import React from "react";

export default function CreativePreview({ fieldMap }) {
  const blob = fieldMap["blob"];
  const itemTemplate = fieldMap["item template"];
  const size = parseInt(fieldMap["size"] || 0, 10);
  const parentBlob = fieldMap["parent blob"];
  const parentTemplate = fieldMap["parent template"];

  // Determine final blob & template
  const finalBlob =
    itemTemplate === "media folder" && parentBlob ? parentBlob : blob;

  const rawTemplate =
    itemTemplate === "media folder" && parentTemplate
      ? parentTemplate
      : itemTemplate;

  if (!finalBlob || !rawTemplate) {
<<<<<<< HEAD
    return <p className="text-danger">Missing blob or item template field.</p>;
=======
    return <p className="text-destructive">Missing blob or item template field.</p>;
>>>>>>> 8623917 (Updated overall look and improved code logic)
  }

  // Clean template (remove spaces if any)
  const finalTemplate = rawTemplate.replace(/\s+/g, "");

  // CORRECTED CDN URL STRUCTURE
  const imageUrl = `https://scmedia-us.itsfogo.com/$-$/original/${finalBlob}.${finalTemplate}`;

  const isLarge = size >= 100000;

  return (
<<<<<<< HEAD
    <div className="w-full flex justify-center p-4">
      <img
        src={imageUrl}
        alt={finalBlob}
        className={`max-w-full h-auto border-4 ${
          isLarge ? "border-red-500" : "border-green-500"
        } rounded-lg`}
=======
    <div className="flex w-full justify-center p-4">
      <img
        src={imageUrl}
        alt={finalBlob}
        className={`h-auto max-w-full rounded-lg border-4 ${isLarge ? "border-red-500" : "border-green-500"}`}
>>>>>>> 8623917 (Updated overall look and improved code logic)
        onError={(e) => {
          e.target.src =
            "https://via.placeholder.com/600x300?text=Preview+Unavailable";
        }}
      />
    </div>
  );
}
