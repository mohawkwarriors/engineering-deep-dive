---
id: "#004"
title: "The Secret Geometry of Foldable Screens"
subtitle: "Why multi-link teardrop hinges solve the impossible physics of bending glass without snapping it—and how floating support plates eliminate the crease."
subject: "Product Dives"
date: "Oct 17, 2026"
isoDate: "2026-10-17"
---

# The Secret Geometry of Foldable Screens

*Why multi-link teardrop hinges solve the impossible physics of bending glass without snapping it—and how floating support plates eliminate the crease.*


<div class="meta-line">
  <span>ISSUE #004</span><span>•</span><span class="archive-subject-tag sub-product-dives">PRODUCT DIVES</span><span>•</span><span id="read-time-badge">14 MIN READ</span>
</div>

<h1>The Secret Geometry of Foldable Screens</h1>
<p class="subtitle">
  Why multi-link teardrop hinges solve the impossible physics of bending glass without snapping it—and how floating support plates eliminate the crease.
</p>

<!-- FIG 01: REAL TEARDOWN PHOTOGRAPHY OF MOBILE HINGE ASSEMBLY -->
<figure class="product-figure">
  <div class="img-wrapper">
    <img referrerpolicy="no-referrer" src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Galaxy_Z_Flip_%26_Galaxy_Z_Fold.jpg/1280px-Galaxy_Z_Flip_%26_Galaxy_Z_Fold.jpg" alt="Modern foldable smartphones showing display crease and hinge spine architecture" />
  </div>
  <figcaption>
    <span><strong>FIG 01 — COMMERCIAL FOLDABLE SMARTPHONE ARCHITECTURE:</strong> Modern flexible OLED foldable smartphones in flexed and open states. The central challenge of these designs is managing the neutral-axis strain across the Ultra-Thin Glass (UTG) layer while preventing crease formation along the central hinge line.</span>
    <span class="source-tag">COMMONS HARDWARE ARCHIVE</span>
  </figcaption>
</figure>

<h2 id="section-neutral-axis-physics">1. The Neutral Axis Dilemma & Beam Bending Mechanics</h2>
<p>
  A foldable smartphone is an engineering paradox: it demands that brittle silicate glass, copper foil circuitry, and optically clear polymers withstand hundreds of thousands of sharp $180^\circ$ bends without shattering, delaminating, or forming a permanent plastic trench.
</p>
<p>
  When a multi-layer composite sheet is folded, its cross-section is divided by the <span class="tangent-term" data-tangent="neutral_axis">neutral axis</span>—the plane where longitudinal normal stress and axial strain equal zero. Across any cross-section of total thickness $t$ bent to a radius of curvature $\rho$, the peak longitudinal strain $\epsilon_{\text{max}}$ at the extreme outer and inner fibers is governed by Euler-Bernoulli beam kinematics:
</p>
<div class="math-block">
  $$\epsilon_{\text{max}} = \frac{y}{\rho} = \frac{t}{2\rho}$$
</div>
<p>
  Where $y = t/2$ represents the distance from the neutral axis to the outermost surface. In first-generation foldable devices, industrial designers utilized a traditional <strong>U-shaped hinge</strong>. To minimize the phone's closed thickness, the U-shaped fold forced the display stack into an aggressive bend radius of $\rho = 1.25\text{ mm}$ to $1.50\text{ mm}$.
</p>
<p>
  For an ultra-thin display laminate measuring $t = 0.42\text{ mm}$ (encompassing the PET protective liner, polarizer film, 30 &mu;m <span class="tangent-term" data-tangent="utg_fracture">Ultra-Thin Glass (UTG)</span>, OLED emitter matrix, and stainless steel backplate), evaluating the induced strain reveals the failure mode:
</p>
<div class="math-block">
  $$\epsilon_{\text{U-shape}} = \frac{0.42\text{ mm}}{2 \cdot (1.25\text{ mm})} = 0.168 \quad (16.8\%\text{ tensile / compressive strain})$$
</div>
<p>
  This magnitude of mechanical strain is catastrophic. While flexible polymers can elastically accommodate $3\%$ to $5\%$ strain, silicate glass possesses a theoretical elastic limit of only $7\%$ under pristine laboratory vacuum, and an effective production yield limit of under $2.2\%$ due to surface <span class="tangent-term" data-tangent="griffith_flaws">Griffith micro-flaws</span>—microscopic surface scratches and edge micro-cracks that concentrate tensile stress, causing brittle glass to fracture at a tiny fraction of its theoretical atomic strength. Subjecting UTG to $16.8\%$ strain guarantees rapid crack nucleation, delamination of the <span class="tangent-term" data-tangent="oca_viscoelasticity">Optically Clear Adhesive (OCA)</span>, and catastrophic fracture along the hinge centerline within 2,000 to 5,000 duty cycles.
</p>
<p>
  <strong>The Teardrop (Waterdrop) Kinematic Breakthrough:</strong><br>
  To solve this fundamental limitation without expanding the phone's closed thickness, hardware architects abandoned the concentric circle fold in favor of the <strong>Euler clothoid or teardrop geometry</strong>. Instead of squeezing the screen tightly along the seam, the teardrop hinge drops internal mechanical support plates inward, allowing the bent portion of the display to balloon into a bulbous internal cavity while the outer housing folds completely parallel ($0^\circ$ gap).
</p>
<p>
  By expanding the internal bend radius to $\rho \ge 3.40\text{ mm}$, the peak bending strain collapses by more than half:
</p>
<div class="math-block">
  $$\epsilon_{\text{teardrop}} = \frac{0.42\text{ mm}}{2 \cdot (3.40\text{ mm})} = 0.0617 \quad (6.17\%\text{ strain})$$
</div>
<p>
  Coupled with neutral-axis positioning layers (shifting the zero-strain line directly into the neutral plane of the brittle glass core), peak strain in the UTG drops below <strong>1.1%</strong>—well within its infinite fatigue endurance regime ($> 400{,}000$ cycles).
</p>

<div class="schematic-card" id="fig02-teardrop-geometry">
  <div class="schematic-header">
    <span class="schematic-title">FIG 02 — U-SHAPED FOLD VS. EULER CLOTHOID TEARDROP GEOMETRY</span>
    <span class="schematic-subtitle">COMPARATIVE BENDING RADIUS &amp; CHASSIS GAP KINEMATICS</span>
  </div>
  <div class="schematic-viewport">
    <svg viewBox="0 0 960 360" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="960" height="360" rx="8" class="svg-canvas-bg" />

      <!-- PANEL A: TRADITIONAL U-SHAPED FOLD (LEFT) -->
      <g transform="translate(40, 20)">
        <rect x="0" y="0" width="420" height="265" rx="6" class="svg-panel-bg" stroke="#DC2626" stroke-width="1.8"/>
        <text x="210" y="32" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" fill="#DC2626">A. TRADITIONAL U-SHAPED FOLD</text>
        
        <!-- Chassis Halves with Wedge Gap -->
        <rect x="45" y="65" width="125" height="38" rx="4" class="svg-panel-sub" stroke="#78716C" stroke-width="1.5"/>
        <rect x="45" y="142" width="125" height="38" rx="4" class="svg-panel-sub" stroke="#78716C" stroke-width="1.5"/>
        
        <!-- Hinge Pivot (Isolated behind chassis) -->
        <circle cx="195" cy="122" r="8" fill="#1C1917" stroke="#DC2626" stroke-width="2"/>
        <circle cx="195" cy="122" r="2.5" fill="#DC2626"/>

        <!-- Acute U-Shaped Display Curve -->
        <path d="M 55 103 L 140 103 C 185 103 185 142 140 142 L 55 142" stroke="#EF4444" stroke-width="4" fill="none"/>
        <circle cx="162" cy="122" r="14" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="2 2" fill="none"/>
        
        <!-- Wedge Gap Indicator (Left) -->
        <line x1="52" y1="103" x2="52" y2="142" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="2 2"/>
        <text x="32" y="126" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="10" fill="#DC2626" font-weight="600">2.2mm GAP</text>

        <!-- High Strain Badge (Isolated in Right Margin x=245..400) -->
        <g transform="translate(245, 74)">
          <rect x="0" y="0" width="160" height="82" rx="6" fill="#18181B" stroke="#DC2626" stroke-width="1.5"/>
          <text x="80" y="24" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11" fill="#F87171" font-weight="700">TIGHT BEND RADIUS</text>
          <text x="80" y="47" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11" fill="#F1F5F9">ρ = 1.25 mm (Sharp)</text>
          <text x="80" y="68" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10.5" fill="#EF4444" font-weight="700">Peak Strain: ε = 16.8%</text>
        </g>
        <line x1="245" y1="117" x2="180" y2="122" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="2 2"/>

        <!-- Lower Status Description -->
        <text x="210" y="220" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11" fill="#DC2626" font-weight="700">Tapered Gap: 2.2mm • Deep Crease Trench</text>
        <text x="210" y="242" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" class="svg-text-muted">Exceeds UTG critical Griffith crack limit</text>
      </g>

      <!-- PANEL B: EULER CLOTHOID TEARDROP FOLD (RIGHT) -->
      <g transform="translate(500, 20)">
        <rect x="0" y="0" width="420" height="265" rx="6" class="svg-panel-bg" stroke="#059669" stroke-width="1.8"/>
        <text x="210" y="32" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" fill="#059669">B. EULER CLOTHOID TEARDROP FOLD</text>

        <!-- Chassis Halves Parallel Flush (0.0mm Gap) -->
        <rect x="45" y="65" width="115" height="38" rx="4" class="svg-panel-sub" stroke="#78716C" stroke-width="1.5"/>
        <rect x="45" y="142" width="115" height="38" rx="4" class="svg-panel-sub" stroke="#78716C" stroke-width="1.5"/>
        <line x1="45" y1="122" x2="160" y2="122" stroke="#10B981" stroke-width="1" stroke-dasharray="3 3"/>
        <text x="32" y="126" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="10" fill="#059669" font-weight="600">0.0mm FLUSH</text>

        <!-- Bulbous Waterdrop Teardrop Loop -->
        <path d="M 55 103 L 125 103 C 150 103 160 70 190 70 C 225 70 235 175 190 175 C 160 175 150 142 125 142 L 55 142" stroke="#0284C7" stroke-width="4" fill="none"/>
        <circle cx="195" cy="122" r="32" stroke="#38BDF8" stroke-width="1.5" stroke-dasharray="3 3" fill="none"/>

        <!-- Low Strain Badge (Isolated in Right Margin x=245..400) -->
        <g transform="translate(245, 74)">
          <rect x="0" y="0" width="160" height="82" rx="6" fill="#18181B" stroke="#059669" stroke-width="1.5"/>
          <text x="80" y="24" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11" fill="#34D399" font-weight="700">BULBOUS TEARDROP</text>
          <text x="80" y="47" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11" fill="#F1F5F9">ρ = 3.45 mm (Gentle)</text>
          <text x="80" y="68" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10.5" fill="#10B981" font-weight="700">Safe Strain: ε &lt; 6.2%</text>
        </g>
        <line x1="245" y1="117" x2="227" y2="122" stroke="#059669" stroke-width="1.5" stroke-dasharray="2 2"/>

        <!-- Lower Status Description -->
        <text x="210" y="220" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11" fill="#059669" font-weight="700">True 0.0mm Closed Gap • Flat Display Line</text>
        <text x="210" y="242" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" class="svg-text-muted">Internal floating cavity eliminates outer pinch</text>
      </g>

      <!-- BOTTOM SUMMARY BANNER -->
      <g transform="translate(40, 302)">
        <rect x="0" y="0" width="880" height="44" rx="5" class="svg-panel-bg" stroke="var(--border)" stroke-width="1.2"/>
        <text x="440" y="27" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="12" class="svg-text-primary" font-weight="600">GEOMETRIC PRINCIPLE: Teardrop geometry nearly triples bend radius (3.45mm vs 1.25mm), cutting glass strain by 63%.</text>
      </g>
    </svg>
  </div>
  <div class="schematic-caption">
    <span><strong>FIG 02 — FOLD GEOMETRY COMPARISON:</strong> Side-by-side comparison of legacy U-shaped concentric bending versus the Euler clothoid teardrop fold, illustrating how the internal waterdrop loop relieves tensile strain on Ultra-Thin Glass while enabling flush closure.</span>
    <span class="source-tag">SCHEMATIC: KINEMATIC CAD</span>
  </div>
</div>


<!-- FIG 02: KINEMATIC WORKFLOW GRID -->
<div class="schematic-card" id="process-steps-diagram">
  <div class="schematic-header">
    <span class="schematic-title">FIG 03 — THE 4-STAGE TEARDROP KINEMATIC SEQUENCE</span>
    <span class="schematic-subtitle">PLANAR (180°) &rarr; BENDING &rarr; SLIDING &rarr; CLOSED (0°)</span>
  </div>
  <div class="process-grid">
    
    <div class="process-step-card">
      <div class="process-step-tag">STAGE 01: 180° FLAT</div>
      <div class="process-step-title">Planar Substrate Lockout</div>
      <p class="process-step-desc">
        Floating support wings are locked flush with the chassis by secondary cam detents, forming a rigid 0.10 mm substrate beneath the UTG that resists stylus and finger indentation.
      </p>
    </div>

    <div class="process-step-card">
      <div class="process-step-tag">STAGE 02: 120° UNLATCH</div>
      <div class="process-step-title">Floating Plate Descent</div>
      <p class="process-step-desc">
        As rotation begins, dual synchronization gears drive guide pins along an angled track, dropping the center support plates vertically by 1.35 mm into the housing spine.
      </p>
    </div>

    <div class="process-step-card">
      <div class="process-step-tag">STAGE 03: 60° BENDING</div>
      <div class="process-step-title">Teardrop Cavity Expansion</div>
      <p class="process-step-desc">
        With support plates recessed, the screen enters free-loop deflection. The lateral sliders begin stroking outward along precision curved tracks to absorb display arc-length differential.
      </p>
    </div>

    <div class="process-step-card">
      <div class="process-step-tag">STAGE 04: 0° CLOSED</div>
      <div class="process-step-title">Zero-Gap Waterdrop Lock</div>
      <p class="process-step-desc">
        The housing halves meet parallel with zero gap. The screen loops into a bulbous 3.4 mm waterdrop with &lt;1.1% glass strain, while sliders hold &Delta;L = 1.42 mm tension balance.
      </p>
    </div>

  </div>
  <div class="schematic-caption">
    <span><strong>FIG 03 — KINEMATIC SEQUENCE:</strong> The four-phase transition of a teardrop hinge mechanism, demonstrating the synchronized vertical descent of central support wings and the lateral translation of perimeter sliders.</span>
    <span class="source-tag">FLOWCHART 01</span>
  </div>
</div>

<h2 id="section-path-length-differential">2. Path-Length Mechanics: Absorbing the Arc-Length Differential (&Delta;L)</h2>
<p>
  While the teardrop loop eliminates excessive tensile strain, it creates an aggressive kinematic constraint: <strong>Path-Length Mismatch ($\Delta L$)</strong>.
</p>
<p>
  When a smartphone unfolds from $0^\circ$ to $180^\circ$, the screen is a flat plane spanning width $W_0$. However, when folded into a teardrop shape inside a closed chassis, the curved profile traces an elastica curve composed of a central circular arc of radius $\rho$ flanked by two inflection fillets of radius $r_i$. The total contour length $S$ of the curved display path is given by:
</p>
<div class="math-block">
  $$S = \int_0^{\theta_{\text{max}}} \rho(\theta) \, d\theta + 2 \int_0^{\phi} r_i(\phi) \, d\phi$$
</div>
<p>
  Because the chassis frame is rigid and fixed to the hinge rotation pins, the distance along the outer perimeter differs from the inner neutral axis by a geometric stroke:
</p>
<div class="math-block">
  $$\Delta L = S_{\text{curved}} - L_{\text{flat}} \approx 1.25\text{ mm} - 1.65\text{ mm}$$
</div>
<p>
  If the display were anchored firmly to both sides of the chassis without compliance, this $\Delta L$ differential would induce violent mechanical stress:
</p>
<ul>
  <li><strong>During Folding (Tensile Delamination):</strong> The screen stack would be pulled taut over the hinge spine like a guitar string, creating normal peel stresses exceeding the $0.8\text{ MPa}$ adhesive shear bond of the OCA and ripping the display away from its digitizer.</li>
  <li><strong>During Unfolding (Compressive Buckling):</strong> Excess material would be shoved into the seam under compressive thrust, causing the UTG to buckle upward, generating the permanent high-amplitude "crease trench" that plagues inferior foldables.</li>
</ul>
<p>
  <strong>The Multi-Link Synchronized Slider Solution:</strong><br>
  Modern teardrop hinges solve this by mounting the display support plates onto <strong>lateral sliding carriages</strong>. These carriages ride on precision curved tracks machined directly into the outer wing frames. As the hinge closes, a multi-link scissor mechanism pulls the left and right display wings outward by exactly $\Delta L / 2 \approx 0.71\text{ mm}$ each, absorbing the length change with zero net tension.
</p>

<!-- FIG 03: HIGH-RESOLUTION SVG SCHEMATIC OF TEARDROP HINGE CAD -->
<div class="schematic-card" id="fig03-teardrop-cad">
  <div class="schematic-header">
    <span class="schematic-title">FIG 04 — MULTI-LINK TEARDROP HINGE KINEMATIC CROSS-SECTION</span>
    <span class="schematic-subtitle">DUAL SLIDER STROKE: ΔL = 1.42 mm • CAM PRELOAD: 45 N • ZERO-GAP PROFILE</span>
  </div>
  <div class="schematic-viewport">
    <svg viewBox="0 0 960 380" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="960" height="380" rx="8" class="svg-canvas-bg" />

      <!-- TOP METRIC CARDS (Y: 20 - 56) -->
      <g>
        <rect x="40" y="20" width="260" height="36" rx="5" class="svg-panel-bg" stroke="#38BDF8" stroke-width="1.5"/>
        <text x="170" y="43" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="12" fill="#38BDF8" font-weight="700">TEARDROP RADIUS: ρ = 3.45 mm</text>

        <rect x="350" y="20" width="260" height="36" rx="5" class="svg-panel-bg" stroke="#F59E0B" stroke-width="1.5"/>
        <text x="480" y="43" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="12" fill="#F59E0B" font-weight="700">SLIDER STROKE: ΔL = 1.42 mm</text>

        <rect x="660" y="20" width="260" height="36" rx="5" class="svg-panel-bg" stroke="#10B981" stroke-width="1.5"/>
        <text x="790" y="43" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="12" fill="#10B981" font-weight="700">UTG STRAIN: ε &lt; 1.1% (SAFE)</text>
      </g>

      <!-- MAIN MECHANICAL CROSS-SECTION (Center X: 480, Y: 85 - 280) -->
      <g id="hinge-cad-geometry">
        <!-- Outer Chassis Wings (Left & Right Aluminum 7075 frames) -->
        <rect x="80" y="120" width="240" height="85" rx="6" class="svg-panel-bg" stroke="#64748B" stroke-width="2"/>
        <rect x="640" y="120" width="240" height="85" rx="6" class="svg-panel-bg" stroke="#64748B" stroke-width="2"/>

        <!-- Central Hinge Spine Housing (SUS630 / 17-4 PH MIM) -->
        <path d="M 360 140 L 600 140 L 580 260 L 380 260 Z" class="svg-panel-sub" stroke="#D97706" stroke-width="2"/>
        <text x="480" y="245" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11" fill="#D97706" font-weight="700">MIM CENTRAL SPINE (17-4 PH)</text>

        <!-- Teardrop Display Curve (Folded Profile) -->
        <path d="M 120 110 L 360 110 C 430 110 440 180 480 180 C 520 180 530 110 600 110 L 840 110" stroke="#0284C7" stroke-width="4.5" fill="none"/>
        <path d="M 120 114 L 360 114 C 430 114 440 184 480 184 C 520 184 530 114 600 114 L 840 114" stroke="#38BDF8" stroke-width="1.5" stroke-dasharray="3 3" fill="none"/>

        <!-- Sliding Carriages (Left and Right) -->
        <rect x="220" y="130" width="130" height="40" rx="4" fill="#1E293B" stroke="#38BDF8" stroke-width="1.8"/>
        <rect x="610" y="130" width="130" height="40" rx="4" fill="#1E293B" stroke="#38BDF8" stroke-width="1.8"/>

        <!-- Slider Translation Arrows -->
        <g stroke="#38BDF8" stroke-width="2">
          <line x1="250" y1="150" x2="310" y2="150"/>
          <polygon points="245,150 255,145 255,155" fill="#38BDF8"/>
          <polygon points="315,150 305,145 305,155" fill="#38BDF8"/>
          
          <line x1="640" y1="150" x2="700" y2="150"/>
          <polygon points="635,150 645,145 645,155" fill="#38BDF8"/>
          <polygon points="705,150 695,145 695,155" fill="#38BDF8"/>
        </g>

        <!-- Synchronizing Spur Gear Mesh (Center) -->
        <circle cx="455" cy="185" r="18" fill="#1C1917" stroke="#F59E0B" stroke-width="2"/>
        <circle cx="505" cy="185" r="18" fill="#1C1917" stroke="#F59E0B" stroke-width="2"/>
        <circle cx="455" cy="185" r="4" fill="#F59E0B"/>
        <circle cx="505" cy="185" r="4" fill="#F59E0B"/>

        <!-- Floating Support Plate Drop Mechanism -->
        <rect x="375" y="115" width="95" height="12" rx="2" fill="#047857" stroke="#10B981" stroke-width="1.5"/>
        <rect x="490" y="115" width="95" height="12" rx="2" fill="#047857" stroke="#10B981" stroke-width="1.5"/>
        <line x1="422" y1="127" x2="422" y2="155" stroke="#10B981" stroke-width="2" stroke-dasharray="2 2"/>
        <line x1="538" y1="127" x2="538" y2="155" stroke="#10B981" stroke-width="2" stroke-dasharray="2 2"/>
        <polygon points="422,160 417,152 427,152" fill="#10B981"/>
        <polygon points="538,160 533,152 543,152" fill="#10B981"/>

        <!-- High-Contrast Badge Callouts -->
        <g transform="translate(100, 220)">
          <rect x="0" y="0" width="180" height="42" rx="4" fill="#1C1917" stroke="#38BDF8" stroke-width="1.5"/>
          <text x="90" y="18" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11" fill="#38BDF8" font-weight="700">LATERAL SLIDER</text>
          <text x="90" y="33" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" fill="#94A3B8">Absorbs ΔL = 1.42mm</text>
        </g>

        <g transform="translate(680, 220)">
          <rect x="0" y="0" width="180" height="42" rx="4" fill="#1C1917" stroke="#10B981" stroke-width="1.5"/>
          <text x="90" y="18" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11" fill="#10B981" font-weight="700">FLOATING WINGS</text>
          <text x="90" y="33" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" fill="#94A3B8">Recess 1.35mm vertically</text>
        </g>
      </g>

      <!-- BOTTOM KINEMATIC FOOTER -->
      <g transform="translate(40, 310)">
        <rect x="0" y="0" width="880" height="50" rx="6" class="svg-panel-bg" stroke="var(--border)" stroke-width="1.5"/>
        <text x="20" y="22" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" fill="#38BDF8">KINEMATIC PATH EQUILIBRIUM:</text>
        <text x="20" y="38" font-family="'JetBrains Mono', monospace" font-size="12" class="svg-text-primary">Dual-axis gear synchronization guarantees symmetric 0°–180° rotation with zero screen tension.</text>
      </g>
    </svg>
  </div>
  <div class="schematic-caption">
    <span><strong>FIG 04 — CAD SCHEMATIC:</strong> Transverse kinematic section view of the multi-link teardrop hinge mechanism, highlighting the synchronized spur gears, lateral slider translation, and the vertical drop path of the internal support wings.</span>
    <span class="source-tag">SCHEMATIC: CAD ARCHIVE</span>
  </div>
</div>

<h2 id="section-torque-engine-cams">3. The Torque Engine: Helical Cams & "Flex Mode" Detents</h2>
<p>
  A folding phone must not merely open and close; it must deliver a luxurious, tuned tactile resistance across its entire sweep. Users demand a decisive "snap" into the $180^\circ$ flat state, an effortless glide during closure, and the ability to hold any arbitrary angle between $45^\circ$ and $120^\circ$ (often marketed as "Flex Mode" or "Hover Stance") for hands-free video recording.
</p>
<p>
  This tactile curve is generated by the <strong>Torque Engine</strong>—an assembly of multi-lobed helical cams preloaded by miniature Belleville disc spring washers or high-tensile music-wire coil springs.
</p>
<p>
  <strong>Cam Kinematics & Torque Derivation:</strong><br>
  As the user rotates the hinge through angle $\theta$, the follower rides along the inclined helical surface of the drive cam. The profile of the cam determines the axial displacement $z(\theta)$ of the springs. The instantaneous torque $T(\theta)$ opposing or assisting user motion is derived from the balance of spring force and friction:
</p>
<div class="math-block">$T_{\text{hold}} \approx \mu \cdot R_{\text{cam}} \cdot F_{\text{spring}}$</div>
<p>
  Where:
</p>
<ul>
  <li>$R_{\text{cam}}$ is the mean pitch radius of the cam face ($2.10\text{ mm}$ to $2.85\text{ mm}$).</li>
  <li>$F_{\text{spring}}(z) = k \cdot (z_0 + z(\theta))$ is the normal spring force, where initial preload $F_0 = k \cdot z_0 \approx 38\text{ N}$ to $48\text{ N}$.</li>
  <li>$\alpha = \arctan\left(\frac{1}{R_{\text{cam}}} \cdot \frac{dz}{d\theta}\right)$ is the instantaneous cam helix angle.</li>
  <li>$\mu$ is the dynamic coefficient of friction across the lubricated metal interface (typically $\mu \approx 0.08 - 0.12$).</li>
</ul>
<p>
  <strong>Achieving the "Free-Stop" Hover Regime:</strong><br>
  To achieve stable hovering without motorized locking pins, the mechanism relies on the <strong>Coulomb friction locking condition</strong>. In the intermediate angle window ($45^\circ \le \theta \le 120^\circ$), the cam slope is designed to be flat ($\frac{dz}{d\theta} = 0$, so $\alpha = 0$). The holding friction torque becomes:
</p>
<div class="math-block">
  $$T_{\text{hold}} = \mu \cdot R_{\text{cam}} \cdot F_{\text{spring}}$$
</div>
<p>
  If the gravitational moment induced by the upper display half ($M_g = m \cdot g \cdot d_{\text{cg}} \cdot \sin\theta \approx 0.045\text{ Nm}$) is less than $T_{\text{hold}}$ ($0.065\text{ Nm}$), the phone remains locked at any arbitrary angle without sagging. As the phone approaches $180^\circ$, the follower enters a steep negative detent groove ($alpha < 0$), releasing stored spring energy to snap the chassis into a dead-flat plane with satisfying tactile feedback.
</p>

<h2 id="section-manufacturing-mim-tolerances">4. Manufacturing, Tooling & MIM Clearances</h2>
<p>
  A modern teardrop hinge is composed of <strong>45 to 85 precision components</strong> packaged into a spine cavity less than $3.8\text{ mm}$ deep. Tolerances that would be considered exceptional in watchmaking are strictly required here to prevent tactile "slop" or mechanical binding.
</p>
<p>
  <strong>Tolerance Stack-Up & The 10-Micron Gate:</strong><br>
  Because motion transmits through a kinetic chain of gears, pins, link plates, and cam followers, individual clearance errors accumulate rapidly. A tolerance stack-up analysis across 8 mating interfaces demonstrates that a dimensional variance of just $\pm 0.025\text{ mm}$ ($25\,\mu\text{m}$) per part generates over <strong>0.35 mm of tip play</strong> at the phone's outer display bezel—causing the phone to feel loose, rattling, or misaligned.
</p>
<p>
  To maintain a premium rigidity standard, primary hinge pins are centerless ground to $\pm 0.004\text{ mm}$ ($4\,\mu\text{m}$), while interlocking link carriages are produced via <span class="tangent-term" data-tangent="mim_feedstock">Metal Injection Molding (MIM)</span> followed by secondary CNC diamond profiling of contact lands.
</p>

<div class="spec-table-wrap">
  <table class="spec-table">
    <thead>
      <tr>
        <th>Engineering Metric</th>
        <th>Legacy U-Shape Hinge</th>
        <th>Gen-1 Teardrop (Gear-Based)</th>
        <th>Gen-2 Teardrop (Multi-Link)</th>
        <th>Liquidmetal Monolithic Hinge</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Minimum Bend Radius ($ho$)</strong></td>
        <td>1.35 mm</td>
        <td>2.80 mm</td>
        <td><strong>3.45 mm</strong></td>
        <td>3.60 mm</td>
      </tr>
      <tr>
        <td><strong>Display Crease Depth</strong></td>
        <td>110 &mu;m – 140 &mu;m (Deep)</td>
        <td>55 &mu;m – 70 &mu;m (Visible)</td>
        <td><strong>&lt; 32 &mu;m (Barely perceptible)</strong></td>
        <td>&lt; 25 &mu;m (Ultra-flat)</td>
      </tr>
      <tr>
        <td><strong>Component Part Count</strong></td>
        <td>18 – 24 parts</td>
        <td>68 – 84 parts</td>
        <td><strong>42 – 52 parts</strong></td>
        <td>28 – 35 parts</td>
      </tr>
      <tr>
        <td><strong>Closed Chassis Gap</strong></td>
        <td>1.8 mm – 2.4 mm (Tapered)</td>
        <td>0.2 mm – 0.4 mm</td>
        <td><strong>0.00 mm (True zero gap)</strong></td>
        <td>0.00 mm (True zero gap)</td>
      </tr>
      <tr>
        <td><strong>Yield Strength of Spine Material</strong></td>
        <td>850 MPa (316L)</td>
        <td>1,150 MPa (SUS630 H900)</td>
        <td><strong>1,380 MPa (17-4 PH Treated)</strong></td>
        <td>1,850 MPa (Zr-based BMG)</td>
      </tr>
      <tr>
        <td><strong>Rated Folding Cycle Life</strong></td>
        <td>100,000 cycles</td>
        <td>200,000 cycles</td>
        <td><strong>400,000 cycles</strong></td>
        <td>600,000+ cycles</td>
      </tr>
    </tbody>
  </table>
</div>

<p>
  <strong>Tooling Steel Selection for MIM:</strong><br>
  Injecting abrasive, metal-powder-loaded feedstock at $180^\circ\text{C}$ and $110\text{ MPa}$ causes severe abrasive tool wear. Mold cavities are machined from premium powder-metallurgy super-steels (specifically <span class="tangent-term" data-tangent="pm_tool_steels">Böhler M390 Microclean or Uddeholm Elmax</span>—wear-resistant alloys formed by atomizing liquid steel into microscopic powder to prevent brittle carbide clumps). Vacuum hardened to <strong>58–60 HRC</strong> and coated with Titanium Aluminum Nitride (TiAlN), these tooling inserts resist abrasive erosion across 500,000 injection shots without losing micron-level tolerances.
</p>

<h2 id="section-metallurgy-tribology">5. Metallurgy, Hertzian Cam Stress & Tribology</h2>
<p>
  The material selection for hinge components is governed by two conflicting requirements: <strong>extreme yield strength under compact packaging</strong> and <strong>tribological immunity to adhesive wear</strong>.
</p>
<p>
  <strong>SUS630 / 17-4 PH Precipitation-Hardening Stainless Steel:</strong><br>
  The structural core of the hinge—including the spine chassis, synchronization gears, and slider links—is molded from 17-4 PH stainless steel. After solvent debinding and hydrogen sintering, components undergo an <strong>H900 age-hardening heat treatment</strong> ($482^\circ\text{C}$ for 1 hour followed by air cooling).
</p>
<p>
  This precipitates sub-microscopic copper-rich clusters throughout the martensitic matrix, driving ultimate tensile strength past <strong>1,310 MPa</strong> with a Rockwell hardness of <strong>43–45 HRC</strong>. This extreme strength prevents synchronization gear teeth from bending or shearing when the user forcefully closes the phone on an obstacle.
</p>
<p>
  <strong>Managing Hertzian Cam Contact Stress:</strong><br>
  The contact patch between the cam follower pin and the torque cam experiences severe <span class="tangent-term" data-tangent="hertzian_stress">Hertzian contact pressure</span>:
</p>
<div class="math-block">
  $$P_{\text{max}} = \sqrt{\frac{F_N \cdot E^*}{\pi \cdot R_{\text{eff}} \cdot L}}$$
</div>
<p>
  With a $45\text{ N}$ spring force concentrated onto an effective curvature radius of $R_{\text{eff}} = 1.1\text{ mm}$ across a contact line length of $L = 1.8\text{ mm}$, peak pressure surges to $P_{\text{max}} \approx 1{,}180\text{ MPa}$. Under cyclic sliding friction, raw stainless steel would suffer immediate adhesive micro-welding, surface galling, and metal transfer.
</p>
<p>
  <strong>The Dry-Film Tribology Architecture:</strong><br>
  Traditional liquid greases cannot be used inside phone hinges. Over time, liquid oils migrate outward via capillary action, dissolving display adhesives and collecting abrasive environmental pocket lint. Instead, manufacturers utilize bonded <strong>solid dry-film lubricants</strong>:
</p>
<ul>
  <li><strong>Diamond-Like Carbon (DLC):</strong> Cams are coated with a 2.5 &mu;m thick layer of hydrogenated amorphous carbon (a-C:H), yielding a surface hardness $> 2{,}400\text{ HV}$ and a coefficient of friction $\mu \le 0.08$.</li>
  <li><strong>PTFE / MoS2 Impregnation:</strong> Sliding links are treated with microscopic fluoropolymer micro-coatings that self-burnish during the first 1,000 cycles, maintaining smooth, grit-free glide without attracting debris.</li>
  <li><strong>Micro-Fiber Bristle Sweepers:</strong> Tiny nylon sweepers ($0.04\text{ mm}$ bristle diameter) are sealed at the hinge-to-bezel gaps, mechanically clearing dust and sand grains every time the phone folds.</li>
</ul>

<h2 id="section-empirical-metrology">6. Empirical Torture Metrology & Crease Interferometry</h2>
<p>
  Validating a next-generation teardrop hinge requires rigorous bench torture testing that compresses ten years of human abuse into four weeks of continuous automated cycling.
</p>
<p>
  <strong>High-Speed Automated Cycling:</strong> Robotic pneumatically actuated test rigs cycle the hinge at $0.5\text{ Hz}$ (one complete open-and-close every two seconds) for <strong>400,000 cycles</strong>—the equivalent of 100 folds per day for over 10 years. Continuous load-cell telemetry monitors torque degradation: if friction torque drifts by more than $\pm 15\%$, the test flags lubrication breakdown or galling.
</p>
<p>
  <strong>Environmental Chambers (-20°C to +65°C):</strong> Because the aluminum chassis ($\alpha_{\text{Al}} \approx 23 \times 10^{-6}\text{ K}^{-1}$) and steel hinge ($\alpha_{\text{steel}} \approx 11 \times 10^{-6}\text{ K}^{-1}$) have vastly different thermal expansion coefficients, temperature extremes shrink operating clearances. At $-20^\circ\text{C}$, the differential thermal contraction:
</p>

<p>
  Shrinks the lateral slider clearance by up to $14\,\mu\text{m}$. If the initial manufacturing tolerance is not precisely compensated, the sliders will bind solid in freezing climates.
</p>
<p>
  <strong>White-Light Optical Profilometry (Crease Metrology):</strong><br>
  To quantify display crease severity, engineers scan the unfolded screen with a non-contact white-light interferometric optical profiler. The profilometer maps the micro-topography across a $40 \times 40\text{ mm}$ grid, measuring two decisive metrics:
</p>
<ul>
  <li><strong>Peak-to-Valley Trench Depth ($D_v$):</strong> Benchmark teardrop designs achieve $D_v < 32\,\mu\text{m}$ (versus $> 120\,\mu\text{m}$ on first-gen U-shape folds).</li>
  <li><strong>Maximum Slope Angle ($\theta_{\text{crease}}$):</strong> The human fingertip cannot detect height steps below $40\,\mu\text{m}$ if the transition slope is gradual. By spreading the deformation over a wide $12\text{ mm}$ span, the slope remains below $1.2^\circ$—rendering the crease visually invisible and tactilely undetectable during swipe gestures.</li>
</ul>

<div class="telemetry-bar">
  <div class="telemetry-info">
    <span class="telemetry-title">Background Quality Telemetry</span>
    <span class="telemetry-desc">Rate this topic to train the automated curation model for future dispatches.</span>
  </div>
  <div class="telemetry-actions">
    <button class="score-btn" id="telemetry-up" onclick="recordTelemetry('up')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
      Good Topic
    </button>
    <button class="score-btn" id="telemetry-down" onclick="recordTelemetry('down')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg>
      Poor Topic
    </button>
  </div>
</div>

