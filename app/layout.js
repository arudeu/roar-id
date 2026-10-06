import "./globals.css";
<<<<<<< HEAD
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import Script from "next/script";
=======
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
>>>>>>> 8623917 (Updated overall look and improved code logic)

export const metadata = {
  title: "RoarID",
  description: "Previews the Rest ID response for a given URL",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
<<<<<<< HEAD
      <head />
      <body suppressHydrationWarning>
        {children}
        <Script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
          strategy="afterInteractive"
        />
=======
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap"
        />
      </head>
      <body suppressHydrationWarning>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
>>>>>>> 8623917 (Updated overall look and improved code logic)
      </body>
    </html>
  );
}
