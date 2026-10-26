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

export function generateTechnicalOverviewPresets(
  topic: string = "",
  subject: string = "",
  existingSummary: string = ""
): TechnicalOverviewPresets {
  const lower = (topic + " " + subject + " " + existingSummary).toLowerCase();

  if (lower.includes("vapor chamber") || lower.includes("two-phase") || lower.includes("wick")) {
    return {
      mechanism: "Two-phase latent vaporization ($h_{fg} = 2.26 \\times 10^6\\text{ J/kg}$) across a 0.09 mm vacuum core achieves effective thermal conductivities exceeding 8,000 W/m·K—utilizing 4.8 kPa capillary wick pressure to spread 15W SoC thermal flux without dryout.",
      boundary: "Balancing sub-micron sintered copper wick pore radius ($r_{eff} \\approx 25\\ \\mu\\text{m}$) against hydraulic liquid permeability $\\kappa$ prevents capillary burnout, while monolithic etched columns withstand 1.0 bar external atmospheric crush pressure.",
      tradeoff: "Chemical degreasing and vacuum sealing to $10^{-3}\\text{ Torr}$ prevent non-condensable hydrogen ($H_2$) passivation over $10^5$ thermal cycles, sustaining continuous vapor circulation across 0.35 mm total z-height.",
    };
  }

  if (lower.includes("cycloidal") || lower.includes("speed reducer") || lower.includes("gear")) {
    return {
      mechanism: "Epitrochoidal disc profiles distribute torque simultaneously across 70% of perimeter ring pins, eliminating backlash while suppressing Hertzian contact stresses under continuous dynamic reversing loads.",
      boundary: "Accumulated pin-circle pitch runout must remain under 12 µm across the ring housing to avoid multi-pin tooth binding and localized micro-pitting fatigue under high torsional shock loads.",
      tradeoff: "High reduction ratios (up to 119:1 in a single stage) trade sliding friction across pin contacts for zero backlash, requiring ISO VG 220 synthetic polyalphaolefin lubrication to prevent adhesive scuffing.",
    };
  }

  if (lower.includes("magnesium") || lower.includes("thixomold") || lower.includes("casting")) {
    return {
      mechanism: "Semi-solid injection molding of AZ91D slurry at 580°C suppresses dendritic solidification, producing 0.45 mm thin-wall enclosures with near-zero gas porosity and isotropic yield strength exceeding 160 MPa.",
      boundary: "Tight mold temperature gradients within ±3°C and injection velocities >80 m/s prevent premature cold-shut freezing across high aspect ratio thin-wall chassis ribs.",
      tradeoff: "Eliminating secondary CNC machining operations saves 40% cycle time, but requires heated beryllium-copper runner inserts and vacuum-assisted venting to prevent thermal fatigue checking.",
    };
  }

  if (lower.includes("laser") || lower.includes("weld") || lower.includes("busbar")) {
    return {
      mechanism: "Frequency-doubled green (515 nm) or blue (450 nm) laser wavelengths increase copper absorptivity to >40% at room temperature, suppressing keyhole instability and melt-pool spatter during high-speed seam micro-welding.",
      boundary: "Heat-affected zone (HAZ) depth must be constrained under 60 µm to prevent thermal degradation of adjacent polymer battery gaskets and avoid intermetallic phase embrittlement.",
      tradeoff: "Continuous-wave fiber wobble optics bridge 0.05 mm mechanical fit-up gaps without burn-through, trading linear process speed for joint electrical resistance below 1.2 µΩ.",
    };
  }

  if (lower.includes("piezo") || lower.includes("actuator") || lower.includes("ultrasonic")) {
    return {
      mechanism: "Inverse piezoelectric distortion in lead zirconate titanate (PZT-5H) delivers nanometer-scale displacement and gigapascal blocking forces across microsecond response times under 150V bipolar excitation.",
      boundary: "Driving past the dynamic Curie depoling temperature or tensile fracture limit (80 MPa) causes domain switching fatigue, requiring compressive mechanical preloading flexures.",
      tradeoff: "Hysteresis compensation algorithms trade closed-loop processing overhead for sub-micron positioning repeatability across high-frequency optical and fluidic delivery cycles.",
    };
  }

  const { core } = cleanTopicSubject(topic);
  return {
    mechanism: `First-principles kinematic and structural analysis of ${core.toLowerCase()}: balancing continuous dynamic stress distribution against material fatigue limits to maximize operational service life.`,
    boundary: `Governing physical tolerance constraints in ${core.toLowerCase()}: maintaining sub-micron geometric tolerances and thermal expansion compliance under full mechanical load capacity.`,
    tradeoff: `Core engineering tradeoffs in ${core.toLowerCase()}: optimizing manufacturing cycle times and material selection while suppressing localized micro-fretting and failure modes.`,
  };
}

/**
 * Ensures the article's executive overview (subtitle) delivers high-value,
 * quantitative engineering insight rather than repeating colloquial or simplistic blurbs.
 */
export function formatAnswerOverview(
  rawSubtitle: string,
  title: string = "",
  fallbackTopic: string = ""
): string {
  let sub = (rawSubtitle || "").trim();

  // Replace generic or simplistic placeholders with high-value technical mechanism
  if (
    !sub ||
    /^an exhaustive teardown and kinematic analysis of/i.test(sub) ||
    /tight geometry and smart material choices/i.test(sub) ||
    /a sealed.*copper pouch.*boiling water/i.test(sub)
  ) {
    const presets = generateTechnicalOverviewPresets(fallbackTopic || title, "", "");
    return presets.mechanism;
  }

  // Strip leading "How " or "Why " so the overview directly states the answer
  if (/^(how|why)\s+/i.test(sub)) {
    sub = sub
      .replace(/^(?:how|why)\s+/i, "")
      .replace(/\s*[—–-]\s*and\s+(?:how|why)\s+/gi, ", while ");
    sub = sub.charAt(0).toUpperCase() + sub.slice(1);
  }

  return sub;
}
