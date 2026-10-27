/**
 * Title & Overview generation utility for The HW Insider
 *
 * Enforces editorial standards from Curator-in-the-Loop:
 * - Direct, engaging titles in plain English that capture the hardware mechanism
 * - Avoids textbook jargon salads and stacked colons
 * - Summary overviews state the direct answer in clear, conversational English
 */

export interface TitleAngles {
  mechanism: string;
  tradeoff: string;
  teardown: string;
  failureMode: string;
}

export function cleanTopicSubject(rawTopic: string): { core: string; detail: string } {
  if (!rawTopic) return { core: "Hardware Mechanism", detail: "" };

  const sanitized = rawTopic
    .replace(/:\s*Kinematic Decomposition.*$/i, "")
    .replace(/:\s*Sub-Micron Dynamics.*$/i, "")
    .trim();

  const parts = sanitized
    .split(/[:–—]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const core = parts[0] || sanitized;
  const detail = parts.slice(1).join(" — ").trim();

  return { core, detail };
}

export function generateCleanTitleAngles(
  rawTopic: string,
  subject: string = "Mechanisms"
): TitleAngles {
  const { core, detail } = cleanTopicSubject(rawTopic);
  const s = (subject || "").toLowerCase();
  const lowerTopic = (rawTopic || "").toLowerCase();

  // 1. Mechanism-Focused Angle
  let mechanism = "";
  if (lowerTopic.includes("vapor chamber") || lowerTopic.includes("spreader")) {
    mechanism = "How smartphones stay cool: Exploring phase change in Ultra-Thin Vapor Chambers";
  } else if (lowerTopic.includes("immersion") || lowerTopic.includes("dielectric")) {
    mechanism = "Submerged servers: How two-phase immersion cooling boils away data center heat";
  } else if (lowerTopic.includes("liquid metal") || lowerTopic.includes("tim")) {
    mechanism = "Cooling with liquid metal: How gallium alloys move heat without eating aluminum";
  } else if (lowerTopic.includes("cycloidal")) {
    mechanism = "Zero-backlash robotics: How cycloidal gearboxes survive massive shock loads";
  } else if (lowerTopic.includes("strain wave") || lowerTopic.includes("harmonic")) {
    mechanism = "Bending steel for precision: How strain wave gears work without backlash";
  } else if (lowerTopic.includes("lithography") || lowerTopic.includes("flexure")) {
    mechanism = "Moving without friction: How titanium flexure hinges steer chip-making lasers";
  } else if (lowerTopic.includes("ball screw")) {
    mechanism = "Smooth under load: How gothic-arch grooves stop ball screws from binding";
  } else if (lowerTopic.includes("wire edm")) {
    mechanism = "Cutting metal with sparks: How wire EDM holds micron tolerances";
  } else if (lowerTopic.includes("thixomold")) {
    mechanism = "Molding semi-solid metal: How laptops get featherweight magnesium shells";
  } else if (lowerTopic.includes("tabless 4680") || lowerTopic.includes("battery cell")) {
    mechanism = "Welding shiny copper: How green lasers build tabless 4680 battery cells";
  } else if (lowerTopic.includes("voice coil") || lowerTopic.includes("camera ois")) {
    mechanism = "Steady smartphone video: Inside tiny camera voice coil actuators";
  } else if (lowerTopic.includes("o-ring") || lowerTopic.includes("explosive decompression")) {
    mechanism = "Sealing high-pressure gas: Why standard rubber O-rings pop under rapid venting";
  } else if (lowerTopic.includes("busbar") || lowerTopic.includes("ultrasonic")) {
    mechanism = "Welding with sound: How ultrasonic vibrations bond heavy EV copper busbars";
  } else if (lowerTopic.includes("kinematic coupling") || lowerTopic.includes("kelvin")) {
    mechanism = "Six points of contact: How Kelvin clamps snap optics into the exact same spot";
  } else if (lowerTopic.includes("geneva")) {
    mechanism = "Start-and-stop motion: How Geneva wheels index smoothly at high speed";
  } else if (s.includes("thermal")) {
    const topicDesc = detail || core;
    mechanism = `How hardware stays cool: Inside ${topicDesc}`;
  } else if (s.includes("manufactur")) {
    const topicDesc = detail || core;
    mechanism = `Making parts to the micron: How ${topicDesc} works on the factory floor`;
  } else if (s.includes("material")) {
    const topicDesc = detail || core;
    mechanism = `Inside the metal: How alloy design prevents failure in ${topicDesc}`;
  } else if (s.includes("fluid")) {
    const topicDesc = detail || core;
    mechanism = `Controlling high-pressure flow: Inside ${topicDesc}`;
  } else if (s.includes("electromechanical")) {
    const topicDesc = detail || core;
    mechanism = `Magnets and motion: How ${topicDesc} hits micron accuracy`;
  } else {
    if (detail) {
      mechanism = `${core}: How ${detail.toLowerCase()} works in practice`;
    } else {
      mechanism = `Inside ${core}: The mechanics of zero-play precision`;
    }
  }

  // 2. Design Tradeoff Angle
  let tradeoff = "";
  if (lowerTopic.includes("vapor chamber")) {
    tradeoff = "Ultra-thin vapor chambers: Balancing wick suction against steam drag in a 0.35 mm gap";
  } else if (lowerTopic.includes("cycloidal")) {
    tradeoff = "Cycloidal drives: Trading slight torque ripple for 5x higher shock survival";
  } else if (lowerTopic.includes("flexure")) {
    tradeoff = "Flexure hinges: Trading travel range for zero friction and infinite fatigue life";
  } else if (s.includes("thermal")) {
    tradeoff = `${core}: Balancing cooling power against tight device thickness`;
  } else if (s.includes("manufactur") || s.includes("material")) {
    tradeoff = `${core}: Balancing surface hardness against toughness and cost`;
  } else {
    tradeoff = `${core}: Balancing tight machining tolerances against factory yield`;
  }

  // 3. Teardown Case Study Angle
  const teardown = `Hardware teardown: Taking apart ${core} to see what makes it tick`;

  // 4. Failure Mode Angle
  let failureMode = "";
  if (lowerTopic.includes("vapor chamber")) {
    failureMode = "Why vapor chambers dry out: Boiling limits, steam choking, and trapped gas";
  } else if (lowerTopic.includes("cycloidal")) {
    failureMode = "Why precision gearboxes jam: Pin runout, surface wear, and heat expansion";
  } else if (s.includes("thermal")) {
    failureMode = `Why ${core} overheats: Dry-out, air pockets, and bad thermal contact`;
  } else if (s.includes("material") || s.includes("manufactur")) {
    failureMode = `Why ${core} cracks: Locked-in stress, microscopic voids, and metal fatigue`;
  } else {
    failureMode = `Why ${core} fails: Wear, heat growth, and hidden stress points`;
  }

  return {
    mechanism,
    tradeoff,
    teardown,
    failureMode,
  };
}

export interface TechnicalOverviewPresets {
  mechanism: string;
  boundary: string;
  tradeoff: string;
}

/**
 * Converts raw LaTeX math markup into clean, readable Unicode engineering typography.
 * E.g., "$h_{fg} = 2.26 \times 10^6\text{ J/kg}$" -> "h_fg = 2.26 × 10⁶ J/kg"
 *       "$r_{eff} \approx 25\ \mu\text{m}$" -> "r_eff ≈ 25 µm"
 *       "$10^{-3}\text{ Torr}$" -> "10⁻³ Torr"
 *       "$H_2$" -> "H₂"
 */
export function cleanRawLatex(text: string): string {
  if (!text) return "";

  let res = text;

  // 1. Math symbols and operators
  res = res
    .replace(/\\times/g, "×")
    .replace(/\\approx/g, "≈")
    .replace(/\\leq?/g, "≤")
    .replace(/\\geq?/g, "≥")
    .replace(/\\pm/g, "±")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\kappa/g, "κ")
    .replace(/\\mu/g, "µ")
    .replace(/\\Omega/g, "Ω")
    .replace(/\\cdot/g, "·")
    .replace(/\\degree/g, "°")
    .replace(/\\circ/g, "°");

  // 2. LaTeX text wrappers and spacing
  res = res
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\[ ,;]/g, " ")
    .replace(/\\quad/g, " ");

  // 3. Superscripts: numbers, signs, and variables
  const superMap: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "-": "⁻", "+": "⁺", "n": "ⁿ",
  };
  res = res.replace(/\^\{?([0-9\-+n]+)\}?/g, (_, p1) => {
    return p1.split("").map((c: string) => superMap[c] || c).join("");
  });

  // 4. Subscripts: convert numeric subscripts to Unicode subscripts (e.g., H_2 -> H₂)
  const subMap: Record<string, string> = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
    "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  };
  res = res.replace(/_\{?([0-9]+)\}?/g, (_, p1) => {
    return p1.split("").map((c: string) => subMap[c] || c).join("");
  });

  // 5. Letter subscripts: e.g. _{fg} -> _fg, _{eff} -> _eff
  res = res.replace(/_\{([a-zA-Z0-9]+)\}/g, "_$1");

  // 6. Strip math delimiters $ and $$
  res = res.replace(/\$\$?/g, "");

  // 7. Clean up multiple spaces and spaces before punctuation
  res = res
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.:;?!])/g, "$1")
    .trim();

  return res;
}

export function generateTechnicalOverviewPresets(
  topic: string = "",
  subject: string = "",
  existingSummary: string = ""
): TechnicalOverviewPresets {
  const lower = (topic + " " + subject + " " + existingSummary).toLowerCase();

  if (lower.includes("vapor chamber") || lower.includes("two-phase") || lower.includes("wick")) {
    return {
      mechanism: "Vaporizing purified water inside a sealed vacuum envelope moves heat away from dense processor hotspots far faster than solid copper, turning liquid into steam at the warm die and condensing it across the cooler frame.",
      boundary: "Cooling capacity is physically capped by the capillary wick—if steam boils away faster than capillary suction can pump water back through the porous copper, the chamber dries out and temperatures spike.",
      tradeoff: "Making the vapor cavity razor-thin saves smartphone thickness, but constricts internal vapor flow and demands internal support pillars so atmospheric pressure doesn't crush the hollow shell.",
    };
  }

  if (lower.includes("cycloidal") || lower.includes("speed reducer") || lower.includes("gear")) {
    return {
      mechanism: "A wobbling eccentric disc rolls across an outer ring of steel pins, sharing driving torque across multiple teeth simultaneously to achieve zero backlash under sudden shock loads.",
      boundary: "If pin spacing or housing tolerances drift, rolling pins bind against the disc teeth, multiplying sliding friction and causing rapid surface pitting.",
      tradeoff: "Achieving zero backlash and extreme reduction ratios in a single stage trades rolling efficiency for contact friction, demanding continuous high-pressure boundary lubrication.",
    };
  }

  if (lower.includes("magnesium") || lower.includes("thixomold") || lower.includes("casting")) {
    return {
      mechanism: "Injecting semi-solid magnesium slurry into a high-pressure mold prevents turbulent air bubbles, creating ultra-thin laptop unibodies that combine featherweight handling with high structural rigidity.",
      boundary: "Because semi-solid slurry chills rapidly on contact with cold steel, mold temperatures and injection speeds must stay tightly synchronized to keep thin walls from freezing prematurely.",
      tradeoff: "Eliminating secondary CNC machining passes dramatically cuts production cycle times, but requires complex heated runners and vacuum venting to prevent mold fatigue checking.",
    };
  }

  if (lower.includes("laser") || lower.includes("weld") || lower.includes("busbar")) {
    return {
      mechanism: "Short-wavelength green or blue laser beams overcome copper's natural surface reflectivity, forming clean, spatter-free seam welds without overheating sensitive adjacent components.",
      boundary: "Weld pool depth must be kept under tight control so intense laser energy bonds the copper foils without scorching underlying polymer insulation or battery seals.",
      tradeoff: "Wobbling the laser spot across the seam bridges small assembly gaps reliably, trading linear welding speed for lower electrical joint resistance.",
    };
  }

  if (lower.includes("piezo") || lower.includes("actuator") || lower.includes("ultrasonic")) {
    return {
      mechanism: "Applying electric fields to specialized piezoceramic crystals expands their crystal lattices, delivering ultra-precise, sub-micron physical displacement in fractions of a millisecond.",
      boundary: "Driving crystals past their electrical or thermal limits causes permanent depoling and micro-cracking, requiring preloaded spring flexures to keep the material in safe compression.",
      tradeoff: "Compensating for natural ceramic hysteresis achieves nanometer positioning repeatability, but adds closed-loop control overhead to high-frequency motion stages.",
    };
  }

  const { core } = cleanTopicSubject(topic);
  return {
    mechanism: `How ${core.toLowerCase()} guides operating loads along direct mechanical paths, using precision geometry to maintain smooth motion without binding or play.`,
    boundary: `The operating envelope is limited by material yield and thermal growth—keeping clearances balanced so parts glide freely without loose play or thermal seizure.`,
    tradeoff: `Balancing tight manufacturing tolerances against factory yield, trading ultra-precise fit-up for assembly speed and long-term wear resistance.`,
  };
}

/**
 * Detects whether a subtitle or overview is overly dense with numeric statistics,
 * equations, or unit specifications rather than providing a high-level narrative.
 */
export function isTooStatsHeavy(text: string): boolean {
  if (!text) return false;
  // Multiple numbers associated with units (e.g. 0.09 mm, 8,000 W/m·K, 4.8 kPa)
  const statsMatches = text.match(/\b\d+(\.\d+)?\s*(mm|µm|kPa|MPa|Torr|W\/m|W\/cm²|kgf|bar|RPM|Hz|J\/kg)\b/gi);
  if (statsMatches && statsMatches.length >= 2) return true;

  // Formula patterns like h_fg =, r_eff ≈, k_eff >=
  if (/[a-zA-Z]_[a-zA-Z0-9]+\s*[=≈≤≥]/i.test(text)) return true;

  return false;
}

/**
 * Ensures the article's executive overview (subtitle) delivers an engaging,
 * high-level overview of what is discussed without dumping dense technical stats.
 */
export function formatAnswerOverview(
  rawSubtitle: string,
  title: string = "",
  fallbackTopic: string = ""
): string {
  let sub = (rawSubtitle || "").trim();

  // Replace generic, simplistic, or stat-bloated placeholders with high-level conceptual mechanism
  if (
    !sub ||
    /^an exhaustive teardown and kinematic analysis of/i.test(sub) ||
    /tight geometry and smart material choices/i.test(sub) ||
    /a sealed.*copper pouch.*boiling water/i.test(sub) ||
    isTooStatsHeavy(sub)
  ) {
    const presets = generateTechnicalOverviewPresets(fallbackTopic || title, "", "");
    return cleanRawLatex(presets.mechanism);
  }

  // Strip leading "How " or "Why " so the overview directly states the answer
  if (/^(how|why)\s+/i.test(sub)) {
    sub = sub
      .replace(/^(?:how|why)\s+/i, "")
      .replace(/\s*[—–-]\s*and\s+(?:how|why)\s+/gi, ", while ");
    sub = sub.charAt(0).toUpperCase() + sub.slice(1);
  }

  return cleanRawLatex(sub);
}
