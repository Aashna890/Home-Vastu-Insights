import React from "react";

const STATUS_STYLE = {
  deficient: "text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300",
  balanced: "text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300",
  excessive: "text-rose-700 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function DevtaAnalyticsTable({ chakra, unit = "sq ft" }) {
  if (!chakra) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60">
          <tr className="text-left">
            <th className="px-3 py-2 font-medium">Devta</th>
            <th className="px-3 py-2 font-medium">Dir.</th>
            <th className="px-3 py-2 font-medium text-right">Area ({unit})</th>
            <th className="px-3 py-2 font-medium text-right">Min</th>
            <th className="px-3 py-2 font-medium text-right">Avg</th>
            <th className="px-3 py-2 font-medium text-right">Max</th>
            <th className="px-3 py-2 font-medium text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {chakra.items.map((d) => (
            <tr key={d.name} className="border-t border-border">
              <td className="px-3 py-2 font-medium">{d.name}</td>
              <td className="px-3 py-2 text-muted-foreground">{d.direction}</td>
              <td className="px-3 py-2 text-right tabular-nums">{d.area}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{d.min}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{d.avg}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{d.max}</td>
              <td className="px-3 py-2 text-center">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[d.status]}`}>
                  {d.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-muted/40">
          <tr className="border-t border-border font-medium">
            <td className="px-3 py-2" colSpan={2}>Total / Ideal</td>
            <td className="px-3 py-2 text-right tabular-nums">{chakra.total}</td>
            <td className="px-3 py-2 text-right tabular-nums">{chakra.min}</td>
            <td className="px-3 py-2 text-right tabular-nums">{chakra.avg}</td>
            <td className="px-3 py-2 text-right tabular-nums">{chakra.max}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}