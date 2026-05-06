import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthSessionRecovery } from "@/app/auth-session-recovery";
import { getGoogleMapsEmbedApiKey } from "@/lib/env-google-maps";
import { getPublicSupabaseEnv } from "@/lib/env-supabase";
import "./globals.css";

export const dynamic = "force-dynamic";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000"
).replace(/\/$/, "");

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Salon Pro",
  description: "SaaS platforma za salone, online zakazivanje i portal kupaca.",
  openGraph: {
    title: "Salon Pro",
    description: "SaaS platforma za salone, online zakazivanje i portal kupaca.",
    siteName: "Salon Pro",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Salon Pro logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Salon Pro",
    description: "SaaS platforma za salone, online zakazivanje i portal kupaca.",
    images: ["/twitter-image"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? "";
  const { url, anonKey } = getPublicSupabaseEnv();
  const supabaseBootstrap = JSON.stringify({ url, anonKey });
  const mapsKey = JSON.stringify(getGoogleMapsEmbedApiKey());
  return (
    <html
      lang="sr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `window.__SALON_SUPABASE__=${supabaseBootstrap};window.__GOOGLE_MAPS_EMBED_KEY__=${mapsKey};`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthSessionRecovery />
        {children}
      </body>
    </html>
  );
}
