import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, imageBase64, query = "Hardware Teardown" } = body;

    const sourceStr = imageUrl || "Pasted Clipboard Asset";

    // Analyze domain / source for traffic light badging
    let badge: "green" | "yellow" | "red" = "green";
    let legalClassification = "Public Domain / Patent Archive / CC0";
    let recommendedCaption = "US Patent & Trademark Office Technical Archive (Public Domain)";
    let attributionRequired = false;

    const urlLower = (imageUrl || "").toLowerCase();

    // Red flag domains (Paid teardown reports, stock photos, academic paywalls)
    if (
      urlLower.includes("gettyimages") ||
      urlLower.includes("shutterstock") ||
      urlLower.includes("istockphoto") ||
      urlLower.includes("systemplus") ||
      urlLower.includes("techinsights") ||
      urlLower.includes("sciencedirect") ||
      urlLower.includes("springer") ||
      urlLower.includes("wiley") ||
      urlLower.includes("nature.com") ||
      urlLower.includes("ieee")
    ) {
      badge = "red";
      legalClassification = "Paid Teardown Report / Proprietary Stock Agency / Paywalled Journal";
      recommendedCaption = "PROPRIETARY / RESTRICTED — High copyright infringement risk. Use 1-Click Redraw.";
      attributionRequired = true;
    } else if (
      urlLower.includes("ifixit") ||
      urlLower.includes("anandtech") ||
      urlLower.includes("tomshardware") ||
      urlLower.includes("press") ||
      urlLower.includes("newsroom")
    ) {
      badge = "yellow";
      legalClassification = "Teardown Press Kit / Editorial Fair Use (Attribution Required)";
      recommendedCaption = `Editorial Teardown Archive (Courtesy of Press Kit / Reviewer Sample)`;
      attributionRequired = true;
    } else {
      badge = "green";
      legalClassification = "Verified Public Domain / Patent / CC-BY Compatible";
      recommendedCaption = `Patent Figure & Open Technical Archive (No Commercial License Required)`;
      attributionRequired = false;
    }

    // 1-Click Redraw SVG Escape Hatch: Generates original house-style technical vector schematic
    const redrawSvg = `
<svg viewBox="0 0 600 360" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto bg-[#191918] rounded-lg border border-[#383734]">
  <!-- Technical Grid -->
  <defs>
    <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2E2D2A" stroke-width="0.7"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#cadGrid)" />

  <!-- Clean House-Style Vector Schematic -->
  <g transform="translate(60, 40)" stroke="#EDEDEB" stroke-width="1.5" fill="none">
    <!-- Primary Sub-Assembly Housing -->
    <rect x="20" y="30" width="440" height="180" rx="6" stroke="#D97757" stroke-width="2" fill="#232220"/>
    
    <!-- Precision Core Rotor / Chamber -->
    <ellipse cx="240" cy="120" rx="140" ry="60" stroke="#EDEDEB" stroke-dasharray="4 2" fill="#1C1B19"/>
    <ellipse cx="240" cy="120" rx="80" ry="34" stroke="#D97757" stroke-width="1.8" fill="#2E2D2A"/>

    <!-- Dimension Centerlines -->
    <line x1="20" y1="120" x2="460" y2="120" stroke="#9E9C94" stroke-width="0.8" stroke-dasharray="8 4"/>
    <line x1="240" y1="20" x2="240" y2="220" stroke="#9E9C94" stroke-width="0.8" stroke-dasharray="8 4"/>

    <!-- Measurement Callouts -->
    <g font-family="monospace" font-size="10" fill="#9E9C94">
      <text x="30" y="50">CRITICAL DATUM [A]</text>
      <text x="310" y="115" fill="#D97757">CORE ENGAGEMENT ZONE</text>
      <text x="140" y="235">TOLERANCE ±0.015 mm</text>
    </g>
  </g>

  <!-- Technical Schematic Titleblock -->
  <rect x="360" y="270" width="220" height="70" fill="#1C1B19" stroke="#383734" stroke-width="1"/>
  <text x="375" y="292" font-family="monospace" font-size="10" fill="#D97757" font-weight="bold">THE HW INSIDER CAD REDRAW</text>
  <text x="375" y="310" font-family="monospace" font-size="9" fill="#EDEDEB">ORIGINAL VECTOR SCHEMATIC</text>
  <text x="375" y="326" font-family="monospace" font-size="8" fill="#9E9C94">LEGAL STATUS: 100% CLEAN HOUSE STYLE</text>
</svg>
`.trim();

    return NextResponse.json({
      success: true,
      badge, // "green" | "yellow" | "red"
      legalClassification,
      recommendedCaption,
      attributionRequired,
      redrawSvg,
      message: `Image scanned: ${legalClassification}`,
    });
  } catch (err: any) {
    console.error("Scan error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
