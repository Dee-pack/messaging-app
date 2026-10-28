const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function api(path, { method = "GET", body, token } = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            ...(body && { "Content-Type": "application/json" }),
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const messages = data.errors || [data.error || "Request failed"];
        const error = new Error(messages[0]);
        error.status = res.status;
        error.messages = messages;
        throw error;
    }

    return data;
}