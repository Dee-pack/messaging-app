const ONLINE_WINDOW_MS = 75_000;

// Adds an `online` flag based on how recently the user was seen
export function withPresence(user) {
    if (!user) return user;
    const online =
        Boolean(user.lastSeenAt) &&
        Date.now() - new Date(user.lastSeenAt).getTime() < ONLINE_WINDOW_MS;
    return { ...user, online };
}