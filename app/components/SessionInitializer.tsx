"use client";

import { useEffect } from "react";

/**
 * Client component to initialize session on page load
 * This ensures the session cookie is set when user lands on the page
 */
export default function SessionInitializer() {
  useEffect(() => {
    // Initialize session by calling API endpoint
    fetch("/api/session/init", {
      method: "POST",
      credentials: "include",
    }).catch((error) => {
      console.error("Error initializing session:", error);
    });
  }, []);

  return null; // This component doesn't render anything
}
