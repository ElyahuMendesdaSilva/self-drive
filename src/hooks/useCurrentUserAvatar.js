import { useEffect, useState } from "react";

import { useSession } from "../lib/session";
import { avatarSource, getCurrentUser } from "../lib/api";

let cachedKey = null;
let cachedAvatarPromise = null;
let cachedUserPromise = null;
const refreshListeners = new Set();

export function refreshCurrentUserAvatar() {
  cachedKey = null;
  cachedAvatarPromise = null;
  cachedUserPromise = null;
  refreshListeners.forEach((listener) => listener());
}

export function getCachedCurrentUser(key) {
  if (cachedKey !== key) {
    cachedKey = key;
    cachedUserPromise = getCurrentUser().catch(() => null);
    cachedAvatarPromise = cachedUserPromise
      .then((user) => (user?.avatarUrl ? avatarSource(user.avatarUrl) : null));
  }
  return cachedUserPromise;
}

function loadAvatar(key) {
  getCachedCurrentUser(key);
  return cachedAvatarPromise;
}

export default function useCurrentUserAvatar() {
  const { signedIn, host, username, token } = useSession();
  const key = signedIn ? `${host}|${username}|${token}` : null;
  const [result, setResult] = useState({ key: null, source: null });
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setRefreshVersion((version) => version + 1);
    refreshListeners.add(refresh);
    return () => refreshListeners.delete(refresh);
  }, []);

  useEffect(() => {
    let active = true;
    const request = key ? loadAvatar(key) : Promise.resolve(null);
    request.then((source) => {
      if (active) setResult({ key, source });
    });
    return () => {
      active = false;
    };
  }, [key, refreshVersion]);

  return result.key === key ? result.source : null;
}
