import { Suspense } from "react";
import ApplicationDetailClient from "@/components/ApplicationDetailClient";

export default function ApplicationDetailPage() {
  return (
    <Suspense>
      <ApplicationDetailClient />
    </Suspense>
  );
}
