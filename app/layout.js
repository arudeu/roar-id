import "./globals.css";
import Splash from "@/components/Splash";
import SpellProvider from "@/components/SpellProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata = {
  title: "RoarID",
  description: "Previews the Rest ID response for a given URL",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // Apply the saved (or OS) colour scheme before first paint so there is no light flash.
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('roarid-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap"
        />
      </head>
      <body suppressHydrationWarning>
        <Splash />
        <TooltipProvider>
          <SpellProvider>{children}</SpellProvider>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
