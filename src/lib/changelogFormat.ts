/**
 * Formats a changelog announcement into a Facebook-ready post.
 */
export interface ChangelogPayload {
  title: string;
  newFeatures?: string | null;
  changesFixes?: string | null;
  brandName?: string;
}

function bulletize(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((l) => l.replace(/^[\s•\-*]+/, "").trim())
    .filter(Boolean);
}

export function formatForFacebook({
  title,
  newFeatures,
  changesFixes,
  brandName = "RepairPro",
}: ChangelogPayload): string {
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const parts: string[] = [];
  parts.push(`🚀 ${brandName} — ${title || `Mise à jour du ${date}`}`);

  const features = bulletize(newFeatures);
  if (features.length) {
    parts.push("");
    parts.push("✨ Nouveautés");
    features.forEach((f) => parts.push(`• ${f}`));
  }

  const fixes = bulletize(changesFixes);
  if (fixes.length) {
    parts.push("");
    parts.push("🛠 Améliorations & corrections");
    fixes.forEach((f) => parts.push(`• ${f}`));
  }

  parts.push("");
  parts.push("👉 Mettez à jour votre app pour en profiter !");
  parts.push("#RepairPro #GestionDeBoutique");

  return parts.join("\n");
}
