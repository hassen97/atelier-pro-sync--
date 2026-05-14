const LABELS: Record<string, string> = {
  imei: "IMEI",
  model: "Modèle",
  notes: "Notes",
  code: "Code",
  link: "Lien",
  url: "Lien",
  value: "Valeur",
  password: "Mot de passe",
  serial: "Numéro de série",
};

const humanize = (k: string) =>
  LABELS[k.toLowerCase()] ??
  k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const isUrl = (v: string) => /^https?:\/\//i.test(v);

function renderValue(v: any) {
  if (v === null || v === undefined || v === "") {
    return <span className="text-muted-foreground italic">—</span>;
  }
  if (typeof v === "string") {
    if (isUrl(v)) {
      return (
        <a
          href={v}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline break-all"
        >
          {v}
        </a>
      );
    }
    return <span className="break-words whitespace-pre-wrap">{v}</span>;
  }
  if (typeof v === "number" || typeof v === "boolean") {
    return <span>{String(v)}</span>;
  }
  return (
    <pre className="text-xs bg-black/20 rounded p-1 overflow-auto">
      {JSON.stringify(v, null, 2)}
    </pre>
  );
}

export function KeyValueList({
  data,
  className,
}: {
  data?: Record<string, any> | null;
  className?: string;
}) {
  const entries = data ? Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== "") : [];
  if (!entries.length) {
    return <div className="text-xs text-muted-foreground italic">Aucune donnée</div>;
  }
  return (
    <dl className={`grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-sm ${className ?? ""}`}>
      {entries.map(([k, v]) => (
        <FragmentRow key={k} label={humanize(k)} value={v} />
      ))}
    </dl>
  );
}
