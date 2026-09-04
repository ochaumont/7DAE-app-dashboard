"use client";

import { useState } from "react";
import clsx from "clsx";

export interface TabItem {
  /** Stable identifier; used for active-tab comparison and as the React key. */
  id: string;
  /** Button label rendered in the tab bar. */
  label: string;
  /** Panel content rendered when this tab is active. */
  content: React.ReactNode;
}

/**
 * Generic tab bar + single active panel, styled after the mono/uppercase
 * label convention used by `Section`. Only one panel is mounted at a time.
 *
 * Currently used on the Application detail page (Identity / Accountability /
 * Compliance / Documentation / In Context); kept generic for reuse there as
 * the remaining tabs get real content.
 */
export default function Tabs({
  items,
  defaultActiveId,
}: {
  items: TabItem[];
  /** id of the tab active on first render. Defaults to `items[0].id`. */
  defaultActiveId?: string;
}) {
  const [activeId, setActiveId] = useState(defaultActiveId ?? items[0]?.id);
  const active = items.find((item) => item.id === activeId);

  const selectTab = (id: string) => {
    if (id === activeId) return;
    setActiveId(id);
  };

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-border">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectTab(item.id)}
              className={clsx(
                "px-4 py-2 text-xs uppercase tracking-[0.15em] font-mono border-b-2 -mb-px transition-colors",
                isActive
                  ? "text-fg border-accent"
                  : "text-muted border-transparent hover:text-fg",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="pt-4">
        {active?.content}
      </div>
    </div>
  );
}
