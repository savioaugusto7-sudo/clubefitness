import type { Metadata } from 'next';
import dbConnect from '@/utils/dbConnect';
import RenewalProposal from '@/models/RenewalProposal';
import Client from '@/models/Client';

export async function generateMetadata({
  params
}: {
  params: any
}): Promise<Metadata> {
  try {
    const resolvedParams = params && 'then' in params ? await params : params;
    const id = resolvedParams?.id;

    await dbConnect();
    const _client = Client;
    const renewal = id ? await RenewalProposal.findById(id).populate('clientId') : null;
    
    const clientName = renewal?.clientId?.dadosPessoais?.nome || '';
    const planoNome = renewal?.planoNome || 'Plano de Treino';
    
    const titleStr = clientName 
      ? `🔄 Renovação de Plano: ${clientName} | Clube Fitness & Fisio`
      : `🔄 Renovação Oficial de Plano: ${planoNome} | Clube Fitness & Fisio`;

    const descriptionStr = renewal?.isExpired
      ? `Veja suas condições especiais de renovação para reativar seu plano ${planoNome} no Clube Fitness & Fisio. Assinatura digital rápida e segura via WhatsApp.`
      : `Garanta a continuidade dos seus treinos e benefícios no Clube Fitness & Fisio para o plano ${planoNome}. Assinatura digital rápida e segura via WhatsApp.`;

    const pageUrl = `https://clubefitness.vercel.app/renovacao/${id || ''}`;
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
        siteName: 'Clube Fitness & Fisio',
        type: 'website',
        locale: 'pt_BR',
        images: [
          {
            url: logoUrl,
            secureUrl: logoUrl,
            width: 800,
            height: 800,
            type: 'image/jpeg',
            alt: 'Clube Fitness & Fisio - Renovação Oficial de Plano'
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
      title: '🔄 Renovação Oficial de Plano | Clube Fitness & Fisio',
      description: 'Confira as condições exclusivas de renovação do seu plano no Clube Fitness & Fisio.',
      metadataBase: new URL('https://clubefitness.vercel.app'),
      openGraph: {
        title: '🔄 Renovação Oficial de Plano | Clube Fitness & Fisio',
        description: 'Confira as condições exclusivas de renovação do seu plano no Clube Fitness & Fisio.',
        url: 'https://clubefitness.vercel.app',
        siteName: 'Clube Fitness & Fisio',
        type: 'website',
        locale: 'pt_BR',
        images: [
          {
            url: 'https://clubefitness.vercel.app/logo.jpg',
            width: 800,
            height: 800,
            type: 'image/jpeg',
            alt: 'Clube Fitness & Fisio'
          }
        ]
      }
    };
  }
}

export default function RenovacaoLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
