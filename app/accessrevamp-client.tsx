"use client";

import { useEffect } from "react";

export function AccessRevampClient() {
  useEffect(() => {
    void import("../src/main.js");
  }, []);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div id="app" />
      <noscript>This site needs JavaScript for navigation and interactive features.</noscript>
    </>
  );
}
