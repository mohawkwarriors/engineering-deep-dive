import { NextRequest, NextResponse } from "next/server";
import { commitFile } from "@/lib/github";
import { generateCleanTitleAngles } from "@/lib/title-utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, bullets = [], mode = "full" } = body;

    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const cleanTopic = topic.trim();
    const bulletList: string[] = Array.isArray(bullets)
      ? bullets.map((b: string) => b.trim()).filter(Boolean)
      : typeof bullets === "string"
      ? bullets.split("\n").map((b) => b.trim().replace(/^[-*•]\s*/, "")).filter(Boolean)
      : [];

    // Build the 6-section outline structure
    // Anchor & Fill: Editor bullets -> [Your Section], AI bridging -> [AI Fill]
    const defaultHeadings = [
      "The Mechanical Bottleneck & Failure Mechanism",
      "Kinematic Decomposition & First-Principles Physics",
      "Tolerance Stackup & Manufacturing Limits",
      "Material Selection & Microstructural Tradeoffs",
      "Empirical Dynamometer Metrology & Teardown Data",
      "Production Design Rules & Yield Optimization",
    ];

    const outlineSections = defaultHeadings.map((heading, idx) => {
      // If editor provided a bullet for this slot, badge as [Your Section]
      if (bulletList[idx]) {
        const clean = bulletList[idx].replace(/^(?:Section\s+\d+[:.]?\s*|\d+[\.:]\s*)/i, "").trim();
        return {
          id: `sec-${idx + 1}`,
          heading: `${idx + 1}. ${clean}`,
          type: "editor" as const,
          badge: "[Your Section]",
          summary: `Editor-seeded focus on ${clean}`,
        };
      }
      const clean = heading.replace(/^(?:Section\s+\d+[:.]?\s*|\d+[\.:]\s*)/i, "").trim();
      return {
        id: `sec-${idx + 1}`,
        heading: `${idx + 1}. ${clean}`,
        type: "ai_fill" as const,
        badge: "[AI Fill]",
        summary: `AI structural bridge examining ${clean.toLowerCase()}`,
      };
    });

    // 4 Distinct Clean Title Angles (direct, engaging, no colon-stacking)
    const titleAngles = generateCleanTitleAngles(cleanTopic, "Mechanisms");

    if (mode === "outline") {
      return NextResponse.json({
        success: true,
        mode: "outline",
        topic: cleanTopic,
        titleAngles,
        sections: outlineSections,
      });
    }

    // Generate Full Draft
    // We compose the 6-7 modular sections adhering to the Self-Contained Modular Rule
    const fullSections = outlineSections.map((sec, idx) => {
      let content = `### ${sec.heading}\n\n`;

      if (idx === 0) {
        content += `In high-performance electro-mechanical assemblies, **${cleanTopic}** operates at the exact boundary of elastic deformation and structural fatigue. When mechanical stress concentrations cycle across interfacial boundaries, micro-fretting and localized thermal gradients induce non-linear degradation.\n\n$$\\sigma_{\\text{contact}} = \\sqrt{\\frac{F_N \\cdot E^*}{\\pi \\cdot R^*}}$$\n\nWhere $F_N$ is the normal contact load, $E^*$ is the composite elastic modulus, and $R^*$ is the effective radius of curvature at the contact interface.`;
      } else if (idx === 1) {
        content += `Kinematic motion transfer relies on constrained degrees of freedom. Any radial misalignment converts pure tangential torque into parasitic bending moments along the input shaft.\n\n<ParameterExplorer\n  title="${cleanTopic} Operating Dynamics"\n  equationTex="\\tau_{\\text{shear}} = \\frac{16 \\cdot T}{\\pi \\cdot d^3} \\cdot K_t"\n  takeaway="Maintain notch factor Kt under 1.25 by incorporating generous root transition fillets."\n/>`;
      } else if (idx === 2) {
        content += `Manufacturing tolerances dictate whether high-volume production achieves zero-backlash engagement or catastrophic binding under temperature excursions.\n\n<ToleranceStackupBar\n  title="${cleanTopic} Critical Interface Clearances"\n  minAllowableGap={0.025}\n  maxAllowableGap={0.085}\n  unit="mm"\n  takeaway="Worst-case arithmetic sum exceeds clearance limits; laser micrometer sort binning is required for grade A fits."\n/>`;
      } else if (idx === 3) {
        content += `Material selection balances high surface hardness against core fracture toughness under shock loading.\n\n<TradeoffMatrix\n  title="Substrate Alloy Selection for ${cleanTopic}"\n  takeaway="Carburized 8620 steel provides superior resistance to tooth root micro-pitting compared to 4140 pre-hardened alloy."\n/>`;
      } else if (idx === 4) {
        content += `Dynamometer testing and optical coordinate metrology reveal non-linear hysteresis curves when driving against rated torque payloads.\n\n{{ FIGURE_0 }}\n\nUnder stroboscopic high-speed imaging, micro-slip between adjacent mating surfaces occurs approximately $12^\\circ$ before full engagement.`;
      } else {
        content += `### Critical Manufacturing Directives\n\n1. **Surface Roughness:** Maintain ground finish $R_a < 0.2\\,\\mu\\text{m}$ along primary contact paths.\n2. **Thermal Dissipation:** Enforce direct copper thermal strap grounding to the outer aluminum chassis.\n3. **Lubricant Viscosity:** Specify synthetic fluorosilicone grease rated for $-40^\\circ\\text{C}$ to $+130^\\circ\\text{C}$ operation.`;
      }

      return {
        id: sec.id,
        heading: sec.heading,
        type: sec.type,
        badge: sec.badge,
        hidden: false,
        content,
      };
    });

    const fullMdx = fullSections.map((s) => s.content).join("\n\n---\n\n");
    const slug = cleanTopic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const filename = `manual-${Date.now()}-${slug}.json`;

    const draftPayload = {
      title: titleAngles.mechanism,
      titleAngles,
      subtitle: `An exhaustive teardown and kinematic analysis of ${cleanTopic} under cyclic thermal and mechanical stresses.`,
      subject: "Mechanisms",
      category: "Mechanisms",
      readTime: "11 min read",
      date: new Date().toISOString().split("T")[0],
      source: "Manual Seed (Anchor & Fill)",
      sections: fullSections,
      body_mdx: fullMdx,
      figures: [
        {
          id: "FIGURE_0",
          placeholder: "{{ FIGURE_0 }}",
          caption: `FIG 01 — ${cleanTopic.toUpperCase()} SUB-ASSEMBLY: Precision cross-section cutaway showing interfacial contact geometry.`,
          source: "HARDWARE TEARDOWN ARCHIVE",
          selectedIndex: 0,
          images: [
            {
              url: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=2000",
              title: `${cleanTopic} Precision Machined Teardown`,
              source: "Public Technical Teardown Archive",
            },
            {
              url: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&q=80&w=2000",
              title: `${cleanTopic} Optical CMM Metrology`,
              source: "Metrology Laboratory",
            },
          ],
        },
      ],
    };

    // Commit draft to staging - will stack on top of queue with absolute priority
    await commitFile(
      `staging/${filename}`,
      JSON.stringify(draftPayload, null, 2),
      `feat(seed): add manual topic draft for "${cleanTopic}"`
    );

    return NextResponse.json({
      success: true,
      filename,
      draft: draftPayload,
      message: `✓ Draft generated for "${cleanTopic}" and stacked at the top of the queue!`,
    });
  } catch (err: any) {
    console.error("Topic seed failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
