import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Clube Fitness Fisio | Gestão Inteligente de Saúde e Treino',
  description: 'Sistema integrado de gestão para o Clube Fitness Fisio: controle administrativo, agenda inteligente, avaliação física avançada e portal do cliente.',
  keywords: ['clube fitness fisio', 'academia', 'fisioterapia', 'agenda inteligente', 'avaliacao fisica', 'quiropraxista'],
  authors: [{ name: 'Clube Fitness Fisio' }]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* FontAwesome Icons CDN */}
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" 
          crossOrigin="anonymous" 
          referrerPolicy="no-referrer" 
        />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
