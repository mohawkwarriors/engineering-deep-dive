/**
 * Title generation utility for The HW Insider
 *
 * Enforces editorial standards from Curator-in-the-Loop:
 * - Direct, engaging titles capturing the exact hardware mechanism
 * - Avoids stacked colons and jargon salads
 * - Example: "How smartphones stay cool: Exploring phase change in Ultra-Thin Vapor Chambers"
 * - Pattern: [Engaging Hook / Concept]: [Exact Physical Mechanism in Context]
 */

export interface TitleAngles {
  mechanism: string;
  tradeoff: string;
  teardown: string;
  failureMode: string;
}

export function cleanTopicSubject(rawTopic: string): { core: string; detail: string } {
  if (!rawTopic) return { core: "Hardware Mechanism", detail: "" };

  // Strip existing double colons or kinematic fluff if already appended
  const sanitized = rawTopic
    .replace(/:\s*Kinematic Decomposition.*$/i, "")
    .replace(/:\s*Sub-Micron Dynamics.*$/i, "")
    .trim();

  // Split on colons, em-dashes, or en-dashes
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
    mechanism = "Submerged compute: Boiling heat transfer in two-phase immersion cooling";
  } else if (lowerTopic.includes("liquid metal") || lowerTopic.includes("tim")) {
    mechanism = "Defeating the thermal interface: Gallium alloys and galvanic containment";
  } else if (lowerTopic.includes("cycloidal")) {
    mechanism = "Zero-backlash robotics: How cycloidal reducers transfer high torque";
  } else if (lowerTopic.includes("strain wave") || lowerTopic.includes("harmonic")) {
    mechanism = "Flexible steel in precision motion: Kinematics of strain wave gearing";
  } else if (lowerTopic.includes("lithography") || lowerTopic.includes("flexure")) {
    mechanism = "Sub-nanometer positioning: Compliant titanium flexures in lithography";
  } else if (lowerTopic.includes("ball screw")) {
    mechanism = "Smooth under load: How gothic-arch preloading eliminates stick-slip in ball screws";
  } else if (lowerTopic.includes("wire edm")) {
    mechanism = "Cutting with sparks: Sub-surface recast metrology in precision wire EDM";
  } else if (lowerTopic.includes("thixomold")) {
    mechanism = "Semi-solid magnesium: Net-shape casting for ultra-thin laptop chasses";
  } else if (lowerTopic.includes("tabless 4680") || lowerTopic.includes("battery cell")) {
    mechanism = "Defeating copper reflection: Laser micro-welding in tabless 4680 battery cells";
  } else if (lowerTopic.includes("voice coil") || lowerTopic.includes("camera ois")) {
    mechanism = "Sub-micron optical stabilization: Inside smartphone voice coil actuators";
  } else if (lowerTopic.includes("o-ring") || lowerTopic.includes("explosive decompression")) {
    mechanism = "Sealing under extreme pressure: Preventing explosive decompression in fluorocarbon O-rings";
  } else if (lowerTopic.includes("busbar") || lowerTopic.includes("ultrasonic")) {
    mechanism = "Acoustic bonding: Ultrasonic metal welding of high-power EV busbars";
  } else if (lowerTopic.includes("kinematic coupling") || lowerTopic.includes("kelvin")) {
    mechanism = "Deterministic positioning: Sub-micron repeatability in Kelvin and Maxwell kinematic mounts";
  } else if (lowerTopic.includes("geneva")) {
    mechanism = "Intermittent motion: Dynamic shock and acceleration control in Geneva mechanisms";
  } else if (s.includes("thermal")) {
    const topicDesc = detail || core;
    mechanism = `How hardware stays cool: Thermal transport in ${topicDesc}`;
  } else if (s.includes("manufactur")) {
    const topicDesc = detail || core;
    mechanism = `Sub-micron precision: Manufacturing physics of ${topicDesc}`;
  } else if (s.includes("material")) {
    const topicDesc = detail || core;
    mechanism = `Microstructure and alloy design: Material limits of ${topicDesc}`;
  } else if (s.includes("fluid")) {
    const topicDesc = detail || core;
    mechanism = `High-speed flow dynamics: Hydraulic control in ${topicDesc}`;
  } else if (s.includes("electromechanical")) {
    const topicDesc = detail || core;
    mechanism = `Electromagnetic precision: Inside high-speed ${topicDesc}`;
  } else {
    // General mechanical
    if (detail) {
      mechanism = `${core}: Exploring ${detail}`;
    } else {
      mechanism = `Zero-play precision: First-principles physics of ${core}`;
    }
  }

  // 2. Design Tradeoff Angle
  let tradeoff = "";
  if (lowerTopic.includes("vapor chamber")) {
    tradeoff = "Ultra-thin vapor chambers: Balancing capillary pumping pressure against vapor flow resistance";
  } else if (lowerTopic.includes("cycloidal")) {
    tradeoff = "Cycloidal drives: Balancing pin-circle runout against contact stress and back-drivability";
  } else if (lowerTopic.includes("flexure")) {
    tradeoff = "Compliant mechanisms: Balancing angular deflection range against resonant fatigue life";
  } else if (s.includes("thermal")) {
    tradeoff = `${core}: Balancing thermal spreading resistance against chassis z-height`;
  } else if (s.includes("manufactur") || s.includes("material")) {
    tradeoff = `${core}: Balancing surface hardness against core fracture toughness`;
  } else {
    tradeoff = `${core}: Balancing tight machining tolerances against production yield`;
  }

  // 3. Teardown Case Study Angle
  const teardown = `Hardware teardown: Dissecting the internal architecture of ${core}`;

  // 4. Failure Mode Angle
  let failureMode = "";
  if (lowerTopic.includes("vapor chamber")) {
    failureMode = "Why vapor chambers dry out: Critical heat flux, boiling limits, and non-condensable gas";
  } else if (lowerTopic.includes("cycloidal")) {
    failureMode = "Why precision gearboxes bind: Multi-pin runout, fretting wear, and thermal lockup";
  } else if (s.includes("thermal")) {
    failureMode = `Why ${core} fails: Hotspot dryout and interfacial thermal degradation`;
  } else if (s.includes("material") || s.includes("manufactur")) {
    failureMode = `Why ${core} cracks: Residual stress, micro-voids, and cyclic thermal fatigue`;
  } else {
    failureMode = `Why ${core} fails: Contact stress, fretting wear, and cyclic fatigue`;
  }

  return {
    mechanism,
    tradeoff,
    teardown,
    failureMode,
  };
}

/**
 * Ensures the article's short summary overview (subtitle) gives the direct answer
 * rather than repeating "How..." or "Why..." when the title already poses the question.
 */
export function formatAnswerOverview(
  rawSubtitle: string,
  title: string = "",
  fallbackTopic: string = ""
): string {
  let sub = (rawSubtitle || "").trim();

  // If the subtitle uses generic harvester boilerplate, replace with a direct answer overview
  if (!sub || /^an exhaustive teardown and kinematic analysis of/i.test(sub)) {
    const { core, detail } = cleanTopicSubject(fallbackTopic || title);
    if (detail) {
      return `${detail} governs the operating envelope of ${core}, preventing structural fatigue and thermal runaway under peak cyclic loads.`;
    }
    return `Precision contact geometry and material microstructure allow ${core} to sustain peak operating loads without mechanical degradation.`;
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

