const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
  draft:    { label: 'Draft',    bg: 'rgba(136,136,136,0.12)', color: '#888888', border: 'rgba(136,136,136,0.25)' },
  active:   { label: 'Active',   bg: 'rgba(232,255,71,0.12)',  color: '#E8FF47', border: 'rgba(232,255,71,0.3)'  },
  archived: { label: 'Archived', bg: 'rgba(255,71,71,0.10)',   color: '#FF7070', border: 'rgba(255,71,71,0.25)'  },
};

export default function ProductStatusBadge({ status }: { status: string }) {
  const s = map[status] ?? map.draft;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.04em',
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  );
}
