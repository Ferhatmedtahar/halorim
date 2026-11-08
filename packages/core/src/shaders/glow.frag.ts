export const GLOW_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_sdf;
uniform vec2 u_resolution;        // Viewport width, height
uniform vec2 u_shapePos;          // Shape center [0..1]
uniform float u_shapeScale;       // Normalized shape scale
uniform float u_shapeRotation;    // Radians
uniform float u_maxDistance;      // Normalized max distance factor
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

  // Map to [0..1] shape UV
  float safeScale = max(u_shapeScale, 0.001);
  vec2 shapeUv = (rotated / safeScale) + vec2(0.5);

  // Clamp UV for SDF sampling
  vec2 clampedUv = clamp(shapeUv, vec2(0.001), vec2(0.999));
  float rawSdf = texture(u_sdf, clampedUv).r;
  float distPixels = (rawSdf - 0.5) * 2.0 * u_maxDistance;

  // Add Euclidean box distance if UV falls outside shape grid
  vec2 boxDistVec = max(vec2(0.0), max(vec2(0.0) - shapeUv, shapeUv - vec2(1.0)));
  float extraPixels = length(boxDistVec) * 1024.0;
  float totalPixels = distPixels + extraPixels;

  // Normalized distance in world scale (distance from shape edge)
  float d = (totalPixels / 1024.0) * safeScale;

  // Compute SDF surface normal via central differences
  float eps = 1.0 / 1024.0;
  float dR = texture(u_sdf, clamp(shapeUv + vec2(eps, 0.0), 0.001, 0.999)).r;
  float dL = texture(u_sdf, clamp(shapeUv - vec2(eps, 0.0), 0.001, 0.999)).r;
  float dU = texture(u_sdf, clamp(shapeUv + vec2(0.0, eps), 0.001, 0.999)).r;
  float dD = texture(u_sdf, clamp(shapeUv - vec2(0.0, eps), 0.001, 0.999)).r;
  vec2 grad = vec2(dR - dL, dU - dD);
  float gLen = length(grad);
  vec2 shapeNormal = gLen > 0.00001 ? grad / gLen : vec2(0.0, 1.0);

  // Edge perimeter angle around shape center
  vec2 centerDiff = shapeUv - vec2(0.5);
  float angle = (length(centerDiff) > 0.00001) ? atan(centerDiff.y, centerDiff.x) : 0.0;
  float normAngle = fract((angle / 6.28318530718) + 0.5 + u_time * u_rotationSpeed + u_hueShift);

  // Chromatic dispersion for prism effect
  float disp = u_edgeDispersion * 0.035;
  float rColor = samplePalette(normAngle - disp).r;
  float gColor = samplePalette(normAngle).g;
  float bColor = samplePalette(normAngle + disp).b;
  vec3 edgeColor = vec3(rColor, gColor, bColor);

  // --- Perimeter Beam Focusing ---
  float beam = 1.0;
  if (u_rotationSpeed > 0.001 || u_hoverTransition > 0.001) {
    float angleDiff = abs(angle - u_lightAngle);
    if (angleDiff > 3.14159265) angleDiff = 6.2831853 - angleDiff;
    beam = pow(max(cos(angleDiff), 0.0), 2.5);
    beam = mix(0.12, 1.0, beam);
  }
  float perimeterLight = beam;

  // --- Cursor Directional Light ---
  vec2 cursorDiff = v_uv - u_cursorPos;
  cursorDiff.x *= aspect;
  float cursorDist = length(cursorDiff);
  vec2 dirToCursor = cursorDist > 0.0001 ? -cursorDiff / cursorDist : vec2(0.0, 1.0);

  vec2 shapeCursorDir = vec2(
    dirToCursor.x * cosR + dirToCursor.y * sinR,
    -dirToCursor.x * sinR + dirToCursor.y * cosR
  );

  float alignment = pow(max(dot(shapeNormal, shapeCursorDir), 0.0), max(u_cursorSharpness, 0.1));
  float attenuation = 1.0 / (1.0 + cursorDist * 3.5);
  float cursorLight = u_hasCursor * alignment * attenuation * 2.2;

  // Active edge illumination
  float edgeLight = perimeterLight + cursorLight;

  // Mode modulations
  edgeLight = edgeLight * u_pulseFactor * u_flickerFactor + u_burstFactor;

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

  // --- Sharp Vercel Edge Falloff ---
  float core = smoothstep(u_edgeWidth, 0.0, abs(d));
  float nearOuter = max(u_edgeFalloff * 0.35, 0.015);
  float nearFade = clamp(1.0 - max(d, 0.0) / nearOuter, 0.0, 1.0);
  float nearBand = pow(nearFade, 3.5);
  float farGlow = exp(-max(d, 0.0) * 32.0) * 0.55;

  float rimProfile = (nearBand * 0.85 + core * 0.9 + farGlow) * u_edgeIntensity * edgeLight;

  // Inside vs outside composition
  vec3 linearColor;
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
    float occluderEdge = max(length(vec2(dFdx(d), dFdy(d))), 0.0015);
    float occluder = clamp(0.5 - d / occluderEdge, 0.0, 1.0);
    linearColor = mix(edgeColor * rimProfile, col, occluder);
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

  // Dither in sRGB space on outside rim/background to eliminate banding without lifting true black
  if (d >= 0.0 && dot(srgb, vec3(1.0)) > 0.001) {
    float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
    srgb = clamp(srgb + vec3(dither), 0.0, 1.0);
  }

  fragColor = vec4(srgb, 1.0);
}
`;
