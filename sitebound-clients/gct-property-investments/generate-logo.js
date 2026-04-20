/**
 * generate-logo.js
 * Recreates the GCT Property Investments logo as a transparent PNG
 * using SVG rendered via sharp — no source image required.
 * Run with: node generate-logo.js
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const OUT_TRANSPARENT = path.join(__dirname, 'images', 'gct-logo-transparent.png');
const OUT_SOURCE      = path.join(__dirname, 'images', 'gct-logo.png');

// ─── SVG Logo ───────────────────────────────────────────────
// Viewbox: 600 × 580 — matches original proportions
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 540" width="600" height="540">

  <!--
    GCT Property Investments Ltd — Logo Recreation
    Colours:
      White  #ffffff  — houses, GCT text, subtitle
      Teal   #4ecdc4  — centre window, separator line
      Navy   #1a2744  — window pane fills
  -->

  <!-- ═══ THREE HOUSES ═══════════════════════════════════ -->

  <!-- Left house — roof -->
  <polygon points="212,72 298,152 126,152" fill="white"/>
  <!-- Left house — body -->
  <rect x="126" y="152" width="172" height="96" fill="white"/>
  <!-- Left house — windows (2 dark squares) -->
  <rect x="152" y="183" width="24" height="24" fill="#1a2744"/>
  <rect x="186" y="183" width="24" height="24" fill="#1a2744"/>

  <!-- Centre house — roof (tallest) -->
  <polygon points="300,14 408,144 192,144" fill="white"/>
  <!-- Centre house — body -->
  <rect x="192" y="144" width="216" height="104" fill="white"/>

  <!-- Teal 4-pane window in centre house roof -->
  <!-- Top-left pane -->
  <rect x="264" y="64"  width="28" height="28" fill="#4ecdc4" rx="1"/>
  <!-- Top-right pane -->
  <rect x="298" y="64"  width="28" height="28" fill="#4ecdc4" rx="1"/>
  <!-- Bottom-left pane -->
  <rect x="264" y="98"  width="28" height="28" fill="#4ecdc4" rx="1"/>
  <!-- Bottom-right pane -->
  <rect x="298" y="98"  width="28" height="28" fill="#4ecdc4" rx="1"/>

  <!-- Right house — roof (mirror of left) -->
  <polygon points="388,72 474,152 302,152" fill="white"/>
  <!-- Right house — body -->
  <rect x="302" y="152" width="172" height="96" fill="white"/>
  <!-- Right house — windows (2 dark squares) -->
  <rect x="338" y="183" width="24" height="24" fill="#1a2744"/>
  <rect x="372" y="183" width="24" height="24" fill="#1a2744"/>

  <!-- ═══ CONNECTING SWOOSH ════════════════════════════════ -->
  <!-- Subtle arc below the three houses, spanning full house width -->
  <path d="M110,250 Q300,270 490,250"
        stroke="white" stroke-width="3.5" fill="none"
        stroke-linecap="round"/>

  <!-- ═══ GCT TEXT ═════════════════════════════════════════ -->
  <text x="300" y="385"
    font-family="'Arial Black', 'Arial Bold', Arial, sans-serif"
    font-size="168"
    font-weight="900"
    text-anchor="middle"
    fill="white">GCT</text>

  <!-- ═══ TEAL SEPARATOR ══════════════════════════════════ -->
  <rect x="120" y="400" width="360" height="3.5" fill="#4ecdc4" rx="1.75"/>

  <!-- ═══ SUBTITLE ════════════════════════════════════════ -->
  <text x="300" y="440"
    font-family="Arial, sans-serif"
    font-size="23"
    font-weight="400"
    letter-spacing="4"
    text-anchor="middle"
    fill="white">PROPERTY INVESTMENTS LTD</text>

</svg>`;

// ─── Generate ─────────────────────────────────────────────
async function generate() {
  const imagesDir = path.join(__dirname, 'images');
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  const svgBuffer = Buffer.from(svg);

  // Transparent PNG — used everywhere on the site
  await sharp(svgBuffer)
    .png()
    .toFile(OUT_TRANSPARENT);

  // Also write as gct-logo.png so remove-bg.js has a source if needed later
  await sharp(svgBuffer)
    .png()
    .toFile(OUT_SOURCE);

  console.log('✓ gct-logo-transparent.png');
  console.log('✓ gct-logo.png');
  console.log('\nLogo generated successfully in /images/');
}

generate().catch(err => {
  console.error('Generation failed:', err.message);
  process.exit(1);
});
