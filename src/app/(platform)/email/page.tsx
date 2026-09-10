import { Suspense } from 'react';
import { EmailView } from '@/components/views/EmailView';

export default function EmailPage() {
  return (
    <Suspense>
      <EmailView />
    </Suspense>
  );
}
