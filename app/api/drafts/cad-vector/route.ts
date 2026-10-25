import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title = "Hardware Mechanism", topic = "Kinematics", figNumber = "01" } = body;

    // Generates crisp, clean SVG vector schematic adhering to the site's dark mode palette
    const svgContent = `
<svg viewBox="0 0 700 420" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto bg-[#191918] rounded-xl border border-[#383734]">
  <!-- Technical CAD Grid -->
  <defs>
    <pattern id="cadGridLarge" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#252422" stroke-width="0.8"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#cadGridLarge)" />

  <!-- Outer Structural Chassis -->
  <g transform="translate(60, 40)" stroke="#EDEDEB" stroke-width="1.8" fill="none">
    <rect x="20" y="30" width="540" height="240" rx="8" stroke="#383734" stroke-width="2" fill="#232220"/>
    
    <!-- Primary Sub-Assembly Contours -->
    <rect x="60" y="60" width="460" height="180" rx="6" stroke="#D97757" stroke-width="2" fill="#1C1B19"/>
    
    <!-- Precision Core Component -->
    <ellipse cx="290" cy="150" rx="160" ry="70" stroke="#EDEDEB" stroke-dasharray="6 3" fill="#2E2D2A"/>
    <ellipse cx="290" cy="150" rx="90" ry="40" stroke="#D97757" stroke-width="2" fill="#191918"/>
    <circle cx="290" cy="150" r="18" stroke="#D97757" fill="#D97757" opacity="0.3"/>
    <circle cx="290" cy="150" r="6" fill="#D97757"/>

    <!-- Kinematic Centerlines -->
    <line x1="20" y1="150" x2="560" y2="150" stroke="#9E9C94" stroke-width="0.9" stroke-dasharray="10 4"/>
    <line x1="290" y1="30" x2="290" y2="270" stroke="#9E9C94" stroke-width="0.9" stroke-dasharray="10 4"/>

    <!-- Critical Dimension Callouts -->
    <g font-family="monospace" font-size="10" fill="#9E9C94">
      <text x="75" y="85">DATUM PLANE [A] REF</text>
      <text x="360" y="145" fill="#D97757">MAX CONTACT STRESS REGION</text>
      <text x="160" y="225">CLEARANCE C = 0.035 mm ± 0.005</text>
    </g>

    <!-- Dimension arrows -->
    <line x1="200" y1="180" x2="380" y2="180" stroke="#D97757" stroke-width="1"/>
    <circle cx="200" cy="180" r="2.5" fill="#D97757"/>
    <circle cx="380" cy="180" r="2.5" fill="#D97757"/>
  </g>

  <!-- Engineering Titleblock -->
  <g transform="translate(430, 315)">
    <rect x="0" y="0" width="240" height="85" fill="#1C1B19" stroke="#383734" stroke-width="1.2"/>
    <text x="15" y="24" font-family="monospace" font-size="11" fill="#D97757" font-weight="bold">THE HW INSIDER CAD METROLOGY</text>
    <text x="15" y="44" font-family="monospace" font-size="9" fill="#EDEDEB">${title.slice(0, 32).toUpperCase()}</text>
    <text x="15" y="60" font-family="monospace" font-size="8" fill="#9E9C94">DWG NO: DWG-${figNumber}-CAD • SCALE 1:1</text>
    <text x="15" y="74" font-family="monospace" font-size="8" fill="#10B981">ALL DIMENSIONS IN MILLIMETERS (ISO 2768-m)</text>
  </g>
</svg>
`.trim();

    return NextResponse.json({
      success: true,
      svg: svgContent,
      message: "✓ On-Demand CAD Vector Schematic generated successfully.",
    });
  } catch (err: any) {
    console.error("CAD vector generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
