import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "AccessRevamp — Make the next click feel obvious",
  description: "Evidence-led website revamps that identify friction, clarify the offer, and create a stronger customer path.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
