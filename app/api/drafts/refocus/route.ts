import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentContent, mode = "math" } = body;

    if (!currentContent) {
      return NextResponse.json({ error: "Missing currentContent" }, { status: 400 });
    }

    let updatedContent = currentContent;

    if (mode === "math") {
      // Deepen Math: append governing equation explained in plain English
      updatedContent = `${currentContent}\n\n#### How the Forces Balance Out\nWhen a sudden load hits the part, the way stress waves travel and damp out follows this balance:\n\n$$\\frac{\\partial^2 u}{\\partial t^2} - c^2 \\nabla^2 u + \\gamma \\frac{\\partial u}{\\partial t} = \\frac{F(t)}{\\rho A}$$\n\nIn plain terms: $u(x,t)$ is how far the metal flexes, $c = \\sqrt{E/\\rho}$ is how fast a shock wave travels through the metal, and $\\gamma$ is how quickly internal friction calms the vibration down.`;
    } else if (mode === "tradeoffs") {
      // Compare Material Tradeoffs: insert clear material comparison table
      updatedContent = `${currentContent}\n\n#### Comparing Common Alloys Side-by-Side\n\n| Material | Yield Strength ($R_{p0.2}$) | Heat Conductivity ($k$) | Thermal Growth (CTE) | How Easy to Machine |\n| :--- | :--- | :--- | :--- | :--- |\n| **Pure Copper (C10100)** | $69\\,\\text{MPa}$ | $390\\,\\text{W/m}\\cdot\\text{K}$ | $17.0\\times 10^{-6}\\,/\\text{K}$ | Easy (Soft & gummy) |\n| **Beryllium Copper (C17200)** | $1100\\,\\text{MPa}$ | $105\\,\\text{W/m}\\cdot\\text{K}$ | $17.8\\times 10^{-6}\\,/\\text{K}$ | Medium (Spring-hard) |\n| **Grade 5 Titanium (Ti-6Al-4V)** | $880\\,\\text{MPa}$ | $6.7\\,\\text{W/m}\\cdot\\text{K}$ | $8.6\\times 10^{-6}\\,/\\text{K}$ | Hard (Wears tools fast) |\n| **6061-T6 Aluminum** | $276\\,\\text{MPa}$ | $167\\,\\text{W/m}\\cdot\\text{K}$ | $23.2\\times 10^{-6}\\,/\\text{K}$ | Very Easy |`;
    } else if (mode === "rules") {
      // Add Design Rules: practical shop-floor rules in plain English
      updatedContent = `${currentContent}\n\n#### Practical Shop-Floor Rules\n- **Round Off Inside Corners:** Use a fillet radius at least $1.5\\times$ the wall thickness ($R \\ge 1.5t$) so sharp corners don't start fatigue cracks.\n- **Smooth Out Sliding Surfaces:** Polish bearing paths to $R_z < 1.6\\,\\mu\\text{m}$ after CNC milling so rough peaks don't wear away early.\n- **Lock Down Bolts Against Vibration:** Torque fasteners to 70% of their yield limit and add medium-strength threadlocker so $50g$ shocks don't rattle them loose.`;
    } else if (mode === "simplify") {
      // Simplify: produce clear, plain-English summary
      const firstParagraph = currentContent.split("\n\n")[0] || currentContent;
      updatedContent = `${firstParagraph}\n\n> **The Bottom Line:** Keep alignment errors under $15\\,\\mu\\text{m}$ so the load spreads evenly instead of digging into one edge and wearing out the part.`;
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
