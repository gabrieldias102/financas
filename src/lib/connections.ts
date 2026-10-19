type ConnectionLike = {
  connectorName: string;
  status: string;
  error: string | null;
  consentExpiresAt: Date | null;
  lastSyncedAt: Date | null;
};

const WARN_DAYS = 30;

export function latestSync(conns: ConnectionLike[]) {
  const times = conns.flatMap((c) => (c.lastSyncedAt ? [c.lastSyncedAt.getTime()] : []));
  return times.length ? new Date(Math.max(...times)) : null;
}

// Avisos para mostrar no topo: conexão com erro ou autorização perto de expirar.
export function connectionWarnings(conns: ConnectionLike[], now = Date.now()) {
  return conns.flatMap((c) => {
    const w: string[] = [];
    if (c.status !== "UPDATED") w.push(`${c.connectorName}: ${c.error ?? `status ${c.status}`}`);
    if (c.consentExpiresAt) {
      const days = Math.floor((c.consentExpiresAt.getTime() - now) / 86_400_000);
      if (days <= WARN_DAYS) {
        w.push(`${c.connectorName}: autorização expira em ${Math.max(days, 0)} dias. Renove no Meu Pluggy.`);
      }
    }
    return w;
  });
}
