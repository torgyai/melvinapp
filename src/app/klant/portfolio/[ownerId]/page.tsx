import { PortfolioView } from '@/components/public/PortfolioView';
import { getStore } from '@/lib/db';

export default async function PortfolioPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params;
  const properties = (await getStore().listProperties()).filter((p) => p.ownerId === ownerId);
  return <PortfolioView properties={properties} />;
}
