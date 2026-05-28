import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { SecurityProvider } from "@/contexts/SecurityContext";
import QueryProvider from "@/providers/QueryProvider";
import PWAInstallPrompt from "@/components/pwa/PWAInstallPrompt";
import DataPrefetchWrapper from "@/components/DataPrefetchWrapper";
import ErrorBoundary from "@/components/ErrorBoundary";
import ThemeColorProvider from "@/components/ThemeColorProvider";

export const metadata: Metadata = {
  title: {
    default: "Money Mitra - Quick Loans | Personal, Business & Home Loans at Low Interest Rates",
    template: "%s | Money Mitra Financial Services"
  },
  description: "Get instant personal loans, business loans, home loans at lowest interest rates starting from 8% p.a. Quick approval in 59 minutes. Apply online for EMI calculator, flexible tenure & minimal documentation. Trusted by 5+ Lakh customers across India.",
  keywords: [
    "personal loan", "business loan", "home loan", "gold loan", "education loan", "vehicle loan",
    "instant loan approval", "low interest loan", "EMI calculator", "loan online India",
    "quick loan", "money mitra", "financial services", "lending platform", "loan against property",
    "small business loan", "startup loan", "mortgage loan", "personal finance", "credit solutions"
  ],
  authors: [{ name: "Money Mitra Financial Services" }],
  creator: "Money Mitra",
  publisher: "Money Mitra Financial Services Pvt. Ltd.",
  
  // PWA Configuration
  manifest: "/manifest.json",
  
  // Icons
  icons: {
    icon: [
      { url: "/logo-circle.png", sizes: "192x192", type: "image/png" },
      { url: "/logo-circle.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/logo-circle.png", sizes: "180x180", type: "image/png" },
    ],
  },
  
  // Apple specific
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Money Mitra",
  },
  
  // Microsoft
  formatDetection: {
    telephone: true,
    date: true,
    address: true,
    email: true,
  },
  
  // Open Graph
  openGraph: {
    type: "website",
    siteName: "Money Mitra Financial Services",
    title: "Money Mitra - Quick Loans | Personal, Business & Home Loans",
    description: "Get instant personal loans, business loans, home loans at lowest interest rates. Quick approval in 59 minutes. Apply online now!",
    url: "https://moneymitra.com",
    locale: "en_IN",
    images: [
      {
        url: "/logo-square.png",
        width: 512,
        height: 512,
        alt: "Money Mitra - Quick Loan Approval",
      },
    ],
  },
  
  // Twitter
  twitter: {
    card: "summary_large_image",
    site: "@moneymitra",
    title: "Money Mitra - Quick Loans at Lowest Interest Rates",
    description: "Get instant personal loans, business loans, home loans starting from 8% p.a. Quick approval in 59 minutes.",
    images: ["/logo-square.png"],
  },
  
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  
  // Verification
  verification: {
    google: "google-site-verification-code",
  },
  
  // Alternates
  alternates: {
    canonical: "https://moneymitra.com",
  },
  
  // Category
  category: "Financial Services",
  
  // Classification
  classification: "Loan & Financial Services",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#737301" },
    { media: "(prefers-color-scheme: dark)",  color: "#5c5c01" },
  ],
  width:        "device-width",
  initialScale: 1,
  minimumScale: 1,
  // Allow pinch-zoom on phones — improves accessibility & usability
  userScalable: true,
  viewportFit:  "cover",
};


export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Favicon — brand logo */}
        <link rel="icon" href="/mm-logo.png" type="image/png" />
        <link rel="shortcut icon" href="/mm-logo.png" type="image/png" />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Money Mitra" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Money Mitra" />
        <meta name="msapplication-TileColor" content="#737301" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileImage" content="/mm-logo.png" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/mm-logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/mm-logo.png" />
        
        {/* Splash screens for iOS */}
        {/* Performance: preconnect to Google Fonts CDN */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Noto Sans — full ₹ rupee symbol support on Android, iOS, Windows */}
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {/* Inject admin-configured theme color as CSS variables */}
        <ThemeColorProvider />
        <QueryProvider>
          <ErrorBoundary>
            <AuthProvider>
              <CompanyProvider>
                <SettingsProvider>
                  <SecurityProvider>
                    <DataPrefetchWrapper>
                      {children}
                    </DataPrefetchWrapper>
                  </SecurityProvider>
                </SettingsProvider>
              </CompanyProvider>
            </AuthProvider>
          </ErrorBoundary>
        </QueryProvider>
        <Toaster position="top-right" richColors closeButton />
        <ShadcnToaster />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}

