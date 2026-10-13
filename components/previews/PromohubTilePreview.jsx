"use client";

import { ImageOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { getImageSrc, moreInfoUrl, parseSmartLink } from "@/lib/pat";
import Rich from "./Rich";

const VIP_ICON = "https://scmedia-us.itsfogo.com/cdn-cgi/image/format=auto/$-$/49429388059643eba8ac11dc62e49679.svg";

// The Promohub offer tile. Status pill, VIP icon and PROMOTION badge are static
// decoration; the image, name and terms come from the item.
export default function PromohubTilePreview({ fieldMap }) {
  const image = getImageSrc(fieldMap.teaserimage);
  const infoUrl = moreInfoUrl(fieldMap.promoid);
  const playNow = parseSmartLink(fieldMap.playnow);

  return (
    <div className="my-2">
      <Card className="mx-auto w-full max-w-sm gap-0 overflow-hidden py-0 shadow-md">
        {/* Image + status pill */}
        <div className="relative bg-muted">
          {image ? (
            <img src={image} alt={fieldMap.promoname || "Promotion"} className="block h-auto w-full" />
          ) : (
            <div className="flex h-40 flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
              <ImageOff className="size-6" />
              No teaser image
            </div>
          )}
          <Badge className="absolute top-3 left-3 border-transparent bg-[#d4b962] text-black shadow">
            New Promotion
          </Badge>
        </div>

        <CardContent className="flex flex-1 flex-col gap-3 p-4">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <img src={VIP_ICON} alt="VIP" width={33} height={14} loading="lazy" />
            <Badge className="rounded-sm border-transparent bg-[#212529] px-2 text-[10px] tracking-wider text-white uppercase">
              Promotion
            </Badge>
          </div>

          <h3 className="m-0 text-lg leading-tight font-bold">{fieldMap.promoname}</h3>

          <Rich html={fieldMap.keytermsandconditions} className="text-xs text-[#63656a] [&_p]:mb-0" />
        </CardContent>

        <CardFooter className="grid grid-cols-2 gap-2 p-4 pt-0">
          {infoUrl ? (
            <Button asChild variant="outline">
              <a href={infoUrl} target="_blank" rel="noopener noreferrer">
                More Info
              </a>
            </Button>
          ) : (
            <Button variant="outline" disabled title="This item has no promoid to link to">
              More Info
            </Button>
          )}
          {/* Dummy button: does nothing */}
          <Button type="button">Opt In</Button>
        </CardFooter>
      </Card>

      {(playNow.text || playNow.url) && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Play Now link: <span className="font-semibold text-foreground">{playNow.text || "(no text)"}</span>
          {playNow.url && (
            <>
              {" → "}
              <span className="break-all">{playNow.url}</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
