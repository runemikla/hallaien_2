import type { Metadata } from "next";
import { Roboto, Roboto_Slab } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const robotoSlab = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Hallaien - Din personlige talebaserte KI-assistent",
  description: "Hallaien gir elever i videregående skole en unik mulighet til å øve på muntlige ferdigheter med en tålmodig og kunnskapsrik KI-partner.",
};

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.variable} ${robotoSlab.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
