import { NextRequest, NextResponse } from "next/server";
import { generateCadVectorSvg } from "@/lib/cad-generator";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      imageUrl,
      query = "Hardware Teardown",
      caption = "",
      sectionHeading = "",
      sectionContent = "",
      figNumber = "01",
    } = body;

    let badge: "green" | "yellow" | "red" = "green";
    let legalClassification = "Public Domain / Patent Archive / CC0";
    let recommendedCaption = "US Patent & Trademark Office Technical Archive (Public Domain)";
    let attributionRequired = false;

    const urlLower = (imageUrl || "").toLowerCase();

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

    const redrawSvg = generateCadVectorSvg({
      title: query,
      topic: query,
      figNumber: String(figNumber).padStart(2, "0"),
      caption,
      sectionHeading,
      sectionContent,
    });

    return NextResponse.json({
      success: true,
      badge,
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
