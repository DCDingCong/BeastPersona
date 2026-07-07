import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "兽格推算所",
  description: "推演并生成你的专属兽设。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
