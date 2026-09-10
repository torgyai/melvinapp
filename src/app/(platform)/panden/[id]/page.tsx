import { notFound } from 'next/navigation';
import { PandDetailView } from '@/components/views/PandDetailView';
import { getStore } from '@/lib/db';

export default async function PandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const p = await store.getProperty(id);
  if (!p) notFound();
  const notes = await store.listNotes(id);
  return <PandDetailView p={p} notes={notes} />;
}
