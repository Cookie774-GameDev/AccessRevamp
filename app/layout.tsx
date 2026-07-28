import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  metadataBase: new URL("https://accessrevamp.com"),
  title: "AccessRevamp — Make the next click feel obvious",
  description: "Evidence-led website revamps that identify friction, clarify the offer, and create a stronger customer path.",
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
