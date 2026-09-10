import { Suspense } from 'react';
import { ScanView } from '@/components/views/ScanView';

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="note-box">Laden…</div>}>
      <ScanView />
    </Suspense>
  );
}
