"use client";

<<<<<<< HEAD
import { useState } from "react";
import {
  ProgressBar,
  Tabs,
  Tab,
  Accordion,
  Carousel,
  Image,
} from "react-bootstrap";
=======
import { ArrowLeft, Check, Lock } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Rich, { getSrc } from "./Rich";
>>>>>>> 8623917 (Updated overall look and improved code logic)

export default function PATPreview({
  fieldMap,
  progress = 50,
  isActive = true,
  isLocked = true,
}) {
<<<<<<< HEAD
  const [key, setKey] = useState("progress");
  const getSrc = (html) => html?.replace(/.*src="([^&]+)".*/, "$1");

  return (
    <div className="container my-4">
      {/* HEADER BAR */}
      <div className="d-flex align-items-center mb-4">
        <button className="btn p-0 me-3">
          <i className="bi bi-arrow-left fs-3"></i>
        </button>
        <h4 className="m-0 fw-bold">{fieldMap.promoname}</h4>
      </div>

      {/* TABS */}
      <Tabs
        id="promo-tabs"
        activeKey={key}
        onSelect={(k) => setKey(k || "progress")}
        className="mb-3"
        style={{
          color: "#000 !important",
        }}
      >
        <Tab eventKey="progress" title="My Progress">
          <div className="row">
            <div className="col">
              {/* IMAGE CAROUSEL */}
              <Carousel className="mb-4">
                <Carousel.Item>
                  {fieldMap.carouselbackgroundimage && (
                    <img
                      src={getSrc(fieldMap.carouselbackgroundimage)}
                      className="d-block img-fluid rounded"
                      alt="Promo Banner"
                    />
                  )}
                  <Carousel.Caption>
                    {fieldMap.slabimage && (
                      <img
                        src={getSrc(fieldMap.slabimage)}
                        className="img-fluid "
                        alt="Promo Banner"
                      />
                    )}
                  </Carousel.Caption>
                </Carousel.Item>
              </Carousel>
              <div className="criteria-steps d-flex align-items-center">
                {/* Marker */}
                <div className="criteria-steps-marker d-flex flex-column align-items-center me-3">
                  <div className="criteria-steps-marker-txt"></div>

                  <div className="criteria-steps-marker-dot position-relative">
                    {isActive && (
                      <i className="criteria-steps-marker-dot-icn criteria-steps-marker-dot-icn-active theme-check" />
                    )}
                    {isLocked && (
                      <i className="criteria-steps-marker-dot-icn criteria-steps-marker-dot-icn-locked theme-locked-i" />
                    )}
                  </div>
                </div>

                {/* Slider */}
                <div className="criteria-steps-slider flex-grow-1 position-relative mb-4">
                  {/* Progress Bar */}
                  <ProgressBar
                    now={progress}
                    className="criteria-steps-slider-progress"
                    variant="custom-gold"
                  />

                  {/* Thumb */}
                  <div
                    className="criteria-steps-slider-thumb position-absolute"
                    style={{
                      left: `${progress}%`,
                      transform: "translateX(-50%) translateY(-100%)",
                    }}
                  >
                    {fieldMap.slabimage && (
                      <Image
                        src={getSrc(fieldMap.stepimage)}
                        className="img-fluid "
                        alt="Promo Banner"
                        roundedCircle
                        width={20}
                        height={20}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Tab>

        <Tab className="container" eventKey="overview" title="Overview">
          <div className="row">
            <div className="col-8">
              <p
                className="mt-3"
                style={{
                  color: "#63656a",
                }}
              >
                {fieldMap.promoteaserinfo}
              </p>
              <h3
                style={{
                  color: "#63656a",
                }}
              >
                <strong>{fieldMap.prizemessage}</strong>
              </h3>
            </div>
            <div className="col-4">
              {fieldMap.slabimage && (
                <Image
                  src={getSrc(fieldMap.image)}
                  className="img-fluid mb-3"
                  alt="Promo Banner"
                />
              )}
            </div>
          </div>
        </Tab>

        <Tab eventKey="how" title="How it works">
          <p className="mt-3">How it works content goes here...</p>
        </Tab>
      </Tabs>

      {/* TERMS AND CONDITIONS */}
      <Accordion defaultActiveKey="0">
        <Accordion.Item eventKey="0">
          <Accordion.Header>Terms and Conditions</Accordion.Header>
          <Accordion.Body>
            {/* You can paste all your T&C as-is below */}
            <div
              className="accordion-body"
              dangerouslySetInnerHTML={{
                __html: fieldMap.fulltermsandconditions,
              }}
            />
          </Accordion.Body>
        </Accordion.Item>
=======
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
>>>>>>> 8623917 (Updated overall look and improved code logic)
      </Accordion>
    </div>
  );
}
