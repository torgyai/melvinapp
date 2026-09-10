import { notFound } from 'next/navigation';
import { ProjectenView } from '@/components/views/ProjectenView';

export default async function ProjectenPage({ params }: { params: Promise<{ filter: string }> }) {
  const { filter } = await params;
  if (filter !== 'open' && filter !== 'afgerond') notFound();
  return <ProjectenView done={filter === 'afgerond'} />;
}
