"use client";

import { useEffect, useMemo, useState } from "react";
import InstitutionSelector from "@/components/InstitutionSelector";
import InstitutionProfileCard from "@/components/InstitutionProfileCard";
import ScenarioToggle from "@/components/ScenarioToggle";
import ModelInputs from "@/components/ModelInputs";
import AdvancedSettings from "@/components/AdvancedSettings";
import { runSimulation, DEFAULT_INPUTS } from "@/lib/model";
import { resolveInputs } from "@/lib/levers";

export default function Home() {
  const [institutions, setInstitutions] = useState([]);
  const [institutionCount, setInstitutionCount] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [scenario, setScenario] = useState("scenario_a");
  const [levers, setLevers] = useState({});
  const [advancedOverrides, setAdvancedOverrides] = useState({});

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

  function handleAdvancedChange(key, value) {
    setAdvancedOverrides((prev) => ({ ...prev, [key]: value }));
  }

  // Merge DEFAULT_INPUTS with any user overrides from Advanced Settings
  const inputs = useMemo(
    () => ({ ...DEFAULT_INPUTS, ...advancedOverrides }),
    [advancedOverrides]
  );

  // Run both scenarios simultaneously so switching replays instantly
  const simulationA = useMemo(
    () => selected ? runSimulation(selected, inputs, "scenario_a") : null,
    [selected, inputs]
  );
  const simulationB = useMemo(
    () => selected ? runSimulation(selected, inputs, "scenario_b") : null,
    [selected, inputs]
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
                <AdvancedSettings inputs={inputs} onChange={handleAdvancedChange} />
              </section>

              {/* Temporary readout — will be replaced by simulation UI in Steps 8–13 */}
              {activeSimulation && (
                <section className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600 space-y-1">
                  <p className="font-semibold text-zinc-800 mb-2">
                    Simulation preview ({scenario === "scenario_a" ? "Expansion Markets Only" : "All Markets"})
                  </p>
                  <p>Month 60 digital members: <span className="font-medium text-zinc-900">{activeSimulation[59].totalDigitalMembers.toLocaleString()}</span></p>
                  <p>Month 60 cumulative net: <span className={`font-medium ${activeSimulation[59].cumulativeNetContribution >= 0 ? "text-emerald-700" : "text-red-600"}`}>${activeSimulation[59].cumulativeNetContribution.toLocaleString()}</span></p>
                  <p>Break-even month: <span className="font-medium text-zinc-900">{activeSimulation.find(m => m.isBreakEvenMonth)?.month ?? "Not reached within 5 years"}</span></p>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
