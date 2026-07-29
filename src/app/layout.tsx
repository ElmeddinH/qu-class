import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// KUDS §4: Poppins, fallback Tahoma. Çəkilər: Regular / Medium / SemiBold / Bold.
// CSS dəyişəni adı `--font-poppins` tailwind.config.ts-dəki fontFamily.sans ilə
// eyni olmalıdır — dəyişsən bütün tipoqrafiya Tahoma-ya düşür.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "latin-ext"], // latin-ext → azərbaycan hərfləri (ə, ğ, ı, ö, ş, ü, ç)
  weight: ["400", "500", "600", "700"],
  display: "swap",
  fallback: ["Tahoma", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "QU CLASS — Qarabağ Universiteti sinif platforması",
    template: "%s · QU CLASS",
  },
  description:
    "Qarabağ Universitetinin tələbə və məzun sinif platforması. Tanışlıq, xatirələr və məzuniyyətdən sonra davam edən sinif əlaqəsi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az" className={poppins.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
