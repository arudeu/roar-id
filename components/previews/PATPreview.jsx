"use client";

import { useState } from "react";
import { Tabs, Tab, Accordion, Carousel } from "react-bootstrap";

export default function PATPreview() {
  const [key, setKey] = useState("progress");

  return (
    <div className="container my-4">
      {/* HEADER BAR */}
      <div className="d-flex align-items-center mb-4">
        <button className="btn btn-link p-0 me-3">
          <i className="bi bi-arrow-left fs-3"></i>
        </button>
        <h4 className="m-0 fw-bold">Jewel Boom Super Drop Bet And Get</h4>
      </div>

      {/* TABS */}
      <Tabs
        id="promo-tabs"
        activeKey={key}
        onSelect={(k) => setKey(k || "progress")}
        className="mb-3"
      >
        <Tab eventKey="progress" title="My Progress">
          <div className="row">
            <div className="col-md-8">
              {/* IMAGE CAROUSEL */}
              <Carousel className="mb-4">
                <Carousel.Item>
                  <img
                    className="d-block w-100 rounded"
                    src="https://scmedia.nj.betmgm.com/$-$/d76df21fd2074654bbc9fbc544708f78.jpg"
                    alt="Slide 1"
                  />
                  <Carousel.Caption>
                    <h3>$20 Bonus</h3>
                    <p>Earn your reward by playing Jewel Boom Super Drop</p>
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
            <p>
              <strong>Click Tile Below To Play Eligible Game:</strong>
            </p>
            <a href="https://www.nj.betmgm.com/en/casino/launchng/nyxjewelboomsuperdrop">
              <img
                src="https://casinogames.nj.betmgm.com/htmllobby/images/newlmticons/square/nyxjewelboomsuperdrop.jpg"
                alt="Jewel Boom Super Drop"
                width="120"
                height="120"
                className="border border-white"
              />
            </a>

            {/* You can paste all your T&C as-is below */}
            <p className="mt-3">
              <strong>Description of Promotion:</strong>
            </p>
            <ul>
              <li>
                Bet $50 on Jewel Boom Super Drop and get $20 Casino Bonus.
              </li>
              <li>Bonus valid for 1 day after activation.</li>
            </ul>

            <p>
              <strong>Promotional Period:</strong>
            </p>
            <ul>
              <li>Runs from Nov 24 – Nov 30, 2025.</li>
            </ul>

            <p>
              <strong>Eligibility:</strong>
            </p>
            <ul>
              <li>21+ physically in NJ, MI, PA.</li>
              <li>Valid & verified BetMGM account required.</li>
              <li>No excluded or ineligible persons.</li>
            </ul>

            <p>
              <strong>Wagering Requirement:</strong>
            </p>
            <ul>
              <li>Bet $50 to receive $20 bonus.</li>
              <li>Bonus has 10x playthrough.</li>
            </ul>

            <p>
              <strong>Gambling Problem?</strong>
            </p>
            <p>Call 1-800-GAMBLER.</p>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </div>
  );
}
