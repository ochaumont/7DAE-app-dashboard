import type { Metadata } from "next";
import Header from "@/components/Header";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Airbus Applications Catalog",
  description: "Visual catalog of Airbus applications",
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="theme-industrial-premium">
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
