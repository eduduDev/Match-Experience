import { Playfair_Display, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

export const dynamic = 'force-dynamic';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'Match Experience',
  description: 'Conexões que fazem negócio. Diga o que você oferece e o que precisa — nós montamos a sua mesa com quem realmente importa.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Match Experience',
    description: 'Conexões que fazem negócio.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${playfair.variable} ${inter.variable} ${jetbrains.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
