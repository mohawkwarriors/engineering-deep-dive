import fs from 'fs';
import path from 'path';

const STAGING_DIR = path.resolve('staging');
const APPROVED_DIR = path.resolve('approved');
const CONTENT_DIR = path.resolve('content');
const ISSUES_DIR = path.resolve('content/issues');
const VETOES_PATH = path.resolve('content/vetoes.json');

const TARGET_CAPACITY = 40;

if (!fs.existsSync(STAGING_DIR)) fs.mkdirSync(STAGING_DIR, { recursive: true });
if (!fs.existsSync(APPROVED_DIR)) fs.mkdirSync(APPROVED_DIR, { recursive: true });

// 1. Gather all existing topics for Semantic Deduplication
function getExistingTopics() {
  const existing = new Set();

  // Published issues
  if (fs.existsSync(ISSUES_DIR)) {
    fs.readdirSync(ISSUES_DIR).forEach(f => {
      if (f.endsWith('.json')) {
        try {
          const d = JSON.parse(fs.readFileSync(path.join(ISSUES_DIR, f), 'utf8'));
          if (d.title) existing.add(d.title.toLowerCase().trim());
        } catch {}
      }
    });
  }

  // Published markdown files
  if (fs.existsSync(CONTENT_DIR)) {
    fs.readdirSync(CONTENT_DIR).forEach(f => {
      if (f.endsWith('.md')) {
        existing.add(f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '').replace(/-/g, ' ').toLowerCase());
      }
    });
  }

  // Staged drafts
  if (fs.existsSync(STAGING_DIR)) {
    fs.readdirSync(STAGING_DIR).forEach(f => {
      if (f.endsWith('.json')) {
        try {
          const d = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, f), 'utf8'));
          if (d.title) existing.add(d.title.toLowerCase().trim());
        } catch {}
      }
    });
  }

  // Approved drafts
  if (fs.existsSync(APPROVED_DIR)) {
    fs.readdirSync(APPROVED_DIR).forEach(f => {
      if (f.endsWith('.json')) {
        try {
          const d = JSON.parse(fs.readFileSync(path.join(APPROVED_DIR, f), 'utf8'));
          if (d.title) existing.add(d.title.toLowerCase().trim());
        } catch {}
      }
    });
  }

  // Vetoes log
  if (fs.existsSync(VETOES_PATH)) {
    try {
      const vetoes = JSON.parse(fs.readFileSync(VETOES_PATH, 'utf8'));
      if (Array.isArray(vetoes)) {
        vetoes.forEach(v => {
          if (v.topic) existing.add(v.topic.toLowerCase().trim());
        });
      }
    } catch {}
  }

  return existing;
}

const existingTopics = getExistingTopics();

function isDuplicate(topicTitle) {
  const t = topicTitle.toLowerCase().trim();
  for (const existing of existingTopics) {
    if (existing.includes(t) || t.includes(existing)) return true;
  }
  return false;
}

// 40 Deep Dive Topics Across Mechanical Subjects
const TOPIC_TEMPLATES = [
  {
    topic: "Cycloidal Speed Reducers: Zero-Backlash Contact Kinematics",
    subject: "Mechanisms",
    category: "Mechanisms",
    readTime: "11 min",
    equation: "\\sigma_{Hertz} = \\sqrt{\\frac{F_n}{\\pi \\cdot L} \\cdot \\frac{\\frac{1}{R_1} + \\frac{1}{R_2}}{\\frac{1-\\nu_1^2}{E_1} + \\frac{1-\\nu_2^2}{E_2}}}",
    cardType: "ToleranceStackupBar",
    cardConfig: {
      minAllowableGap: 0.015,
      maxAllowableGap: 0.045,
      unit: "mm",
      takeaway: "Maintain total accumulated pin-circle runout under 12 microns to avoid multi-pin tooth binding."
    }
  },
  {
    topic: "Thixomolding Magnesium: Thin-Wall Net-Shape Casting",
    subject: "Manufacturing",
    category: "Manufacturing",
    readTime: "10 min",
    equation: "\\mu_{eff} = \\mu_0 \\cdot \\left(1 + 2.5 \\cdot \\Phi + 10.05 \\cdot \\Phi^2\\right)",
    cardType: "TradeoffMatrix",
    cardConfig: {
      takeaway: "Thixomolded AZ91D achieves 0.45 mm wall sections with zero porosity compared to high-pressure die casting."
    }
  },
  {
    topic: "Laser Micro-Welding of Tabless 4680 Cylindrical Battery Cells",
    subject: "Manufacturing",
    category: "Manufacturing",
    readTime: "12 min",
    equation: "P_{absorbed} = P_{laser} \\cdot \\left(1 - R_0 \\cdot e^{-\\alpha \\cdot T}\\right)",
    cardType: "LayeredCrossSection",
    cardConfig: {
      totalThickness: "0.22 mm",
      takeaway: "Green (515 nm) or blue (450 nm) lasers overcome copper's 95% infrared reflectance at room temperature."
    }
  },
  {
    topic: "Immersion Two-Phase Dielectric Cooling: Boiling Heat Transfer",
    subject: "Thermal",
    category: "Thermal",
    readTime: "13 min",
    equation: "q''_{max} = 0.149 \\cdot h_{fg} \\cdot \\rho_v^{1/2} \\cdot \\left[\\sigma \\cdot g \\cdot (\\rho_l - \\rho_v)\\right]^{1/4}",
    cardType: "ParameterExplorer",
    cardConfig: {
      equationTex: "q''_{max} = 0.149 \\cdot h_{fg} \\cdot \\rho_v^{0.5} \\cdot [\\sigma g (\\rho_l - \\rho_v)]^{0.25}",
      takeaway: "Micro-porous copper boiling surfaces delay Critical Heat Flux (CHF) past 120 W/cm²."
    }
  },
  {
    topic: "Camera OIS Voice Coil Actuators: Sub-Micron Suspensions",
    subject: "Electromechanical",
    category: "Electromechanical",
    readTime: "10 min",
    equation: "F_{Lorentz} = B \\cdot I \\cdot L \\cdot \\sin(\\theta)",
    cardType: "MechanismWalkthrough",
    cardConfig: {
      takeaway: "Cross-talk between magnetic autofocus (AF) coils and optical stabilization (OIS) magnets must remain under 3%."
    }
  },
  {
    topic: "Compliant Titanium Flexure Hinges in Lithography Stages",
    subject: "Design",
    category: "Design",
    readTime: "11 min",
    equation: "k_\\theta = \\frac{2 \\cdot E \\cdot b \\cdot t^{5/2}}{9 \\cdot \\pi \\cdot R^{1/2}}",
    cardType: "ToleranceStackupBar",
    cardConfig: {
      minAllowableGap: 0.005,
      maxAllowableGap: 0.020,
      unit: "mm",
      takeaway: "Wire EDM recast layer must be chemically etched to prevent fatigue initiation in 10^8 cycle flexures."
    }
  },
  {
    topic: "Ball Screw Gothic-Arch Preload & Stick-Slip Dynamics",
    subject: "Mechanisms",
    category: "Mechanisms",
    readTime: "12 min",
    equation: "\\delta_{contact} = \\left(\\frac{9 \\cdot F_n^2}{16 \\cdot R^* \\cdot E^{*2}}\\right)^{1/3}",
    cardType: "ParameterExplorer",
    cardConfig: {
      equationTex: "\\delta = (9 F_n^2 / (16 R^* E^{*2}))^{1/3}",
      takeaway: "Gothic-arch conformity factor must exceed 0.52 to suppress high contact stress at 45° contact angles."
    }
  },
  {
    topic: "Wire EDM Kerf Metrology & Sub-Surface Recast Layers",
    subject: "Manufacturing",
    category: "Manufacturing",
    readTime: "9 min",
    equation: "h_{recast} \\propto \\sqrt{E_{pulse} \\cdot t_{on}}",
    cardType: "LayeredCrossSection",
    cardConfig: {
      totalThickness: "0.15 mm",
      takeaway: "Multi-pass skim cuts reduce white recast layer from 18 microns down to under 1.5 microns."
    }
  },
  {
    topic: "Metal Injection Molding (MIM): Sintering Shrinkage Control",
    subject: "Materials",
    category: "Materials",
    readTime: "11 min",
    equation: "Y = 1 - \\left(\\frac{\\rho_{green}}{\\rho_{sintered}}\\right)^{1/3}",
    cardType: "ToleranceStackupBar",
    cardConfig: {
      minAllowableGap: 0.010,
      maxAllowableGap: 0.035,
      unit: "mm",
      takeaway: "Isotropic 16.5% volumetric shrinkage requires uniform thermal distribution within ±2°C inside vacuum retorts."
    }
  },
  {
    topic: "Liquid Metal TIM Containment & Galvanic Corrosion",
    subject: "Thermal",
    category: "Thermal",
    readTime: "12 min",
    equation: "\\Delta E_{galvanic} = E_{cathode} - E_{anode}",
    cardType: "TradeoffMatrix",
    cardConfig: {
      takeaway: "Galinstan rapidly embrittles bare aluminum via intergranular penetration; nickel plating is mandatory."
    }
  },
  {
    topic: "Explosive Decompression Resistance in Fluorocarbon O-Rings",
    subject: "Design",
    category: "Design",
    readTime: "10 min",
    equation: "\\sigma_{internal} = \\Delta P_{gas} - \\frac{4 \\cdot G}{3}",
    cardType: "ParameterExplorer",
    cardConfig: {
      equationTex: "\\sigma_{internal} = \\Delta P_{gas} - 4G/3",
      takeaway: "90 Shore A FKM with high cross-link density prevents internal micro-bubble cavitation during rapid venting."
    }
  },
  {
    topic: "Ultrasonic Metal Welding of EV Busbars",
    subject: "Manufacturing",
    category: "Manufacturing",
    readTime: "11 min",
    equation: "E_{weld} = P_{acoustic} \\cdot t_{weld} = F_N \\cdot \\mu_{dyn} \\cdot v_{sonotrode} \\cdot t",
    cardType: "LayeredCrossSection",
    cardConfig: {
      totalThickness: "1.20 mm",
      takeaway: "Sonotrode knurl geometry must balance oxide dispersion against copper foil tearing."
    }
  },
  {
    topic: "Kinematic Couplings: Kelvin Clamps & Maxwell Mounts",
    subject: "Design",
    category: "Design",
    readTime: "10 min",
    equation: "F_{contact} = \\frac{F_{preload}}{3 \\cdot \\cos(\\alpha)}",
    cardType: "MechanismWalkthrough",
    cardConfig: {
      takeaway: "Exact-constraint 6-point contact provides sub-micron repeatability without over-constraining thermal growth."
    }
  },
  {
    topic: "Geneva Mechanism Kinematics & High-Speed Dynamic Shock",
    subject: "Mechanisms",
    category: "Mechanisms",
    readTime: "9 min",
    equation: "\\alpha_{output} = \\omega_{in}^2 \\cdot \\frac{\\sin(\\beta) \\cdot (1 - \\mu^2)}{(\\mu^2 + 1 - 2\\mu\\cos\\beta)^2}",
    cardType: "ParameterExplorer",
    cardConfig: {
      equationTex: "\\alpha = \\omega^2 \\cdot f(\\beta, \\mu)",
      takeaway: "Drive pins require synthetic elastomeric dampers to prevent tooth bouncing during entry at >600 RPM."
    }
  },
  {
    topic: "Microchannel Heat Sinks: Laminar Slip Flow in Silicon",
    subject: "Thermal",
    category: "Thermal",
    readTime: "12 min",
    equation: "Nu = \\frac{h \\cdot D_h}{k} = 4.36 + \\frac{0.055 \\cdot (Re \\cdot Pr \\cdot D_h/L)^{0.92}}{1 + 0.033 \\cdot (Re \\cdot Pr \\cdot D_h/L)^{0.84}}",
    cardType: "ToleranceStackupBar",
    cardConfig: {
      minAllowableGap: 0.050,
      maxAllowableGap: 0.120,
      unit: "mm",
      takeaway: "Aspect ratio 10:1 DRIE channels achieve thermal resistance below 0.08 K·cm²/W."
    }
  },
  {
    topic: "Piezoelectric Ultrasonic Transducers: PZT Matching Layers",
    subject: "Electromechanical",
    category: "Electromechanical",
    readTime: "11 min",
    equation: "Z_{matching} = \\sqrt{Z_{PZT} \\cdot Z_{tissue}}",
    cardType: "LayeredCrossSection",
    cardConfig: {
      totalThickness: "0.85 mm",
      takeaway: "Quarter-wave acoustic impedance matching eliminates reflection loss between 30 MRayl PZT and water."
    }
  },
  {
    topic: "Peristaltic Pump Tubing Extrusion & Cyclic Spallation",
    subject: "Fluids",
    category: "Fluids",
    readTime: "10 min",
    equation: "N_f = \\left(\\frac{\\sigma_{endurance}}{\\sigma_{occlusion}}\\right)^b",
    cardType: "TradeoffMatrix",
    cardConfig: {
      takeaway: "Thermoplastic vulcanizate (Santoprene) resists spallation 8x longer than peroxide-cured silicone."
    }
  },
  {
    topic: "Laser Powder Bed Fusion (LPBF): Residual Stress & Anchors",
    subject: "Manufacturing",
    category: "Manufacturing",
    readTime: "13 min",
    equation: "\\sigma_{residual} = E \\cdot \\alpha \\cdot \\Delta T_{melt-solid}",
    cardType: "ParameterExplorer",
    cardConfig: {
      equationTex: "\\sigma = E \\cdot \\alpha \\cdot \\Delta T",
      takeaway: "Heated build plates (>200°C) reduce thermal gradient d2T/dz2 and prevent build part blade delamination."
    }
  },
  {
    topic: "Cavitation Erosion in High-Pressure Common-Rail Injectors",
    subject: "Fluids",
    category: "Fluids",
    readTime: "12 min",
    equation: "P_{collapse} = P_0 \\cdot \\left(\\frac{R_0}{R_{min}}\\right)^{3\\gamma} \\approx 10^3\\,\\text{MPa}",
    cardType: "MechanismWalkthrough",
    cardConfig: {
      takeaway: "Micro-hydro-erosive grinding rounds orifice inlet edges to eliminate vena contracta vortex cavitation."
    }
  },
  {
    topic: "Bulk Metallic Glasses (BMG) in Micro-Gears",
    subject: "Materials",
    category: "Materials",
    readTime: "11 min",
    equation: "\\sigma_y / E \\approx 0.02",
    cardType: "TradeoffMatrix",
    cardConfig: {
      takeaway: "Zr-based amorphous alloys offer 2% elastic strain limit—double that of high-strength spring steel."
    }
  },
  {
    topic: "Planetary Roller Screws: Extreme Load Density Mechanics",
    subject: "Mechanisms",
    category: "Mechanisms",
    readTime: "12 min",
    equation: "C_a = f_c \\cdot (i \\cdot \\cos\\alpha)^{0.7} \\cdot Z^{2/3} \\cdot D_{pw}^{1.8} \\cdot \\tan\\alpha",
    cardType: "ToleranceStackupBar",
    cardConfig: {
      minAllowableGap: 0.008,
      maxAllowableGap: 0.025,
      unit: "mm",
      takeaway: "Thread pitch synchronization across 10 planet rollers eliminates axial backlash without preloading springs."
    }
  },
  {
    topic: "5-Axis Thermal Drift Compensation in Precision Machining",
    subject: "Manufacturing",
    category: "Manufacturing",
    readTime: "10 min",
    equation: "\\Delta L = L_0 \\cdot \\alpha \\cdot \\int_0^L \\Delta T(x,t)\\,dx",
    cardType: "ParameterExplorer",
    cardConfig: {
      equationTex: "\\Delta L = L_0 \\cdot \\alpha \\cdot \\Delta T",
      takeaway: "Real-time FBG fiber-optic temperature telemetry corrects spindle growth within 1.5 microns over 8-hour shifts."
    }
  },
  {
    topic: "Direct Die Copper Cold Plates: Micro-Pin Fins in AI Servers",
    subject: "Thermal",
    category: "Thermal",
    readTime: "12 min",
    equation: "\\Delta P = f \\cdot \\left(\\frac{L}{D_h}\\right) \\cdot \\left(\\frac{\\rho v^2}{2}\\right)",
    cardType: "LayeredCrossSection",
    cardConfig: {
      totalThickness: "2.40 mm",
      takeaway: "Staggered 150-micron diamond micro-pins suppress boundary layer growth at 1.2 LPM coolant flow."
    }
  },
  {
    topic: "High-G Shock Isolation in Guided Munitions Gimbal Bearings",
    subject: "Design",
    category: "Design",
    readTime: "11 min",
    equation: "\\zeta = \\frac{c}{2 \\cdot \\sqrt{k \\cdot m}}",
    cardType: "MechanismWalkthrough",
    cardConfig: {
      takeaway: "Pre-stressed elastomer Belleville dampers prevent brinelling of ceramic silicon nitride ball races under 20,000g launch shocks."
    }
  },
  {
    topic: "Sapphire Crystal to Titanium Diffusion Bonding",
    subject: "Materials",
    category: "Materials",
    readTime: "10 min",
    equation: "J = -D_0 \\cdot e^{-Q/(RT)} \\cdot \\frac{\\partial C}{\\partial x}",
    cardType: "TradeoffMatrix",
    cardConfig: {
      takeaway: "Niobium intermediate transition interlayer accommodates the 3:1 thermal expansion mismatch between Al2O3 and Ti-6Al-4V."
    }
  },
  {
    topic: "Electrostatic Discharge (ESD) Spring Contacts in Smartphones",
    subject: "Electromechanical",
    category: "Electromechanical",
    readTime: "9 min",
    equation: "R_{contact} = \\sqrt{\\frac{\\rho_1 \\cdot \\rho_2 \\cdot \\pi \\cdot H}{4 \\cdot F_N}}",
    cardType: "ToleranceStackupBar",
    cardConfig: {
      minAllowableGap: 0.12,
      maxAllowableGap: 0.35,
      unit: "mm",
      takeaway: "Hard gold plating over nickel barrier prevents copper interdiffusion and contact resistance spiking above 15 mΩ."
    }
  },
  {
    topic: "Hydrostatic Journal Bearings: Micro-Pocket Fluid Film Pressure",
    subject: "Fluids",
    category: "Fluids",
    readTime: "12 min",
    equation: "\\frac{\\partial}{\\partial x}\\left(h^3 \\frac{\\partial p}{\\partial x}\\right) + \\frac{\\partial}{\\partial z}\\left(h^3 \\frac{\\partial p}{\\partial z}\\right) = 6 \\mu U \\frac{\\partial h}{\\partial x}",
    cardType: "ParameterExplorer",
    cardConfig: {
      equationTex: "dp/dx = f(\\mu, U, h)",
      takeaway: "Capillary tube restrictors match pocket pressures to balance heavy asymmetric spindle cutting loads."
    }
  },
  {
    topic: "Anisotropic Conductive Film (ACF) Bonding in Micro-OLEDs",
    subject: "Manufacturing",
    category: "Manufacturing",
    readTime: "11 min",
    equation: "N_{particles} = A_{bump} \\cdot C_{density} \\cdot (1 - \\text{voids})",
    cardType: "LayeredCrossSection",
    cardConfig: {
      totalThickness: "0.025 mm",
      takeaway: "3-micron gold-coated polymer spheres deform 30% to guarantee 4+ particle bridges per contact pad."
    }
  },
  {
    topic: "Coreless BLDC Motors: Halbach Array Flux Concentration",
    subject: "Electromechanical",
    category: "Electromechanical",
    readTime: "11 min",
    equation: "B_r(r) = B_{rem} \\cdot \\frac{p}{p+1} \\cdot \\left[1 - \\left(\\frac{R_{in}}{R_{out}}\\right)^{p+1}\\right]",
    cardType: "TradeoffMatrix",
    cardConfig: {
      takeaway: "Halbach magnetic orientation increases airgap flux by 1.4x while eliminating the need for a heavy back-iron."
    }
  },
  {
    topic: "Silicon Nitride Ceramic Bearings in Cryogenic Turbo-Pumps",
    subject: "Materials",
    category: "Materials",
    readTime: "12 min",
    equation: "K_{IC} = Y \\cdot \\sigma \\cdot \\sqrt{\\pi a}",
    cardType: "MechanismWalkthrough",
    cardConfig: {
      takeaway: "Si3N4 balls prevent cold-welding in liquid oxygen where traditional hydrocarbon lubricants freeze instantly."
    }
  },
  {
    topic: "Friction Stir Welding of 7000-Series Aerospace Extrusions",
    subject: "Manufacturing",
    category: "Manufacturing",
    readTime: "10 min",
    equation: "T_{peak} / T_{solidus} \\approx 0.80 - 0.85",
    cardType: "TradeoffMatrix",
    cardConfig: {
      takeaway: "Solid-state joining avoids solidification cracking and porosity common in fusion welding of 7075-T6."
    }
  },
  {
    topic: "Piezoelectric Micropumps for Targeted Drug Delivery",
    subject: "Fluids",
    category: "Fluids",
    readTime: "11 min",
    equation: "Q = \\Delta V \\cdot f \\cdot \\eta_{valve}",
    cardType: "ToleranceStackupBar",
    cardConfig: {
      minAllowableGap: 0.002,
      maxAllowableGap: 0.010,
      unit: "mm",
      takeaway: "Nozzle-diffuser valve rectification eliminates mechanical wear particles in biological fluids."
    }
  },
  {
    topic: "Thread-Locking Adhesives: Anaerobic Polymerization Kinetics",
    subject: "Design",
    category: "Design",
    readTime: "9 min",
    equation: "T_{breakaway} = T_{thread} + \\tau_{shear} \\cdot A_{thread} \\cdot r_m",
    cardType: "ParameterExplorer",
    cardConfig: {
      equationTex: "T_{break} = T_{clamp} + \\tau \\cdot A \\cdot r",
      takeaway: "Active metal ions (copper, iron) accelerate polymerization; stainless steel fasteners require chemical activators."
    }
  },
  {
    topic: "Micro-Turbine Foil Air Bearings in Aircraft Cooling Units",
    subject: "Fluids",
    category: "Fluids",
    readTime: "12 min",
    equation: "W = \\Lambda \\cdot p_a \\cdot R \\cdot L \\cdot f(\\epsilon)",
    cardType: "MechanismWalkthrough",
    cardConfig: {
      takeaway: "Hydrodynamic air wedge lifts journal at 15,000 RPM, achieving zero metal-to-metal contact at 80,000 RPM."
    }
  },
  {
    topic: "Chemical Mechanical Planarization (CMP) Retaining Ring Wear",
    subject: "Manufacturing",
    category: "Manufacturing",
    readTime: "11 min",
    equation: "MRR = K_P \\cdot P \\cdot V",
    cardType: "LayeredCrossSection",
    cardConfig: {
      totalThickness: "6.35 mm",
      takeaway: "Slotted PPS retaining rings prevent wafer slippage and maintain uniform boundary layer slurry thickness."
    }
  },
  {
    topic: "Squeeze Film Dampers in High-Speed Turbomachinery",
    subject: "Mechanisms",
    category: "Mechanisms",
    readTime: "11 min",
    equation: "F_{damping} = -12 \\pi \\mu R \\left(\\frac{L}{c}\\right)^3 \\frac{\\dot{\\epsilon}}{(1-\\epsilon^2)^{3/2}}",
    cardType: "ParameterExplorer",
    cardConfig: {
      equationTex: "F_{damp} = f(\\mu, R, L, c, \\epsilon)",
      takeaway: "Oil film cavitation must be suppressed with 0.3 MPa supply pressure to prevent non-linear jump resonances."
    }
  },
  {
    topic: "Carbon Fiber Composite Overwrapped Pressure Vessels (COPV)",
    subject: "Materials",
    category: "Materials",
    readTime: "12 min",
    equation: "P_{burst} = \\frac{2 \\cdot \\sigma_{fiber} \\cdot t_{hoop}}{D_{liner}}",
    cardType: "LayeredCrossSection",
    cardConfig: {
      totalThickness: "14.5 mm",
      takeaway: "Thin-wall laser-welded aluminum liners prevent hydrogen gas micro-permeation while carbon overwraps take 85% of hoop tension."
    }
  },
  {
    topic: "Helical Gear Micro-Geometry: Lead Crown & Involute Tip Relief",
    subject: "Mechanisms",
    category: "Mechanisms",
    readTime: "11 min",
    equation: "\\delta_{tooth} = \\frac{w \\cdot b}{E \\cdot \\cos\\beta}",
    cardType: "ToleranceStackupBar",
    cardConfig: {
      minAllowableGap: 0.004,
      maxAllowableGap: 0.018,
      unit: "mm",
      takeaway: "5-micron lead crowning compensates for shaft torsional windup and bearing deflection under 500 Nm load."
    }
  },
  {
    topic: "Direct Metal Laser Sintering (DMLS) of Inconel 718 Impellers",
    subject: "Manufacturing",
    category: "Manufacturing",
    readTime: "12 min",
    equation: "H_v = \\frac{P_{laser}}{v_{scan} \\cdot h_{hatch} \\cdot t_{layer}}",
    cardType: "TradeoffMatrix",
    cardConfig: {
      takeaway: "HIP (Hot Isostatic Pressing) at 1160°C and 100 MPa closes all internal micro-voids, restoring wrought fatigue life."
    }
  },
  {
    topic: "Magnetic Fluid Rotary Seals (Ferrofluidic) in Vacuum Systems",
    subject: "Fluids",
    category: "Fluids",
    readTime: "10 min",
    equation: "\\Delta P_{stage} = \\mu_0 \\cdot \\int_0^H M(H)\\,dH",
    cardType: "MechanismWalkthrough",
    cardConfig: {
      takeaway: "Multi-stage pole pieces each hold 0.2 bar differential pressure, achieving 10^-8 Torr hermetic isolation with zero mechanical friction."
    }
  }
];

// Generates 12 curated candidate technical images
function generateImageCandidates(topic) {
  const basePool = [
    { url: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=2000", title: `${topic} Precision Teardown Macro`, source: "Hardware Teardown Lab" },
    { url: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&q=80&w=2000", title: `${topic} Sub-Assembly Metrology`, source: "Optical CMM Metrology" },
    { url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2000", title: `${topic} High-Aspect Cross Section`, source: "Materials Lab" },
    { url: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&q=80&w=2000", title: `${topic} Internal Kinematic Interface`, source: "Kinematics Archive" },
    { url: "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&q=80&w=2000", title: `${topic} Surface Profilometry Scan`, source: "Interferometry Metrology" },
    { url: "https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&q=80&w=2000", title: `${topic} Dynamometer Test Cell`, source: "Dynamometer Dynamics" },
    { url: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&q=80&w=2000", title: `${topic} Thermal Infrared Hot Spot Map`, source: "FLIR Calibrated Thermal" },
    { url: "https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&q=80&w=2000", title: `${topic} SEM Fractography Analysis`, source: "SEM Microscopy" },
    { url: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&q=80&w=2000", title: `${topic} Micro-Cavitation Pitting`, source: "Tribology Institute" },
    { url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=2000", title: `${topic} Laser Seam Interferogram`, source: "Laser Optics Group" },
    { url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=2000", title: `${topic} Production Assembly Fixture`, source: "Automation Metrology" },
    { url: "https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?auto=format&fit=crop&q=80&w=2000", title: `${topic} Final Quality Acceptance Gauge`, source: "CMM Metrology" }
  ];
  return basePool;
}


function cleanTopicSubject(rawTopic) {
  if (!rawTopic) return { core: "Hardware Mechanism", detail: "" };

  const sanitized = rawTopic
    .replace(/:\s*Kinematic Decomposition.*$/i, '')
    .replace(/:\s*Sub-Micron Dynamics.*$/i, '')
    .trim();

  const parts = sanitized
    .split(/[:–—]/)
    .map(s => s.trim())
    .filter(Boolean);

  const core = parts[0] || sanitized;
  const detail = parts.slice(1).join(" — ").trim();
  return { core, detail };
}

function generateCleanTitleAngles(rawTopic, subject = "Mechanisms") {
  const { core, detail } = cleanTopicSubject(rawTopic);
  const s = (subject || "").toLowerCase();
  const lowerTopic = (rawTopic || "").toLowerCase();

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
    if (detail) {
      mechanism = `${core}: Exploring ${detail}`;
    } else {
      mechanism = `Zero-play precision: First-principles physics of ${core}`;
    }
  }

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

  const teardown = `Hardware teardown: Dissecting the internal architecture of ${core}`;

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

  return { mechanism, tradeoff, teardown, failureMode };
}

export async function populateQueueToFloor() {
  console.log('[Queue Manager] Checking 40+ Rolling Queue Volume Floor...');

  const currentStaging = fs.readdirSync(STAGING_DIR).filter(f => f.endsWith('.json'));
  console.log(`[Queue Manager] Current unreviewed drafts in staging: ${currentStaging.length}`);

  let added = 0;
  for (const t of TOPIC_TEMPLATES) {
    if (currentStaging.length + added >= TARGET_CAPACITY) break;

    // Semantic Deduplication Check
    if (isDuplicate(t.topic)) {
      console.log(`[Queue Manager] Skipping duplicate/vetoed topic: "${t.topic}"`);
      continue;
    }

    const slug = t.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const filename = `${String(currentStaging.length + added + 1).padStart(3, '0')}-${slug}.json`;
    const targetPath = path.join(STAGING_DIR, filename);

    // 4 Title Angles
    const titleAngles = {
      mechanism: `${t.topic}: Kinematic Decomposition and Sub-Micron Dynamics`,
      tradeoff: `Designing for Yield: The Critical Material & Tolerance Tradeoffs in ${t.topic.split(':')[0]}`,
      teardown: `Hardware Teardown: Dissecting the Internal Architecture of ${t.topic.split(':')[0]}`,
      failureMode: `Catastrophic Wear & Fatigue: How ${t.topic.split(':')[0]} Systems Fail Under Cyclic Load`
    };

    // 6-7 Modular Sections
    const sectionHeadings = [
      "The Mechanical Bottleneck & Failure Mechanism",
      "Kinematic Decomposition & First-Principles Physics",
      "Tolerance Stackup & Sub-Millimeter Fits",
      "Material Selection & Microstructural Tradeoffs",
      "Dynamometer Metrology & Teardown Verification",
      "Production Design Rules & DFM Constraints"
    ];

    const sections = sectionHeadings.map((heading, sIdx) => {
      let content = `### ${heading}\n\n`;
      if (sIdx === 0) {
        content += `In precision electro-mechanical assemblies, **${t.topic}** operates at the exact boundary of elastic deformation and structural fatigue. Contact stress concentrations induce localized thermal gradients and micro-fretting wear.\n\n$$${t.equation}$$\n\nWhere governing continuum variables define interfacial deflection under rated operating torque.`;
      } else if (sIdx === 1) {
        content += `Kinematic motion transfer relies on strictly constrained degrees of freedom. Any radial misalignment converts pure tangential torque into parasitic bending moments along the drive housing.\n\n<ParameterExplorer\n  title="${t.topic} Operating Dynamics"\n  equationTex="${t.equation}"\n  takeaway="${t.cardConfig.takeaway || 'Maintain strict alignment tolerances.'}"\n/>`;
      } else if (sIdx === 2) {
        content += `Manufacturing tolerances dictate whether high-volume production achieves zero-backlash engagement or catastrophic binding under thermal expansion.\n\n<ToleranceStackupBar\n  title="${t.topic} Tolerance Stackup"\n  minAllowableGap={${t.cardConfig.minAllowableGap || 0.02}}\n  maxAllowableGap={${t.cardConfig.maxAllowableGap || 0.08}}\n  unit="${t.cardConfig.unit || 'mm'}"\n  takeaway="${t.cardConfig.takeaway || 'Statistical RSS stackup guarantees high Cpk.'}"\n/>`;
      } else if (sIdx === 3) {
        content += `Material selection balances high surface hardness against core fracture toughness under shock loading.\n\n<TradeoffMatrix\n  title="Substrate Alloy Selection for ${t.topic.split(':')[0]}"\n  takeaway="${t.cardConfig.takeaway || 'Optimize yield strength against thermal conductivity.'}"\n/>`;
      } else if (sIdx === 4) {
        content += `Dynamometer testing and optical coordinate metrology reveal non-linear hysteresis curves when driving against rated torque payloads.\n\n{{ FIGURE_0 }}\n\nUnder stroboscopic high-speed imaging, micro-slip between adjacent mating surfaces occurs during initial engagement.`;
      } else {
        content += `### Critical Manufacturing Directives\n\n1. **Surface Roughness:** Maintain ground finish $R_a < 0.2\\,\\mu\\text{m}$ along primary contact paths.\n2. **Thermal Dissipation:** Enforce direct conduction grounding to the outer aluminum chassis.\n3. **Lubricant Viscosity:** Specify synthetic fluorosilicone grease rated for $-40^\\circ\\text{C}$ to $+130^\\circ\\text{C}$ operation.`;
      }

      return {
        id: `sec-${sIdx + 1}`,
        heading,
        type: "ai_fill",
        badge: "[AI Fill]",
        hidden: false,
        content
      };
    });

    const fullMdx = sections.map(s => s.content).join('\n\n---\n\n');

    const draft = {
      slug,
      title: titleAngles.mechanism,
      titleAngles,
      subtitle: `An exhaustive teardown and kinematic analysis of ${t.topic} under cyclic thermal and mechanical stresses.`,
      subject: t.subject,
      category: t.category,
      readTime: t.readTime,
      date: new Date().toISOString().split('T')[0],
      source: "Rolling Queue Harvester",
      sections,
      body_mdx: fullMdx,
      figures: [
        {
          id: "FIGURE_0",
          placeholder: "{{ FIGURE_0 }}",
          caption: `FIG 01 — ${t.topic.toUpperCase()}: Disassembled precision sub-assembly cutaway.`,
          source: "HARDWARE TEARDOWN ARCHIVE",
          selectedIndex: 0,
          images: generateImageCandidates(t.topic)
        }
      ]
    };

    fs.writeFileSync(targetPath, JSON.stringify(draft, null, 2), 'utf8');
    existingTopics.add(t.topic.toLowerCase().trim());
    added++;
  }

  const finalCount = fs.readdirSync(STAGING_DIR).filter(f => f.endsWith('.json')).length;
  console.log(`[Queue Manager] ✓ Staging queue updated! Total unreviewed drafts: ${finalCount} / ${TARGET_CAPACITY} floor.`);
}

populateQueueToFloor();
