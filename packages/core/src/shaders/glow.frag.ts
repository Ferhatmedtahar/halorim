export const GLOW_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_sdf;
uniform vec2 u_resolution;        // Viewport width, height
uniform vec2 u_shapePos;          // Shape center [0..1]
uniform float u_shapeScale;       // Normalized shape scale
uniform float u_shapeRotation;    // Radians
uniform int u_shapeType;          // 0 = EDT texture, 1 = analytic triangle, 2 = analytic circle, 3 = analytic hexagon
uniform float u_maxDistance;      // (legacy) unused: the SDF texture is R16F in grid units
uniform int u_colorFlow;          // 0 = radial (angle around center), 1 = surface (position on outline)
uniform float u_edgeWidth;        // Rim core width
uniform float u_edgeFalloff;      // Glow exponential falloff
uniform float u_edgeIntensity;    // Glow intensity multiplier
uniform float u_edgeDispersion;   // Prism dispersion offset
uniform vec3 u_fillColor;         // Linear RGB interior color
uniform vec3 u_bgColor;           // Linear RGB background color
uniform vec4 u_palette[8];        // Linear RGB color stops
uniform int u_paletteCount;       // Number of color stops (max 8)
uniform float u_time;             // Time in seconds
uniform float u_rotationSpeed;    // Mode rotation speed
uniform vec2 u_cursorPos;         // Normalized cursor position [0..1]
uniform float u_cursorSharpness;  // Specular light focus
uniform float u_hazeIntensity;    // Background haze intensity
uniform float u_hasCursor;        // 1.0 if cursor active, 0.0 otherwise
uniform float u_hoverTransition;  // Smooth hover weight [0..1]
uniform float u_lightAngle;       // Perimeter light angle [radians]
uniform float u_pulseFactor;      // Base mode: pulse multiplier (1.0 default)
uniform float u_hueShift;         // Base mode: spectrum-cycle hue offset (0.0 default)
uniform float u_flickerFactor;    // Base mode: neon flicker multiplier (1.0 default)
uniform vec4 u_sweep;             // Base mode: sweep [angle, width, intensity, active]
uniform vec4 u_ripple;            // Click effect: ripple [originU, originV, radius, intensity]
uniform float u_burstFactor;      // Click effect: burst flash multiplier (0.0 default)
uniform sampler2D u_contentTexture; // Center content RGBA texture
uniform float u_hasContent;       // 1.0 if center content active, 0.0 otherwise
uniform float u_contentScale;     // Relative scale of center content
uniform float u_contentOpacity;   // Center content alpha opacity
uniform vec4 u_contentTint;       // Optional tint overlay [r, g, b, active]
vec3 samplePalette(float t) {
  if (u_paletteCount <= 1) return u_palette[0].rgb;
  float scaled = fract(t) * float(u_paletteCount);
  int i0 = int(floor(scaled)) % u_paletteCount;
  int i1 = (i0 + 1) % u_paletteCount;
  float fracVal = fract(scaled);
  return mix(u_palette[i0].rgb, u_palette[i1].rgb, fracVal);
}

// Distance from point p to segment [a, b]
float sdfSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

// Analytic signed distance to 2D triangle (Vercel geometry.wgsl / Inigo Quilez)
float sdfTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
  float d = min(min(sdfSegment(p, a, b), sdfSegment(p, b, c)), sdfSegment(p, c, a));
  vec2 e0 = b - a;
  vec2 e1 = c - b;
  vec2 e2 = a - c;
  float side0 = e0.x * (p.y - a.y) - e0.y * (p.x - a.x);
  float side1 = e1.x * (p.y - b.y) - e1.y * (p.x - b.x);
  float side2 = e2.x * (p.y - c.y) - e2.y * (p.x - c.x);
  bool inside = (side0 <= 0.0 && side1 <= 0.0 && side2 <= 0.0) ||
                (side0 >= 0.0 && side1 >= 0.0 && side2 >= 0.0);
  return inside ? -d : d;
}

// Analytic regular hexagon
float sdHexagon(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}

// Maps a screen UV (0..1) into aspect-corrected, rotated, scaled shape space (grid units).
vec2 toLocal(vec2 uv, float aspect, float safeScale) {
  vec2 df = uv - u_shapePos;
  df.x *= aspect;
  float cr = cos(-u_shapeRotation);
  float sr = sin(-u_shapeRotation);
  vec2 rot = vec2(df.x * cr - df.y * sr, df.x * sr + df.y * cr);
  return rot / safeScale;
}

// Cursor light: the outline brightens only where it faces the cursor, strongest on the part closest
// to it. Edges facing away stay dark, so the light clearly follows the pointer around the shape.
float cursorBeamAt(vec2 bp, vec2 nrm, vec2 cLocal) {
  vec2 toC = cLocal - bp;
  float dc = length(toC);
  // Softened direction: fades out smoothly (instead of flipping) when the cursor touches the outline.
  vec2 dirC = toC / sqrt(dc * dc + 0.0036);
  // Soft, wide lobe: the lit side fades out gradually around curves instead of stopping at a line.
  float cosA = dot(nrm, dirC);
  float facing = pow(smoothstep(-0.25, 1.0, cosA), max(u_cursorSharpness, 1.0) * 0.8);
  return facing * (0.30 + 0.70 * exp(-dc * 1.8));
}

float dLocalForGap(float d, float safeScale) { return d / safeScale; }

void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);

  // Aspect-corrected offset from shape center
  vec2 diff = v_uv - u_shapePos;
  diff.x *= aspect;

  // Inverse rotation into shape coordinate space
  float cosR = cos(-u_shapeRotation);
  float sinR = sin(-u_shapeRotation);
  vec2 rotated = vec2(
    diff.x * cosR - diff.y * sinR,
    diff.x * sinR + diff.y * cosR
  );

  float safeScale = max(u_shapeScale, 0.001);
  vec2 p = rotated / safeScale;
  vec2 shapeUv = p + vec2(0.5);

  float d = 0.0;
  vec2 shapeNormal = vec2(0.0, 1.0);
  vec2 smoothNormal = vec2(0.0, 1.0);
  bool haveSmooth = false;
  float dEnvLocal = 0.0; // distance to the OUTER envelope (grid units); drives the soft glow
  bool haveEnv = false;

  if (u_shapeType == 1) {
    // Analytic equilateral triangle matching canonical preset geometry (size 0.7)
    // h = 0.7 * sqrt(3)/2 = 0.60621778; topY = -2/3*h = -0.40414519; botY = 1/3*h = 0.20207259
    const vec2 p0 = vec2(0.0, -0.40414518843);
    const vec2 p1 = vec2(0.35, 0.20207259422);
    const vec2 p2 = vec2(-0.35, 0.20207259422);
    float localD = sdfTriangle(p, p0, p1, p2);
    d = localD * safeScale;

    // True analytic normal via central differences
    const float eps = 0.0005;
    float ndx = sdfTriangle(p + vec2(eps, 0.0), p0, p1, p2) - sdfTriangle(p - vec2(eps, 0.0), p0, p1, p2);
    float ndy = sdfTriangle(p + vec2(0.0, eps), p0, p1, p2) - sdfTriangle(p - vec2(0.0, eps), p0, p1, p2);
    float nLen = length(vec2(ndx, ndy));
    shapeNormal = nLen > 0.00001 ? vec2(ndx, ndy) / nLen : vec2(0.0, 1.0);
  } else if (u_shapeType == 2) {
    // Analytic circle
    float localD = length(p) - 0.35;
    d = localD * safeScale;
    float pLen = length(p);
    shapeNormal = pLen > 0.00001 ? p / pLen : vec2(0.0, 1.0);
  } else if (u_shapeType == 3) {
    // Analytic hexagon
    float localD = sdHexagon(p, 0.35);
    d = localD * safeScale;
    const float eps = 0.0005;
    float ndx = sdHexagon(p + vec2(eps, 0.0), 0.35) - sdHexagon(p - vec2(eps, 0.0), 0.35);
    float ndy = sdHexagon(p + vec2(0.0, eps), 0.35) - sdHexagon(p - vec2(0.0, eps), 0.35);
    float nLen = length(vec2(ndx, ndy));
    shapeNormal = nLen > 0.00001 ? vec2(ndx, ndy) / nLen : vec2(0.0, 1.0);
  } else {
    // Exact distance field (R16F, signed distance in units of the texture grid).
    // Beyond the projection circle the field is extended radially so glow stays round and smooth.
    float r = length(p);
    const float rMax = 0.49;
    vec2 pSample = (r > rMax) ? p * (rMax / r) : p;
    vec2 sampleUv = pSample + vec2(0.5);

    // R = exact distance to the true artwork, G = distance to its outer envelope (gaps, holes and
    // notches sealed). The artwork edge keeps a crisp line; only the envelope radiates soft glow.
    vec2 samp = texture(u_sdf, sampleUv).rg;
    float extra = max(r - rMax, 0.0);
    float dLocal = samp.r + extra;
    dEnvLocal = samp.g + extra;
    haveEnv = true;
    d = dLocal * safeScale;

    // Wide-support gradient of the envelope field: a stable outward direction for the cursor light.
    // (A 1-texel difference of a bilinearly filtered field is piecewise constant and shows up as
    // blocky, dotted light; it is never used.)
    vec2 radialNormal = r > 0.00001 ? p / r : vec2(0.0, 1.0);
    float we = 10.0 / 1024.0;
    vec2 wgrad = vec2(
      texture(u_sdf, sampleUv + vec2(we, 0.0)).g - texture(u_sdf, sampleUv - vec2(we, 0.0)).g,
      texture(u_sdf, sampleUv + vec2(0.0, we)).g - texture(u_sdf, sampleUv - vec2(0.0, we)).g
    );
    float wLen = length(wgrad);
    smoothNormal = wLen > 0.00001 ? wgrad / wLen : radialNormal;
    haveSmooth = true;
    shapeNormal = smoothNormal;
  }

  // Edge perimeter angle around shape center
  float angle = (length(p) > 0.00001) ? atan(p.y, p.x) : 0.0;

  // Nearest outline point (local units) and cursor position in the same space.
  // Right at the outline we use the exact nearest point and normal. As the glow spreads away from
  // the shape we blend to the pixel position and a radial direction: the nearest outline point jumps
  // along medial axes (between panes, limbs, rings), which would otherwise draw hard seams.
  if (!haveEnv) dEnvLocal = d / safeScale;
  float outsideLocal = max(dEnvLocal, 0.0);
  float farBlend = smoothstep(0.0, 0.12, outsideLocal);
  vec2 radialDir = length(p) > 0.00001 ? normalize(p) : vec2(0.0, 1.0);
  vec2 baseNormal = haveSmooth ? smoothNormal : shapeNormal;
  vec2 flowNormal = mix(baseNormal, radialDir, farBlend);
  float fnLen = length(flowNormal);
  flowNormal = fnLen > 0.00001 ? flowNormal / fnLen : radialDir;
  // The outline point this pixel's light belongs to: walk back along the (smoothed) outward
  // direction. Exact next to the outline, a radial projection far away, continuous in between.
  vec2 bp = p - flowNormal * outsideLocal;
  vec2 cLocal = toLocal(u_cursorPos, aspect, safeScale);

  float normAngle;
  float posAngle;
  if (u_colorFlow == 1) {
    // Surface flow: color is a function of WHERE on the outline you are, not of the angle around
    // the shape center. Every pane/limb/ring of a logo carries its own continuous gradient and
    // nothing converges to a single point.
    // Soft radial saturation (tanh) instead of a hard clamp: the palette never repeats outside the
    // shape and there is no crease where the clamp used to start.
    float qLen = length(p);
    vec2 qf = p * (0.42 * tanh(qLen / 0.42) / max(qLen, 0.00001));
    float spin = u_time * u_rotationSpeed * 6.28318530718;
    vec2 dirSpin = vec2(cos(spin), sin(spin));
    normAngle = fract(dot(qf, dirSpin) * 1.45 + 0.5 + u_hueShift);
    posAngle = fract(dot(qf, vec2(0.6, 0.8)) * 1.45 + 0.5);
  } else {
    normAngle = fract((angle / 6.28318530718) + 0.5 + u_time * u_rotationSpeed + u_hueShift);
    posAngle = fract((angle / 6.28318530718) + 0.5);
  }

  // Chromatic dispersion for prism effect
  float disp = u_edgeDispersion * 0.035;
  vec3 edgeColor = vec3(
    samplePalette(normAngle - disp).r,
    samplePalette(normAngle).g,
    samplePalette(normAngle + disp).b
  );
  if (u_colorFlow == 1) {
    // The palette orbits around the object (the object itself never moves). Close to the center,
    // where every angle meets, the steady surface gradient takes over.
    vec2 orbitDir = normalize(bp + vec2(0.00001, 0.0));
    float orbit = fract(atan(orbitDir.y, orbitDir.x) / 6.28318530718 + 0.5 - u_time * u_rotationSpeed + u_hueShift);
    vec3 orbitColor = vec3(
      samplePalette(orbit - disp).r,
      samplePalette(orbit).g,
      samplePalette(orbit + disp).b
    );
    float orbitWeight = smoothstep(0.06, 0.24, length(bp));
    edgeColor = mix(edgeColor, orbitColor, orbitWeight);
    posAngle = fract(atan(orbitDir.y, orbitDir.x) / 6.28318530718 + 0.5);
  }

  // --- Dynamic Multi-Band Perimeter Motion ---
  float perimeterLight = 1.0;
  if (u_rotationSpeed > 0.001) {
    // 3 harmonic traveling wave bands inspired by Vercel LINE_VELOCITIES [-3.302, -2.355, -1.636]
    float s = u_rotationSpeed;
    float t = u_time;

    // Band centers traveling at non-commensurate harmonic ratios
    float c0 = fract(t * s * 1.0);
    float c1 = fract(t * s * 0.713 + 0.333);
    float c2 = fract(t * s * 0.495 + 0.666);

    // Dynamic breathing sizes
    float w0 = 0.16 + 0.05 * sin(t * 0.41);
    float w1 = 0.14 + 0.04 * sin(t * 0.31 + 2.1);
    float w2 = 0.12 + 0.03 * sin(t * 0.23 + 4.2);

    // Dynamic breathing intensities
    float f0 = 0.5 + 0.5 * sin(t * 0.52 + 1.57);
    float f1 = 0.5 + 0.5 * sin(t * 0.38 + 0.40);
    float f2 = 0.5 + 0.5 * sin(t * 0.28 - 0.60);

    float d0 = min(abs(posAngle - c0), 1.0 - abs(posAngle - c0));
    float d1 = min(abs(posAngle - c1), 1.0 - abs(posAngle - c1));
    float d2 = min(abs(posAngle - c2), 1.0 - abs(posAngle - c2));

    float p0 = exp(-(d0 * d0) / max(2.0 * w0 * w0, 0.001)) * f0;
    float p1 = exp(-(d1 * d1) / max(2.0 * w1 * w1, 0.001)) * f1;
    float p2 = exp(-(d2 * d2) / max(2.0 * w2 * w2, 0.001)) * f2;

    float multiBand = max(p0, max(p1, p2));
    perimeterLight = mix(0.10, 0.80, multiBand);
  } else {
    perimeterLight = 0.45;
  }
  // Hover: light comes only from the cursor (computed whenever hover is fading in or out).
  // The beam follows the overall form (outline normal blended with the direction from the center),
  // so notches and concave corners (Tux's feet, gaps between panes) do not cut it into streaks.
  vec2 beamNormal = normalize(flowNormal * 0.45 + radialDir * 0.55 + vec2(0.00001, 0.0));
  float cursorBeam = u_hoverTransition > 0.001 ? cursorBeamAt(bp, beamNormal, cLocal) : 0.0;
  float hoverLight = mix(0.02, 1.0, cursorBeam);

  // Mode modulations (idle animation only; the cursor light stays steady)
  float edgeLight = perimeterLight * u_pulseFactor * u_flickerFactor + u_burstFactor;

  // Sweep highlight beam
  if (u_sweep.w > 0.5) {
    float dAngle = abs(normAngle - u_sweep.x);
    dAngle = min(dAngle, 1.0 - dAngle);
    float sweepBeam = exp(-(dAngle * dAngle) / max(u_sweep.y * u_sweep.y, 0.0001)) * u_sweep.z;
    edgeLight += sweepBeam;
  }

  // Transient ripple wave
  if (u_ripple.w > 0.001) {
    float clickDist = length(shapeUv - u_ripple.xy);
    float waveDist = abs(clickDist - u_ripple.z);
    edgeLight += exp(-(waveDist * waveDist) / 0.0015) * u_ripple.w;
  }

  // --- Pure Vercel Edge Falloff & Space Expansion ---
  // 1. Razor-sharp core line
  float core = smoothstep(u_edgeWidth, 0.0, abs(d));
  // 2. Soft glow is measured from the OUTER envelope, never from empty space inside the artwork.
  float dg = max(dEnvLocal * safeScale, 0.0);
  float nearOuter = max(u_edgeFalloff, 0.018);
  float nearFade = clamp(1.0 - dg / nearOuter, 0.0, 1.0);
  float nearBand = pow(nearFade, 2.8);
  // 3. Idle: a tight halo hugging the outline. Hover: a longer glow that reaches toward the cursor
  //    (pixels between the shape and the cursor face it, so the beam lights them).
  float idleGlow = nearBand * 0.30 + exp(-dg * 34.0) * 0.24 + exp(-dg * 16.0) * 0.03;
  idleGlow *= 1.0 - smoothstep(0.10, 0.32, dg);
  float hoverGlow = nearBand * 0.50 + exp(-dg * 18.0) * 0.30 +
    exp(-dg * 6.0) * 0.10 * (1.0 - smoothstep(0.25, 0.80, dg));

  // Soft glow is zero in gaps/holes (inside the envelope but outside the artwork) and fades where
  // the nearest real edge is much farther away than the envelope (sealed notches), so no plasma
  // appears in or around the empty spaces of a logo. The thin edge line always stays.
  float gapDepth = max(dLocalForGap(d, safeScale) - dEnvLocal, 0.0);
  float sealed = 1.0 - smoothstep(0.03, 0.14, gapDepth);
  float inGap = smoothstep(-0.003, -0.008, dEnvLocal);
  float glowMask = sealed * (1.0 - inGap);
  float hover = u_hoverTransition;
  // Detail lines inside the silhouette stay quiet: the light belongs to the outer outline, so it reads
  // as part of the object instead of shining out of its center.
  float coreW = core * mix(1.0, 0.30, smoothstep(0.0, -0.012, dEnvLocal));
  float idlePart = (idleGlow * glowMask + coreW * 0.55) * edgeLight;
  float hoverPart = (hoverGlow * glowMask + coreW * 0.70) * hoverLight;
  float rimProfile = mix(idlePart, hoverPart, hover) * u_edgeIntensity;

  // Inside vs outside composition
  vec3 linearColor;
  float outAlpha = 1.0;
  if (d < 0.0) {
    vec3 col = u_fillColor;
    if (u_hasContent > 0.5) {
      vec2 contentUv = (shapeUv - vec2(0.5)) / max(u_contentScale, 0.001) + vec2(0.5);
      if (contentUv.x >= 0.0 && contentUv.x <= 1.0 && contentUv.y >= 0.0 && contentUv.y <= 1.0) {
        vec4 texSample = texture(u_contentTexture, contentUv);
        vec3 contentRgb = (u_contentTint.w > 0.5) ? u_contentTint.rgb : texSample.rgb;
        float alpha = texSample.a * u_contentOpacity;
        col = mix(col, contentRgb, alpha);
      }
    }
    // Subpixel occluder edge derivative for crisp anti-aliased silhouette
    float occluderEdge = max(length(vec2(dFdx(d), dFdy(d))), 0.001);
    float occluder = clamp(0.5 - d / occluderEdge, 0.0, 1.0);
    linearColor = mix(edgeColor * rimProfile, col, occluder);
    outAlpha = 1.0;
  } else {
    linearColor = u_bgColor + (edgeColor * rimProfile);
  }

  // Screen-edge vertical fade
  float vertDist = min(v_uv.y, 1.0 - v_uv.y);
  float screenEdgeFade = sqrt(clamp(vertDist / 0.15, 0.0, 1.0));
  linearColor *= screenEdgeFade;

  linearColor = clamp(linearColor, 0.0, 1.0);

  // Gamma correction to sRGB
  vec3 srgb = pow(linearColor, vec3(1.0 / 2.2));

  // Triangular-PDF dither (+-1 LSB) in sRGB space: removes banding in the long, dark glow gradients
  // without lifting true black.
  if (dot(srgb, vec3(1.0)) > 0.001) {
    float n1 = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    float n2 = fract(sin(dot(gl_FragCoord.xy + vec2(31.7, 17.3), vec2(39.3468, 11.135))) * 24634.6345);
    srgb = clamp(srgb + vec3((n1 + n2 - 1.0) / 255.0), 0.0, 1.0);
  }

  // Always opaque. A glow-derived alpha gets multiplied into the color by the compositor, which
  // crushes the soft falloff and quantizes it into visible bands.
  fragColor = vec4(srgb, outAlpha);
}
`;
