import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Lovsentralen | Juridisk veiledning for alle",
  description:
    "Få skreddersydd juridisk veiledning basert på norske lover og forskrifter. Gratis og tilgjengelig for alle.",
  keywords: [
    "juridisk hjelp",
    "norsk lov",
    "rettigheter",
    "forbrukerkjøp",
    "husleie",
    "arbeidsrett",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb" className={outfit.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
