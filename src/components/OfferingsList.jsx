import React from "react";
import { Check } from "lucide-react";

// Card grid listing every Devta with its directional zone and the remedial offering.
export default function OfferingsList({ items, title }) {
  return (
    <div>
      {title && <h3 className="text-base font-semibold mb-3">{title}</h3>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((d) => (
          <div key={d.name} className="rounded-lg border border-border p-3 bg-card">
            <div className="flex items-center justify-between">
              <span className="font-medium">{d.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{d.direction}</span>
            </div>
            {d.offering && (
              <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                <span>{d.offering}</span>
              </div>
            )}
            {typeof d.area === "number" && (
              <div className="mt-1 text-xs text-muted-foreground">{d.area} {d.unit || "sq ft"}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}