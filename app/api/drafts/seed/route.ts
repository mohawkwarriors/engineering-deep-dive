import { NextRequest, NextResponse } from "next/server";
import { commitFile } from "@/lib/github";
import { generateCleanTitleAngles, formatAnswerOverview } from "@/lib/title-utils";

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
      "The Bottleneck: Why Standard Designs Fail",
      "How the Mechanism Actually Works",
      "Tight Tolerances: Where Microns Matter",
      "Material Tradeoffs: Picking the Right Alloy",
      "Inside the Teardown: Bench Tests and Measurements",
      "Shop-Floor Rules for Engineers",
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
          summary: `Editor focus on ${clean}`,
        };
      }
      const clean = heading.replace(/^(?:Section\s+\d+[:.]?\s*|\d+[\.:]\s*)/i, "").trim();
      return {
        id: `sec-${idx + 1}`,
        heading: `${idx + 1}. ${clean}`,
        type: "ai_fill" as const,
        badge: "[AI Fill]",
        summary: `Plain-English breakdown of ${clean.toLowerCase()}`,
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
        content += `When you push **${cleanTopic}** hard, standard off-the-shelf parts quickly hit their physical limits. Under repeated loads and fast temperature swings, tiny surface imperfections turn into stress hotspots that cause wear, heat buildup, or sudden jamming.\n\n$$\\sigma_{\\text{contact}} = \\sqrt{\\frac{F_N \\cdot E^*}{\\pi \\cdot R^*}}$$\n\nHere, $F_N$ is the pressing force between the parts, $E^*$ is the combined stiffness of the metals, and $R^*$ is the curve radius where they touch. In plain terms: sharper contact corners concentrate force into a tiny spot and wear the metal out fast.`;
      } else if (idx === 1) {
        content += `To keep motion smooth and predictable, the mechanism has to guide forces along a clean path without wobbling. Even a slight misalignment turns useful driving torque into side-load friction against the housing.\n\n<ParameterExplorer\n  title="${cleanTopic} Operating Behavior"\n  equationTex="\\tau_{\\text{shear}} = \\frac{16 \\cdot T}{\\pi \\cdot d^3} \\cdot K_t"\n  takeaway="Adding generous rounded fillets at sharp corners keeps the stress multiplier Kt under 1.25."\n/>`;
      } else if (idx === 2) {
        content += `On a CAD screen, every part is the exact right size. On the factory floor, every machined dimension varies by a few microns. When you stack five or six parts together, those tiny errors add up—determining whether the assembly glides smoothly or binds solid when it warms up.\n\n<ToleranceStackupBar\n  title="${cleanTopic} Clearance Stackup"\n  minAllowableGap={0.025}\n  maxAllowableGap={0.085}\n  unit="mm"\n  takeaway="Simple worst-case tolerances are too loose; laser-sorting parts into matched size bins keeps clearances tight."\n/>`;
      } else if (idx === 3) {
        content += `Picking the right alloy is always a tradeoff. A harder metal resists surface wear and denting, but can snap under a sudden shock load. A softer alloy absorbs impacts easily, but wears down under repeated sliding.\n\n<TradeoffMatrix\n  title="Alloy Comparison for ${cleanTopic}"\n  takeaway="Case-hardened 8620 steel gives a hard, wear-resistant skin over a tough core that won't snap under shock."\n/>`;
      } else if (idx === 4) {
        content += `Computer simulations only tell half the story. When engineers bolt **${cleanTopic}** onto a test rig and film it under full load with high-speed cameras, real-world flex and tiny surface slip show up right away.\n\n{{ FIGURE_0 }}\n\nUnder high-speed strobe cameras, mating surfaces slip slightly during the first few degrees of contact before locking into smooth steady-state motion.`;
      } else {
        content += `### Practical Rules for Production\n\n1. **Keep Contact Surfaces Mirror-Smooth:** Polish load-bearing faces to $R_a < 0.2\\,\\mu\\text{m}$ so microscopic peaks don't scrape through the oil film.\n2. **Give Heat a Direct Exit Path:** Bolt hot components directly against the aluminum frame instead of trapping heat behind plastic brackets.\n3. **Use Wide-Range Synthetic Grease:** Pick a fluorosilicone lubricant rated from $-40^\\circ\\text{C}$ to $+130^\\circ\\text{C}$ so it doesn't gum up in the cold or thin out when hot.`;
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
      subtitle: formatAnswerOverview("", titleAngles.mechanism, cleanTopic),
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
