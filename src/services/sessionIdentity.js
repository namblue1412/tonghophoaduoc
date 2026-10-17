// Bridge the existing lab-account login to data subscriptions when Firebase Auth
// is not configured. A configured Firebase Auth session always takes precedence.
export function createSessionIdentity({ authConfigured, authUser }) {
  let labUser = null;
  return {
    setLabUser(user) {
      if (authConfigured()) { labUser = null; return; }
      labUser = user?.uid ? { uid: user.uid, email: user.email || '', displayName: user.displayName || '', studentId: user.studentId || '', isLocal: true, legacyOwnerIds: Array.isArray(user.legacyOwnerIds) ? user.legacyOwnerIds.filter((id) => typeof id === 'string' && /^(student-|stu_)/.test(id)) : [] } : null;
    },
    current() { return authConfigured() ? authUser() : labUser; }
  };
}
