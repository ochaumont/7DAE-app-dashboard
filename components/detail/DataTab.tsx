import type { Application } from "@/lib/types";

/**
 * Content of the DATA tab on the Application detail page: the Data Object
 * FactSheets linked via `relApplicationToDataObject` (name only — no
 * navigation, no extra attributes, per spec).
 */
export default function DataTab({
  application,
}: {
  /** Application already fetched by the parent — no data fetching here. */
  application: Application;
}) {
  const dataObjects = application.dataObjects ?? [];

  if (dataObjects.length === 0) {
    return <p className="text-sm text-muted">Aucun Data Object associé.</p>;
  }

  return (
    <ul className="flex max-h-96 flex-row flex-wrap items-start gap-2 overflow-y-auto">
      {dataObjects.map((dataObject) => (
        <li
          key={dataObject.id}
          className="w-fit rounded-card border border-border bg-surface px-3 py-2 text-sm text-fg"
        >
          {dataObject.name}
        </li>
      ))}
    </ul>
  );
}
