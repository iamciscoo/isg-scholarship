export async function markInboxRead(id: string | null) {
  try {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}
