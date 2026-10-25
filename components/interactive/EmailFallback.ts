/**
 * Email Fallback Compiler for Interactive Hardware Cards
 *
 * As specified in Section 4 of Curator-in-the-Loop v2.0:
 * "Email Fallback Compilation: Interactive web widgets cleanly degrade to static
 * side-by-side comparison tables, structured summaries, and clean numbered lists
 * for email clients."
 */

import { ParameterExplorerProps } from "./ParameterExplorer";
import { MechanismWalkthroughProps } from "./MechanismWalkthrough";
import { ToleranceStackupBarProps } from "./ToleranceStackupBar";
import { TradeoffMatrixProps } from "./TradeoffMatrix";
import { LayeredCrossSectionProps } from "./LayeredCrossSection";

export function compileParameterExplorerToEmail(card: ParameterExplorerProps): string {
  const paramRows = card.parameters
    .map(
      (p) =>
        `| **${p.symbol || p.name}** | ${p.name} | ${p.defaultValue} ${p.unit} | [${p.min} – ${p.max} ${p.unit}] |`
    )
    .join("\n");

  return `
### [Technical Parameter Reference] ${card.title}
${card.subtitle ? `*${card.subtitle}*\n` : ""}
**Governing Relation:** \`${card.equationTex}\`

| Symbol | Parameter | Nominal Setting | Operating Range |
| :--- | :--- | :--- | :--- |
${paramRows}

${card.takeaway ? `> **Design Rule:** ${card.takeaway}` : ""}
`.trim();
}

export function compileMechanismWalkthroughToEmail(card: MechanismWalkthroughProps): string {
  const steps = card.stages
    .map(
      (s, idx) => `
**Stage ${s.step || idx + 1}: ${s.title}**
- *Kinematic Action:* ${s.kinematicAction}
- *Stress Distribution:* ${s.stressDistribution}
${s.criticalMetric ? `- *Critical Metric:* \`${s.criticalMetric}\`` : ""}
`
    )
    .join("\n");

  return `
### [Mechanism Motion Walkthrough] ${card.title}
${card.subtitle ? `*${card.subtitle}*\n` : ""}

${steps}

${card.takeaway ? `> **Kinematic Constraint:** ${card.takeaway}` : ""}
`.trim();
}

export function compileToleranceStackupToEmail(card: ToleranceStackupBarProps): string {
  const nominalGap = card.components.reduce(
    (acc, c) => (c.direction === "+" ? acc + c.nominal : acc - c.nominal),
    0
  );
  const worstCase = card.components.reduce((acc, c) => acc + c.tolerance, 0);
  const rss = Math.sqrt(card.components.reduce((acc, c) => acc + Math.pow(c.tolerance, 2), 0));

  const rows = card.components
    .map(
      (c) =>
        `| ${c.name} | ${c.direction === "+" ? "+ Opening" : "- Closing"} | ${c.nominal.toFixed(3)} ${card.unit} | ±${c.tolerance.toFixed(3)} ${card.unit} |`
    )
    .join("\n");

  return `
### [Tolerance Stackup Analysis] ${card.title}
${card.subtitle ? `*${card.subtitle}*\n` : ""}

| Dimension Feature | Direction | Nominal | Tolerance |
| :--- | :--- | :--- | :--- |
${rows}

**Calculated Limits:**
- **Nominal Clearance:** ${nominalGap.toFixed(3)} ${card.unit}
- **Worst-Case Stackup:** ${(nominalGap - worstCase).toFixed(3)} to ${(nominalGap + worstCase).toFixed(3)} ${card.unit} (Allowable: ${card.minAllowableGap} to ${card.maxAllowableGap} ${card.unit})
- **RSS Statistical Stackup (±3σ):** ${(nominalGap - rss).toFixed(3)} to ${(nominalGap + rss).toFixed(3)} ${card.unit}

${card.takeaway ? `> **Stackup Rule:** ${card.takeaway}` : ""}
`.trim();
}

export function compileTradeoffMatrixToEmail(card: TradeoffMatrixProps): string {
  const headerCols = card.metricDefinitions.map((m) => `${m.label} (${m.unit || "Score"})`).join(" | ");
  const separator = card.metricDefinitions.map(() => ":---").join(" | ");

  const rows = card.candidates
    .map((c) => {
      const vals = card.metricDefinitions.map((m) => c.metrics[m.key] ?? "—").join(" | ");
      return `| **${c.name}** (${c.category}) | ${vals} | ${c.bestFor} |`;
    })
    .join("\n");

  return `
### [Material & Process Tradeoff Matrix] ${card.title}
${card.subtitle ? `*${card.subtitle}*\n` : ""}

| Alloy / Process | ${headerCols} | Ideal Application |
| :--- | ${separator} | :--- |
${rows}

${card.takeaway ? `> **Selection Directive:** ${card.takeaway}` : ""}
`.trim();
}

export function compileLayeredCrossSectionToEmail(card: LayeredCrossSectionProps): string {
  const rows = card.layers
    .map(
      (l) =>
        `| **${l.name}** | ${l.thickness} | ${l.material} | ${l.functionRole} | ${l.failureMode || "—"} |`
    )
    .join("\n");

  return `
### [Layered Cross-Section Breakdown] ${card.title}
*Total Package Envelope: ${card.totalThickness}*
${card.subtitle ? `*${card.subtitle}*\n` : ""}

| Layer | Thickness | Material | Functional Role | Failure Mechanism |
| :--- | :--- | :--- | :--- | :--- |
${rows}

${card.takeaway ? `> **Stackup Limit:** ${card.takeaway}` : ""}
`.trim();
}

/**
 * Universal dispatcher to compile any interactive card payload to email markdown
 */
export function compileInteractiveCardToEmail(cardType: string, cardData: any): string {
  switch (cardType) {
    case "ParameterExplorer":
      return compileParameterExplorerToEmail(cardData);
    case "MechanismWalkthrough":
      return compileMechanismWalkthroughToEmail(cardData);
    case "ToleranceStackupBar":
      return compileToleranceStackupToEmail(cardData);
    case "TradeoffMatrix":
      return compileTradeoffMatrixToEmail(cardData);
    case "LayeredCrossSection":
      return compileLayeredCrossSectionToEmail(cardData);
    default:
      return "";
  }
}
