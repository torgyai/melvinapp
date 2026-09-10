import { notFound } from 'next/navigation';
import { RapportView } from '@/components/views/RapportView';
import { getStore } from '@/lib/db';

export default async function RapportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getStore().getProperty(id);
  if (!p) notFound();
  return <RapportView p={p} />;
}
