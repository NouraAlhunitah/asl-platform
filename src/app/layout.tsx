import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'أَصْل | Asl AI Studio',
  description: 'منصة التدقيق الشرعي المعتمد والتكييف الثقافي للمحتوى الإسلامي',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}