"use client";

import { useMemo, useState } from "react";
import type {
  ApplicationCategory,
  ApplicationStatus,
  BusinessCriticality,
  PhotoFilter,
} from "@/lib/types";
import { PORTFOLIO_NONE } from "@/lib/applications";
import {
  BUSINESS_CRITICALITY_LABELS,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from "@/lib/labels";
import clsx from "clsx";

const STATUS_ORDER: ApplicationStatus[] = [
  "active",
  "developmentPhase",
  "planPhase",
  "inactive",
  "NA",
];

// Tri-state sliding switch, left → right. The knob is green for "with"/"all"
// and red for "without" (see the requested toggle.gif visual).
const PHOTO_STATES: { value: PhotoFilter; label: string; tone: "on" | "off" }[] =
  [
    { value: "with", label: "With photo", tone: "on" },
    { value: "all", label: "All", tone: "on" },
    { value: "without", label: "Without photo", tone: "off" },
  ];

export type FilterValue = {
  search: string;
  photo: PhotoFilter;
  categories: ApplicationCategory[];
  statuses: ApplicationStatus[];
  portfolios: string[];
  operator: string;
  businessCriticalities: BusinessCriticality[];
};

type Props = {
  categories: ApplicationCategory[];
  statuses: ApplicationStatus[];
  portfolios: string[];
  businessCriticalities: BusinessCriticality[];
  value: FilterValue;
  onChange: (v: FilterValue) => void;
};

function Toggle<T extends string>({
  options,
  value,
  onChange,
  renderLabel,
  optionClassName,
  cols,
}: {
  options: T[];
  value: T[];
  onChange: (v: T[]) => void;
  renderLabel?: (o: T) => string;
  optionClassName?: (o: T) => string | undefined;
  cols?: number;
}) {
  const containerClass = cols ? "grid gap-1" : "flex flex-wrap gap-1";
  const containerStyle = cols
    ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
    : undefined;
  return (
    <div className={containerClass} style={containerStyle}>
      {options.map((o) => {
        const active = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() =>
              onChange(active ? value.filter((v) => v !== o) : [...value, o])
            }
            className={clsx(
              "px-2.5 py-1 rounded text-xs font-medium border transition-colors truncate",
              active
                ? "bg-accent text-accent-fg border-accent"
                : "bg-surface text-fg border-border hover:border-accent/50",
              optionClassName?.(o)
            )}
          >
            {renderLabel ? renderLabel(o) : o}
          </button>
        );
      })}
    </div>
  );
}

export default function FilterBar({
  categories,
  statuses,
  portfolios,
  businessCriticalities,
  value,
  onChange,
}: Props) {
  const [search, setSearch] = useState(value.search);
  const [operatorSearch, setOperatorSearch] = useState(value.operator);
  const photoIndex = Math.max(
    0,
    PHOTO_STATES.findIndex((s) => s.value === value.photo),
  );
  const currentPhoto = PHOTO_STATES[photoIndex];
  const sortedStatuses = useMemo(
    () =>
      [...statuses].sort(
        (a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b),
      ),
    [statuses],
  );
  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search applications, references, managers…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange({ ...value, search: e.target.value });
        }}
        className="w-full px-3 py-2 rounded bg-surface border border-border text-fg placeholder:text-muted focus:outline-none focus:border-accent"
      />
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Photo</div>
        <div className="flex items-center gap-2.5">
          <div
            role="radiogroup"
            aria-label="Photo filter"
            className="relative inline-flex h-[26px] w-16 shrink-0 rounded-full bg-[#00205B] p-[3px] shadow-inner"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute top-[3px] left-[3px] z-20 h-5 w-5 rounded-full shadow transition-transform duration-200 ease-out"
              style={{
                transform: `translateX(${photoIndex * 19}px)`,
                backgroundColor: "var(--color-bg)",
              }}
            />
            {PHOTO_STATES.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={value.photo === s.value}
                aria-label={s.label}
                title={s.label}
                onClick={() => onChange({ ...value, photo: s.value })}
                className="relative z-10 flex-1 rounded-full bg-transparent focus:outline-none"
              />
            ))}
          </div>
          <span className="text-xs font-medium text-fg">{currentPhoto.label}</span>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Category</div>
        <Toggle
          options={categories}
          value={value.categories}
          onChange={(v) => onChange({ ...value, categories: v })}
          renderLabel={(c) => CATEGORY_LABELS[c]}
          cols={2}
        />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Status</div>
        <Toggle
          options={sortedStatuses}
          value={value.statuses}
          onChange={(v) => onChange({ ...value, statuses: v })}
          renderLabel={(s) => STATUS_LABELS[s]}
          cols={2}
        />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Portfolio</div>
        <Toggle
          options={portfolios}
          value={value.portfolios}
          onChange={(v) => onChange({ ...value, portfolios: v })}
          renderLabel={(p) => (p === PORTFOLIO_NONE ? "None" : p)}
          cols={2}
        />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Operator</div>
        <input
          type="search"
          placeholder="Search by operator code…"
          value={operatorSearch}
          onChange={(e) => {
            setOperatorSearch(e.target.value);
            onChange({ ...value, operator: e.target.value });
          }}
          className="w-full px-3 py-2 rounded bg-surface border border-border text-fg placeholder:text-muted focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Business Criticality</div>
        <Toggle
          options={businessCriticalities}
          value={value.businessCriticalities}
          onChange={(v) => onChange({ ...value, businessCriticalities: v })}
          renderLabel={(c) => BUSINESS_CRITICALITY_LABELS[c]}
          cols={2}
        />
      </div>
    </div>
  );
}
