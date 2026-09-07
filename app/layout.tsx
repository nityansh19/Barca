import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Barça | Your match-day companion',
  description:
    'Barcelona fixtures, squad information and match-day reminders. Independent fan project.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
