import type { ApplicationCategory } from "@/lib/types";
import CategoryIcon from "./icons/CategoryIcon";
import { CATEGORY_LABELS } from "@/lib/labels";

export default function ChipCategory({
  category,
  withIcon = false,
}: {
  category: ApplicationCategory;
  withIcon?: boolean;
}) {
  return (
    <span className="chip-type inline-flex items-center px-2 py-0.5 rounded">
      {withIcon && <CategoryIcon className="mr-1.5" />}
      {CATEGORY_LABELS[category]}
    </span>
  );
}
