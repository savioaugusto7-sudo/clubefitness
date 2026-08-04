import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Clube Fitness Fisio | Cadastro de Aluno',
  description: 'Preencha seus dados para dar início ao seu atendimento e agendar sua avaliação física personalizada.',
  openGraph: {
    title: 'Clube Fitness Fisio | Cadastro de Aluno',
    description: 'Preencha seus dados para dar início ao seu atendimento e agendar sua avaliação física personalizada.',
    url: 'https://clubefitness.vercel.app/cadastro',
    type: 'website',
    images: [
      {
        url: '/logo.jpg',
        width: 300,
        height: 300,
        alt: 'Logo Clube Fitness Fisio',
      }
    ]
  },
  twitter: {
    card: 'summary',
    title: 'Clube Fitness Fisio | Cadastro de Aluno',
    description: 'Preencha seus dados para dar início ao seu atendimento e agendar sua avaliação física personalizada.',
    images: ['/logo.jpg']
  },
  metadataBase: new URL('https://clubefitness.vercel.app')
};

export default function CadastroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
