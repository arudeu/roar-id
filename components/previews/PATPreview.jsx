"use client";

import { useState } from "react";
import { Tabs, Tab, Accordion, Carousel } from "react-bootstrap";

export default function PATPreview({ fieldMap }) {
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
            </div>
          </div>
        </Tab>

        <Tab eventKey="overview" title="Overview">
          <p className="mt-3">Overview content goes here...</p>
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
