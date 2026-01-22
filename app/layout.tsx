import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mock Webhook API",
  description: "Mock webhook API for testing webhook integrations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
