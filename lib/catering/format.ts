// "Sat, 14 November 2026" for an event date (yyyy-mm-dd). Date-only value:
// formatted in UTC so it never shifts a day.
export function formatEventDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-NG", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
