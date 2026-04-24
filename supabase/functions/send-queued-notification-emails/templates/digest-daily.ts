// @ts-nocheck
import { escapeHtml, renderButton, renderLayout, TEXT, MUTED, BORDER } from "./layout.ts";

export type DigestNotification = {
  id: string;
  title: string;
  body: string | null;
  category: string;
  actionUrl: string | null;
  createdAt: string;
};

export type DigestDailyProps = {
  firstName: string | null;
  dateLabel: string; // ex : "24 avril 2026"
  notifications: DigestNotification[];
};

const CATEGORY_LABEL: Record<string, string> = {
  listings: "Annonces",
  payments: "Paiements",
  activity: "Activité",
  searches: "Recherches sauvegardées",
  system: "Système",
  admin: "Administration",
};

function renderNotificationRow(n: DigestNotification): string {
  const catLabel = CATEGORY_LABEL[n.category] ?? n.category;
  const bodyHtml = n.body ? `<p style="margin:6px 0 0 0;font-size:13px;line-height:1.5;color:${MUTED};">${escapeHtml(n.body)}</p>` : "";
  const linkHtml = n.actionUrl
    ? `<p style="margin:8px 0 0 0;font-size:12px;"><a href="${escapeHtml(n.actionUrl)}" style="color:#1E4CC4;">Voir le détail →</a></p>`
    : "";
  return `
    <tr>
      <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${MUTED};">${escapeHtml(catLabel)}</p>
        <p style="margin:4px 0 0 0;font-size:14px;font-weight:600;color:${TEXT};">${escapeHtml(n.title)}</p>
        ${bodyHtml}
        ${linkHtml}
      </td>
    </tr>`;
}

export function renderDigestDailyEmail(props: DigestDailyProps): {
  subject: string;
  html: string;
} {
  const { firstName, dateLabel, notifications } = props;
  const subject = `Votre résumé AutoNex — ${dateLabel}`;
  const greeting = firstName ? `Bonjour ${escapeHtml(firstName)},` : "Bonjour,";
  const count = notifications.length;

  // Regroupement par catégorie pour un rendu hiérarchique.
  const byCategory = new Map<string, DigestNotification[]>();
  for (const n of notifications) {
    const arr = byCategory.get(n.category) ?? [];
    arr.push(n);
    byCategory.set(n.category, arr);
  }

  const sections: string[] = [];
  for (const [cat, items] of byCategory.entries()) {
    const catLabel = CATEGORY_LABEL[cat] ?? cat;
    const rows = items.map(renderNotificationRow).join("");
    sections.push(`
      <h2 style="margin:18px 0 10px 0;font-family:Georgia,serif;font-size:16px;color:${TEXT};">${escapeHtml(catLabel)} <span style="color:${MUTED};font-size:13px;font-weight:400;">(${items.length})</span></h2>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid ${BORDER};border-radius:8px;overflow:hidden;">
        ${rows}
      </table>
    `);
  }

  const content = `
    <h1 style="margin:0 0 12px 0;font-family:Georgia,serif;font-size:22px;color:${TEXT};">${greeting}</h1>
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:${TEXT};">
      Voici votre résumé AutoNex du ${escapeHtml(dateLabel)} — <strong>${count} notification${count > 1 ? "s" : ""}</strong> non lue${count > 1 ? "s" : ""} regroupée${count > 1 ? "s" : ""} par catégorie.
    </p>
    ${sections.join("")}
    ${renderButton("Voir toutes mes notifications", "https://autonex.mg/notifications")}
    <p style="margin:16px 0 0 0;font-size:12px;color:${MUTED};line-height:1.6;">
      Vous recevez ce résumé parce que le digest email est activé dans vos préférences. Vous pouvez ajuster la fréquence à tout moment.
    </p>
  `;

  return {
    subject,
    html: renderLayout({
      previewText: `${count} notification${count > 1 ? "s" : ""} AutoNex cette journée.`,
      contentHtml: content,
    }),
  };
}
