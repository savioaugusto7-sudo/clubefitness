import type { Metadata } from 'next';
import dbConnect from '@/utils/dbConnect';
import Proposal from '@/models/Proposal';

export async function generateMetadata({
  params
}: {
  params: { id: string }
}): Promise<Metadata> {
  try {
    await dbConnect();
    const proposal = await Proposal.findById(params.id);
    if (!proposal) {
      return {
        title: 'Proposta Comercial | Clube Fitness Fisio',
        description: 'Acesse a sua proposta comercial de prestação de serviços.'
      };
    }

    const titleStr = `Proposta Comercial - ${proposal.planoNome}`;
    const descriptionStr = `Acesse a sua proposta comercial negociada para o plano ${proposal.planoNome} no Clube Fitness Fisio. Preencha seus dados para liberação do seu contrato.`;

    return {
      title: titleStr,
      description: descriptionStr,
      openGraph: {
        title: titleStr,
        description: descriptionStr,
        url: `https://clubefitness.vercel.app/vendas/${params.id}`,
        type: 'website',
        images: [
          {
            url: '/logo.jpg',
            width: 300,
            height: 300,
            alt: 'Logo Clube Fitness Fisio'
          }
        ]
      },
      metadataBase: new URL('https://clubefitness.vercel.app')
    };
  } catch (error) {
    return {
      title: 'Proposta Comercial | Clube Fitness Fisio',
      description: 'Acesse a sua proposta comercial de prestação de serviços.'
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
