const map: Record<string, { label: string; className: string }> = {
  draft:    { label: 'Draft',    className: 'bg-gray-100 text-gray-600' },
  active:   { label: 'Active',   className: 'bg-green-50 text-green-700' },
  archived: { label: 'Archived', className: 'bg-amber-50 text-amber-700' },
};

export default function ProductStatusBadge({ status }: { status: string }) {
  const { label, className } = map[status] ?? map.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
