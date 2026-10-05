import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { themeInitScript } from "@/lib/themeScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dhurava ERP | Modern School ERP Platform",
  description:
    "Dhurava ERP is a comprehensive school management platform for managing students, teachers, academics, attendance, examinations, fees, communication, reports, and school operations.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://erp.dhurava.com"
  ),
  openGraph: {
    title: "Dhurava ERP | Modern School ERP Platform",
    description:
      "Dhurava ERP is a comprehensive school management platform for managing students, teachers, academics, attendance, examinations, fees, communication, reports, and school operations.",
    url: "https://erp.dhurava.com",
    siteName: "Dhurava ERP",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dhurava ERP | Modern School ERP Platform",
    description:
      "Dhurava ERP is a comprehensive school management platform for managing students, teachers, academics, attendance, examinations, fees, communication, reports, and school operations.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <UserProvider>{children}</UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
