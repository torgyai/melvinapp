import { notFound } from 'next/navigation';
import { BerekeningView } from '@/components/views/BerekeningView';
import { getStore } from '@/lib/db';

export default async function BerekeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getStore().getProperty(id);
  if (!p) notFound();
  return <BerekeningView p={p} />;
}
