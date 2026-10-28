import { redirect } from 'next/navigation';

export default function AdminAgendaSavioPage() {
  redirect('/dashboard?tab=agenda_savio');
}
