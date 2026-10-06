"use client";

import { ArrowLeft, Check, Lock } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Rich, { getSrc } from "./Rich";

export default function PATPreview({
  fieldMap,
  progress = 50,
  isActive = true,
  isLocked = true,
}) {
  return (
    <div className="my-2">
      {/* Header bar */}
      <div className="mb-4 flex items-center gap-3">
        <button type="button" aria-label="Back" className="rounded p-1 hover:bg-black/5">
          <ArrowLeft className="size-6" />
        </button>
        <h4 className="m-0 text-2xl font-bold">{fieldMap.promoname}</h4>
      </div>

      <Tabs defaultValue="progress">
        <TabsList className="mb-2 h-10 w-full justify-start rounded-none border-b bg-transparent p-0">
          {[
            ["progress", "My Progress"],
            ["overview", "Overview"],
            ["how", "How it works"],
          ].map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="h-10 flex-none rounded-none border-0 border-b-2 border-transparent px-4 text-sm text-black/60 data-[state=active]:border-b-black data-[state=active]:bg-transparent data-[state=active]:text-black data-[state=active]:shadow-none"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="progress">
          {/* Banner */}
          <div className="relative mb-4">
            {fieldMap.carouselbackgroundimage && (
              <img
                src={getSrc(fieldMap.carouselbackgroundimage)}
                className="block w-full rounded"
                alt="Promo Banner"
              />
            )}
            {fieldMap.slabimage && (
              <div className="absolute inset-x-[15%] bottom-5 text-center">
                <img src={getSrc(fieldMap.slabimage)} className="mx-auto max-w-full" alt="Slab" />
              </div>
            )}
          </div>

          <div className="flex items-center">
            {/* Marker */}
            <div className="mr-3 flex flex-col items-center">
              <div className="relative flex size-8 items-center justify-center rounded-full border-2 border-[#d4b962] bg-white">
                {isActive && <Check className="size-4 text-[#d4b962]" />}
                {isLocked && !isActive && <Lock className="size-4 text-black/40" />}
              </div>
              {isLocked && isActive && <Lock className="mt-1 size-3.5 text-black/40" />}
            </div>

            {/* Slider */}
            <div className="relative mb-4 flex-1 pt-6">
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-[#e9ecef]"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full bg-[#d4b962]" style={{ width: `${progress}%` }} />
              </div>
              {fieldMap.stepimage && (
                <div
                  className="absolute top-0"
                  style={{ left: `${progress}%`, transform: "translateX(-50%)" }}
                >
                  <img
                    src={getSrc(fieldMap.stepimage)}
                    alt="Step"
                    width={20}
                    height={20}
                    className="size-5 rounded-full"
                  />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="overview">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-8">
              <p className="mt-3 text-[#63656a]">{fieldMap.promoteaserinfo}</p>
              <h3 className="text-xl font-bold text-[#63656a]">{fieldMap.prizemessage}</h3>
            </div>
            <div className="col-span-4">
              {fieldMap.image && (
                <img src={getSrc(fieldMap.image)} className="mb-3 max-w-full" alt="Promo" />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="how">
          <p className="mt-3">How it works content goes here...</p>
        </TabsContent>
      </Tabs>

      {/* Terms and conditions */}
      <Accordion type="single" collapsible defaultValue="tnc" className="mt-4 rounded-md border px-3">
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
