export function syncSessionEvent(storage, event, session) {
  if (['SIGNED_IN', 'TOKEN_REFRESHED', 'INITIAL_SESSION'].includes(event) && session?.access_token) {
    storage.setItem('ewf_token', session.access_token);
    return 'authenticated';
  }
  if (event === 'SIGNED_OUT') {
    for (const key of ['ewf_token', 'ewf_user', 'ewf_current_tab', 'ewf_supabase_auth']) storage.removeItem(key);
    return 'signed_out';
  }
  return 'unchanged';
}
