import type { Metadata } from "next";
import { Outfit } from 'next/font/google';
import "./globals.css";
import { MainNav } from "../components/MainNav";
import { Toaster } from "@/components/ui/Toaster";
import DynamicTitle from "@/components/DynamicTitle";
import { Providers } from "@/components/Providers";

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '600', '700', '900'],
  variable: '--font-outfit',
});

export async function generateMetadata(): Promise<Metadata> {
  let storeName = "Garayi";

  return {
    title: storeName,
    description: "Point of Sale System - Powered by PowerSync",
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: storeName,
    },
  };
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased ${outfit.variable} ${outfit.className} h-screen overflow-hidden bg-gray-50 flex flex-col`}>
        <Providers>
          <DynamicTitle />
          <MainNav />
          <div className="flex-1 flex overflow-hidden w-full relative">
            <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
              {children}
            </main>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
