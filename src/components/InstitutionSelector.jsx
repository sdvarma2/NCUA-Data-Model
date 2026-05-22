"use client";

import { useState, useId } from "react";
import { toTitleCase } from "@/lib/formatters";

const MAX_RESULTS = 8;

export default function InstitutionSelector({ institutions = [], onSelect }) {
  const [query, setQuery] = useState("");
  const inputId = useId();

  const trimmed = query.trim();
  const q = trimmed.toLowerCase();

  const results = trimmed
    ? institutions
        .filter(
          ({ CU_NAME, STATE, CITY }) =>
            CU_NAME.toLowerCase().includes(q) ||
            STATE.toLowerCase().includes(q) ||
            CITY.toLowerCase().includes(q)
        )
        .slice(0, MAX_RESULTS)
    : [];

  const open = trimmed.length > 0;

  function handleSelect(institution) {
    onSelect(institution);
    setQuery("");
  }

  return (
    <div className="relative">
      <p className="text-sm font-medium text-zinc-800 mb-1">
        Credit Union Selector:
      </p>
      <p className="text-xs text-zinc-500 mb-2">
        This model supports {institutions.length} federally insured credit unions.
      </p>

      <input
        id={inputId}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-haspopup="listbox"
        type="text"
        placeholder="Search by name, city, or state…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-md border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500"
      />

      {open && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">No results</li>
          ) : (
            results.map((inst) => (
              <li
                key={inst.CU_NUMBER}
                role="option"
                aria-selected={false}
                onClick={() => handleSelect(inst)}
                className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
              >
                <span className="font-medium text-zinc-900">{toTitleCase(inst.CU_NAME)}</span>
                <span className="text-zinc-500">{inst.STATE}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
