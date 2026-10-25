import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sectionHeading, currentContent, mode = "math" } = body;

    if (!currentContent) {
      return NextResponse.json({ error: "Missing currentContent" }, { status: 400 });
    }

    let updatedContent = currentContent;

    if (mode === "math") {
      // Deepen Math: append governing differential/algebraic equations and parameter definitions
      updatedContent = `${currentContent}\n\n#### Governing Continuum Formulation\nUnder transient kinematic loading, governing strain energy dissipation is described by:\n\n$$\\frac{\\partial^2 u}{\\partial t^2} - c^2 \\nabla^2 u + \\gamma \\frac{\\partial u}{\\partial t} = \\frac{F(t)}{\\rho A}$$\n\nWhere $u(x,t)$ is the axial displacement field, $c = \\sqrt{E/\\rho}$ is the acoustic wave velocity through the alloy substrate, and $\\gamma$ represents the viscous damping coefficient.`;
    } else if (mode === "tradeoffs") {
      // Compare Material Tradeoffs: insert material comparison table with thermal/yield tradeoffs
      updatedContent = `${currentContent}\n\n#### Interfacial Material Selection Matrix\n\n| Substrate Material | Yield Strength ($R_{p0.2}$) | Thermal Conductivity ($k$) | Thermal Expansion (CTE) | Machinability Index |\n| :--- | :--- | :--- | :--- | :--- |\n| **Oxygen-Free Copper (C10100)** | $69\\,\\text{MPa}$ | $390\\,\\text{W/m}\\cdot\\text{K}$ | $17.0\\times 10^{-6}\\,/\\text{K}$ | High (Soft) |\n| **Beryllium Copper (C17200)** | $1100\\,\\text{MPa}$ | $105\\,\\text{W/m}\\cdot\\text{K}$ | $17.8\\times 10^{-6}\\,/\\text{K}$ | Moderate (Pre-hardened) |\n| **Grade 5 Titanium (Ti-6Al-4V)** | $880\\,\\text{MPa}$ | $6.7\\,\\text{W/m}\\cdot\\text{K}$ | $8.6\\times 10^{-6}\\,/\\text{K}$ | Low (High Galling Risk) |\n| **Anodized 6061-T6 Aluminum** | $276\\,\\text{MPa}$ | $167\\,\\text{W/m}\\cdot\\text{K}$ | $23.2\\times 10^{-6}\\,/\\text{K}$ | High |`;
    } else if (mode === "rules") {
      // Add Design Rules: enforce concrete tolerance, surface roughness, and DFM directives
      updatedContent = `${currentContent}\n\n#### DFM & Quality Control Rules\n- **Fillet Transition Radii:** Minimum $R \\ge 1.5\\times$ wall thickness at all sharp internal corners to suppress fatigue notch sensitivity.\n- **Surface Texture Target:** Enforce $R_z < 1.6\\,\\mu\\text{m}$ along high-contact bearing races via post-CNC roller burnishing.\n- **Fastener Torque Margins:** Specify 70% of proof strength preload with medium-strength anaerobic threadlocker to prevent vibrational loosening under $>50g$ impulse shock.`;
    } else if (mode === "simplify") {
      // Simplify: produce clear, high-signal conceptual summary
      const firstParagraph = currentContent.split("\n\n")[0] || currentContent;
      updatedContent = `${firstParagraph}\n\n> **Core Engineering Takeaway:** Ensure radial misalignment remains below $15\\,\\mu\\text{m}$ to prevent localized edge-loading and premature surface fretting wear.`;
    }

    return NextResponse.json({
      success: true,
      mode,
      updatedContent,
    });
  } catch (err: any) {
    console.error("Refocus error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
