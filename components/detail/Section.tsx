/**
 * Vertical block with an uppercase mono label above its content.
 *
 * Reused for every section on the detail page (Description, Security,
 * Lifecycle, Programs · Projects) and for the inline Location/Code labels in
 * the header so the typography stays consistent.
 */
export default function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs uppercase tracking-[0.15em] font-mono text-muted">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}
