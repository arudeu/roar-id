"use client";

import { useState } from "react";
import {
  ProgressBar,
  Tabs,
  Tab,
  Accordion,
  Carousel,
  Image,
} from "react-bootstrap";

export default function PATPreview({
  fieldMap,
  progress = 50,
  isActive = true,
  isLocked = true,
}) {
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
      </Accordion>
    </div>
  );
}
