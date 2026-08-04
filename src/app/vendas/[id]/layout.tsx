import { Metadata } from 'next';
import dbConnect from '@/utils/dbConnect';
import Proposal from '@/models/Proposal';

export async function generateMetadata({ params }: { params: any }): Promise<Metadata> {
  const unwrappedParams = await params;
  const id = unwrappedParams.id;
  try {
    await dbConnect();
    const proposal = await Proposal.findById(id);
    if (proposal) {
      return {
        title: 'Proposta Comercial - Clube Fitness',
        description: `Olá! Revise a proposta comercial para o seu plano "${proposal.planoNome}".`,
        openGraph: {
          title: 'Proposta Comercial - Clube Fitness',
          description: `Olá! Revise os detalhes da sua proposta de plano comercial "${proposal.planoNome}" no Clube Fitness, confirme seus dados e escolha a forma de pagamento.`,
          type: 'website',
          url: `https://clubefitness.vercel.app/vendas/${id}`,
        }
      };
    }
  } catch (err) {
    console.error('Error generating metadata:', err);
  }
  return {
    title: 'Proposta Comercial - Clube Fitness',
    description: 'Acesse e finalize a assinatura do seu plano fitness.'
  };
}

export default function VendasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
