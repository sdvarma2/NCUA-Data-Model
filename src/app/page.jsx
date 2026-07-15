"use client";

import { useEffect, useMemo, useState } from "react";
import InstitutionSelector from "@/components/InstitutionSelector";
import InstitutionProfileCard from "@/components/InstitutionProfileCard";
import ScenarioToggle from "@/components/ScenarioToggle";
import ModelInputs from "@/components/ModelInputs";
import AdvancedSettings, { FootprintSettings } from "@/components/AdvancedSettings";
import ModelHealthPanel from "@/components/ModelHealthPanel";
import SimulationTable from "@/components/SimulationTable";
import SimulationStage from "@/components/SimulationStage";
import { runSimulation, DEFAULT_INPUTS, DEFAULT_FOOTPRINT_INPUTS, suggestMilestones } from "@/lib/model";
import { resolveInputs, LEVER_PRESETS } from "@/lib/levers";
import { MARKET_OPPORTUNITY_TAM } from "@/components/ModelInputs";

// ── Collapsible introduction ──────────────────────────────────────────────────

function IntroSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-700 transition-colors mb-2 min-h-[44px] py-1"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
        {open ? "Hide introduction" : "About this simulation"}
      </button>

      {open && (
        <div className="rounded-lg border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600 leading-relaxed space-y-3 max-w-2xl">
          <p>
            Imagine the CEO of your institution, a credit union, has tasked you with growing membership by 10%
            in the next 5 years. You&rsquo;ve decided to evaluate the option of
            launching a digital-only membership to grow the credit union 
            without diluting ROA. You have one week to come back with a
            presentation on the options and trade-offs of this strategy.
          </p>
          <p>
            That scenario is the basis of this simulation. It&rsquo;s not a real assignment
            I was given, but a scenario I assigned myself to see just how far I could take a
            simulation (with Claude Code as my copilot) in one week. Here&rsquo;s how this
            tool works:
          </p>
          <ol className="space-y-1.5 list-none pl-0">
            {[
              ["Step 1", "Search for and select a credit union to model."],
              ["Step 2", "Pick a scenario — will you be launching this digital-only product outside of the credit union's existing branch footprint only (Expansion Markets Only), or will you also launch it within your existing footprint (All Markets)?"],
              ["Step 3", "Pick your strategy levers."],
              ["Step 4", "Fine-tune your inputs in Advanced Settings, or skip this step to get straight to the good stuff!"],
              ["Step 5", "Run the simulation and see how the expansion strategy you selected plays out."],
            ].map(([step, text]) => (
              <li key={step} className="flex gap-2">
                <span className="font-semibold text-zinc-700 shrink-0">{step}:</span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-zinc-500 border-t border-zinc-100 pt-3">
            <span className="font-semibold text-zinc-600">Note:</span> This model was built
            entirely from publicly available information. This is a personal project I invented
            to challenge my own thinking and build AI literacy — not a real exercise I was
            tasked with by my employer. 
          </p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [institutions, setInstitutions] = useState([]);
  const [institutionCount, setInstitutionCount] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [scenario, setScenario] = useState("scenario_a");
  const [levers, setLevers] = useState({});
  const [advancedOverrides, setAdvancedOverrides] = useState({});
  const [footprintMarketing, setFootprintMarketing] = useState(false);
  const [footprintOverrides, setFootprintOverrides] = useState({});

  useEffect(() => {
    fetch("/ncua_model_data.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setInstitutions(data.institutions);
        setInstitutionCount(data.institutions.length);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  function handleLeverChange(id, value) {
    setLevers((prev) => ({ ...prev, [id]: value }));

    // Market Opportunity directly sets TAM and re-suggests milestones so that
    // m12/m36/m60 targets stay coherent with the new market size.
    if (id === "marketOpportunity") {
      const newTam = MARKET_OPPORTUNITY_TAM[value];
      if (newTam != null) {
        setAdvancedOverrides((prev) => {
          const mergedInputs = { ...DEFAULT_INPUTS, ...prev, tam: newTam };
          const suggested   = suggestMilestones(mergedInputs);
          return { ...prev, tam: newTam, ...suggested };
        });
      }
    }

    // Target Member Profile applies deposit/loan/attrition presets and re-suggests
    // milestones, since attrition rates affect Bass calibration.
    if (id === "memberProfile") {
      const preset = LEVER_PRESETS.memberProfile[value];
      if (preset) {
        setAdvancedOverrides((prev) => {
          const mergedInputs = { ...DEFAULT_INPUTS, ...prev, ...preset };
          const suggested   = suggestMilestones(mergedInputs);
          return { ...prev, ...preset, ...suggested };
        });
      }
    }
  }

  /** Single-key override from Advanced Settings number/text fields. */
  function handleAdvancedChange(key, value) {
    setAdvancedOverrides((prev) => ({ ...prev, [key]: value }));
  }

  /** Multi-key batch override — used by preset toggles (Market Competitiveness). */
  function handleAdvancedBatchChange(overrides) {
    setAdvancedOverrides((prev) => ({ ...prev, ...overrides }));
  }

  /** Single-key override for the inside-footprint panel. */
  function handleFootprintChange(key, value) {
    setFootprintOverrides((prev) => ({ ...prev, [key]: value }));
  }

  // Merge DEFAULT_INPUTS with any user overrides from Advanced Settings
  const inputs = useMemo(
    () => ({ ...DEFAULT_INPUTS, ...advancedOverrides }),
    [advancedOverrides]
  );

  // Inside-footprint inputs: start from the user's customised base inputs so
  // shared fields (servicing, branch visits, etc.) stay in sync, then apply
  // footprint-specific defaults and any user overrides for the footprint panel.
  // When marketing is off, CPA is forced to $0 — no charge for incidental adoption.
  const footprintInputs = useMemo(() => ({
    ...inputs,
    ...DEFAULT_FOOTPRINT_INPUTS,
    ...footprintOverrides,
    ...(footprintMarketing ? {} : { initialCPA: 0, steadyStateCPA: 0 }),
  }), [inputs, footprintOverrides, footprintMarketing]);

  // Run both scenarios simultaneously so switching replays instantly
  const simulationA = useMemo(
    () => selected ? runSimulation(selected, inputs, "scenario_a") : null,
    [selected, inputs]
  );
  const simulationB = useMemo(
    () => selected ? runSimulation(selected, inputs, "scenario_b", footprintInputs) : null,
    [selected, inputs, footprintInputs]
  );

  const loading = institutionCount === null && !error;

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-10 font-sans">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">
        Credit Union Digital-Only Product Expansion Model
      </h1>
      <p className="text-sm text-zinc-500 mb-3">
        Simulate the economics of launching a digital-only product line at a credit union.
      </p>

      <IntroSection />

      {loading && (
        <p className="text-sm text-zinc-500">Loading data…</p>
      )}

      {error && (
        <p className="text-sm text-red-600">Failed to load data: {error}</p>
      )}

      {institutionCount !== null && (
        <div className="space-y-8">
          <div className="max-w-2xl space-y-8">
            {/* Step 1: Select an institution */}
            <section>
              <InstitutionSelector
                institutions={institutions}
                onSelect={setSelected}
              />
            </section>

            {/* Steps 2–4: Profile, scenario, levers — only shown after selection */}
            {selected && (
              <>
                <section>
                  <InstitutionProfileCard institution={selected} institutions={institutions} inputs={inputs} />
                </section>

                <section className="space-y-6">
                  <ScenarioToggle scenario={scenario} onChange={setScenario} />
                  <ModelInputs
                    levers={levers}
                    onChange={handleLeverChange}
                    onInputChange={handleAdvancedChange}
                    onBatchInputChange={handleAdvancedBatchChange}
                    inputs={inputs}
                    calibration={simulationA?.calibration}
                  />
                  <ModelHealthPanel
                    inputs={inputs}
                    footprintInputs={footprintInputs}
                    scenario={scenario}
                    institution={selected}
                  />
                  <AdvancedSettings
                    inputs={inputs}
                    onChange={handleAdvancedChange}
                    onBatchChange={handleAdvancedBatchChange}
                  />
                  {scenario === "scenario_b" && (
                    <FootprintSettings
                      inputs={footprintInputs}
                      marketing={footprintMarketing}
                      onMarketingChange={setFootprintMarketing}
                      onChange={handleFootprintChange}
                    />
                  )}
                </section>
              </>
            )}
          </div>

          {/* Phase 3: Simulation stage — full-width within the padded content area */}
          {selected && (simulationA || simulationB) && (
            <section className="max-w-4xl">
              <SimulationStage
                simulationA={simulationA}
                simulationB={simulationB}
                scenario={scenario}
                institution={selected}
              />
            </section>
          )}

          {/* Tabular simulation detail — collapsible reference */}
          {selected && (simulationA || simulationB) && (
            <div className="max-w-2xl">
              <SimulationTable
                simulationA={simulationA}
                simulationB={simulationB}
                scenario={scenario}
              />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
