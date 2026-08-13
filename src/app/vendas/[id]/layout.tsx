import type { Metadata } from 'next';
import dbConnect from '@/utils/dbConnect';
import Proposal from '@/models/Proposal';

export async function generateMetadata({
  params
}: {
  params: any
}): Promise<Metadata> {
  try {
    const resolvedParams = params && 'then' in params ? await params : params;
    const id = resolvedParams?.id;

    await dbConnect();
    const proposal = id ? await Proposal.findById(id) : null;
    
    const planoNome = proposal?.planoNome || 'Plano de Treino';
    const titleStr = `📄 Proposta Comercial: ${planoNome} | Clube Fitness Fisio`;
    const descriptionStr = `Confira sua proposta comercial personalizada para o plano ${planoNome}. Preencha seus dados para revisão e emissão do contrato oficial com assinatura digital.`;
    const pageUrl = `https://clubefitness.vercel.app/vendas/${id || ''}`;
    const logoUrl = 'https://clubefitness.vercel.app/logo.jpg';

    return {
      title: titleStr,
      description: descriptionStr,
      metadataBase: new URL('https://clubefitness.vercel.app'),
      alternates: {
        canonical: pageUrl
      },
      openGraph: {
        title: titleStr,
        description: descriptionStr,
        url: pageUrl,
        siteName: 'Clube Fitness Fisio',
        type: 'website',
        locale: 'pt_BR',
        images: [
          {
            url: logoUrl,
            secureUrl: logoUrl,
            width: 800,
            height: 800,
            type: 'image/jpeg',
            alt: 'Clube Fitness Fisio - Proposta e Contrato'
          }
        ]
      },
      twitter: {
        card: 'summary_large_image',
        title: titleStr,
        description: descriptionStr,
        images: [logoUrl]
      }
    };
  } catch (error) {
    return {
      title: '📄 Proposta Comercial & Contrato | Clube Fitness Fisio',
      description: 'Acesse sua proposta comercial personalizada no Clube Fitness Fisio.',
      metadataBase: new URL('https://clubefitness.vercel.app'),
      openGraph: {
        title: '📄 Proposta Comercial & Contrato | Clube Fitness Fisio',
        description: 'Acesse sua proposta comercial personalizada no Clube Fitness Fisio.',
        url: 'https://clubefitness.vercel.app',
        siteName: 'Clube Fitness Fisio',
        type: 'website',
        locale: 'pt_BR',
        images: [
          {
            url: 'https://clubefitness.vercel.app/logo.jpg',
            width: 800,
            height: 800,
            type: 'image/jpeg',
            alt: 'Clube Fitness Fisio'
          }
        ]
      }
    };
  }
}

export default function VendasLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
