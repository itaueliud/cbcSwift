"use client";

import { FormEvent, useState } from "react";

const EMAIL_ADDRESS = "techswifttrix@gmail.com";
const WHATSAPP_NUMBER = "254703670841";

export default function RequestSystemForm() {
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("I would like to request the TechSwiftTrix CBC Swift system for my school.");
  const [status, setStatus] = useState<string | null>(null);

  const buildMailto = () => {
    const subject = encodeURIComponent("Request for TechSwiftTrix CBC Swift System");
    const body = encodeURIComponent(
      `Name: ${name || "-"}\nSchool: ${school || "-"}\nEmail: ${email || "-"}\nPhone: ${phone || "-"}\n\nMessage:\n${message}`,
    );
    return `mailto:${EMAIL_ADDRESS}?subject=${subject}&body=${body}`;
  };

  const buildWhatsappUrl = () => {
    const text = encodeURIComponent(
      `Hello TechSwiftTrix, I would like to request the CBC Swift system for my school.\n\nName: ${name || "-"}\nSchool: ${school || "-"}\nEmail: ${email || "-"}\nPhone: ${phone || "-"}\n\nMessage: ${message}`,
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  };

  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name || !school || !email) {
      setStatus("Please provide your name, school, and email before sending.");
      return;
    }

    window.location.href = buildMailto();
    setStatus("Opening your email app with TechSwiftTrix contact details...");
  }

  function handleWhatsappClick() {
    if (!name || !school || !email) {
      setStatus("Please provide your name, school, and email before sending on WhatsApp.");
      return;
    }

    window.open(buildWhatsappUrl(), "_blank");
    setStatus("Opening WhatsApp with your request message...");
  }

  return (
    <div className="auth-card auth-stack request-card">
      <div className="request-card-top">
        <span className="section-kicker">Request this system</span>
        <h2>Talk to TechSwiftTrix for a CBC Swift rollout.</h2>
        <p className="subtitle">
          Fill the form below and choose Email or WhatsApp to contact our team instantly.
        </p>
      </div>

      <form className="auth-stack" onSubmit={handleEmailSubmit}>
        <div className="field">
          <label htmlFor="request-name">Your name</label>
          <input
            id="request-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Jane Doe"
          />
        </div>

        <div className="field">
          <label htmlFor="request-school">School or organization</label>
          <input
            id="request-school"
            value={school}
            onChange={(event) => setSchool(event.target.value)}
            placeholder="Green Valley Academy"
          />
        </div>

        <div className="field">
          <label htmlFor="request-email">Email</label>
          <input
            id="request-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="field">
          <label htmlFor="request-phone">Phone</label>
          <input
            id="request-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+254 703 670 841"
          />
        </div>

        <div className="field">
          <label htmlFor="request-message">Message</label>
          <textarea
            id="request-message"
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>

        <div className="request-actions">
          <button type="submit" className="auth-submit landing-primary">
            Send Email Request
          </button>
          <button type="button" className="auth-submit secondary-button" onClick={handleWhatsappClick}>
            Send WhatsApp Message
          </button>
        </div>

        {status ? <div className="auth-note request-status">{status}</div> : null}
      </form>
    </div>
  );
}
