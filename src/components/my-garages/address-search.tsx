"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { PinIcon } from "@/components/ui/icons";
import { searchAddress, type AddressMatch } from "@/lib/geocoding";
import { inputClass } from "@/components/ui/form-fields";

/**
 * Campo "calle y altura" con sugerencias mientras se escribe. Al elegir una,
 * devuelve la dirección normalizada y su punto.
 */
export function AddressSearch({
  id,
  provinceId,
  value,
  onTextChange,
  onPick,
  invalid,
  describedBy,
}: {
  id: string;
  provinceId: string;
  value: string;
  onTextChange: (text: string) => void;
  onPick: (match: AddressMatch) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const listId = useId();
  const [results, setResults] = useState<AddressMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<"idle" | "searching" | "empty">("idle");
  // Solo se busca cuando la persona escribe (no al cargar un garaje existente).
  const [query, setQuery] = useState<string | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query === null || query.trim().length < 3) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setStatus("searching");
      searchAddress(query, provinceId, ctrl.signal)
        .then((r) => {
          setResults(r);
          setActive(-1);
          setOpen(true);
          setStatus(r.length ? "idle" : "empty");
        })
        .catch(() => {});
    }, 400);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, provinceId]);

  function pick(m: AddressMatch) {
    if (m.kind === "calle") {
      // Solo la calle: completarla y pedir la altura.
      const text = `${m.label} `;
      onTextChange(text);
      setQuery(text);
      setResults([]);
      setOpen(false);
      inputRef.current?.focus();
      return;
    }
    onPick(m);
    setOpen(false);
    setResults([]);
    setQuery(null);
    setStatus("idle");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && (results.length > 0 || status === "empty");

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        autoComplete="off"
        placeholder="Calle y altura, ej.: Gurruchaga 1500"
        className={inputClass}
        value={value}
        onChange={(e) => {
          onTextChange(e.target.value);
          setQuery(e.target.value);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
      />
      {status === "searching" && (
        <span className="pointer-events-none absolute top-3 right-3 text-xs text-ink-500">Buscando…</span>
      )}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl border border-ink-200 bg-white py-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-500">
              No encontramos esa dirección. Revisá calle y altura, o la provincia. También podés
              marcarla en el mapa.
            </li>
          ) : (
            results.map((r, i) => (
              <li
                key={`${r.label}-${i}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
                className={`flex cursor-pointer items-start gap-2.5 px-3 py-2.5 ${i === active ? "bg-brand-50" : "hover:bg-ink-50"}`}
              >
                <PinIcon width={18} height={18} className="mt-0.5 shrink-0 text-ink-400" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink-900">{r.label}</span>
                  <span className="block truncate text-xs text-ink-500">
                    {r.kind === "calle" ? `${r.detail ? `${r.detail} · ` : ""}Elegila y agregá la altura` : r.detail}
                  </span>
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
