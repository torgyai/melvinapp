import { notFound } from 'next/navigation';
import { KlantView } from '@/components/public/KlantView';
import { getStore } from '@/lib/db';

export default async function KlantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const property = await store.getProperty(id);
  if (!property) notFound();
  const profiles = await store.listProfiles();
  const assignee = profiles.find((p) => p.id === property.assignedTo) ?? null;
  return <KlantView property={property} assignee={assignee} />;
}
