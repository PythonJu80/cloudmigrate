"use client";

import { Expand, Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DocumentConfig } from "./visualization-types";

interface DocumentMessageProps {
  config: DocumentConfig;
  onExpand?: () => void;
}

export function DocumentMessage({ config, onExpand }: DocumentMessageProps) {
  const { type, title, subtitle, date, sections, footer } = config;

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Create a simple text export
    let text = `${title}\n`;
    if (subtitle) text += `${subtitle}\n`;
    if (date) text += `Date: ${date}\n`;
    text += "\n";

    sections.forEach((section) => {
      if (section.heading) text += `\n## ${section.heading}\n\n`;
      text += `${section.content}\n`;
    });

    if (footer) text += `\n---\n${footer}`;

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderSection = (section: DocumentConfig["sections"][0], index: number) => {
    switch (section.type) {
      case "list":
        const items = section.content.split("\n").filter(Boolean);
        return (
          <ul key={index} className="list-disc list-inside space-y-1 text-foreground/80">
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );

      case "quote":
        return (
          <blockquote
            key={index}
            className="border-l-4 border-emerald-500/50 pl-4 italic text-foreground/70"
          >
            {section.content}
          </blockquote>
        );

      case "code":
        return (
          <pre
            key={index}
            className="bg-zinc-950 rounded-lg p-4 overflow-x-auto text-sm font-mono text-zinc-300"
          >
            {section.content}
          </pre>
        );

      case "table":
        if (section.data && Array.isArray(section.data)) {
          const headers = Object.keys(section.data[0] || {});
          return (
            <div key={index} className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full">
                <thead>
                  <tr className="bg-zinc-800/50">
                    {headers.map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {section.data.map((row: any, i: number) => (
                    <tr key={i}>
                      {headers.map((h) => (
                        <td key={h} className="px-4 py-2 text-sm text-foreground/80">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return null;

      default:
        return (
          <p key={index} className="text-foreground/80 leading-7">
            {section.content}
          </p>
        );
    }
  };

  const typeStyles: Record<string, string> = {
    report: "border-blue-500/30",
    summary: "border-emerald-500/30",
    invoice: "border-amber-500/30",
    letter: "border-violet-500/30",
  };

  const typeLabels: Record<string, string> = {
    report: "Report",
    summary: "Summary",
    invoice: "Invoice",
    letter: "Letter",
  };

  return (
    <div className={`bg-zinc-900/50 rounded-xl border-2 ${typeStyles[type] || "border-zinc-800"} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-violet-500" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {typeLabels[type] || "Document"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={handlePrint}
          >
            <Printer className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleExport}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          {onExpand && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={onExpand}
            >
              <Expand className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Document Content */}
      <div className="p-6 bg-zinc-950/50 print:bg-white print:text-black">
        {/* Title Block */}
        <div className="mb-6 pb-4 border-b border-zinc-800 print:border-black">
          <h1 className="text-xl font-semibold text-foreground print:text-black">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 print:text-gray-600">{subtitle}</p>}
          {date && <p className="text-xs text-muted-foreground mt-2 print:text-gray-500">{date}</p>}
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <div key={index}>
              {section.heading && (
                <h2 className="text-base font-medium text-foreground mb-3 print:text-black">
                  {section.heading}
                </h2>
              )}
              {renderSection(section, index)}
            </div>
          ))}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-8 pt-4 border-t border-zinc-800 print:border-black">
            <p className="text-xs text-muted-foreground print:text-gray-500">{footer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
