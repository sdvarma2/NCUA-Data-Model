"use client";

import { useEffect, useMemo, useState } from "react";
import InstitutionSelector from "@/components/InstitutionSelector";
import InstitutionProfileCard from "@/components/InstitutionProfileCard";
import ScenarioToggle from "@/components/ScenarioToggle";
import ModelInputs from "@/components/ModelInputs";
import AdvancedSettings, { FootprintSettings } from "@/components/AdvancedSettings";
import SimulationTable from "@/components/SimulationTable";
import SimulationStage from "@/components/SimulationStage";
import { runSimulation, DEFAULT_INPUTS, DEFAULT_FOOTPRINT_INPUTS, suggestMilestones } from "@/lib/model";
import { resolveInputs, LEVER_PRESETS } from "@/lib/levers";
import { MARKET_OPPORTUNITY_TAM } from "@/components/ModelInputs";

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

    // Rate Competitiveness sets deposit/loan rate fields — no milestone re-suggestion needed.
    if (id === "rateCompetitiveness") {
      const preset = LEVER_PRESETS.rateCompetitiveness[value];
      if (preset) {
        setAdvancedOverrides((prev) => ({ ...prev, ...preset }));
      }
    }

    // Acquisition Aggression sets CPA economics only — no milestone re-suggestion needed
    // because CPA is a pure cost overlay and doesn't affect Bass curve calibration.
    if (id === "acquisitionAggression") {
      const preset = LEVER_PRESETS.acquisitionAggression[value];
      if (preset) {
        setAdvancedOverrides((prev) => ({ ...prev, ...preset }));
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
                  <ModelInputs levers={levers} onChange={handleLeverChange} />
                  <AdvancedSettings
                    inputs={inputs}
                    onChange={handleAdvancedChange}
                    onBatchChange={handleAdvancedBatchChange}
                    footprintInputs={footprintInputs}
                    scenario={scenario}
                    institution={selected}
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
