import { AuthenticatedLayout } from '@/components/authenticated-layout';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
