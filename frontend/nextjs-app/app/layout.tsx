import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:       "CREST — Union Bank Grievance Intelligence",
  description: "Complaint Resolution & Escalation Smart Technology",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased text-gray-900">{children}</body>
    </html>
  );
}
