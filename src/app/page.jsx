"use client";

import { useEffect, useMemo, useState } from "react";
import InstitutionSelector from "@/components/InstitutionSelector";
import InstitutionProfileCard from "@/components/InstitutionProfileCard";
import ScenarioToggle from "@/components/ScenarioToggle";
import ModelInputs from "@/components/ModelInputs";
import AdvancedSettings, { FootprintSettings } from "@/components/AdvancedSettings";
import ModelHealthPanel from "@/components/ModelHealthPanel";
import { runSimulation, DEFAULT_INPUTS, DEFAULT_FOOTPRINT_INPUTS } from "@/lib/model";
import { resolveInputs } from "@/lib/levers";

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

  const activeSimulation = scenario === "scenario_a" ? simulationA : simulationB;

  const loading = institutionCount === null && !error;

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-10 font-sans">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">
        Digital Banking Expansion Model
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        Simulate the economics of launching a digital-only product line at a credit union.
      </p>

      {loading && (
        <p className="text-sm text-zinc-500">Loading data…</p>
      )}

      {error && (
        <p className="text-sm text-red-600">Failed to load data: {error}</p>
      )}

      {institutionCount !== null && (
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
                <InstitutionProfileCard institution={selected} institutions={institutions} />
              </section>

              <section className="space-y-6">
                <ScenarioToggle scenario={scenario} onChange={setScenario} />
                <ModelInputs levers={levers} onChange={handleLeverChange} />
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

              {/* Step 10: Model Health instrument panel */}
              <ModelHealthPanel inputs={inputs} institution={selected} />

              {/* Temporary readout — will be replaced by simulation UI in Steps 8–13 */}
              {activeSimulation && (
                <section className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600 space-y-1">
                  <p className="font-semibold text-zinc-800 mb-2">
                    Simulation preview ({scenario === "scenario_a" ? "Expansion Markets Only" : "All Markets"})
                  </p>
                  <p>Month 60 active members: <span className="font-medium text-zinc-900">{activeSimulation.months[59].totalActiveMembers.toLocaleString()}</span></p>
                  <p>Month 60 cumulative net: <span className={`font-medium ${activeSimulation.months[59].cumulativeNetContribution >= 0 ? "text-emerald-700" : "text-red-600"}`}>${activeSimulation.months[59].cumulativeNetContribution.toLocaleString()}</span></p>
                  <p>Break-even month: <span className="font-medium text-zinc-900">{activeSimulation.months.find(m => m.isBreakEvenMonth)?.month ?? "Not reached within 5 years"}</span></p>
                  <p className="pt-1 text-zinc-500">
                    Bass fit: p = {activeSimulation.calibration.p.toFixed(4)}, q = {activeSimulation.calibration.q.toFixed(3)}
                    {" · "}
                    <span className={
                      activeSimulation.calibration.realismIndicator.overall === "green"  ? "text-emerald-700" :
                      activeSimulation.calibration.realismIndicator.overall === "yellow" ? "text-amber-700"   :
                      "text-red-600"
                    }>
                      {activeSimulation.calibration.realismIndicator.overall === "green"  ? "✓ Plausible"  :
                       activeSimulation.calibration.realismIndicator.overall === "yellow" ? "⚠ Ambitious"  :
                       "✗ Implausible"}
                    </span>
                  </p>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
