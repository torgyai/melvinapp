import { PlatformShell } from '@/components/platform/PlatformShell';
import { loadAppData } from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const data = await loadAppData();
  return <PlatformShell data={data}>{children}</PlatformShell>;
}
