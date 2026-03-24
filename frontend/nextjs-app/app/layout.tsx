import type { Metadata } from "next";
import "./globals.css";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title:       "CREST — Union Bank",
  description: "Internet Banking Grievance Intelligence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
