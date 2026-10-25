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

/**
 * Ensures the article's short summary overview (subtitle) gives the direct answer
 * in plain, accessible English rather than repeating "How..." or using textbook jargon.
 */
export function formatAnswerOverview(
  rawSubtitle: string,
  title: string = "",
  fallbackTopic: string = ""
): string {
  let sub = (rawSubtitle || "").trim();

  // Replace generic harvester boilerplate with plain-English answer overview
  if (!sub || /^an exhaustive teardown and kinematic analysis of/i.test(sub)) {
    const { core, detail } = cleanTopicSubject(fallbackTopic || title);
    if (detail) {
      return `By controlling ${detail.toLowerCase()}, engineers keep ${core.toLowerCase()} running smoothly under heavy heat and mechanical loads.`;
    }
    return `Tight geometry and smart material choices let ${core.toLowerCase()} handle extreme loads without wearing out or jamming.`;
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
