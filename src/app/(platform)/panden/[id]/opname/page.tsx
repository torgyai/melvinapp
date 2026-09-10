import { notFound } from 'next/navigation';
import { OpnameView } from '@/components/views/OpnameView';
import { getStore } from '@/lib/db';

export default async function OpnamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getStore().getProperty(id);
  if (!p) notFound();
  return <OpnameView p={p} />;
}
