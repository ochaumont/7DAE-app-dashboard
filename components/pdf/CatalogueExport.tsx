import { Document } from "@react-pdf/renderer";
import type { Application } from "@/lib/types";
import CoverPage from "./CoverPage";
import TableOfContents from "./TableOfContents";
import ApplicationDetailPage from "./ApplicationDetailPage";

type Props = {
  applications: Application[];
  filtersDescription: string;
  baseUrl: string;
};

export default function CatalogueExport({
  applications,
  filtersDescription,
  baseUrl,
}: Props) {
  return (
    <Document title="Applications — Catalogue Export">
      <CoverPage
        applicationCount={applications.length}
        filtersDescription={filtersDescription}
      />
      <TableOfContents applications={applications} baseUrl={baseUrl} />
      {applications.map((a) => (
        <ApplicationDetailPage key={a.externalId} application={a} baseUrl={baseUrl} />
      ))}
    </Document>
  );
}
