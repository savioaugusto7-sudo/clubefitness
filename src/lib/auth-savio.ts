/**
 * Validador de Autorização Exclusiva do Gestor Geral Sávio Augusto Oliveira (Administrador)
 * Utilizado para isolar a Agenda Pessoal Executiva e rotas de tarefas privadas.
 */
export function isSavioAdmin(user: any): boolean {
  if (!user) return false;

  const email = (user.email || '').toLowerCase().trim();
  const name = (user.name || '').toLowerCase().trim();
  const id = String(user.id || user._id || '');
  const role = (user.role || '').toLowerCase().trim();
  const activeRoles = Array.isArray(user.activeRoles)
    ? user.activeRoles.map((r: any) => String(r).toLowerCase().trim())
    : [];

  const isAdmin = role === 'admin' || activeRoles.includes('admin');
  const isSavioIdentity =
    email === 'savioaugusto7@gmail.com' ||
    id === '6a3d455ae52a33bfc8e5302f' ||
    name === 'savio augusto oliveira' ||
    name === 'sávio augusto oliveira' ||
    name.includes('sávio') ||
    name.includes('savio');

  return isAdmin && isSavioIdentity;
}

export const SAVIO_CANONICAL_EMAIL = 'savioaugusto7@gmail.com';
