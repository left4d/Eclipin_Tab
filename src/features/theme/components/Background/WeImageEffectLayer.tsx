import React from 'react';
import type { ImportedWeTextureEffect } from '@/features/theme/utils/wallpaperEngineImportedScene';
import { createPerspectiveQuadToSquareMatrix } from '@/features/theme/utils/wallpaperEnginePerspectiveRenderer';

export type RuntimeTextureEffect =
    | (Extract<ImportedWeTextureEffect, { kind: 'opacity' }> & {
        maskUrl: string | null;
    })
    | Extract<ImportedWeTextureEffect, { kind: 'scroll' }>
    | Extract<ImportedWeTextureEffect, { kind: 'transform' }>
    | Extract<ImportedWeTextureEffect, { kind: 'spin' }>
    | Extract<ImportedWeTextureEffect, { kind: 'perspective' }>
    | (Extract<ImportedWeTextureEffect, { kind: 'foliageSway' }> & {
        maskUrl: string | null;
        noiseUrl: string | null;
    })
    | (Extract<ImportedWeTextureEffect, { kind: 'waterFlow' }> & {
        flowMapUrl: string | null;
        phaseUrl: string | null;
    })
    | (Extract<ImportedWeTextureEffect, { kind: 'shake' }> & {
        directionMapUrl: string | null;
    })
    | (Extract<ImportedWeTextureEffect, { kind: 'blurPrecise' }> & {
        maskUrl: string | null;
    })
    | Extract<ImportedWeTextureEffect, { kind: 'shimmer' }>
    | (Extract<ImportedWeTextureEffect, { kind: 'shine' }> & {
        maskUrl: string | null;
        noiseUrl: string | null;
    })
    | (Extract<ImportedWeTextureEffect, { kind: 'godRays' }> & {
        maskUrl: string | null;
    })
    | (Extract<ImportedWeTextureEffect, { kind: 'waterRipple' }> & {
        maskUrl: string | null;
        normalUrl: string | null;
    })
    | (Extract<ImportedWeTextureEffect, { kind: 'waterWaves' }> & {
        maskUrl: string | null;
        timeOffsetUrl: string | null;
    });

interface WeImageEffectLayerProps {
    src: string;
    effects: RuntimeTextureEffect[];
    className: string;
    style: React.CSSProperties;
    dataSource: string;
    dataTiming?: string;
    timeOriginMs: number;
    /** Optional consumer for the fully processed atlas/frame. Avoid React state here: this runs once per rendered frame. */
    onFrame?: (canvas: HTMLCanvasElement) => void;
}

const VERTEX_SHADER = `
attribute vec2 a_Position;
varying vec2 v_TexCoord;
void main() {
    gl_Position = vec4(a_Position, 0.0, 1.0);
    v_TexCoord = a_Position * 0.5 + 0.5;
}
`;

const OPACITY_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Mask;
uniform bool u_HasMask;
uniform float u_Alpha;

void main() {
    vec4 color = texture2D(u_Source, v_TexCoord);
    float mask = u_HasMask ? texture2D(u_Mask, v_TexCoord).r : 1.0;
    // The WebGL pipeline stores premultiplied render-target colors. Applying
    // WE's opacity pass as a surface pass therefore attenuates RGB together
    // with alpha so subsequent passes see the composited transparent result.
    gl_FragColor = color * (mask * u_Alpha);
}
`;

const SCROLL_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform float u_Time;
uniform float u_SpeedX;
uniform float u_SpeedY;
uniform vec2 u_Repeat;

void main() {
    vec2 speed = vec2(u_SpeedX, u_SpeedY);
    // Matches Wallpaper Engine's built-in scroll shader: signed square gives
    // fine control near zero while preserving authored direction.
    vec2 scroll = sign(speed) * speed * speed * u_Time;
    vec2 texCoord = fract((v_TexCoord + scroll) * u_Repeat);
    gl_FragColor = texture2D(u_Source, texCoord);
}
`;

const TRANSFORM_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform vec2 u_Offset;
uniform vec2 u_Scale;
uniform float u_Angle;
uniform bool u_Repeat;

vec2 rotate2D(vec2 value, float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return vec2(
        value.x * cosine - value.y * sine,
        value.x * sine + value.y * cosine
    );
}

void main() {
    vec2 texCoord = rotate2D(v_TexCoord - vec2(0.5), u_Angle);
    texCoord = (texCoord + u_Offset) * u_Scale + vec2(0.5);
    if (u_Repeat) texCoord = fract(texCoord);
    gl_FragColor = texture2D(u_Source, texCoord);
}
`;

const SPIN_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform float u_Time;
uniform vec2 u_Center;
uniform float u_Speed;
uniform float u_Ratio;
uniform float u_Axis;
uniform float u_Phase;
uniform float u_Size;
uniform float u_Feather;
uniform float u_Aspect;
uniform bool u_Repeat;
uniform bool u_Elliptical;
uniform bool u_SoftMask;

vec2 rotate2D(vec2 value, float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return vec2(
        value.x * cosine - value.y * sine,
        value.x * sine + value.y * cosine
    );
}

void main() {
    vec2 originalCoord = v_TexCoord;
    vec2 texCoord = originalCoord - u_Center;
    texCoord.x *= u_Aspect;

    if (u_Elliptical) {
        texCoord = rotate2D(texCoord, u_Axis);
        texCoord.x *= u_Ratio;
    }
    vec2 softMaskCoord = texCoord;

    float offset = u_Phase * 6.28318530718;
    texCoord = rotate2D(texCoord, u_Speed * u_Time + offset);

    if (u_Elliptical) {
        texCoord.x /= u_Ratio;
        texCoord = rotate2D(texCoord, -u_Axis);
        softMaskCoord = rotate2D(softMaskCoord, -u_Axis);
    }

    texCoord.x /= u_Aspect;
    texCoord += u_Center;

    if (u_Repeat) {
        texCoord = fract(texCoord);
    }

    vec4 spun = texture2D(u_Source, texCoord);
    float mask = 1.0;
    if (u_SoftMask) {
        float distanceValue = length(softMaskCoord);
        float feather = max(0.0, u_Feather);
        float innerEdge = max(0.0, u_Size - feather);
        float outerEdge = u_Size + feather + 0.00001;
        mask = 1.0 - smoothstep(innerEdge, outerEdge, distanceValue);
    }
    gl_FragColor = mix(texture2D(u_Source, originalCoord), spun, mask);
}
`;

const PERSPECTIVE_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform mat3 u_QuadToSquare;
uniform bool u_Repeat;

void main() {
    vec3 projected = u_QuadToSquare * vec3(v_TexCoord, 1.0);
    float denominator = projected.z;
    float validDenominator = step(0.000001, denominator);
    vec2 texCoord = projected.xy / max(denominator, 0.000001);

    float mask = validDenominator;
    if (u_Repeat) {
        texCoord = fract(texCoord);
    } else {
        mask *= step(0.0, texCoord.x) * step(texCoord.x, 1.0);
        mask *= step(0.0, texCoord.y) * step(texCoord.y, 1.0);
    }

    vec4 color = texture2D(u_Source, texCoord);
    color.a *= mask;
    color.rgb *= mask;
    gl_FragColor = color;
}
`;

const FOLIAGE_SWAY_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Mask;
uniform sampler2D u_Noise;
uniform bool u_HasMask;
uniform float u_Time;
uniform float u_Speed;
uniform float u_Strength;
uniform float u_Phase;
uniform float u_Power;
uniform float u_NoiseScale;
uniform float u_Ratio;
uniform float u_Direction;
uniform float u_Aspect;

vec2 rotate2D(vec2 value, float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return vec2(
        value.x * cosine - value.y * sine,
        value.x * sine + value.y * cosine
    );
}

void main() {
    float aspect = max(0.000001, u_Aspect * u_Ratio);
    vec2 displacementBasis = rotate2D(vec2(1.0 / aspect, aspect), u_Direction);
    vec2 rotatedCoord = rotate2D(v_TexCoord, u_Direction);
    vec3 noise = texture2D(u_Noise, v_TexCoord * u_NoiseScale).rgb;

    float amp = u_Strength * u_Strength * 0.005;
    if (u_HasMask) {
        amp *= texture2D(u_Mask, v_TexCoord).r;
    }

    float phase = (noise.g * 6.28318530718 + rotatedCoord.x * 10.0 + rotatedCoord.y * 5.0) * u_Phase;
    vec4 sines = phase + u_Speed * u_Time * vec4(1.0, -0.16161616, 0.0083333, -0.00019841);
    vec4 csines = 0.4 + phase + u_Speed * u_Time * vec4(-0.5, 0.041666666, -0.0013888889, 0.000024801587);
    sines = sin(sines);
    csines = sin(csines);
    sines = pow(abs(sines), vec4(u_Power)) * sign(sines);
    csines = pow(abs(csines), vec4(u_Power)) * sign(csines);

    vec2 texCoordOffset;
    texCoordOffset.x = displacementBasis.x * dot(sines, vec4(amp));
    texCoordOffset.y = displacementBasis.y * dot(csines, vec4(amp));
    gl_FragColor = texture2D(u_Source, v_TexCoord + texCoordOffset);
}
`;

const WATER_FLOW_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_FlowMap;
uniform sampler2D u_Phase;
uniform bool u_FlowMapPackedRg88;
uniform float u_Time;
uniform float u_Speed;
uniform float u_Strength;
uniform float u_PhaseScale;
uniform bool u_Legacy;
uniform bool u_HasFeather;
uniform float u_Feather;

void main() {
    // Some extracted WE RG88 textures are serialized as RGBA PNGs with the
    // original G replicated into RGB and the original R stored in alpha.
    // Reconstruct the authored WE RG vector for that representation while
    // preserving direct RG flow maps used by older/external extractors.
    vec4 flowSample = texture2D(u_FlowMap, v_TexCoord);
    vec2 flowColors = u_FlowMapPackedRg88 ? flowSample.ar : flowSample.rg;
    vec2 flowMask = (flowColors - vec2(0.498, 0.498)) * 2.0;
    float flowAmount = length(flowMask);
    vec4 albedo = texture2D(u_Source, v_TexCoord);
    float timeValue = u_Time * u_Speed;

    if (u_Legacy) {
        float flowPhase = texture2D(u_Phase, fract(v_TexCoord * u_PhaseScale)).r - 0.5;
        vec2 cycles = vec2(fract(timeValue), fract(timeValue + 0.5));
        float blend = 2.0 * abs(cycles.x - 0.5);
        blend = smoothstep(max(0.0, flowPhase), min(1.0, 1.0 + flowPhase), blend);
        vec2 offset1 = flowMask * u_Strength * 0.1 * cycles.x;
        vec2 offset2 = flowMask * u_Strength * 0.1 * cycles.y;
        vec4 flowed = mix(
            texture2D(u_Source, v_TexCoord + offset1),
            texture2D(u_Source, v_TexCoord + offset2),
            blend
        );
        gl_FragColor = mix(albedo, flowed, flowAmount);
        return;
    }

    float flowPhase = texture2D(u_Phase, fract(v_TexCoord * u_PhaseScale)).r;
    vec4 cycles = vec4(
        fract(timeValue),
        fract(timeValue + 0.5),
        fract(timeValue + 0.25),
        fract(timeValue + 0.75)
    );
    float blend1 = 2.0 * abs(cycles.x - 0.5);
    float blend2 = 2.0 * abs(cycles.z - 0.5);
    if (u_HasFeather) {
        float feather = clamp(u_Feather, 0.00001, 0.5);
        vec2 edges = vec2(0.5 - feather, 0.5 + feather);
        blend1 = smoothstep(edges.x, edges.y, blend1);
        blend2 = smoothstep(edges.x, edges.y, blend2);
    }
    cycles -= vec4(0.5);

    vec4 offsets1 = flowMask.xyxy * u_Strength * 0.1 * cycles.xxyy;
    vec4 offsets2 = flowMask.xyxy * u_Strength * 0.1 * cycles.zzww;
    vec4 flowed1 = mix(
        texture2D(u_Source, v_TexCoord + offsets1.xy),
        texture2D(u_Source, v_TexCoord + offsets1.zw),
        blend1
    );
    vec4 flowed2 = mix(
        texture2D(u_Source, v_TexCoord + offsets2.xy),
        texture2D(u_Source, v_TexCoord + offsets2.zw),
        blend2
    );
    vec4 flowed = mix(flowed1, flowed2, smoothstep(0.2, 0.8, flowPhase));
    gl_FragColor = mix(albedo, flowed, flowAmount);
}
`;

const SHAKE_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_DirectionMap;
uniform bool u_DirectionMapPackedRg88;
uniform float u_Time;
uniform float u_Speed;
uniform float u_Strength;
uniform vec2 u_Friction;
uniform vec2 u_Bounds;
uniform float u_DirectionMode;

const float TWO_PI = 6.28318530718;

void main() {
    vec4 directionSample = texture2D(u_DirectionMap, v_TexCoord);
    vec2 directionColors = u_DirectionMapPackedRg88 ? directionSample.ar : directionSample.rg;
    vec2 flowMask = (directionColors - vec2(0.498, 0.498)) * 2.0;
    // WE flow maps encode vertical displacement in its opposite texture-space
    // convention. Reflect only the vector component; authored scalar timing is unchanged.
    flowMask.y = -flowMask.y;

    float timeValue = u_Speed * u_Time;
    float wrapped = fract(timeValue / TWO_PI) * TWO_PI;
    float offset = sin(wrapped) * 0.498 + 0.5;
    float base = step(0.0, cos(timeValue));
    float negativeHalf = 1.0 - pow(max(0.0, 1.0 - offset), u_Friction.x);
    float positiveHalf = pow(max(0.0, offset), u_Friction.y);
    offset = mix(negativeHalf, positiveHalf, base);
    offset = clamp((offset - u_Bounds.x) / max(0.000001, u_Bounds.y - u_Bounds.x), 0.0, 1.0);

    if (u_DirectionMode < 0.5) {
        offset = offset * 2.0 - 1.0;
    } else if (u_DirectionMode >= 1.5) {
        offset = offset - 1.0;
    }

    vec2 texCoordOffset = offset * u_Strength * u_Strength * flowMask;
    gl_FragColor = texture2D(u_Source, v_TexCoord + texCoordOffset);
}
`;

const BLUR_PRECISE_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Original;
uniform sampler2D u_Mask;
uniform vec2 u_Direction;
uniform bool u_FinalPass;
uniform bool u_HasMask;
uniform bool u_BlurAlpha;

// Wallpaper Engine's supplied blur-precise shader calls blur13a() from the
// engine-owned common_blur.h include. RePKG samples retain the call site but
// not that built-in include. The observed KERNEL=0 path uses the canonical
// optimized 13-tap Gaussian layout (7 texture fetches via bilinear offsets).
vec4 blur13a(vec2 uv, vec2 direction) {
    vec4 color = texture2D(u_Source, uv) * 0.1964825501511404;
    vec2 off1 = direction * 1.411764705882353;
    vec2 off2 = direction * 3.2941176470588234;
    vec2 off3 = direction * 5.176470588235294;
    color += texture2D(u_Source, uv + off1) * 0.2969069646728344;
    color += texture2D(u_Source, uv - off1) * 0.2969069646728344;
    color += texture2D(u_Source, uv + off2) * 0.09447039785044732;
    color += texture2D(u_Source, uv - off2) * 0.09447039785044732;
    color += texture2D(u_Source, uv + off3) * 0.010381362401148057;
    color += texture2D(u_Source, uv - off3) * 0.010381362401148057;
    return color;
}

void main() {
    vec4 blurred = blur13a(v_TexCoord, u_Direction);
    if (!u_FinalPass) {
        gl_FragColor = blurred;
        return;
    }

    vec4 original = texture2D(u_Original, v_TexCoord);
    if (u_HasMask) {
        blurred = mix(original, blurred, texture2D(u_Mask, v_TexCoord).r);
    }
    if (!u_BlurAlpha) {
        blurred.a = original.a;
    }
    gl_FragColor = blurred;
}
`;


const SHIMMER_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform float u_Time;
uniform vec3 u_Color;
uniform float u_Brightness;
uniform float u_Direction;
uniform float u_Granularity;
uniform float u_Offset;
uniform float u_Speed;
uniform float u_Delay;

void main() {
    vec4 base = texture2D(u_Source, v_TexCoord);
    vec2 direction = vec2(cos(u_Direction), sin(u_Direction));
    float centered = dot(v_TexCoord - vec2(0.5), direction);

    float travelDuration = max(0.15, 1.0 / max(abs(u_Speed), 0.01));
    float pauseDuration = max(0.0, u_Delay);
    float cycleDuration = travelDuration + pauseDuration;
    float phase = mod(max(0.0, u_Time) + u_Offset, cycleDuration);
    float active = step(phase, travelDuration);
    float sweep = clamp(phase / travelDuration, 0.0, 1.0);
    float bandCenter = mix(-0.95, 0.95, sweep);

    float bandScale = max(0.35, u_Granularity);
    float bandWidth = mix(0.24, 0.06, clamp((bandScale - 0.35) / 2.65, 0.0, 1.0));
    float distanceToBand = abs(centered - bandCenter);
    float core = 1.0 - smoothstep(0.0, bandWidth, distanceToBand);
    float halo = 1.0 - smoothstep(bandWidth, bandWidth * 2.5, distanceToBand);
    float shimmer = active * max(core, halo * 0.45);

    vec3 added = u_Color * (u_Brightness * shimmer * base.a);
    gl_FragColor = vec4(min(vec3(1.0), base.rgb + added), base.a);
}
`;

const SHINE_DOWNSAMPLE_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Mask;
uniform sampler2D u_Noise;
uniform bool u_HasMask;
uniform bool u_NoiseEnabled;
uniform float u_Time;
uniform float u_Threshold;
uniform float u_NoiseAmount;
uniform float u_NoiseScale;
uniform float u_NoiseSpeed;

void main() {
    float mask = u_HasMask ? texture2D(u_Mask, v_TexCoord).r : 1.0;
    vec4 sampleColor = texture2D(u_Source, v_TexCoord);

    float noiseAlpha = sampleColor.a;
    if (u_NoiseEnabled) {
        float drift = u_Time * u_NoiseSpeed;
        vec2 noiseUv1 = vec2(
            (v_TexCoord.x + drift) * u_NoiseScale,
            1.0 - ((1.0 - v_TexCoord.y) + drift) * u_NoiseScale
        );
        // Canonical WE writes the rotated coordinates to v_NoiseTexCoord.wz
        // and samples them back as .zw, intentionally swapping the pair.
        // Convert the resulting WE texture-space coordinate through the same
        // Y reflection used by the browser-facing texture stage.
        vec2 noiseUv2 = vec2(
            (-v_TexCoord.x * 0.633 + drift * 0.5) * u_NoiseScale,
            1.0 - (((1.0 - v_TexCoord.y) * 0.633 - drift * 0.5) * u_NoiseScale)
        );
        float noiseSample = texture2D(u_Noise, noiseUv1).r * texture2D(u_Noise, noiseUv2).r;
        noiseAlpha = mix(sampleColor.a, sampleColor.a * noiseSample, u_NoiseAmount);
    }

    // TabLab uploads the source texture premultiplied. WE's canonical shader
    // performs this multiplication here because its source sampler is straight
    // alpha; applying it again would square alpha on translucent edges.
    sampleColor.a = 1.0;
    float brightness = dot(vec3(0.11, 0.59, 0.3), sampleColor.rgb);
    vec4 result = sampleColor * mask * step(u_Threshold, brightness);
    if (u_NoiseEnabled) result.a *= noiseAlpha;
    gl_FragColor = result;
}
`;

const SHINE_CAST_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform float u_Time;
uniform float u_Direction;
uniform float u_Speed;
uniform float u_RayLength;
uniform float u_Intensity;
uniform vec3 u_Color;
uniform float u_Aspect;
uniform int u_Edges;
uniform int u_SampleMode;

vec2 rotate2D(vec2 value, float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return vec2(
        value.x * cosine - value.y * sine,
        value.x * sine + value.y * cosine
    );
}

float sampleCountForMode() {
    if (u_SampleMode == 0) return 4.0;
    if (u_SampleMode == 1) return 8.0;
    if (u_SampleMode == 2) return 15.0;
    return 30.0;
}

vec4 gatherDirection(vec2 texCoords, vec2 direction) {
    vec4 albedo = vec4(0.0);
    float dist = length(direction);
    if (dist < 0.000001) return albedo;
    direction /= dist;
    dist *= u_RayLength;
    texCoords += direction * dist;

    float sampleCount = sampleCountForMode();
    float sampleDrop = max(1.0, sampleCount - 1.0);
    vec2 stepDirection = direction * dist / sampleDrop;
    for (int i = 0; i < 30; ++i) {
        if (float(i) < sampleCount) {
            vec4 raySample = texture2D(u_Source, texCoords);
            albedo += raySample * (float(i) / sampleDrop);
            texCoords -= stepDirection;
        }
    }
    return albedo;
}

vec2 rayDirection(float angle) {
    vec2 direction = rotate2D(vec2(0.0, -0.5), angle);
    direction.y *= u_Aspect;
    return direction;
}

void main() {
    float angle = u_Direction + u_Time * u_Speed;
    vec4 rays = vec4(0.0);

    if (u_Edges == 2) {
        vec2 d = rayDirection(angle);
        rays += gatherDirection(v_TexCoord, d);
        rays += gatherDirection(v_TexCoord, -d);
    } else if (u_Edges == 3) {
        rays += gatherDirection(v_TexCoord, rayDirection(angle));
        rays += gatherDirection(v_TexCoord, rayDirection(angle + 6.28318530718 * 0.3333));
        rays += gatherDirection(v_TexCoord, rayDirection(angle + 6.28318530718 * 0.6666));
    } else if (u_Edges == 4) {
        vec2 d0 = rayDirection(angle);
        vec2 d1 = rayDirection(angle + 1.57079632679);
        rays += gatherDirection(v_TexCoord, d0);
        rays += gatherDirection(v_TexCoord, -d0);
        rays += gatherDirection(v_TexCoord, d1);
        rays += gatherDirection(v_TexCoord, -d1);
    } else {
        rays += gatherDirection(v_TexCoord, rayDirection(angle));
        rays += gatherDirection(v_TexCoord, rayDirection(angle + 6.28318530718 * 0.2));
        rays += gatherDirection(v_TexCoord, rayDirection(angle + 6.28318530718 * 0.4));
        rays += gatherDirection(v_TexCoord, rayDirection(angle + 6.28318530718 * 0.6));
        rays += gatherDirection(v_TexCoord, rayDirection(angle + 6.28318530718 * 0.8));
    }

    float sampleCount = sampleCountForMode();
    float sampleIntensity = 0.1 * (30.0 / sampleCount);
    rays.rgb *= u_Color;
    float factor = u_Intensity * sampleIntensity;
    gl_FragColor = vec4(factor * rays.rgb, clamp(factor * rays.a, 0.0, 1.0));
}
`;

const RAY_COMBINE_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Rays;
uniform sampler2D u_Original;
uniform int u_BlendMode;

float blendLinearDodgeF(float base, float blend) { return base + blend; }
float blendLinearBurnF(float base, float blend) { return max(base + blend - 1.0, 0.0); }
float blendLightenF(float base, float blend) { return max(blend, base); }
float blendDarkenF(float base, float blend) { return min(blend, base); }
float blendScreenF(float base, float blend) { return 1.0 - ((1.0 - base) * (1.0 - blend)); }
float blendOverlayF(float base, float blend) {
    return base < 0.5
        ? 2.0 * base * blend
        : 1.0 - 2.0 * (1.0 - base) * (1.0 - blend);
}
float blendSoftLightF(float base, float blend) {
    return blend < 0.5
        ? 2.0 * base * blend + base * base * (1.0 - 2.0 * blend)
        : sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend);
}
float blendColorDodgeF(float base, float blend) {
    return blend == 1.0 ? blend : min(base / (1.0 - blend), 1.0);
}
float blendColorBurnF(float base, float blend) {
    return blend == 0.0 ? blend : max(1.0 - ((1.0 - base) / blend), 0.0);
}
float blendLinearLightF(float base, float blend) {
    return blend < 0.5
        ? blendLinearBurnF(base, 2.0 * blend)
        : blendLinearDodgeF(base, 2.0 * (blend - 0.5));
}
float blendVividLightF(float base, float blend) {
    return blend < 0.5
        ? blendColorBurnF(base, 2.0 * blend)
        : blendColorDodgeF(base, 2.0 * (blend - 0.5));
}
float blendPinLightF(float base, float blend) {
    return blend < 0.5
        ? blendDarkenF(base, 2.0 * blend)
        : blendLightenF(base, 2.0 * (blend - 0.5));
}
float blendHardMixF(float base, float blend) {
    return blendVividLightF(base, blend) < 0.5 ? 0.0 : 1.0;
}
float blendReflectF(float base, float blend) {
    return blend == 1.0 ? blend : min(base * base / (1.0 - blend), 1.0);
}

vec3 rgbToHsl(vec3 color) {
    float fmin = min(min(color.r, color.g), color.b);
    float fmax = max(max(color.r, color.g), color.b);
    float delta = fmax - fmin;
    vec3 hsl = vec3(0.0, 0.0, (fmax + fmin) / 2.0);
    if (delta == 0.0) return hsl;
    hsl.y = hsl.z < 0.5
        ? delta / (fmax + fmin)
        : delta / (2.0 - fmax - fmin);
    float deltaR = (((fmax - color.r) / 6.0) + (delta / 2.0)) / delta;
    float deltaG = (((fmax - color.g) / 6.0) + (delta / 2.0)) / delta;
    float deltaB = (((fmax - color.b) / 6.0) + (delta / 2.0)) / delta;
    if (color.r == fmax) hsl.x = deltaB - deltaG;
    else if (color.g == fmax) hsl.x = (1.0 / 3.0) + deltaR - deltaB;
    else hsl.x = (2.0 / 3.0) + deltaG - deltaR;
    if (hsl.x < 0.0) hsl.x += 1.0;
    else if (hsl.x > 1.0) hsl.x -= 1.0;
    return hsl;
}

float hueToRgb(float f1, float f2, float hue) {
    if (hue < 0.0) hue += 1.0;
    else if (hue > 1.0) hue -= 1.0;
    if ((6.0 * hue) < 1.0) return f1 + (f2 - f1) * 6.0 * hue;
    if ((2.0 * hue) < 1.0) return f2;
    if ((3.0 * hue) < 2.0) return f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
    return f1;
}

vec3 hslToRgb(vec3 hsl) {
    if (hsl.y == 0.0) return vec3(hsl.z);
    float f2 = hsl.z < 0.5
        ? hsl.z * (1.0 + hsl.y)
        : (hsl.z + hsl.y) - (hsl.y * hsl.z);
    float f1 = 2.0 * hsl.z - f2;
    return vec3(
        hueToRgb(f1, f2, hsl.x + (1.0 / 3.0)),
        hueToRgb(f1, f2, hsl.x),
        hueToRgb(f1, f2, hsl.x - (1.0 / 3.0))
    );
}

vec3 blendScreen(vec3 base, vec3 blend) {
    return vec3(
        blendScreenF(base.r, blend.r),
        blendScreenF(base.g, blend.g),
        blendScreenF(base.b, blend.b)
    );
}
vec3 blendOverlay(vec3 base, vec3 blend) {
    return vec3(
        blendOverlayF(base.r, blend.r),
        blendOverlayF(base.g, blend.g),
        blendOverlayF(base.b, blend.b)
    );
}
vec3 blendSoftLight(vec3 base, vec3 blend) {
    return vec3(
        blendSoftLightF(base.r, blend.r),
        blendSoftLightF(base.g, blend.g),
        blendSoftLightF(base.b, blend.b)
    );
}
vec3 blendColorDodge(vec3 base, vec3 blend) {
    return vec3(
        blendColorDodgeF(base.r, blend.r),
        blendColorDodgeF(base.g, blend.g),
        blendColorDodgeF(base.b, blend.b)
    );
}
vec3 blendColorBurn(vec3 base, vec3 blend) {
    return vec3(
        blendColorBurnF(base.r, blend.r),
        blendColorBurnF(base.g, blend.g),
        blendColorBurnF(base.b, blend.b)
    );
}
vec3 blendLinearLight(vec3 base, vec3 blend) {
    return vec3(
        blendLinearLightF(base.r, blend.r),
        blendLinearLightF(base.g, blend.g),
        blendLinearLightF(base.b, blend.b)
    );
}
vec3 blendVividLight(vec3 base, vec3 blend) {
    return vec3(
        blendVividLightF(base.r, blend.r),
        blendVividLightF(base.g, blend.g),
        blendVividLightF(base.b, blend.b)
    );
}
vec3 blendPinLight(vec3 base, vec3 blend) {
    return vec3(
        blendPinLightF(base.r, blend.r),
        blendPinLightF(base.g, blend.g),
        blendPinLightF(base.b, blend.b)
    );
}
vec3 blendHardMix(vec3 base, vec3 blend) {
    return vec3(
        blendHardMixF(base.r, blend.r),
        blendHardMixF(base.g, blend.g),
        blendHardMixF(base.b, blend.b)
    );
}
vec3 blendReflect(vec3 base, vec3 blend) {
    return vec3(
        blendReflectF(base.r, blend.r),
        blendReflectF(base.g, blend.g),
        blendReflectF(base.b, blend.b)
    );
}
vec3 blendHue(vec3 base, vec3 blend) {
    vec3 baseHsl = rgbToHsl(base);
    return hslToRgb(vec3(rgbToHsl(blend).r, baseHsl.g, baseHsl.b));
}
vec3 blendSaturation(vec3 base, vec3 blend) {
    vec3 baseHsl = rgbToHsl(base);
    return hslToRgb(vec3(baseHsl.r, rgbToHsl(blend).g, baseHsl.b));
}
vec3 blendColor(vec3 base, vec3 blend) {
    vec3 blendHsl = rgbToHsl(blend);
    return hslToRgb(vec3(blendHsl.r, blendHsl.g, rgbToHsl(base).b));
}
vec3 blendLuminosity(vec3 base, vec3 blend) {
    vec3 baseHsl = rgbToHsl(base);
    return hslToRgb(vec3(baseHsl.r, baseHsl.g, rgbToHsl(blend).b));
}

vec3 applyWeBlend(int mode, vec3 base, vec3 blend, float opacity) {
    if (mode == 1) return mix(base, min(base, blend), opacity);
    if (mode == 2) return mix(base, base * blend, opacity);
    if (mode == 3) return mix(base, blendColorBurn(base, blend), opacity);
    if (mode == 4) return mix(base, max(base + blend - vec3(1.0), vec3(0.0)), opacity);
    if (mode == 5) return min(base, blend);
    if (mode == 6) return mix(base, max(base, blend), opacity);
    if (mode == 7) return mix(base, blendScreen(base, blend), opacity);
    if (mode == 8) return mix(base, blendColorDodge(base, blend), opacity);
    if (mode == 9) return mix(base, min(base + blend, vec3(1.0)), opacity);
    if (mode == 10) return max(base, blend);
    if (mode == 11) return mix(base, blendOverlay(base, blend), opacity);
    if (mode == 12) return mix(base, blendSoftLight(base, blend), opacity);
    if (mode == 13) return mix(base, blendOverlay(blend, base), opacity);
    if (mode == 14) return mix(base, blendVividLight(base, blend), opacity);
    if (mode == 15) return mix(base, blendLinearLight(base, blend), opacity);
    if (mode == 16) return mix(base, blendPinLight(base, blend), opacity);
    if (mode == 17) return mix(base, blendHardMix(base, blend), opacity);
    if (mode == 18) return mix(base, abs(base - blend), opacity);
    if (mode == 19) return mix(base, base + blend - 2.0 * base * blend, opacity);
    if (mode == 20) return mix(base, max(base + blend - vec3(1.0), vec3(0.0)), opacity);
    if (mode == 21) return mix(base, blendReflect(base, blend), opacity);
    if (mode == 22) return mix(base, blendReflect(blend, base), opacity);
    if (mode == 23) return mix(base, min(base, blend) - max(base, blend) + vec3(1.0), opacity);
    if (mode == 24) return mix(base, (base + blend) / 2.0, opacity);
    if (mode == 25) return mix(base, vec3(1.0) - abs(vec3(1.0) - base - blend), opacity);
    if (mode == 26) return mix(base, blendHue(base, blend), opacity);
    if (mode == 27) return mix(base, blendSaturation(base, blend), opacity);
    if (mode == 28) return mix(base, blendColor(base, blend), opacity);
    if (mode == 29) return mix(base, blendLuminosity(base, blend), opacity);
    if (mode == 30) return mix(base, vec3(max(base.r, max(base.g, base.b))) * blend, opacity);
    if (mode == 31) return base + blend * opacity;
    if (mode == 32) return mix(base, base + base * blend, opacity);
    return mix(base, blend, opacity);
}

void main() {
    vec4 rays = texture2D(u_Rays, v_TexCoord);
    vec4 albedo = texture2D(u_Original, v_TexCoord);

    // Mirrors Wallpaper Engine's shine_combine.frag + common_blending.h.
    // Mode 0 replaces the surface with the generated rays; modes 1..32 use
    // ApplyBlending(..., rays.a), then accumulate the generated alpha.
    if (u_BlendMode == 0) {
        gl_FragColor = rays;
        return;
    }
    albedo.rgb = applyWeBlend(u_BlendMode, albedo.rgb, rays.rgb, rays.a);
    albedo.a = clamp(albedo.a + rays.a, 0.0, 1.0);
    gl_FragColor = albedo;
}
`;


const GOD_RAYS_DOWNSAMPLE_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Mask;
uniform bool u_HasMask;
uniform float u_Threshold;

void main() {
    float mask = u_HasMask ? texture2D(u_Mask, v_TexCoord).r : 1.0;
    vec4 sampleColor = texture2D(u_Source, v_TexCoord);

    // TabLab uploads the source premultiplied. WE's canonical God Rays shader
    // multiplies straight-alpha RGB by alpha before thresholding; do not square
    // alpha here when sampling the browser-facing premultiplied source.
    sampleColor.a = 1.0;
    float brightness = dot(vec3(0.11, 0.59, 0.3), sampleColor.rgb);
    gl_FragColor = sampleColor * mask * step(u_Threshold, brightness);
}
`;

const GOD_RAYS_CAST_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform int u_CasterMode;
uniform vec2 u_Center;
uniform float u_Direction;
uniform float u_RayLength;
uniform float u_Intensity;
uniform vec3 u_ColorStart;
uniform vec3 u_ColorEnd;
uniform int u_SampleMode;

vec2 rotate2D(vec2 value, float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return vec2(
        value.x * cosine - value.y * sine,
        value.x * sine + value.y * cosine
    );
}

float sampleCountForMode() {
    if (u_SampleMode == 0) return 30.0;
    if (u_SampleMode == 1) return 50.0;
    return 70.0;
}

void main() {
    vec2 texCoords = v_TexCoord;
    vec2 direction = u_CasterMode == 0
        ? u_Center - texCoords
        : rotate2D(vec2(0.0, -0.5), u_Direction);

    float directionLength = length(direction);
    if (directionLength < 0.000001) {
        gl_FragColor = vec4(0.0);
        return;
    }
    direction /= directionLength;

    float dist = min(directionLength, directionLength * u_RayLength);
    texCoords += direction * dist;

    float sampleCount = sampleCountForMode();
    float sampleDrop = max(1.0, sampleCount - 1.0);
    vec2 stepDirection = direction * dist / sampleDrop;
    vec4 albedo = vec4(0.0);

    for (int i = 0; i < 70; ++i) {
        if (float(i) < sampleCount) {
            vec4 raySample = texture2D(u_Source, texCoords);
            float progress = float(i) / sampleDrop;
            texCoords -= stepDirection;
            raySample.rgb *= mix(u_ColorEnd, u_ColorStart, progress);
            albedo += raySample * progress;
        }
    }

    gl_FragColor = albedo * u_Intensity * 0.1;
}
`;

const RAY_GAUSSIAN_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform vec2 u_Direction;
uniform int u_Kernel;

vec4 kernel13(vec2 uv) {
    vec4 color = texture2D(u_Source, uv - u_Direction * 6.0) * 0.006299;
    color += texture2D(u_Source, uv - u_Direction * 5.0) * 0.017298;
    color += texture2D(u_Source, uv - u_Direction * 4.0) * 0.039533;
    color += texture2D(u_Source, uv - u_Direction * 3.0) * 0.075189;
    color += texture2D(u_Source, uv - u_Direction * 2.0) * 0.119007;
    color += texture2D(u_Source, uv - u_Direction) * 0.156756;
    color += texture2D(u_Source, uv) * 0.171834;
    color += texture2D(u_Source, uv + u_Direction) * 0.156756;
    color += texture2D(u_Source, uv + u_Direction * 2.0) * 0.119007;
    color += texture2D(u_Source, uv + u_Direction * 3.0) * 0.075189;
    color += texture2D(u_Source, uv + u_Direction * 4.0) * 0.039533;
    color += texture2D(u_Source, uv + u_Direction * 5.0) * 0.017298;
    color += texture2D(u_Source, uv + u_Direction * 6.0) * 0.006299;
    return color;
}

vec4 kernel7(vec2 uv) {
    vec4 color = texture2D(u_Source, uv - u_Direction * 3.0) * 0.071303;
    color += texture2D(u_Source, uv - u_Direction * 2.0) * 0.131514;
    color += texture2D(u_Source, uv - u_Direction) * 0.189879;
    color += texture2D(u_Source, uv) * 0.214607;
    color += texture2D(u_Source, uv + u_Direction) * 0.189879;
    color += texture2D(u_Source, uv + u_Direction * 2.0) * 0.131514;
    color += texture2D(u_Source, uv + u_Direction * 3.0) * 0.071303;
    return color;
}

vec4 kernel3(vec2 uv) {
    return texture2D(u_Source, uv - u_Direction) * 0.25
        + texture2D(u_Source, uv) * 0.5
        + texture2D(u_Source, uv + u_Direction) * 0.25;
}

void main() {
    if (u_Kernel == 0) {
        gl_FragColor = kernel13(v_TexCoord);
    } else if (u_Kernel == 1) {
        gl_FragColor = kernel7(v_TexCoord);
    } else {
        gl_FragColor = kernel3(v_TexCoord);
    }
}
`;

const WATER_RIPPLE_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Mask;
uniform sampler2D u_Normal;
uniform bool u_HasMask;
uniform float u_Time;
uniform float u_AnimationSpeed;
uniform float u_Scale;
uniform float u_ScrollSpeed;
uniform float u_Direction;
uniform float u_Ratio;
uniform float u_Strength;
uniform float u_Aspect;

vec2 rotate2D(vec2 value, float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return vec2(
        value.x * cosine - value.y * sine,
        value.x * sine + value.y * cosine
    );
}

void main() {
    float mask = u_HasMask ? texture2D(u_Mask, v_TexCoord).r : 1.0;
    float phase = u_Time * u_AnimationSpeed * u_AnimationSpeed;

    // WE authors ripple UVs in the opposite vertical texture convention.
    // u_Direction has already been reflected at the render-plan boundary.
    vec2 scroll = rotate2D(vec2(0.0, -1.0), u_Direction)
        * u_ScrollSpeed * u_ScrollSpeed * u_Time;

    // These equations are the reflected form of WE's canonical version-1
    // PERSPECTIVE=0 vertex shader. Keeping the phase constants is important
    // when ripple scale is fractional; merely negating Y after scaling changes
    // the repeating normal-map phase.
    vec4 rippleCoords;
    rippleCoords.x = (v_TexCoord.x + phase + scroll.x) * u_Scale * u_Aspect;
    rippleCoords.y = (v_TexCoord.y - 1.0 - phase + scroll.y) * u_Scale * u_Ratio;
    rippleCoords.z = (v_TexCoord.x * 1.333 - phase + scroll.x) * u_Scale * u_Aspect;
    rippleCoords.w = (v_TexCoord.y * 1.333 - 1.333 + phase + scroll.y) * u_Scale * u_Ratio;

    vec3 n1 = texture2D(u_Normal, fract(rippleCoords.xy)).xyz * 2.0 - 1.0;
    vec3 n2 = texture2D(u_Normal, fract(rippleCoords.zw)).xyz * 2.0 - 1.0;
    vec3 normal = normalize(vec3(n1.xy + n2.xy, n1.z));

    // The normal map stores WE-space XY displacement. Reflect its Y component
    // before applying it to the browser-facing source UV.
    normal.y = -normal.y;
    vec2 texCoord = v_TexCoord + normal.xy * u_Strength * u_Strength * mask;
    gl_FragColor = texture2D(u_Source, texCoord);
}
`;

const WATER_WAVES_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Mask;
uniform sampler2D u_TimeOffset;
uniform bool u_HasMask;
uniform bool u_HasTimeOffset;
uniform float u_Time;
uniform float u_Direction;
uniform float u_Speed;
uniform float u_Scale;
uniform float u_Exponent;
uniform float u_Strength;

void main() {
    float sineDirection = sin(u_Direction);
    float cosineDirection = cos(u_Direction);
    vec2 direction = vec2(-sineDirection, cosineDirection);
    vec2 displacementDirection = vec2(direction.y, -direction.x);

    float mask = u_HasMask ? texture2D(u_Mask, v_TexCoord).r : 1.0;
    float distanceValue = u_Time * u_Speed + dot(v_TexCoord, direction) * u_Scale;
    if (u_HasTimeOffset) {
        distanceValue += texture2D(u_TimeOffset, v_TexCoord).r * 6.28318530718;
    }

    float wave = sin(distanceValue);
    float signedWave = sign(wave) * pow(abs(wave), u_Exponent);
    float strength = u_Strength * u_Strength;
    vec2 texCoord = v_TexCoord + signedWave * displacementDirection * strength * mask;
    gl_FragColor = texture2D(u_Source, texCoord);
}
`;

const MAX_RENDER_DIMENSION = 2048;

const loadImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load Wallpaper Engine effect texture: ${url}`));
    image.src = url;
});

const compileShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Unable to allocate WebGL shader.');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) || 'Unknown shader compile error.';
        gl.deleteShader(shader);
        throw new Error(message);
    }
    return shader;
};

const createProgram = (gl: WebGLRenderingContext, fragmentSource: string): WebGLProgram => {
    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error('Unable to allocate WebGL program.');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const message = gl.getProgramInfoLog(program) || 'Unknown program link error.';
        gl.deleteProgram(program);
        throw new Error(message);
    }
    return program;
};

const scaledCanvas = (image: HTMLImageElement, width: number, height: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas is unavailable for Wallpaper Engine texture scaling.');
    context.drawImage(image, 0, 0, width, height);
    return canvas;
};

const usesPackedRg88FlowPngLayout = (image: HTMLImageElement): boolean => {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (sourceWidth <= 0 || sourceHeight <= 0) return false;

    const sampleWidth = Math.min(128, sourceWidth);
    const sampleHeight = Math.min(128, sourceHeight);
    const canvas = document.createElement('canvas');
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const context = canvas.getContext('2d');
    if (!context) return false;

    try {
        // Nearest-neighbor downsampling preserves exact channel relationships.
        // This matters for sparse flow regions that can disappear when a RG88
        // alpha channel is blended into a mostly neutral map.
        context.imageSmoothingEnabled = false;
        context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
        const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
        const sampleCount = sampleWidth * sampleHeight;
        let grayscaleRgbCount = 0;
        let alphaDifferentPixelCount = 0;

        for (let offset = 0; offset < pixels.length; offset += 4) {
            const red = pixels[offset];
            const green = pixels[offset + 1];
            const blue = pixels[offset + 2];
            const alpha = pixels[offset + 3];
            if (
                Math.abs(red - green) <= 1
                && Math.abs(red - blue) <= 1
                && Math.abs(green - blue) <= 1
            ) {
                grayscaleRgbCount += 1;
            }
            if (Math.abs(alpha - red) > 1) alphaDifferentPixelCount += 1;
        }

        // RePKG's RG88 PNG conversion is (G, G, G, R). Direct WE RG maps
        // instead retain distinct R/G color channels. Restrict this heuristic
        // to flow-map inputs so ordinary grayscale/alpha masks are unaffected.
        // A tiny non-zero alpha population is enough: some valid flow maps are
        // neutral almost everywhere and carry direction only in sparse regions.
        return (grayscaleRgbCount / sampleCount) >= 0.999
            && alphaDifferentPixelCount >= Math.max(1, Math.ceil(sampleCount * 0.0001));
    } catch {
        // A tainted/cross-origin image cannot be inspected safely. In that case
        // preserve the direct-RG path rather than failing the whole wallpaper.
        return false;
    }
};

const createNeutralFlowCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas is unavailable for Wallpaper Engine neutral flow map.');
    const imageData = context.createImageData(1, 1);
    // WE decodes a neutral flow vector around 0.498 in both RG channels.
    imageData.data.set([127, 127, 0, 255]);
    context.putImageData(imageData, 0, 0);
    return canvas;
};

const createBuiltinNoiseCanvas = (): HTMLCanvasElement => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas is unavailable for Wallpaper Engine built-in noise.');
    const imageData = context.createImageData(size, size);
    let state = 0x6d2b79f5;
    for (let index = 0; index < imageData.data.length; index += 4) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        const red = state >>> 24;
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        const green = state >>> 24;
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        const blue = state >>> 24;
        imageData.data[index] = red;
        imageData.data[index + 1] = green;
        imageData.data[index + 2] = blue;
        imageData.data[index + 3] = 255;
    }
    context.putImageData(imageData, 0, 0);
    return canvas;
};


const createBuiltinCloudNoiseCanvas = (): HTMLCanvasElement => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas is unavailable for Wallpaper Engine built-in cloud noise.');
    const imageData = context.createImageData(size, size);

    const hash = (x: number, y: number, seed: number): number => {
        let value = (Math.imul(x + seed * 17, 374761393) + Math.imul(y + seed * 31, 668265263)) >>> 0;
        value = Math.imul(value ^ (value >>> 13), 1274126177) >>> 0;
        return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
    };
    const smooth = (value: number): number => value * value * (3 - 2 * value);
    const valueNoise = (x: number, y: number, cells: number, seed: number): number => {
        const gx = x / size * cells;
        const gy = y / size * cells;
        const x0 = Math.floor(gx);
        const y0 = Math.floor(gy);
        const tx = smooth(gx - x0);
        const ty = smooth(gy - y0);
        const wrap = (value: number) => ((value % cells) + cells) % cells;
        const a = hash(wrap(x0), wrap(y0), seed);
        const b = hash(wrap(x0 + 1), wrap(y0), seed);
        const c = hash(wrap(x0), wrap(y0 + 1), seed);
        const d = hash(wrap(x0 + 1), wrap(y0 + 1), seed);
        const top = a + (b - a) * tx;
        const bottom = c + (d - c) * tx;
        return top + (bottom - top) * ty;
    };

    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            let value = 0;
            let amplitude = 1;
            let totalAmplitude = 0;
            for (let octave = 0; octave < 4; octave += 1) {
                value += valueNoise(x, y, 4 << octave, 91 + octave * 37) * amplitude;
                totalAmplitude += amplitude;
                amplitude *= 0.5;
            }
            const gray = Math.round(Math.max(0, Math.min(1, value / totalAmplitude)) * 255);
            const offset = (y * size + x) * 4;
            imageData.data[offset] = gray;
            imageData.data[offset + 1] = gray;
            imageData.data[offset + 2] = gray;
            imageData.data[offset + 3] = 255;
        }
    }
    context.putImageData(imageData, 0, 0);
    return canvas;
};

const isPowerOfTwo = (value: number): boolean => value > 0 && (value & (value - 1)) === 0;

const createTexture = (
    gl: WebGLRenderingContext,
    source: TexImageSource,
    premultiplyAlpha = false,
    repeat = false,
): WebGLTexture => {
    const texture = gl.createTexture();
    if (!texture) throw new Error('Unable to allocate WebGL texture.');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplyAlpha ? 1 : 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const width = 'width' in source ? Number(source.width) : 0;
    const height = 'height' in source ? Number(source.height) : 0;
    const canRepeat = repeat && isPowerOfTwo(width) && isPowerOfTwo(height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, canRepeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, canRepeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    return texture;
};

const updateTexture = (
    gl: WebGLRenderingContext,
    texture: WebGLTexture,
    source: TexImageSource,
    premultiplyAlpha = false,
): void => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplyAlpha ? 1 : 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
};

const createRenderTarget = (
    gl: WebGLRenderingContext,
    width: number,
    height: number,
): { texture: WebGLTexture; framebuffer: WebGLFramebuffer } => {
    const texture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    if (!texture || !framebuffer) throw new Error('Unable to allocate Wallpaper Engine render target.');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error('Wallpaper Engine image-effect framebuffer is incomplete.');
    }
    return { texture, framebuffer };
};

const effectSignature = (effects: RuntimeTextureEffect[]): string => effects.map((effect) => {
    if (effect.kind === 'opacity') {
        return ['opacity', effect.maskPath ?? '', effect.alpha].join(':');
    }
    if (effect.kind === 'scroll') {
        return ['scroll', effect.speedX, effect.speedY, effect.repeat.x, effect.repeat.y].join(':');
    }
    if (effect.kind === 'transform') {
        return [
            'transform',
            effect.offset.x,
            effect.offset.y,
            effect.scale.x,
            effect.scale.y,
            effect.angle,
            effect.repeat ? 1 : 0,
        ].join(':');
    }
    if (effect.kind === 'spin') {
        return [
            'spin',
            effect.center.x,
            effect.center.y,
            effect.speed,
            effect.ratio,
            effect.axis,
            effect.phase,
            effect.size,
            effect.feather,
            effect.repeat ? 1 : 0,
            effect.elliptical ? 1 : 0,
            effect.aspectCorrect ? 1 : 0,
            effect.softMask ? 1 : 0,
        ].join(':');
    }
    if (effect.kind === 'perspective') {
        return [
            'perspective',
            ...effect.points.flatMap((point) => [point.x, point.y]),
            effect.repeat ? 1 : 0,
        ].join(':');
    }
    if (effect.kind === 'foliageSway') {
        return [
            'foliageSway',
            effect.maskPath ?? '',
            effect.noisePath ?? '',
            effect.speed,
            effect.strength,
            effect.phase,
            effect.power,
            effect.noiseScale,
            effect.ratio,
            effect.direction,
        ].join(':');
    }
    if (effect.kind === 'waterFlow') {
        return [
            'waterFlow',
            effect.flowMapPath ?? '',
            effect.phasePath,
            effect.speed,
            effect.strength,
            effect.phaseScale,
            effect.phaseMode,
            effect.feather ?? '',
        ].join(':');
    }
    if (effect.kind === 'shake') {
        return [
            'shake',
            effect.directionMapPath ?? '',
            effect.speed,
            effect.strength,
            effect.friction.x,
            effect.friction.y,
            effect.bounds.x,
            effect.bounds.y,
            effect.directionMode,
        ].join(':');
    }
    if (effect.kind === 'blurPrecise') {
        return [
            'blurPrecise',
            effect.maskPath ?? '',
            effect.scale.x,
            effect.scale.y,
            effect.horizontalKernel,
            effect.verticalKernel,
            effect.blurAlpha ? 1 : 0,
        ].join(':');
    }
    if (effect.kind === 'shimmer') {
        return [
            'shimmer',
            effect.brightness,
            effect.color.r,
            effect.color.g,
            effect.color.b,
            effect.delay,
            effect.direction,
            effect.granularity,
            effect.offset,
            effect.speed,
        ].join(':');
    }
    if (effect.kind === 'shine') {
        return [
            'shine',
            effect.maskPath ?? '',
            effect.noisePath ?? '',
            effect.threshold,
            effect.noiseAmount,
            effect.noiseScale,
            effect.noiseSpeed,
            effect.rayColor.r,
            effect.rayColor.g,
            effect.rayColor.b,
            effect.rayDirection,
            effect.raySpeed,
            effect.rayIntensity,
            effect.rayLength,
            effect.edges,
            effect.sampleMode,
            effect.blurScale.x,
            effect.blurScale.y,
            effect.kernel,
            effect.blendMode,
            effect.copyBackground ? 1 : 0,
            effect.noiseEnabled ? 1 : 0,
        ].join(':');
    }
    if (effect.kind === 'godRays') {
        return [
            'godRays',
            effect.maskPath ?? '',
            effect.threshold,
            effect.caster.mode,
            ...(effect.caster.mode === 'radial'
                ? [effect.caster.center.x, effect.caster.center.y]
                : [effect.caster.direction]),
            effect.rayLength,
            effect.rayIntensity,
            effect.colorStart.r,
            effect.colorStart.g,
            effect.colorStart.b,
            effect.colorEnd.r,
            effect.colorEnd.g,
            effect.colorEnd.b,
            effect.sampleMode,
            effect.blurScale.x,
            effect.blurScale.y,
            effect.kernel,
            effect.blendMode,
        ].join(':');
    }
    if (effect.kind === 'waterRipple') {
        return [
            'waterRipple',
            effect.maskPath ?? '',
            effect.normalPath,
            effect.animationSpeed,
            effect.scale,
            effect.scrollSpeed,
            effect.direction,
            effect.ratio,
            effect.strength,
        ].join(':');
    }
    return [
        'waterWaves',
        effect.maskPath ?? '',
        effect.timeOffsetPath ?? '',
        effect.direction,
        effect.speed,
        effect.scale,
        effect.exponent,
        effect.strength,
    ].join(':');
}).join('|');

export const WeImageEffectLayer: React.FC<WeImageEffectLayerProps> = ({
    src,
    effects,
    className,
    style,
    dataSource,
    dataTiming,
    timeOriginMs,
    onFrame,
}) => {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const latestSrcRef = React.useRef(src);
    const sourceUpdateRef = React.useRef<((url: string) => void) | null>(null);
    const frameCallbackRef = React.useRef<((canvas: HTMLCanvasElement) => void) | undefined>(onFrame);
    const [ready, setReady] = React.useState(false);
    const signature = effectSignature(effects);

    React.useEffect(() => {
        frameCallbackRef.current = onFrame;
    }, [onFrame]);

    React.useEffect(() => {
        latestSrcRef.current = src;
        sourceUpdateRef.current?.(src);
    }, [src]);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || effects.length === 0) return undefined;

        let disposed = false;
        let rafId = 0;
        const deleteTextures: WebGLTexture[] = [];
        const deleteFramebuffers: WebGLFramebuffer[] = [];
        const deletePrograms: WebGLProgram[] = [];
        let gl: WebGLRenderingContext | null = null;
        let buffer: WebGLBuffer | null = null;
        let hasDrawn = false;
        let sourceRevision = 0;
        let failed = false;
        const hasShine = effects.some((effect) => effect.kind === 'shine');
        const hasGodRays = effects.some((effect) => effect.kind === 'godRays');

        setReady(false);

        const fallBackToSource = (error: unknown) => {
            if (disposed || failed) return;
            failed = true;
            if (rafId) {
                window.cancelAnimationFrame(rafId);
                rafId = 0;
            }
            sourceUpdateRef.current = null;
            setReady(false);
            console.warn(
                'Wallpaper Engine image-effect renderer fell back to the source image:',
                {
                    error,
                    effects: effects.map((effect) => effect.kind),
                    shineActive: hasShine,
                    godRaysActive: hasGodRays,
                    source: dataSource,
                },
            );
        };

        const run = async () => {
            const initialSrc = latestSrcRef.current;
            const uniqueUrls = new Set<string>([initialSrc]);
            effects.forEach((effect) => {
                if (effect.kind === 'opacity') {
                    if (effect.maskUrl) uniqueUrls.add(effect.maskUrl);
                } else if (effect.kind === 'waterWaves') {
                    if (effect.maskUrl) uniqueUrls.add(effect.maskUrl);
                    if (effect.timeOffsetUrl) uniqueUrls.add(effect.timeOffsetUrl);
                } else if (effect.kind === 'foliageSway') {
                    if (effect.maskUrl) uniqueUrls.add(effect.maskUrl);
                    if (effect.noiseUrl) uniqueUrls.add(effect.noiseUrl);
                } else if (effect.kind === 'waterFlow') {
                    if (effect.flowMapUrl) uniqueUrls.add(effect.flowMapUrl);
                    if (effect.phaseUrl) uniqueUrls.add(effect.phaseUrl);
                } else if (effect.kind === 'shake') {
                    if (effect.directionMapUrl) uniqueUrls.add(effect.directionMapUrl);
                } else if (effect.kind === 'blurPrecise') {
                    if (effect.maskUrl) uniqueUrls.add(effect.maskUrl);
                } else if (effect.kind === 'shine') {
                    if (effect.maskUrl) uniqueUrls.add(effect.maskUrl);
                    if (effect.noiseUrl) uniqueUrls.add(effect.noiseUrl);
                } else if (effect.kind === 'godRays') {
                    if (effect.maskUrl) uniqueUrls.add(effect.maskUrl);
                } else if (effect.kind === 'waterRipple') {
                    if (effect.maskUrl) uniqueUrls.add(effect.maskUrl);
                    if (effect.normalUrl) uniqueUrls.add(effect.normalUrl);
                }
            });
            const loaded = new Map<string, HTMLImageElement>();
            await Promise.all([...uniqueUrls].map(async (url) => {
                loaded.set(url, await loadImage(url));
            }));
            if (disposed) return;

            const sourceImage = loaded.get(initialSrc);
            if (!sourceImage) throw new Error('Wallpaper Engine image-effect source image is unavailable.');
            const renderScale = Math.min(1, MAX_RENDER_DIMENSION / Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight));
            const renderWidth = Math.max(1, Math.round(sourceImage.naturalWidth * renderScale));
            const renderHeight = Math.max(1, Math.round(sourceImage.naturalHeight * renderScale));
            canvas.width = renderWidth;
            canvas.height = renderHeight;

            gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true });
            if (!gl) throw new Error('WebGL is unavailable for Wallpaper Engine image-effect rendering.');
            gl.viewport(0, 0, renderWidth, renderHeight);

            buffer = gl.createBuffer();
            if (!buffer) throw new Error('Unable to allocate Wallpaper Engine image-effect vertex buffer.');
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

            const opacityProgram = effects.some((effect) => effect.kind === 'opacity')
                ? createProgram(gl, OPACITY_FRAGMENT_SHADER)
                : null;
            const scrollProgram = effects.some((effect) => effect.kind === 'scroll')
                ? createProgram(gl, SCROLL_FRAGMENT_SHADER)
                : null;
            const transformProgram = effects.some((effect) => effect.kind === 'transform')
                ? createProgram(gl, TRANSFORM_FRAGMENT_SHADER)
                : null;
            const spinProgram = effects.some((effect) => effect.kind === 'spin')
                ? createProgram(gl, SPIN_FRAGMENT_SHADER)
                : null;
            const perspectiveProgram = effects.some((effect) => effect.kind === 'perspective')
                ? createProgram(gl, PERSPECTIVE_FRAGMENT_SHADER)
                : null;
            const foliageSwayProgram = effects.some((effect) => effect.kind === 'foliageSway')
                ? createProgram(gl, FOLIAGE_SWAY_FRAGMENT_SHADER)
                : null;
            const waterFlowProgram = effects.some((effect) => effect.kind === 'waterFlow')
                ? createProgram(gl, WATER_FLOW_FRAGMENT_SHADER)
                : null;
            const shakeProgram = effects.some((effect) => effect.kind === 'shake')
                ? createProgram(gl, SHAKE_FRAGMENT_SHADER)
                : null;
            const blurPreciseProgram = effects.some((effect) => effect.kind === 'blurPrecise' || effect.kind === 'shine')
                ? createProgram(gl, BLUR_PRECISE_FRAGMENT_SHADER)
                : null;
            const shimmerProgram = effects.some((effect) => effect.kind === 'shimmer')
                ? createProgram(gl, SHIMMER_FRAGMENT_SHADER)
                : null;
            const shineDownsampleProgram = effects.some((effect) => effect.kind === 'shine')
                ? createProgram(gl, SHINE_DOWNSAMPLE_FRAGMENT_SHADER)
                : null;
            const shineCastProgram = effects.some((effect) => effect.kind === 'shine')
                ? createProgram(gl, SHINE_CAST_FRAGMENT_SHADER)
                : null;
            const godRaysDownsampleProgram = hasGodRays
                ? createProgram(gl, GOD_RAYS_DOWNSAMPLE_FRAGMENT_SHADER)
                : null;
            const godRaysCastProgram = hasGodRays
                ? createProgram(gl, GOD_RAYS_CAST_FRAGMENT_SHADER)
                : null;
            const rayGaussianProgram = hasGodRays
                ? createProgram(gl, RAY_GAUSSIAN_FRAGMENT_SHADER)
                : null;
            const rayCombineProgram = hasShine || hasGodRays
                ? createProgram(gl, RAY_COMBINE_FRAGMENT_SHADER)
                : null;
            const waterRippleProgram = effects.some((effect) => effect.kind === 'waterRipple')
                ? createProgram(gl, WATER_RIPPLE_FRAGMENT_SHADER)
                : null;
            const waterWavesProgram = effects.some((effect) => effect.kind === 'waterWaves')
                ? createProgram(gl, WATER_WAVES_FRAGMENT_SHADER)
                : null;
            if (opacityProgram) deletePrograms.push(opacityProgram);
            if (scrollProgram) deletePrograms.push(scrollProgram);
            if (transformProgram) deletePrograms.push(transformProgram);
            if (spinProgram) deletePrograms.push(spinProgram);
            if (perspectiveProgram) deletePrograms.push(perspectiveProgram);
            if (foliageSwayProgram) deletePrograms.push(foliageSwayProgram);
            if (waterFlowProgram) deletePrograms.push(waterFlowProgram);
            if (shakeProgram) deletePrograms.push(shakeProgram);
            if (blurPreciseProgram) deletePrograms.push(blurPreciseProgram);
            if (shimmerProgram) deletePrograms.push(shimmerProgram);
            if (shineDownsampleProgram) deletePrograms.push(shineDownsampleProgram);
            if (shineCastProgram) deletePrograms.push(shineCastProgram);
            if (godRaysDownsampleProgram) deletePrograms.push(godRaysDownsampleProgram);
            if (godRaysCastProgram) deletePrograms.push(godRaysCastProgram);
            if (rayGaussianProgram) deletePrograms.push(rayGaussianProgram);
            if (rayCombineProgram) deletePrograms.push(rayCombineProgram);
            if (waterRippleProgram) deletePrograms.push(waterRippleProgram);
            if (waterWavesProgram) deletePrograms.push(waterWavesProgram);

            const sourceCanvas = scaledCanvas(sourceImage, renderWidth, renderHeight);
            const sourceContext = sourceCanvas.getContext('2d');
            if (!sourceContext) throw new Error('2D canvas is unavailable for Wallpaper Engine source-frame updates.');
            const sourceTexture = createTexture(gl, sourceCanvas, true);
            deleteTextures.push(sourceTexture);
            const builtinNoiseCanvas = effects.some((effect) => effect.kind === 'foliageSway' && !effect.noiseUrl)
                ? createBuiltinNoiseCanvas()
                : null;
            const builtinNoiseTexture = builtinNoiseCanvas ? createTexture(gl, builtinNoiseCanvas, false, true) : null;
            if (builtinNoiseTexture) deleteTextures.push(builtinNoiseTexture);
            const builtinCloudNoiseCanvas = effects.some((effect) => (
                effect.kind === 'shine' && effect.noiseEnabled && !effect.noiseUrl
            ))
                ? createBuiltinCloudNoiseCanvas()
                : null;
            const builtinCloudNoiseTexture = builtinCloudNoiseCanvas
                ? createTexture(gl, builtinCloudNoiseCanvas, false, true)
                : null;
            if (builtinCloudNoiseTexture) deleteTextures.push(builtinCloudNoiseTexture);
            const neutralFlowTexture = effects.some((effect) => (
                (effect.kind === 'waterFlow' && !effect.flowMapUrl)
                || (effect.kind === 'shake' && !effect.directionMapUrl)
            ))
                ? createTexture(gl, createNeutralFlowCanvas())
                : null;
            if (neutralFlowTexture) deleteTextures.push(neutralFlowTexture);

            const effectTextures = effects.map((effect) => {
                if (effect.kind === 'opacity') {
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    if (maskTexture) deleteTextures.push(maskTexture);
                    return { kind: 'opacity' as const, maskTexture };
                }
                if (effect.kind === 'waterWaves') {
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    const timeOffsetImage = effect.timeOffsetUrl ? loaded.get(effect.timeOffsetUrl) : null;
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    const timeOffsetTexture = timeOffsetImage ? createTexture(gl!, scaledCanvas(timeOffsetImage, renderWidth, renderHeight)) : null;
                    if (maskTexture) deleteTextures.push(maskTexture);
                    if (timeOffsetTexture) deleteTextures.push(timeOffsetTexture);
                    return { kind: 'waterWaves' as const, maskTexture, timeOffsetTexture };
                }
                if (effect.kind === 'foliageSway') {
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    const noiseImage = effect.noiseUrl ? loaded.get(effect.noiseUrl) : null;
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    const noiseTexture = noiseImage ? createTexture(gl!, noiseImage, false, true) : builtinNoiseTexture;
                    if (maskTexture) deleteTextures.push(maskTexture);
                    if (noiseTexture && noiseTexture !== builtinNoiseTexture) deleteTextures.push(noiseTexture);
                    return { kind: 'foliageSway' as const, maskTexture, noiseTexture };
                }
                if (effect.kind === 'waterFlow') {
                    const flowMapImage = effect.flowMapUrl ? loaded.get(effect.flowMapUrl) : null;
                    if (!effect.phaseUrl) throw new Error('Wallpaper Engine water-flow phase URL is unavailable.');
                    const phaseImage = loaded.get(effect.phaseUrl);
                    if (!phaseImage) throw new Error('Wallpaper Engine water-flow phase texture is unavailable.');
                    const flowMapPackedRg88 = flowMapImage ? usesPackedRg88FlowPngLayout(flowMapImage) : false;
                    // Flow maps are vector-data textures. Upload the decoded image directly
                    // instead of routing it through a 2D canvas, where RG88's alpha channel
                    // would be treated as transparency during resampling and could destroy G
                    // values at low/zero alpha. Normalized UV sampling already handles size.
                    const flowMapTexture = flowMapImage
                        ? createTexture(gl!, flowMapImage)
                        : neutralFlowTexture;
                    const phaseTexture = createTexture(gl!, phaseImage, false, true);
                    if (flowMapTexture && flowMapTexture !== neutralFlowTexture) deleteTextures.push(flowMapTexture);
                    deleteTextures.push(phaseTexture);
                    return { kind: 'waterFlow' as const, flowMapTexture, phaseTexture, flowMapPackedRg88 };
                }
                if (effect.kind === 'shake') {
                    const directionMapImage = effect.directionMapUrl ? loaded.get(effect.directionMapUrl) : null;
                    const directionMapPackedRg88 = directionMapImage
                        ? usesPackedRg88FlowPngLayout(directionMapImage)
                        : false;
                    const directionMapTexture = directionMapImage
                        ? createTexture(gl!, directionMapImage)
                        : neutralFlowTexture;
                    if (!directionMapTexture) throw new Error('Wallpaper Engine shake direction map is unavailable.');
                    if (directionMapTexture !== neutralFlowTexture) deleteTextures.push(directionMapTexture);
                    return { kind: 'shake' as const, directionMapTexture, directionMapPackedRg88 };
                }
                if (effect.kind === 'blurPrecise') {
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    if (maskTexture) deleteTextures.push(maskTexture);
                    return { kind: 'blurPrecise' as const, maskTexture };
                }
                if (effect.kind === 'shine') {
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    const noiseImage = effect.noiseUrl ? loaded.get(effect.noiseUrl) : null;
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    const noiseTexture = noiseImage
                        ? createTexture(gl!, noiseImage, false, true)
                        : builtinCloudNoiseTexture;
                    if (maskTexture) deleteTextures.push(maskTexture);
                    if (noiseTexture && noiseTexture !== builtinCloudNoiseTexture) deleteTextures.push(noiseTexture);
                    return { kind: 'shine' as const, maskTexture, noiseTexture };
                }
                if (effect.kind === 'godRays') {
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    if (maskTexture) deleteTextures.push(maskTexture);
                    return { kind: 'godRays' as const, maskTexture };
                }
                if (effect.kind === 'waterRipple') {
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    if (!effect.normalUrl) throw new Error('Wallpaper Engine water-ripple normal URL is unavailable.');
                    const normalImage = loaded.get(effect.normalUrl);
                    if (!normalImage) throw new Error('Wallpaper Engine water-ripple normal texture is unavailable.');
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    const normalTexture = createTexture(gl!, normalImage, false, true);
                    if (maskTexture) deleteTextures.push(maskTexture);
                    deleteTextures.push(normalTexture);
                    return { kind: 'waterRipple' as const, maskTexture, normalTexture };
                }
                return null;
            });

            const perspectiveMatrices = effects.map((effect) => {
                if (effect.kind !== 'perspective') return null;
                const matrix = createPerspectiveQuadToSquareMatrix(effect.points);
                if (!matrix) throw new Error('Wallpaper Engine perspective quad is degenerate.');
                return matrix;
            });

            const renderTargets = effects.length > 1
                ? [createRenderTarget(gl, renderWidth, renderHeight), createRenderTarget(gl, renderWidth, renderHeight)]
                : [];
            renderTargets.forEach((target) => {
                deleteTextures.push(target.texture);
                deleteFramebuffers.push(target.framebuffer);
            });
            // Precise blur is internally two-pass. Keep one dedicated full-size
            // scratch target so its horizontal output never aliases the effect
            // input or the ordinary inter-effect ping-pong target.
            const blurPreciseTarget = effects.some((effect) => effect.kind === 'blurPrecise')
                ? createRenderTarget(gl, renderWidth, renderHeight)
                : null;
            if (blurPreciseTarget) {
                deleteTextures.push(blurPreciseTarget.texture);
                deleteFramebuffers.push(blurPreciseTarget.framebuffer);
            }
            const rayHalfWidth = Math.max(1, Math.round(renderWidth / 2));
            const rayHalfHeight = Math.max(1, Math.round(renderHeight / 2));
            const rayTargets = effects.some((effect) => effect.kind === 'shine' || effect.kind === 'godRays')
                ? [
                    createRenderTarget(gl, rayHalfWidth, rayHalfHeight),
                    createRenderTarget(gl, rayHalfWidth, rayHalfHeight),
                ]
                : null;
            if (rayTargets) {
                rayTargets.forEach((rayTarget) => {
                    deleteTextures.push(rayTarget.texture);
                    deleteFramebuffers.push(rayTarget.framebuffer);
                });
            }

            const opacityLocations = opacityProgram ? {
                position: gl.getAttribLocation(opacityProgram, 'a_Position'),
                source: gl.getUniformLocation(opacityProgram, 'u_Source'),
                mask: gl.getUniformLocation(opacityProgram, 'u_Mask'),
                hasMask: gl.getUniformLocation(opacityProgram, 'u_HasMask'),
                alpha: gl.getUniformLocation(opacityProgram, 'u_Alpha'),
            } : null;
            const scrollLocations = scrollProgram ? {
                position: gl.getAttribLocation(scrollProgram, 'a_Position'),
                source: gl.getUniformLocation(scrollProgram, 'u_Source'),
                time: gl.getUniformLocation(scrollProgram, 'u_Time'),
                speedX: gl.getUniformLocation(scrollProgram, 'u_SpeedX'),
                speedY: gl.getUniformLocation(scrollProgram, 'u_SpeedY'),
                repeat: gl.getUniformLocation(scrollProgram, 'u_Repeat'),
            } : null;
            const transformLocations = transformProgram ? {
                position: gl.getAttribLocation(transformProgram, 'a_Position'),
                source: gl.getUniformLocation(transformProgram, 'u_Source'),
                offset: gl.getUniformLocation(transformProgram, 'u_Offset'),
                scale: gl.getUniformLocation(transformProgram, 'u_Scale'),
                angle: gl.getUniformLocation(transformProgram, 'u_Angle'),
                repeat: gl.getUniformLocation(transformProgram, 'u_Repeat'),
            } : null;
            const spinLocations = spinProgram ? {
                position: gl.getAttribLocation(spinProgram, 'a_Position'),
                source: gl.getUniformLocation(spinProgram, 'u_Source'),
                time: gl.getUniformLocation(spinProgram, 'u_Time'),
                center: gl.getUniformLocation(spinProgram, 'u_Center'),
                speed: gl.getUniformLocation(spinProgram, 'u_Speed'),
                ratio: gl.getUniformLocation(spinProgram, 'u_Ratio'),
                axis: gl.getUniformLocation(spinProgram, 'u_Axis'),
                phase: gl.getUniformLocation(spinProgram, 'u_Phase'),
                size: gl.getUniformLocation(spinProgram, 'u_Size'),
                feather: gl.getUniformLocation(spinProgram, 'u_Feather'),
                aspect: gl.getUniformLocation(spinProgram, 'u_Aspect'),
                repeat: gl.getUniformLocation(spinProgram, 'u_Repeat'),
                elliptical: gl.getUniformLocation(spinProgram, 'u_Elliptical'),
                softMask: gl.getUniformLocation(spinProgram, 'u_SoftMask'),
            } : null;
            const perspectiveLocations = perspectiveProgram ? {
                position: gl.getAttribLocation(perspectiveProgram, 'a_Position'),
                source: gl.getUniformLocation(perspectiveProgram, 'u_Source'),
                matrix: gl.getUniformLocation(perspectiveProgram, 'u_QuadToSquare'),
                repeat: gl.getUniformLocation(perspectiveProgram, 'u_Repeat'),
            } : null;
            const foliageSwayLocations = foliageSwayProgram ? {
                position: gl.getAttribLocation(foliageSwayProgram, 'a_Position'),
                source: gl.getUniformLocation(foliageSwayProgram, 'u_Source'),
                mask: gl.getUniformLocation(foliageSwayProgram, 'u_Mask'),
                noise: gl.getUniformLocation(foliageSwayProgram, 'u_Noise'),
                hasMask: gl.getUniformLocation(foliageSwayProgram, 'u_HasMask'),
                time: gl.getUniformLocation(foliageSwayProgram, 'u_Time'),
                speed: gl.getUniformLocation(foliageSwayProgram, 'u_Speed'),
                strength: gl.getUniformLocation(foliageSwayProgram, 'u_Strength'),
                phase: gl.getUniformLocation(foliageSwayProgram, 'u_Phase'),
                power: gl.getUniformLocation(foliageSwayProgram, 'u_Power'),
                noiseScale: gl.getUniformLocation(foliageSwayProgram, 'u_NoiseScale'),
                ratio: gl.getUniformLocation(foliageSwayProgram, 'u_Ratio'),
                direction: gl.getUniformLocation(foliageSwayProgram, 'u_Direction'),
                aspect: gl.getUniformLocation(foliageSwayProgram, 'u_Aspect'),
            } : null;
            const waterFlowLocations = waterFlowProgram ? {
                position: gl.getAttribLocation(waterFlowProgram, 'a_Position'),
                source: gl.getUniformLocation(waterFlowProgram, 'u_Source'),
                flowMap: gl.getUniformLocation(waterFlowProgram, 'u_FlowMap'),
                phase: gl.getUniformLocation(waterFlowProgram, 'u_Phase'),
                flowMapPackedRg88: gl.getUniformLocation(waterFlowProgram, 'u_FlowMapPackedRg88'),
                time: gl.getUniformLocation(waterFlowProgram, 'u_Time'),
                speed: gl.getUniformLocation(waterFlowProgram, 'u_Speed'),
                strength: gl.getUniformLocation(waterFlowProgram, 'u_Strength'),
                phaseScale: gl.getUniformLocation(waterFlowProgram, 'u_PhaseScale'),
                legacy: gl.getUniformLocation(waterFlowProgram, 'u_Legacy'),
                hasFeather: gl.getUniformLocation(waterFlowProgram, 'u_HasFeather'),
                feather: gl.getUniformLocation(waterFlowProgram, 'u_Feather'),
            } : null;
            const shakeLocations = shakeProgram ? {
                position: gl.getAttribLocation(shakeProgram, 'a_Position'),
                source: gl.getUniformLocation(shakeProgram, 'u_Source'),
                directionMap: gl.getUniformLocation(shakeProgram, 'u_DirectionMap'),
                directionMapPackedRg88: gl.getUniformLocation(shakeProgram, 'u_DirectionMapPackedRg88'),
                time: gl.getUniformLocation(shakeProgram, 'u_Time'),
                speed: gl.getUniformLocation(shakeProgram, 'u_Speed'),
                strength: gl.getUniformLocation(shakeProgram, 'u_Strength'),
                friction: gl.getUniformLocation(shakeProgram, 'u_Friction'),
                bounds: gl.getUniformLocation(shakeProgram, 'u_Bounds'),
                directionMode: gl.getUniformLocation(shakeProgram, 'u_DirectionMode'),
            } : null;
            const blurPreciseLocations = blurPreciseProgram ? {
                position: gl.getAttribLocation(blurPreciseProgram, 'a_Position'),
                source: gl.getUniformLocation(blurPreciseProgram, 'u_Source'),
                original: gl.getUniformLocation(blurPreciseProgram, 'u_Original'),
                mask: gl.getUniformLocation(blurPreciseProgram, 'u_Mask'),
                direction: gl.getUniformLocation(blurPreciseProgram, 'u_Direction'),
                finalPass: gl.getUniformLocation(blurPreciseProgram, 'u_FinalPass'),
                hasMask: gl.getUniformLocation(blurPreciseProgram, 'u_HasMask'),
                blurAlpha: gl.getUniformLocation(blurPreciseProgram, 'u_BlurAlpha'),
            } : null;
            const shimmerLocations = shimmerProgram ? {
                position: gl.getAttribLocation(shimmerProgram, 'a_Position'),
                source: gl.getUniformLocation(shimmerProgram, 'u_Source'),
                time: gl.getUniformLocation(shimmerProgram, 'u_Time'),
                color: gl.getUniformLocation(shimmerProgram, 'u_Color'),
                brightness: gl.getUniformLocation(shimmerProgram, 'u_Brightness'),
                direction: gl.getUniformLocation(shimmerProgram, 'u_Direction'),
                granularity: gl.getUniformLocation(shimmerProgram, 'u_Granularity'),
                offset: gl.getUniformLocation(shimmerProgram, 'u_Offset'),
                speed: gl.getUniformLocation(shimmerProgram, 'u_Speed'),
                delay: gl.getUniformLocation(shimmerProgram, 'u_Delay'),
            } : null;
            const shineDownsampleLocations = shineDownsampleProgram ? {
                position: gl.getAttribLocation(shineDownsampleProgram, 'a_Position'),
                source: gl.getUniformLocation(shineDownsampleProgram, 'u_Source'),
                mask: gl.getUniformLocation(shineDownsampleProgram, 'u_Mask'),
                noise: gl.getUniformLocation(shineDownsampleProgram, 'u_Noise'),
                hasMask: gl.getUniformLocation(shineDownsampleProgram, 'u_HasMask'),
                noiseEnabled: gl.getUniformLocation(shineDownsampleProgram, 'u_NoiseEnabled'),
                time: gl.getUniformLocation(shineDownsampleProgram, 'u_Time'),
                threshold: gl.getUniformLocation(shineDownsampleProgram, 'u_Threshold'),
                noiseAmount: gl.getUniformLocation(shineDownsampleProgram, 'u_NoiseAmount'),
                noiseScale: gl.getUniformLocation(shineDownsampleProgram, 'u_NoiseScale'),
                noiseSpeed: gl.getUniformLocation(shineDownsampleProgram, 'u_NoiseSpeed'),
            } : null;
            const shineCastLocations = shineCastProgram ? {
                position: gl.getAttribLocation(shineCastProgram, 'a_Position'),
                source: gl.getUniformLocation(shineCastProgram, 'u_Source'),
                time: gl.getUniformLocation(shineCastProgram, 'u_Time'),
                direction: gl.getUniformLocation(shineCastProgram, 'u_Direction'),
                speed: gl.getUniformLocation(shineCastProgram, 'u_Speed'),
                rayLength: gl.getUniformLocation(shineCastProgram, 'u_RayLength'),
                intensity: gl.getUniformLocation(shineCastProgram, 'u_Intensity'),
                color: gl.getUniformLocation(shineCastProgram, 'u_Color'),
                aspect: gl.getUniformLocation(shineCastProgram, 'u_Aspect'),
                edges: gl.getUniformLocation(shineCastProgram, 'u_Edges'),
                sampleMode: gl.getUniformLocation(shineCastProgram, 'u_SampleMode'),
            } : null;
            const godRaysDownsampleLocations = godRaysDownsampleProgram ? {
                position: gl.getAttribLocation(godRaysDownsampleProgram, 'a_Position'),
                source: gl.getUniformLocation(godRaysDownsampleProgram, 'u_Source'),
                mask: gl.getUniformLocation(godRaysDownsampleProgram, 'u_Mask'),
                hasMask: gl.getUniformLocation(godRaysDownsampleProgram, 'u_HasMask'),
                threshold: gl.getUniformLocation(godRaysDownsampleProgram, 'u_Threshold'),
            } : null;
            const godRaysCastLocations = godRaysCastProgram ? {
                position: gl.getAttribLocation(godRaysCastProgram, 'a_Position'),
                source: gl.getUniformLocation(godRaysCastProgram, 'u_Source'),
                casterMode: gl.getUniformLocation(godRaysCastProgram, 'u_CasterMode'),
                center: gl.getUniformLocation(godRaysCastProgram, 'u_Center'),
                direction: gl.getUniformLocation(godRaysCastProgram, 'u_Direction'),
                rayLength: gl.getUniformLocation(godRaysCastProgram, 'u_RayLength'),
                intensity: gl.getUniformLocation(godRaysCastProgram, 'u_Intensity'),
                colorStart: gl.getUniformLocation(godRaysCastProgram, 'u_ColorStart'),
                colorEnd: gl.getUniformLocation(godRaysCastProgram, 'u_ColorEnd'),
                sampleMode: gl.getUniformLocation(godRaysCastProgram, 'u_SampleMode'),
            } : null;
            const rayGaussianLocations = rayGaussianProgram ? {
                position: gl.getAttribLocation(rayGaussianProgram, 'a_Position'),
                source: gl.getUniformLocation(rayGaussianProgram, 'u_Source'),
                direction: gl.getUniformLocation(rayGaussianProgram, 'u_Direction'),
                kernel: gl.getUniformLocation(rayGaussianProgram, 'u_Kernel'),
            } : null;
            const rayCombineLocations = rayCombineProgram ? {
                position: gl.getAttribLocation(rayCombineProgram, 'a_Position'),
                rays: gl.getUniformLocation(rayCombineProgram, 'u_Rays'),
                original: gl.getUniformLocation(rayCombineProgram, 'u_Original'),
                blendMode: gl.getUniformLocation(rayCombineProgram, 'u_BlendMode'),
            } : null;
            const waterRippleLocations = waterRippleProgram ? {
                position: gl.getAttribLocation(waterRippleProgram, 'a_Position'),
                source: gl.getUniformLocation(waterRippleProgram, 'u_Source'),
                mask: gl.getUniformLocation(waterRippleProgram, 'u_Mask'),
                normal: gl.getUniformLocation(waterRippleProgram, 'u_Normal'),
                hasMask: gl.getUniformLocation(waterRippleProgram, 'u_HasMask'),
                time: gl.getUniformLocation(waterRippleProgram, 'u_Time'),
                animationSpeed: gl.getUniformLocation(waterRippleProgram, 'u_AnimationSpeed'),
                scale: gl.getUniformLocation(waterRippleProgram, 'u_Scale'),
                scrollSpeed: gl.getUniformLocation(waterRippleProgram, 'u_ScrollSpeed'),
                direction: gl.getUniformLocation(waterRippleProgram, 'u_Direction'),
                ratio: gl.getUniformLocation(waterRippleProgram, 'u_Ratio'),
                strength: gl.getUniformLocation(waterRippleProgram, 'u_Strength'),
                aspect: gl.getUniformLocation(waterRippleProgram, 'u_Aspect'),
            } : null;
            const waterWavesLocations = waterWavesProgram ? {
                position: gl.getAttribLocation(waterWavesProgram, 'a_Position'),
                source: gl.getUniformLocation(waterWavesProgram, 'u_Source'),
                mask: gl.getUniformLocation(waterWavesProgram, 'u_Mask'),
                timeOffset: gl.getUniformLocation(waterWavesProgram, 'u_TimeOffset'),
                hasMask: gl.getUniformLocation(waterWavesProgram, 'u_HasMask'),
                hasTimeOffset: gl.getUniformLocation(waterWavesProgram, 'u_HasTimeOffset'),
                time: gl.getUniformLocation(waterWavesProgram, 'u_Time'),
                direction: gl.getUniformLocation(waterWavesProgram, 'u_Direction'),
                speed: gl.getUniformLocation(waterWavesProgram, 'u_Speed'),
                scale: gl.getUniformLocation(waterWavesProgram, 'u_Scale'),
                exponent: gl.getUniformLocation(waterWavesProgram, 'u_Exponent'),
                strength: gl.getUniformLocation(waterWavesProgram, 'u_Strength'),
            } : null;

            const bindProgram = (program: WebGLProgram, position: number, sourceLocation: WebGLUniformLocation | null) => {
                gl!.useProgram(program);
                gl!.bindBuffer(gl!.ARRAY_BUFFER, buffer);
                gl!.enableVertexAttribArray(position);
                gl!.vertexAttribPointer(position, 2, gl!.FLOAT, false, 0, 0);
                gl!.uniform1i(sourceLocation, 0);
            };

            const requestSourceUpdate = (url: string) => {
                if (url === initialSrc && sourceRevision === 0) return;
                const revision = ++sourceRevision;
                void loadImage(url).then((image) => {
                    if (disposed || revision !== sourceRevision || latestSrcRef.current !== url || !gl) return;
                    sourceContext.clearRect(0, 0, renderWidth, renderHeight);
                    sourceContext.drawImage(image, 0, 0, renderWidth, renderHeight);
                    updateTexture(gl, sourceTexture, sourceCanvas, true);
                }).catch((error) => {
                    if (!disposed && revision === sourceRevision && latestSrcRef.current === url) {
                        console.warn('Wallpaper Engine image-effect renderer retained the previous processed frame:', error);
                    }
                });
            };
            sourceUpdateRef.current = requestSourceUpdate;
            if (latestSrcRef.current !== initialSrc) requestSourceUpdate(latestSrcRef.current);

            const drawSafely = (now: number) => {
                try {
                    draw(now);
                } catch (error) {
                    fallBackToSource(error);
                }
            };

            const draw = (now: number) => {
                if (disposed || failed || !gl) return;
                if (document.hidden) {
                    rafId = window.requestAnimationFrame(drawSafely);
                    return;
                }

                const timeSeconds = Math.max(0, (now - timeOriginMs) / 1000);
                let inputTexture = sourceTexture;

                effects.forEach((effect, index) => {
                    const last = index === effects.length - 1;
                    const target = last ? null : renderTargets[index % 2];
                    gl!.bindFramebuffer(gl!.FRAMEBUFFER, target?.framebuffer ?? null);
                    gl!.viewport(0, 0, renderWidth, renderHeight);
                    gl!.activeTexture(gl!.TEXTURE0);
                    gl!.bindTexture(gl!.TEXTURE_2D, inputTexture);


                    if (effect.kind === 'shine') {
                        const textures = effectTextures[index];
                        if (
                            !shineDownsampleProgram
                            || !shineDownsampleLocations
                            || !shineCastProgram
                            || !shineCastLocations
                            || !rayCombineProgram
                            || !rayCombineLocations
                            || !blurPreciseProgram
                            || !blurPreciseLocations
                            || !rayTargets
                            || !textures
                            || textures.kind !== 'shine'
                            || effect.kernel !== 0
                            || effect.blendMode < 0
                            || effect.blendMode > 32
                            || effect.copyBackground
                            || (effect.noiseEnabled && !textures.noiseTexture)
                        ) {
                            throw new Error('Wallpaper Engine shine multipass program is unavailable.');
                        }

                        const effectInputTexture = inputTexture;
                        const [halfTarget1, halfTarget2] = rayTargets;

                        // Pass 0: threshold/mask/noise extraction -> half-size FBO 1.
                        gl!.bindFramebuffer(gl!.FRAMEBUFFER, halfTarget1.framebuffer);
                        gl!.viewport(0, 0, rayHalfWidth, rayHalfHeight);
                        gl!.activeTexture(gl!.TEXTURE0);
                        gl!.bindTexture(gl!.TEXTURE_2D, effectInputTexture);
                        bindProgram(shineDownsampleProgram, shineDownsampleLocations.position, shineDownsampleLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.noiseTexture);
                        gl!.uniform1i(shineDownsampleLocations.mask, 1);
                        gl!.uniform1i(shineDownsampleLocations.noise, 2);
                        gl!.uniform1i(shineDownsampleLocations.hasMask, textures.maskTexture ? 1 : 0);
                        gl!.uniform1i(shineDownsampleLocations.noiseEnabled, effect.noiseEnabled ? 1 : 0);
                        gl!.uniform1f(shineDownsampleLocations.time, timeSeconds);
                        gl!.uniform1f(shineDownsampleLocations.threshold, effect.threshold);
                        gl!.uniform1f(shineDownsampleLocations.noiseAmount, effect.noiseAmount);
                        gl!.uniform1f(shineDownsampleLocations.noiseScale, effect.noiseScale);
                        gl!.uniform1f(shineDownsampleLocations.noiseSpeed, effect.noiseSpeed);
                        gl!.drawArrays(gl!.TRIANGLES, 0, 6);

                        // Pass 1: directional ray casting -> half-size FBO 2.
                        gl!.bindFramebuffer(gl!.FRAMEBUFFER, halfTarget2.framebuffer);
                        gl!.viewport(0, 0, rayHalfWidth, rayHalfHeight);
                        gl!.activeTexture(gl!.TEXTURE0);
                        gl!.bindTexture(gl!.TEXTURE_2D, halfTarget1.texture);
                        bindProgram(shineCastProgram, shineCastLocations.position, shineCastLocations.source);
                        gl!.uniform1f(shineCastLocations.time, timeSeconds);
                        gl!.uniform1f(shineCastLocations.direction, effect.rayDirection);
                        gl!.uniform1f(shineCastLocations.speed, effect.raySpeed);
                        gl!.uniform1f(shineCastLocations.rayLength, effect.rayLength);
                        gl!.uniform1f(shineCastLocations.intensity, effect.rayIntensity);
                        gl!.uniform3f(
                            shineCastLocations.color,
                            effect.rayColor.r,
                            effect.rayColor.g,
                            effect.rayColor.b,
                        );
                        gl!.uniform1f(shineCastLocations.aspect, rayHalfWidth / rayHalfHeight);
                        gl!.uniform1i(shineCastLocations.edges, effect.edges);
                        gl!.uniform1i(shineCastLocations.sampleMode, effect.sampleMode);
                        gl!.drawArrays(gl!.TRIANGLES, 0, 6);

                        // Passes 2/3: canonical KERNEL=0 Gaussian blur on the half-size rays.
                        gl!.bindFramebuffer(gl!.FRAMEBUFFER, halfTarget1.framebuffer);
                        gl!.viewport(0, 0, rayHalfWidth, rayHalfHeight);
                        gl!.activeTexture(gl!.TEXTURE0);
                        gl!.bindTexture(gl!.TEXTURE_2D, halfTarget2.texture);
                        bindProgram(blurPreciseProgram, blurPreciseLocations.position, blurPreciseLocations.source);
                        gl!.uniform2f(blurPreciseLocations.direction, effect.blurScale.x / rayHalfWidth, 0);
                        gl!.uniform1i(blurPreciseLocations.finalPass, 0);
                        gl!.uniform1i(blurPreciseLocations.hasMask, 0);
                        gl!.uniform1i(blurPreciseLocations.blurAlpha, 1);
                        gl!.drawArrays(gl!.TRIANGLES, 0, 6);

                        gl!.bindFramebuffer(gl!.FRAMEBUFFER, halfTarget2.framebuffer);
                        gl!.viewport(0, 0, rayHalfWidth, rayHalfHeight);
                        gl!.activeTexture(gl!.TEXTURE0);
                        gl!.bindTexture(gl!.TEXTURE_2D, halfTarget1.texture);
                        bindProgram(blurPreciseProgram, blurPreciseLocations.position, blurPreciseLocations.source);
                        gl!.uniform2f(blurPreciseLocations.direction, 0, effect.blurScale.y / rayHalfHeight);
                        gl!.uniform1i(blurPreciseLocations.finalPass, 0);
                        gl!.uniform1i(blurPreciseLocations.hasMask, 0);
                        gl!.uniform1i(blurPreciseLocations.blurAlpha, 1);
                        gl!.drawArrays(gl!.TRIANGLES, 0, 6);

                        // Pass 4: combine rays with the pre-effect full-size source.
                        gl!.bindFramebuffer(gl!.FRAMEBUFFER, target?.framebuffer ?? null);
                        gl!.viewport(0, 0, renderWidth, renderHeight);
                        gl!.activeTexture(gl!.TEXTURE0);
                        gl!.bindTexture(gl!.TEXTURE_2D, halfTarget2.texture);
                        bindProgram(rayCombineProgram, rayCombineLocations.position, rayCombineLocations.rays);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, effectInputTexture);
                        gl!.uniform1i(rayCombineLocations.original, 1);
                        gl!.uniform1i(rayCombineLocations.blendMode, effect.blendMode);
                        gl!.drawArrays(gl!.TRIANGLES, 0, 6);

                        if (target) inputTexture = target.texture;
                        return;
                    }

                    if (effect.kind === 'godRays') {
                        const textures = effectTextures[index];
                        if (
                            !godRaysDownsampleProgram
                            || !godRaysDownsampleLocations
                            || !godRaysCastProgram
                            || !godRaysCastLocations
                            || !rayGaussianProgram
                            || !rayGaussianLocations
                            || !rayCombineProgram
                            || !rayCombineLocations
                            || !rayTargets
                            || !textures
                            || textures.kind !== 'godRays'
                            || effect.blendMode < 0
                            || effect.blendMode > 32
                        ) {
                            throw new Error('Wallpaper Engine God Rays multipass program is unavailable.');
                        }

                        const effectInputTexture = inputTexture;
                        const [halfTarget1, halfTarget2] = rayTargets;

                        // Pass 0: opacity-mask + luminance threshold extraction -> shared half-size FBO 1.
                        gl!.bindFramebuffer(gl!.FRAMEBUFFER, halfTarget1.framebuffer);
                        gl!.viewport(0, 0, rayHalfWidth, rayHalfHeight);
                        gl!.activeTexture(gl!.TEXTURE0);
                        gl!.bindTexture(gl!.TEXTURE_2D, effectInputTexture);
                        bindProgram(
                            godRaysDownsampleProgram,
                            godRaysDownsampleLocations.position,
                            godRaysDownsampleLocations.source,
                        );
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.uniform1i(godRaysDownsampleLocations.mask, 1);
                        gl!.uniform1i(godRaysDownsampleLocations.hasMask, textures.maskTexture ? 1 : 0);
                        gl!.uniform1f(godRaysDownsampleLocations.threshold, effect.threshold);
                        gl!.drawArrays(gl!.TRIANGLES, 0, 6);

                        // Pass 1: canonical radial/directional God Rays cast -> shared half-size FBO 2.
                        gl!.bindFramebuffer(gl!.FRAMEBUFFER, halfTarget2.framebuffer);
                        gl!.viewport(0, 0, rayHalfWidth, rayHalfHeight);
                        gl!.activeTexture(gl!.TEXTURE0);
                        gl!.bindTexture(gl!.TEXTURE_2D, halfTarget1.texture);
                        bindProgram(godRaysCastProgram, godRaysCastLocations.position, godRaysCastLocations.source);
                        if (effect.caster.mode === 'radial') {
                            gl!.uniform1i(godRaysCastLocations.casterMode, 0);
                            gl!.uniform2f(
                                godRaysCastLocations.center,
                                effect.caster.center.x,
                                effect.caster.center.y,
                            );
                            gl!.uniform1f(godRaysCastLocations.direction, 0);
                        } else {
                            gl!.uniform1i(godRaysCastLocations.casterMode, 1);
                            gl!.uniform2f(godRaysCastLocations.center, 0.5, 0.5);
                            gl!.uniform1f(godRaysCastLocations.direction, effect.caster.direction);
                        }
                        gl!.uniform1f(godRaysCastLocations.rayLength, effect.rayLength);
                        gl!.uniform1f(godRaysCastLocations.intensity, effect.rayIntensity);
                        gl!.uniform3f(
                            godRaysCastLocations.colorStart,
                            effect.colorStart.r,
                            effect.colorStart.g,
                            effect.colorStart.b,
                        );
                        gl!.uniform3f(
                            godRaysCastLocations.colorEnd,
                            effect.colorEnd.r,
                            effect.colorEnd.g,
                            effect.colorEnd.b,
                        );
                        gl!.uniform1i(godRaysCastLocations.sampleMode, effect.sampleMode);
                        gl!.drawArrays(gl!.TRIANGLES, 0, 6);

                        // Passes 2/3: God Rays' own 13/7/3-tap Gaussian generation.
                        gl!.bindFramebuffer(gl!.FRAMEBUFFER, halfTarget1.framebuffer);
                        gl!.viewport(0, 0, rayHalfWidth, rayHalfHeight);
                        gl!.activeTexture(gl!.TEXTURE0);
                        gl!.bindTexture(gl!.TEXTURE_2D, halfTarget2.texture);
                        bindProgram(rayGaussianProgram, rayGaussianLocations.position, rayGaussianLocations.source);
                        gl!.uniform2f(rayGaussianLocations.direction, effect.blurScale.x / rayHalfWidth, 0);
                        gl!.uniform1i(rayGaussianLocations.kernel, effect.kernel);
                        gl!.drawArrays(gl!.TRIANGLES, 0, 6);

                        gl!.bindFramebuffer(gl!.FRAMEBUFFER, halfTarget2.framebuffer);
                        gl!.viewport(0, 0, rayHalfWidth, rayHalfHeight);
                        gl!.activeTexture(gl!.TEXTURE0);
                        gl!.bindTexture(gl!.TEXTURE_2D, halfTarget1.texture);
                        bindProgram(rayGaussianProgram, rayGaussianLocations.position, rayGaussianLocations.source);
                        gl!.uniform2f(rayGaussianLocations.direction, 0, effect.blurScale.y / rayHalfHeight);
                        gl!.uniform1i(rayGaussianLocations.kernel, effect.kernel);
                        gl!.drawArrays(gl!.TRIANGLES, 0, 6);

                        // Pass 4: combine with Wallpaper Engine's authored common_blending.h mode.
                        gl!.bindFramebuffer(gl!.FRAMEBUFFER, target?.framebuffer ?? null);
                        gl!.viewport(0, 0, renderWidth, renderHeight);
                        gl!.activeTexture(gl!.TEXTURE0);
                        gl!.bindTexture(gl!.TEXTURE_2D, halfTarget2.texture);
                        bindProgram(rayCombineProgram, rayCombineLocations.position, rayCombineLocations.rays);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, effectInputTexture);
                        gl!.uniform1i(rayCombineLocations.original, 1);
                        gl!.uniform1i(rayCombineLocations.blendMode, effect.blendMode);
                        gl!.drawArrays(gl!.TRIANGLES, 0, 6);

                        if (target) inputTexture = target.texture;
                        return;
                    }

                    if (effect.kind === 'blurPrecise') {
                        const textures = effectTextures[index];
                        if (
                            !blurPreciseProgram
                            || !blurPreciseLocations
                            || !blurPreciseTarget
                            || !textures
                            || textures.kind !== 'blurPrecise'
                            || effect.horizontalKernel !== 0
                            || effect.verticalKernel !== 0
                        ) {
                            throw new Error('Wallpaper Engine precise-blur program is unavailable.');
                        }

                        const effectInputTexture = inputTexture;

                        // Pass 0: horizontal Gaussian -> dedicated named-target equivalent.
                        gl!.bindFramebuffer(gl!.FRAMEBUFFER, blurPreciseTarget.framebuffer);
                        gl!.viewport(0, 0, renderWidth, renderHeight);
                        gl!.activeTexture(gl!.TEXTURE0);
                        gl!.bindTexture(gl!.TEXTURE_2D, effectInputTexture);
                        bindProgram(blurPreciseProgram, blurPreciseLocations.position, blurPreciseLocations.source);
                        gl!.uniform2f(blurPreciseLocations.direction, effect.scale.x / renderWidth, 0);
                        gl!.uniform1i(blurPreciseLocations.finalPass, 0);
                        gl!.uniform1i(blurPreciseLocations.hasMask, 0);
                        gl!.uniform1i(blurPreciseLocations.blurAlpha, 1);
                        gl!.drawArrays(gl!.TRIANGLES, 0, 6);

                        // Pass 1: vertical Gaussian -> ordinary effect-chain output. WE binds
                        // the horizontal FBO as texture0 and the pre-effect source as
                        // `previous`/texture1 so mask and alpha-preserve semantics can mix
                        // against the unblurred input.
                        gl!.bindFramebuffer(gl!.FRAMEBUFFER, target?.framebuffer ?? null);
                        gl!.viewport(0, 0, renderWidth, renderHeight);
                        gl!.activeTexture(gl!.TEXTURE0);
                        gl!.bindTexture(gl!.TEXTURE_2D, blurPreciseTarget.texture);
                        bindProgram(blurPreciseProgram, blurPreciseLocations.position, blurPreciseLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, effectInputTexture);
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.uniform1i(blurPreciseLocations.original, 1);
                        gl!.uniform1i(blurPreciseLocations.mask, 2);
                        gl!.uniform2f(blurPreciseLocations.direction, 0, effect.scale.y / renderHeight);
                        gl!.uniform1i(blurPreciseLocations.finalPass, 1);
                        gl!.uniform1i(blurPreciseLocations.hasMask, textures.maskTexture ? 1 : 0);
                        gl!.uniform1i(blurPreciseLocations.blurAlpha, effect.blurAlpha ? 1 : 0);
                        gl!.drawArrays(gl!.TRIANGLES, 0, 6);
                        if (target) inputTexture = target.texture;
                        return;
                    }

                    if (effect.kind === 'opacity') {
                        const textures = effectTextures[index];
                        if (!opacityProgram || !opacityLocations || !textures || textures.kind !== 'opacity') {
                            throw new Error('Wallpaper Engine opacity program is unavailable.');
                        }
                        bindProgram(opacityProgram, opacityLocations.position, opacityLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.uniform1i(opacityLocations.mask, 1);
                        gl!.uniform1i(opacityLocations.hasMask, textures.maskTexture ? 1 : 0);
                        gl!.uniform1f(opacityLocations.alpha, effect.alpha);
                    } else if (effect.kind === 'scroll') {
                        if (!scrollProgram || !scrollLocations) {
                            throw new Error('Wallpaper Engine scroll program is unavailable.');
                        }
                        bindProgram(scrollProgram, scrollLocations.position, scrollLocations.source);
                        gl!.uniform1f(scrollLocations.time, timeSeconds);
                        gl!.uniform1f(scrollLocations.speedX, effect.speedX);
                        gl!.uniform1f(scrollLocations.speedY, effect.speedY);
                        gl!.uniform2f(scrollLocations.repeat, effect.repeat.x, effect.repeat.y);
                    } else if (effect.kind === 'transform') {
                        if (!transformProgram || !transformLocations) {
                            throw new Error('Wallpaper Engine transform program is unavailable.');
                        }
                        bindProgram(transformProgram, transformLocations.position, transformLocations.source);
                        gl!.uniform2f(transformLocations.offset, effect.offset.x, effect.offset.y);
                        gl!.uniform2f(transformLocations.scale, effect.scale.x, effect.scale.y);
                        gl!.uniform1f(transformLocations.angle, effect.angle);
                        gl!.uniform1i(transformLocations.repeat, effect.repeat ? 1 : 0);
                    } else if (effect.kind === 'spin') {
                        if (!spinProgram || !spinLocations) {
                            throw new Error('Wallpaper Engine spin program is unavailable.');
                        }
                        bindProgram(spinProgram, spinLocations.position, spinLocations.source);
                        gl!.uniform1f(spinLocations.time, timeSeconds);
                        gl!.uniform2f(spinLocations.center, effect.center.x, effect.center.y);
                        gl!.uniform1f(spinLocations.speed, effect.speed);
                        gl!.uniform1f(spinLocations.ratio, effect.ratio);
                        gl!.uniform1f(spinLocations.axis, effect.axis);
                        gl!.uniform1f(spinLocations.phase, effect.phase);
                        gl!.uniform1f(spinLocations.size, effect.size);
                        gl!.uniform1f(spinLocations.feather, effect.feather);
                        gl!.uniform1f(spinLocations.aspect, effect.aspectCorrect ? renderWidth / renderHeight : 1);
                        gl!.uniform1i(spinLocations.repeat, effect.repeat ? 1 : 0);
                        gl!.uniform1i(spinLocations.elliptical, effect.elliptical ? 1 : 0);
                        gl!.uniform1i(spinLocations.softMask, effect.softMask ? 1 : 0);
                    } else if (effect.kind === 'perspective') {
                        const matrix = perspectiveMatrices[index];
                        if (!perspectiveProgram || !perspectiveLocations || !matrix) {
                            throw new Error('Wallpaper Engine perspective program is unavailable.');
                        }
                        bindProgram(perspectiveProgram, perspectiveLocations.position, perspectiveLocations.source);
                        gl!.uniformMatrix3fv(perspectiveLocations.matrix, false, matrix);
                        gl!.uniform1i(perspectiveLocations.repeat, effect.repeat ? 1 : 0);
                    } else if (effect.kind === 'foliageSway') {
                        const textures = effectTextures[index];
                        if (
                            !foliageSwayProgram
                            || !foliageSwayLocations
                            || !textures
                            || textures.kind !== 'foliageSway'
                            || !textures.noiseTexture
                        ) {
                            throw new Error('Wallpaper Engine foliage-sway program is unavailable.');
                        }
                        bindProgram(foliageSwayProgram, foliageSwayLocations.position, foliageSwayLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.noiseTexture);
                        gl!.uniform1i(foliageSwayLocations.mask, 1);
                        gl!.uniform1i(foliageSwayLocations.noise, 2);
                        gl!.uniform1i(foliageSwayLocations.hasMask, textures.maskTexture ? 1 : 0);
                        gl!.uniform1f(foliageSwayLocations.time, timeSeconds);
                        gl!.uniform1f(foliageSwayLocations.speed, effect.speed);
                        gl!.uniform1f(foliageSwayLocations.strength, effect.strength);
                        gl!.uniform1f(foliageSwayLocations.phase, effect.phase);
                        gl!.uniform1f(foliageSwayLocations.power, effect.power);
                        gl!.uniform1f(foliageSwayLocations.noiseScale, effect.noiseScale);
                        gl!.uniform1f(foliageSwayLocations.ratio, effect.ratio);
                        gl!.uniform1f(foliageSwayLocations.direction, effect.direction);
                        gl!.uniform1f(foliageSwayLocations.aspect, renderWidth / renderHeight);
                    } else if (effect.kind === 'waterFlow') {
                        const textures = effectTextures[index];
                        if (
                            !waterFlowProgram
                            || !waterFlowLocations
                            || !textures
                            || textures.kind !== 'waterFlow'
                            || !textures.flowMapTexture
                        ) {
                            throw new Error('Wallpaper Engine water-flow program is unavailable.');
                        }
                        bindProgram(waterFlowProgram, waterFlowLocations.position, waterFlowLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.flowMapTexture);
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.phaseTexture);
                        gl!.uniform1i(waterFlowLocations.flowMap, 1);
                        gl!.uniform1i(waterFlowLocations.phase, 2);
                        gl!.uniform1i(waterFlowLocations.flowMapPackedRg88, textures.flowMapPackedRg88 ? 1 : 0);
                        gl!.uniform1f(waterFlowLocations.time, timeSeconds);
                        gl!.uniform1f(waterFlowLocations.speed, effect.speed);
                        gl!.uniform1f(waterFlowLocations.strength, effect.strength);
                        gl!.uniform1f(waterFlowLocations.phaseScale, effect.phaseScale);
                        gl!.uniform1i(waterFlowLocations.legacy, effect.phaseMode === 'legacy' ? 1 : 0);
                        gl!.uniform1i(waterFlowLocations.hasFeather, effect.feather === null ? 0 : 1);
                        gl!.uniform1f(waterFlowLocations.feather, effect.feather ?? 0);
                    } else if (effect.kind === 'shake') {
                        const textures = effectTextures[index];
                        if (
                            !shakeProgram
                            || !shakeLocations
                            || !textures
                            || textures.kind !== 'shake'
                            || !textures.directionMapTexture
                        ) {
                            throw new Error('Wallpaper Engine shake program is unavailable.');
                        }
                        bindProgram(shakeProgram, shakeLocations.position, shakeLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.directionMapTexture);
                        gl!.uniform1i(shakeLocations.directionMap, 1);
                        gl!.uniform1i(shakeLocations.directionMapPackedRg88, textures.directionMapPackedRg88 ? 1 : 0);
                        gl!.uniform1f(shakeLocations.time, timeSeconds);
                        gl!.uniform1f(shakeLocations.speed, effect.speed);
                        gl!.uniform1f(shakeLocations.strength, effect.strength);
                        gl!.uniform2f(shakeLocations.friction, effect.friction.x, effect.friction.y);
                        gl!.uniform2f(shakeLocations.bounds, effect.bounds.x, effect.bounds.y);
                        gl!.uniform1f(shakeLocations.directionMode, effect.directionMode);
                    } else if (effect.kind === 'shimmer') {
                        if (!shimmerProgram || !shimmerLocations) {
                            throw new Error('Wallpaper Engine shimmer program is unavailable.');
                        }
                        bindProgram(shimmerProgram, shimmerLocations.position, shimmerLocations.source);
                        gl!.uniform1f(shimmerLocations.time, timeSeconds);
                        gl!.uniform3f(shimmerLocations.color, effect.color.r, effect.color.g, effect.color.b);
                        gl!.uniform1f(shimmerLocations.brightness, effect.brightness);
                        gl!.uniform1f(shimmerLocations.direction, effect.direction);
                        gl!.uniform1f(shimmerLocations.granularity, effect.granularity);
                        gl!.uniform1f(shimmerLocations.offset, effect.offset);
                        gl!.uniform1f(shimmerLocations.speed, effect.speed);
                        gl!.uniform1f(shimmerLocations.delay, effect.delay);
                    } else if (effect.kind === 'waterRipple') {
                        const textures = effectTextures[index];
                        if (
                            !waterRippleProgram
                            || !waterRippleLocations
                            || !textures
                            || textures.kind !== 'waterRipple'
                            || !textures.normalTexture
                        ) {
                            throw new Error('Wallpaper Engine water-ripple program is unavailable.');
                        }
                        bindProgram(waterRippleProgram, waterRippleLocations.position, waterRippleLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.normalTexture);
                        gl!.uniform1i(waterRippleLocations.mask, 1);
                        gl!.uniform1i(waterRippleLocations.normal, 2);
                        gl!.uniform1i(waterRippleLocations.hasMask, textures.maskTexture ? 1 : 0);
                        gl!.uniform1f(waterRippleLocations.time, timeSeconds);
                        gl!.uniform1f(waterRippleLocations.animationSpeed, effect.animationSpeed);
                        gl!.uniform1f(waterRippleLocations.scale, effect.scale);
                        gl!.uniform1f(waterRippleLocations.scrollSpeed, effect.scrollSpeed);
                        gl!.uniform1f(waterRippleLocations.direction, effect.direction);
                        gl!.uniform1f(waterRippleLocations.ratio, effect.ratio);
                        gl!.uniform1f(waterRippleLocations.strength, effect.strength);
                        gl!.uniform1f(waterRippleLocations.aspect, renderWidth / renderHeight);
                    } else {
                        const textures = effectTextures[index];
                        if (!waterWavesProgram || !waterWavesLocations || !textures || textures.kind !== 'waterWaves') {
                            throw new Error('Wallpaper Engine water-waves program is unavailable.');
                        }
                        bindProgram(waterWavesProgram, waterWavesLocations.position, waterWavesLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.timeOffsetTexture);
                        gl!.uniform1i(waterWavesLocations.mask, 1);
                        gl!.uniform1i(waterWavesLocations.timeOffset, 2);
                        gl!.uniform1i(waterWavesLocations.hasMask, textures.maskTexture ? 1 : 0);
                        gl!.uniform1i(waterWavesLocations.hasTimeOffset, textures.timeOffsetTexture ? 1 : 0);
                        gl!.uniform1f(waterWavesLocations.time, timeSeconds);
                        gl!.uniform1f(waterWavesLocations.direction, effect.direction);
                        gl!.uniform1f(waterWavesLocations.speed, effect.speed);
                        gl!.uniform1f(waterWavesLocations.scale, effect.scale);
                        gl!.uniform1f(waterWavesLocations.exponent, effect.exponent);
                        gl!.uniform1f(waterWavesLocations.strength, effect.strength);
                    }

                    gl!.drawArrays(gl!.TRIANGLES, 0, 6);
                    if (target) inputTexture = target.texture;
                });

                const frameCallback = frameCallbackRef.current;
                if (frameCallback) {
                    // A processed puppet atlas is consumed by a second WebGL context.
                    // Flush before exposing this canvas so texImage2D observes the
                    // completed effect chain rather than a partially queued frame.
                    gl!.flush();
                    frameCallback(canvas);
                }

                if (!hasDrawn) {
                    hasDrawn = true;
                    setReady(true);
                    if (hasShine) {
                        console.debug('Wallpaper Engine shine renderer produced its first frame.', {
                            effects: effects.filter((effect) => effect.kind === 'shine').length,
                            renderSize: `${renderWidth}x${renderHeight}`,
                            source: dataSource,
                        });
                    }
                }
                rafId = window.requestAnimationFrame(drawSafely);
            };
            rafId = window.requestAnimationFrame(drawSafely);
        };

        void run().catch(fallBackToSource);

        return () => {
            disposed = true;
            sourceRevision += 1;
            sourceUpdateRef.current = null;
            if (rafId) window.cancelAnimationFrame(rafId);
            if (gl) {
                deleteTextures.forEach((texture) => gl!.deleteTexture(texture));
                deleteFramebuffers.forEach((framebuffer) => gl!.deleteFramebuffer(framebuffer));
                deletePrograms.forEach((program) => gl!.deleteProgram(program));
                if (buffer) gl.deleteBuffer(buffer);
            }
        };
    }, [signature, timeOriginMs]);

    return (
        <>
            {!ready && (
                <img
                    src={src}
                    alt=""
                    draggable={false}
                    className={className}
                    data-we-source={dataSource}
                    data-we-timing={dataTiming}
                    style={style}
                />
            )}
            <canvas
                ref={canvasRef}
                className={className}
                data-we-source={dataSource}
                data-we-effect={effects.map((effect) => effect.kind).join(',')}
                data-we-timing={dataTiming}
                style={{ ...style, visibility: ready ? 'visible' : 'hidden' }}
            />
        </>
    );
};
