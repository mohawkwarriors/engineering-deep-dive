import { NextRequest, NextResponse } from "next/server";
import { generateCadVectorSvg } from "@/lib/cad-generator";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title = "Hardware Mechanism",
      topic = "Kinematics",
      figNumber = "01",
      caption = "",
      sectionHeading = "",
      sectionContent = "",
    } = body;

    const svgContent = generateCadVectorSvg({
      title,
      topic,
      figNumber: String(figNumber).padStart(2, "0"),
      caption,
      sectionHeading,
      sectionContent,
    });

    return NextResponse.json({
      success: true,
      svg: svgContent,
      message: "✓ Section-specific CAD Cross-Section generated.",
    });
  } catch (err: any) {
    console.error("CAD vector generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
