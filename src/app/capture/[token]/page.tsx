import { notFound } from 'next/navigation';
import { CaptureApp } from '@/components/capture/CaptureApp';
import { ServiceWorkerRegister } from '@/components/capture/ServiceWorkerRegister';
import { getStore } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function CapturePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = getStore();
  const session = await store.getCaptureSessionByToken(token);
  if (!session) notFound();
  const property = await store.getProperty(session.propertyId);
  return (
    <>
      <ServiceWorkerRegister />
      <CaptureApp session={session} property={property} />
    </>
  );
}
