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
    | (Extract<ImportedWeTextureEffect, { kind: 'iris' }> & {
        maskUrl: string | null;
    })
    | (Extract<ImportedWeTextureEffect, { kind: 'cloudMotion' }> & {
        maskUrl: string | null;
        noiseUrl: string | null;
    })
    | Extract<ImportedWeTextureEffect, { kind: 'skew' }>
    | (Extract<ImportedWeTextureEffect, { kind: 'swing' }> & {
        maskUrl: string | null;
        noiseUrl: string | null;
    })
    | (Extract<ImportedWeTextureEffect, { kind: 'filmGrain' }> & {
        maskUrl: string | null;
        noiseUrl: string | null;
    })
    | (Extract<ImportedWeTextureEffect, { kind: 'pulse' }> & {
        maskUrl: string | null;
    })
    | (Extract<ImportedWeTextureEffect, { kind: 'clouds' }> & {
        cloudUrl: string | null;
        maskUrl: string | null;
    })
    | (Extract<ImportedWeTextureEffect, { kind: 'blurRadial' }> & {
        maskUrl: string | null;
    })
    | (Extract<ImportedWeTextureEffect, { kind: 'lightShafts' }> & {
        noiseUrl: string | null;
    })
    | (Extract<ImportedWeTextureEffect, { kind: 'glitter' }> & {
        maskUrl: string | null;
    })
    | (Extract<ImportedWeTextureEffect, { kind: 'waterCaustics' }> & {
        maskUrl: string | null;
        causticUrl: string | null;
        uniformUrl: string | null;
        perlinUrl: string | null;
        glowUrl: string | null;
    })
    | (Extract<ImportedWeTextureEffect, { kind: 'depthParallax' }> & {
        depthUrl: string | null;
        maskUrl: string | null;
    })
    | (Extract<ImportedWeTextureEffect, { kind: 'blur' }> & {
        maskUrl: string | null;
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

/**
 * Wallpaper Engine's `common_blending.h` ApplyBlending table, shared by every
 * effect shader that composites a generated layer over the source (ray combine,
 * film grain, pulse, ...). Interpolated into each shader so the 32 modes live in
 * exactly one place.
 */
const WE_BLEND_GLSL = `
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
`;

const RAY_COMBINE_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Rays;
uniform sampler2D u_Original;
uniform int u_BlendMode;

${WE_BLEND_GLSL}

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

const IRIS_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Mask;
uniform bool u_HasMask;
uniform float u_Time;
uniform vec2 u_Scale;
uniform float u_Speed;
uniform float u_Rough;
uniform float u_NoiseAmount;
uniform float u_Phase;

void main() {
    // Mirrors Wallpaper Engine's effects/iris.vert: a two-beat breathing motion
    // interpolated across each integer cycle, plus a small sinusoidal wobble.
    float time = u_Time * u_Speed + u_Phase;
    float lowDt = floor(time);

    float startX = sin(1.9 * lowDt) + sin(2.5 * lowDt + 1.0);
    float startY = sin(1.9 * lowDt) + sin(2.5 * (lowDt + 1.0) + 2.0);
    float endX = sin(1.9 * (lowDt + 1.0)) + sin(2.5 * (lowDt + 1.0) + 1.0);
    float endY = sin(1.9 * (lowDt + 1.0)) + sin(2.5 * (lowDt + 1.0) + 2.0);

    // rough = 0 collapses the smoothstep edges; guard the degenerate range so
    // the division inside smoothstep cannot produce NaN.
    float edge = min(1.0 - u_Rough, 0.999);
    float blend = smoothstep(edge, 1.0, cos(fract(time) * 3.14159265359) * -0.5 + 0.5);

    vec2 offset = vec2(mix(startX, endX, blend), mix(startY, endY, blend));
    offset += vec2(sin(time), cos(time)) * u_NoiseAmount;
    offset *= u_Scale * 0.001;

    float mask = u_HasMask ? texture2D(u_Mask, v_TexCoord).r : 1.0;
    gl_FragColor = texture2D(u_Source, v_TexCoord + offset * mask);
}
`;

const CLOUD_MOTION_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Mask;
uniform sampler2D u_Noise;
uniform bool u_HasMask;
uniform float u_Time;
uniform float u_Amount;
uniform float u_Direction;
uniform float u_Speed;
uniform float u_Scale;
uniform float u_ScaleX;
uniform float u_Aspect;

void main() {
    // Mirrors Wallpaper Engine's effects/cloudmotion.vert + .frag: a perlin
    // sample drifts the UVs horizontally, rotated into the authored direction.
    vec2 noiseCoord = vec2(
        v_TexCoord.x * u_Aspect * u_Scale * u_ScaleX + u_Time * u_Speed,
        v_TexCoord.y * u_Scale
    );
    float drift = (texture2D(u_Noise, noiseCoord).r * 2.0 - 1.0) * u_Amount;
    float mask = u_HasMask ? texture2D(u_Mask, v_TexCoord).r : 1.0;

    float angle = u_Direction + 1.57079632679;
    float offset = drift * mask;
    vec2 displaced = v_TexCoord + vec2(offset * cos(angle), offset * sin(angle));

    // With a mask the destination is re-sampled so the drift fades out instead
    // of cutting off at the mask edge.
    if (u_HasMask) {
        displaced = mix(v_TexCoord, displaced, texture2D(u_Mask, displaced).r);
    }

    gl_FragColor = texture2D(u_Source, displaced);
}
`;

const SKEW_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform float u_Top;
uniform float u_Bottom;
uniform float u_Left;
uniform float u_Right;
uniform bool u_Repeat;

void main() {
    // Mirrors Wallpaper Engine's effects/skew.vert (MODE=0, UV shear). Both
    // quadrant tests use the ORIGINAL coordinate, not the running one.
    vec2 uv = v_TexCoord;
    uv.x -= v_TexCoord.y <= 0.5 ? u_Top : u_Bottom;
    uv.y += v_TexCoord.x <= 0.5 ? u_Left : u_Right;
    if (u_Repeat) uv = fract(uv);
    gl_FragColor = texture2D(u_Source, uv);
}
`;

const SWING_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Mask;
uniform sampler2D u_Noise;
uniform bool u_HasMask;
uniform bool u_NoiseEnabled;
uniform bool u_DoubleSided;
uniform float u_Time;
uniform vec2 u_Point0;
uniform vec2 u_Point1;
uniform float u_Size;
uniform float u_Center;
uniform float u_Feather;
uniform float u_Amount;
uniform float u_Speed;
uniform float u_Phase;
uniform float u_NoiseSpeed;
uniform float u_NoiseAmount;
uniform float u_Aspect;

// Branches of the page mask run with edge0 > edge1 (a reversed ramp), which the
// GLSL built-in leaves undefined, so use the explicit formula.
float ss(float edge0, float edge1, float x) {
    float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

void main() {
    // vert: the authored swing amount, optionally perturbed by a noise sample.
    float anim = sin(u_Time * u_Speed + u_Phase * 6.28318530718) * u_Amount;
    if (u_NoiseEnabled) {
        float n = texture2D(u_Noise, vec2(
            u_Time * 0.08333333 * u_NoiseSpeed,
            u_Time * 0.02777777 * u_NoiseSpeed
        )).r * 6.28318530718;
        anim = clamp(anim + sin(n) * u_NoiseAmount, -1.0, 1.0);
    }

    // Axis and centre in aspect-corrected space.
    float ax0 = u_Point0.x * u_Aspect;
    float ay0 = u_Point0.y;
    float ax1 = u_Point1.x * u_Aspect;
    float ay1 = u_Point1.y;
    vec2 axis = vec2(ax1 - ax0, ay1 - ay0);
    axis /= max(length(axis), 1e-6);
    vec2 center = vec2(ax0 + (ax1 - ax0) * u_Center, ay0 + (ay1 - ay0) * u_Center);
    vec2 ortho = vec2(-axis.y, axis.x);

    float feather = max(u_Feather, 0.00001);
    float sizeMod = u_Size * (1.0 - abs(anim) * u_Amount * 0.5);

    vec2 pos = vec2(v_TexCoord.x * u_Aspect, v_TexCoord.y);
    vec2 rel = pos - center;
    float dAlong = dot(axis, rel);
    float dOrtho = dot(ortho, rel);
    vec2 warped = pos + axis * (anim * dOrtho) * dAlong + ortho * (anim * dOrtho * anim);

    // Page region: inside the p0-p1 band and within sizeMod of the axis.
    float mask = ss(feather, 0.0, dot(axis, warped - vec2(ax1, ay1)));
    mask *= ss(-feather, 0.0, dot(axis, warped - vec2(ax0, ay0)));
    mask *= ss(sizeMod + feather, sizeMod - feather, dOrtho);
    if (u_DoubleSided) mask *= ss(sizeMod + feather, sizeMod - feather, -dOrtho);
    else mask *= dOrtho >= 0.0 ? 1.0 : 0.0;
    if (u_HasMask) mask *= texture2D(u_Mask, v_TexCoord).r;

    vec2 uv = mix(v_TexCoord, vec2(warped.x / u_Aspect, warped.y), mask);
    gl_FragColor = texture2D(u_Source, uv);
}
`;

const FILM_GRAIN_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Noise;
uniform sampler2D u_Mask;
uniform bool u_HasMask;
uniform float u_Time;
uniform float u_Strength;
uniform float u_Power;
uniform float u_Scale;
uniform float u_Aspect;
uniform bool u_Greyscale;
uniform int u_BlendMode;
${WE_BLEND_GLSL}
float grainLuma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
    // Mirrors Wallpaper Engine's effects/filmgrain.vert + .frag: two noise
    // samples scrolling at different rates, multiplied per channel.
    vec4 albedo = texture2D(u_Source, v_TexCoord);
    float tf = fract(u_Time);
    vec3 n1 = texture2D(u_Noise, vec2(
        (v_TexCoord.x + tf) * u_Scale * u_Aspect,
        (v_TexCoord.y + tf) * u_Scale
    )).rgb;
    vec3 n2 = texture2D(u_Noise, vec2(
        (v_TexCoord.x - tf * 2.5) * u_Scale * 0.52 * u_Aspect,
        (v_TexCoord.y - tf * 2.5) * u_Scale * 0.52
    )).gbr;

    if (u_Greyscale) {
        n1 = vec3(grainLuma(n1));
        n2 = vec3(grainLuma(n2));
    }

    vec3 mul = clamp(n1 * n2, 0.0, 1.0);
    vec3 grain = vec3(
        pow(max(mul.r, 0.0), u_Power),
        pow(max(mul.g, 0.0), u_Power),
        pow(max(mul.b, 0.0), u_Power)
    );

    float amount = u_Strength;
    if (u_HasMask) amount *= texture2D(u_Mask, v_TexCoord).r;
    gl_FragColor = vec4(applyWeBlend(u_BlendMode, albedo.rgb, grain, amount), albedo.a);
}
`;

const PULSE_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Noise;
uniform sampler2D u_Mask;
uniform bool u_HasMask;
uniform float u_Time;
uniform float u_Speed;
uniform float u_Phase;
uniform float u_Amount;
uniform vec2 u_Bounds;
uniform float u_NoiseSpeed;
uniform float u_NoiseAmount;
uniform float u_Power;
uniform vec3 u_TintLow;
uniform vec3 u_TintHigh;
uniform int u_BlendMode;
uniform bool u_PulseAlpha;
uniform bool u_PulseColor;
${WE_BLEND_GLSL}
void main() {
    // Mirrors Wallpaper Engine's effects/pulse.vert + .frag. The engine's
    // g_PulsePhase uniform is in radians (range 0..2pi), not a normalised 0..1
    // value, so subtract pi/2 directly rather than phase * 2pi.
    vec4 albedo = texture2D(u_Source, v_TexCoord);

    float sv = sin(u_Time * u_Speed + (u_Phase - 1.57079632679)) * 0.5 + 0.5;
    float k = clamp((sv - u_Bounds.x) / max(1e-6, u_Bounds.y - u_Bounds.x), 0.0, 1.0);
    float pulse = (k * k * (3.0 - 2.0 * k)) * u_Amount;

    if (u_NoiseAmount > 0.0) {
        pulse += texture2D(u_Noise, vec2(
            u_Time * 0.08333333 * u_NoiseSpeed,
            u_Time * 0.02777777 * u_NoiseSpeed
        )).r * u_NoiseAmount;
    }
    pulse = pow(max(pulse, 0.0), u_Power);
    float pulseAmount = clamp(pulse, 0.0, 1.0);

    vec3 rgb = albedo.rgb;
    float alpha = albedo.a;
    if (u_PulseColor) {
        rgb = applyWeBlend(
            u_BlendMode,
            albedo.rgb * u_TintLow,
            albedo.rgb * u_TintHigh,
            pulseAmount
        );
    }
    if (u_PulseAlpha) alpha = albedo.a * pulseAmount;
    if (u_HasMask) {
        float mask = texture2D(u_Mask, v_TexCoord).r;
        rgb = mix(albedo.rgb, rgb, mask);
        alpha = mix(albedo.a, alpha, mask);
    }
    gl_FragColor = vec4(max(rgb, vec3(0.0)), alpha);
}
`;

const CLOUDS_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Clouds;
uniform sampler2D u_Mask;
uniform bool u_HasMask;
uniform float u_Time;
uniform float u_Alpha;
uniform float u_Threshold;
uniform float u_Feather;
uniform vec3 u_ColorStart;
uniform vec3 u_ColorEnd;
uniform vec4 u_Speed;
uniform vec4 u_Scale;
uniform float u_Aspect;
uniform bool u_Shading;
uniform int u_BlendMode;
uniform bool u_WriteAlpha;
${WE_BLEND_GLSL}
void main() {
    // Mirrors Wallpaper Engine's effects/clouds.vert + .frag (PERSPECTIVE=0):
    // two samples of the cloud texture scroll at different rates, and the second
    // is sampled with its coordinates swapped.
    vec4 albedo = texture2D(u_Source, v_TexCoord);
    float ax = (v_TexCoord.x + u_Speed.x * u_Time) * u_Scale.x * u_Aspect;
    float ay = (v_TexCoord.y + u_Speed.y * u_Time) * u_Scale.y;
    float bz = (v_TexCoord.x + u_Speed.z * u_Time) * u_Scale.z * u_Aspect;
    float bw = (v_TexCoord.y + u_Speed.w * u_Time) * u_Scale.w;

    float cloud0 = texture2D(u_Clouds, vec2(ax, ay)).r;
    float cloud1 = texture2D(u_Clouds, vec2(-bw, bz)).r;
    float cloudBlend = smoothstep(u_Threshold, u_Threshold + max(u_Feather, 1e-5), cloud0 * cloud1);

    float blend = cloudBlend * u_Alpha;
    if (u_HasMask) blend *= texture2D(u_Mask, v_TexCoord).r;

    vec3 tint = mix(u_ColorEnd, u_ColorStart, blend);
    if (u_Shading) tint *= cloud0 * cloud1;

    vec3 rgb = applyWeBlend(u_BlendMode, albedo.rgb, tint, blend);
    gl_FragColor = vec4(rgb, u_WriteAlpha ? blend : albedo.a);
}
`;

const BLUR_RADIAL_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Mask;
uniform bool u_HasMask;
uniform float u_Scale;
uniform vec2 u_Center;
uniform int u_Kernel;
uniform bool u_KeepAlpha;

// One symmetric tap pair: the centre-relative vector is rotated by the kernel
// angle and the two mirrored samples are averaged by the caller.
vec4 radialTap(vec2 delta, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    vec2 rotated = vec2(delta.x * c - delta.y * s, delta.x * s + delta.y * c);
    vec2 offset = rotated - delta;
    return texture2D(u_Source, u_Center + offset + delta)
        + texture2D(u_Source, u_Center - offset + delta);
}

void main() {
    // Mirrors Wallpaper Engine's effects/blur_radial_gaussian.frag: rotate the
    // centre-relative vector by a fixed angle per tap and average the pair. The
    // kernel offsets and weights come from common_blur.h.
    vec2 delta = v_TexCoord - u_Center;
    float amount = u_Scale * 0.025;
    vec4 accum = vec4(0.0);

    if (u_Kernel == 2) {
        accum += texture2D(u_Source, v_TexCoord) * 0.5;
        accum += radialTap(delta, 1.0 * amount) * 0.25;
    } else if (u_Kernel == 1) {
        accum += radialTap(delta, 2.3515644035337887 * amount) * 0.2028175528299753;
        accum += radialTap(delta, 0.4694337796983720 * amount) * 0.4044856614512112;
        accum += radialTap(delta, -1.4091998770852121 * amount) * 0.3213933537319605;
        accum += radialTap(delta, -3.0 * amount) * 0.0713034319868530;
    } else {
        accum += texture2D(u_Source, v_TexCoord) * 0.1976406528809576;
        accum += radialTap(delta, 1.4091998770852122 * amount) * 0.2959855056006557;
        accum += radialTap(delta, 3.2979348079914822 * amount) * 0.0935333619980593;
        accum += radialTap(delta, 5.2062900776825969 * amount) * 0.0116608059608062;
    }

    vec4 source = texture2D(u_Source, v_TexCoord);
    if (u_HasMask) accum = mix(source, accum, texture2D(u_Mask, v_TexCoord).r);
    if (u_KeepAlpha) accum.a = source.a;
    gl_FragColor = vec4(min(accum.rgb, vec3(1.0)), min(accum.a, 1.0));
}
`;

const LIGHT_SHAFTS_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Noise;
uniform vec3 u_Xform0;
uniform vec3 u_Xform1;
uniform vec3 u_Xform2;
uniform float u_Time;
uniform float u_Speed;
uniform vec2 u_Scale;
uniform float u_Smoothness;
uniform vec2 u_Feather;
uniform float u_Exponent;
uniform float u_Intensity;
uniform vec3 u_ColorStart;
uniform vec3 u_ColorEnd;
uniform int u_BlendMode;
${WE_BLEND_GLSL}
// Several shaft ramps run with edge0 > edge1, which the GLSL built-in leaves
// undefined; the explicit formula handles a reversed range.
float shaftRamp(float edge0, float edge1, float x) {
    float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

void main() {
    // Mirrors Wallpaper Engine's effects/lightshafts.vert + .frag with RAYMODE=0
    // (linear rays) and RENDERING=0 (colour gradient). The inverse
    // square-to-quad matrix is precomputed on the CPU.
    vec3 p = vec3(v_TexCoord, 1.0);
    float f2 = dot(u_Xform2, p);
    float f2Safe = abs(f2) < 1e-6 ? (f2 < 0.0 ? -1e-6 : 1e-6) : f2;
    vec2 fx = vec2(dot(u_Xform0, p), dot(u_Xform1, p)) / f2Safe;

    float featherX = max(u_Feather.x, 1e-5);
    float featherY = max(u_Feather.y, 1e-5);
    float mask = f2 >= 0.0 ? 1.0 : 0.0;
    mask *= shaftRamp(0.50001, 0.5 - featherX, abs(fx.x - 0.5));
    mask *= shaftRamp(0.50001, 0.5 - featherY, abs(fx.y - 0.5));
    mask *= 1.0 - fx.y;

    float n1 = texture2D(u_Noise, vec2(
        fx.x * 0.054111 * u_Scale.x + u_Time * u_Speed * 0.003,
        fx.y * 0.003111 * u_Scale.y + u_Time * u_Speed * 0.000375111
    )).r;
    float n2 = texture2D(u_Noise, vec2(
        fx.x * 0.07333 * u_Scale.x - u_Time * u_Speed * 0.0047111,
        fx.y * 0.005967111 * u_Scale.y - u_Time * u_Speed * 0.0007399
    )).r;

    float shafts = pow(max(n1 * n2, 0.0), u_Exponent);
    shafts = shaftRamp((1.0 - u_Smoothness) * 0.29999, 0.3 + u_Smoothness * 0.7, shafts);
    shafts *= mask;

    vec4 albedo = texture2D(u_Source, v_TexCoord);
    vec3 shaftColor = clamp(mix(u_ColorStart, u_ColorEnd, fx.y), 0.0, 1.0) * u_Intensity;
    vec3 rgb = applyWeBlend(u_BlendMode, albedo.rgb, shaftColor, shafts);
    gl_FragColor = vec4(rgb, max(albedo.a, shafts));
}
`;

const GLITTER_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Noise;
uniform sampler2D u_Mask;
uniform bool u_HasMask;
uniform float u_Time;
uniform float u_Speed;
uniform float u_Density;
uniform float u_Scale;
uniform float u_Alpha;
uniform vec3 u_Color;
uniform int u_BlendMode;
uniform float u_Aspect;
${WE_BLEND_GLSL}
float glitterRamp(float edge0, float edge1, float x) {
    float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

void main() {
    // Inlines Wallpaper Engine's glitter_prepare pass (a pure function of a noise
    // sample and time), collapsing the authored two-pass descriptor into one
    // surface pass. The pattern tiles in the authored UV space.
    vec2 patternUv = fract(vec2(v_TexCoord.x * u_Aspect * u_Scale, v_TexCoord.y * u_Scale));
    vec2 noise = texture2D(u_Noise, patternUv * 5.0).rg;

    float density = u_Density * u_Density;
    float timer = fract(noise.r * (1.0 - noise.g) * 100.0 + u_Time * u_Speed * density);
    float halfWidth = density * 0.5;
    float sparkle = glitterRamp(0.5 - halfWidth, 0.5, timer)
        * glitterRamp(0.5 + halfWidth, 0.5, timer);
    sparkle = glitterRamp(0.5, 1.0, sparkle);
    sparkle *= sparkle;

    vec4 albedo = texture2D(u_Source, v_TexCoord);
    float mask = 1.0;
    if (u_HasMask) mask = texture2D(u_Mask, v_TexCoord).r;

    vec3 rgb = applyWeBlend(u_BlendMode, albedo.rgb, u_Color * sparkle, u_Alpha * mask);
    gl_FragColor = vec4(rgb, albedo.a);
}
`;

const WATER_CAUSTICS_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Mask;
uniform sampler2D u_Caustic;
uniform sampler2D u_Uniform;
uniform sampler2D u_Perlin;
uniform sampler2D u_GlowPattern;
uniform bool u_HasMask;
uniform float u_Time;
uniform float u_Brightness;
uniform float u_Glow;
uniform float u_Granularity;
uniform float u_Distortion;
uniform float u_Chromatic;
uniform float u_Blur;
uniform vec3 u_ColorStart;
uniform vec3 u_ColorEnd;
uniform int u_Mode;
uniform int u_BlendMode;
uniform float u_Aspect;
${WE_BLEND_GLSL}
// MODE 1 thresholds run with edge0 > edge1, which the GLSL built-in leaves
// undefined; this explicit form handles a reversed range.
float causticsRamp(float edge0, float edge1, float x) {
    float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

void main() {
    // Mirrors Wallpaper Engine's effects/watercaustics/caustics.frag: four
    // scrolling coordinate sets drive a noise distortion of a Voronoi pattern,
    // sampled once per colour channel.
    vec4 albedo = texture2D(u_Source, v_TexCoord);
    float mask = 1.0;
    if (u_HasMask) mask = texture2D(u_Mask, v_TexCoord).r;

    vec2 causticsCoords = vec2(v_TexCoord.x * u_Aspect, v_TexCoord.y) * u_Granularity;
    vec2 noiseCoords = vec2(causticsCoords.x * 0.02 + u_Time * 0.005, causticsCoords.y * 0.02);
    vec2 noiseCoords2 = vec2(causticsCoords.x * 0.0333, causticsCoords.y * 0.0333 + u_Time * 0.004111);
    vec2 blendCoords = vec2(causticsCoords.x * 0.01333, causticsCoords.y * 0.01333) + u_Time * 0.003777;
    vec2 shiftCoords = vec2(causticsCoords.x * 0.05, causticsCoords.y * 0.05) + u_Time * 0.01;

    vec2 shift = texture2D(u_Perlin, shiftCoords).rg * 2.0 - 1.0;
    vec2 n1 = texture2D(u_Uniform, noiseCoords).rg;
    vec2 n2 = texture2D(u_Uniform, noiseCoords2).rg;

    causticsCoords.x += (n1.x * 2.0 - 1.0) * 0.025 * u_Distortion
        + (n2.x * 2.0 - 1.0) * 0.025 * u_Distortion + shift.x * u_Distortion;
    causticsCoords.y += (n1.y * 2.0 - 1.0) * 0.025 * u_Distortion
        + (n2.y * 2.0 - 1.0) * 0.025 * u_Distortion + shift.y * u_Distortion;

    vec3 caustics = vec3(
        texture2D(u_Caustic, vec2(causticsCoords.x - 0.01 * u_Chromatic, causticsCoords.y)).r,
        texture2D(u_Caustic, causticsCoords).r,
        texture2D(u_Caustic, vec2(causticsCoords.x + 0.01 * u_Chromatic, causticsCoords.y)).r
    );
    float glowSample = texture2D(u_GlowPattern, causticsCoords).r;
    vec3 blendColor = texture2D(u_Uniform, blendCoords).rgb;
    vec3 cb = mix(caustics, vec3(glowSample), u_Blur);

    float causticsSample;
    vec3 causticsColor;
    if (u_Mode == 1) {
        float threshold = max(0.3, blendColor.r - shift.x);
        float cs = cb.g;
        float particleNoise = texture2D(u_Uniform, shiftCoords).r;
        float particle = causticsRamp(threshold, threshold - 0.001, cs)
            * (particleNoise * cs >= 0.3 ? 1.0 : 0.0);
        causticsSample = causticsRamp(threshold, threshold + 0.001, cs) + particle;
        causticsSample = clamp(causticsSample + glowSample * u_Glow, 0.0, 1.0);
        causticsColor = u_Brightness * mix(u_ColorStart, u_ColorEnd, causticsRamp(0.0, 0.5, blendColor.r));
    } else {
        causticsSample = (cb.r + cb.g + cb.b) / 3.0;
        causticsSample = causticsRamp(
            blendColor.r * 0.8,
            1.0 - blendColor.g * 0.2,
            causticsSample + glowSample * u_Glow
        );
        causticsColor = u_Brightness * mix(u_ColorStart, u_ColorEnd, blendColor) * cb;
    }

    vec3 rgb = applyWeBlend(u_BlendMode, albedo.rgb, causticsColor, mask * causticsSample);
    gl_FragColor = vec4(min(max(rgb, vec3(0.0)), vec3(1.0)), albedo.a);
}
`;

const DEPTH_PARALLAX_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Depth;
uniform sampler2D u_Mask;
uniform bool u_HasDepth;
uniform bool u_HasMask;
uniform vec2 u_Scale;
uniform float u_Sens;
uniform float u_Center;
uniform vec2 u_ParallaxPosition;
uniform int u_Quality;

float depthAt(vec2 uv) {
    return u_HasDepth ? texture2D(u_Depth, uv).r : 0.0;
}

void main() {
    // Mirrors Wallpaper Engine's effects/depthparallax: QUALITY 0 is a single
    // offset tap, QUALITY 1/2 march 24/64 layers through the height map. The
    // pointer position is engine-supplied (g_ParallaxPosition); with no pointer
    // feed this renders the neutral centred pose.
    vec4 albedo = texture2D(u_Source, v_TexCoord);
    float depth = depthAt(v_TexCoord);
    float mask = u_HasMask ? texture2D(u_Mask, v_TexCoord).r : 1.0;

    vec2 prlxPos = u_ParallaxPosition;
    float ctrlSign = u_Sens >= 0.0 ? 1.0 : 0.0;
    float negPerspective = -u_Sens;
    float ctrlPerspOrtho = clamp(u_Sens, 0.0, 1.0) + (negPerspective > 0.0001 ? 1.0 : 0.0);
    vec2 prlx = ctrlSign > 0.5 ? vec2(1.0 - prlxPos.x, 1.0 - prlxPos.y) : prlxPos;
    float perspMix = -1.0 + (negPerspective + 1.0) * ctrlPerspOrtho;
    int numLayers = u_Quality == 2 ? 64 : 24;
    float layerDepth = 1.0 / float(numLayers);

    vec2 sampleUv;
    if (u_Quality == 0) {
        vec2 pointer = vec2(v_TexCoord.x - prlxPos.x, (1.0 - v_TexCoord.y) - prlxPos.y);
        pointer *= vec2(2.0 * u_Scale.x * -0.04, -2.0 * u_Scale.y * -0.04);
        sampleUv = v_TexCoord + pointer * ((depth * 2.0 - 1.0) * mask);
    } else {
        vec2 coords = v_TexCoord;
        if (ctrlSign > 0.5) {
            // A positive sensitivity squeezes the sampling coordinates toward the
            // centre, which reads as a perspective compression.
            coords = (coords - 0.5) / (1.0 + u_Sens * 0.2) + 0.5;
        }
        coords.x -= (prlx.x * 2.0 - 1.0) * u_Center * -0.05 * u_Scale.x * perspMix;
        coords.y -= (prlx.y * 2.0 - 1.0) * u_Center * 0.05 * u_Scale.y * perspMix;

        vec2 pointer = vec2(1.0 - v_TexCoord.x, v_TexCoord.y);
        vec2 ctrlDir = pointer - prlx;
        float altX = 1.0 - prlx.x - 0.5;
        float altY = prlx.y - 0.5;
        vec2 viewdir = vec2(
            altX + (ctrlDir.x * negPerspective - altX) * ctrlPerspOrtho,
            altY + (ctrlDir.y * negPerspective - altY) * ctrlPerspOrtho
        ) * mask;

        vec2 delta = vec2(viewdir.x * u_Scale.x * 0.1, viewdir.y * u_Scale.y * 0.1) / float(numLayers);
        vec2 cur = coords;
        float curDepth = depthAt(cur);
        float currentLayerDepth = 1.0;
        // Constant loop bound keeps this legal in GLSL ES 1.0; the breaks are the
        // variable-length part.
        for (int i = 0; i < 64; i += 1) {
            if (i >= numLayers) break;
            if (currentLayerDepth <= curDepth) break;
            cur -= delta;
            curDepth = depthAt(cur);
            currentLayerDepth -= layerDepth;
        }

        vec2 prev = cur + delta;
        float afterDepth = curDepth - currentLayerDepth;
        float beforeDepth = depthAt(prev) - currentLayerDepth - layerDepth;
        float denominator = afterDepth - beforeDepth;
        float weight = abs(denominator) < 1e-6 ? 0.0 : afterDepth / denominator;
        sampleUv = prev * weight + cur * (1.0 - weight);
    }

    gl_FragColor = clamp(texture2D(u_Source, sampleUv), 0.0, 1.0);
}
`;

const BLUR_DOWNSAMPLE_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform vec2 u_TexelSize;

void main() {
    // Mirrors Wallpaper Engine's blur_downsample4.frag: four source texels around
    // the destination centre are alpha-weighted into one colour, while the stored
    // alpha is the mean of the squared alphas (which keeps edges from blooming).
    //
    // TabLab uploads the source PREMULTIPLIED, so the weight multiply WE applies
    // to straight-alpha RGB is already baked in; the result is converted back to
    // premultiplied because the rest of the chain expects that convention.
    vec2 o = u_TexelSize;
    vec4 s0 = texture2D(u_Source, v_TexCoord + vec2(-o.x, -o.y));
    vec4 s1 = texture2D(u_Source, v_TexCoord + vec2(o.x, -o.y));
    vec4 s2 = texture2D(u_Source, v_TexCoord + vec2(-o.x, o.y));
    vec4 s3 = texture2D(u_Source, v_TexCoord + vec2(o.x, o.y));

    vec3 premultipliedSum = s0.rgb + s1.rgb + s2.rgb + s3.rgb;
    float alphaSum = s0.a + s1.a + s2.a + s3.a;
    float outAlpha = (s0.a * s0.a + s1.a * s1.a + s2.a * s2.a + s3.a * s3.a) * 0.25;
    vec3 straight = premultipliedSum / max(0.001, alphaSum);

    gl_FragColor = vec4(straight * outAlpha, outAlpha);
}
`;

const BLUR_GAUSSIAN_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform vec2 u_Direction;
uniform int u_Kernel;

void main() {
    // Mirrors Wallpaper Engine's blur_gaussian.frag. The tap weights come from
    // common_blur.h and sum to exactly 1.0 for each kernel, so the unrolled
    // branches below need no normalisation.
    vec4 sum;
    if (u_Kernel == 2) {
        sum = texture2D(u_Source, v_TexCoord) * 0.5;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction)
            + texture2D(u_Source, v_TexCoord - u_Direction)) * 0.25;
    } else if (u_Kernel == 1) {
        sum = texture2D(u_Source, v_TexCoord) * 0.214607;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction)
            + texture2D(u_Source, v_TexCoord - u_Direction)) * 0.189879;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction * 2.0)
            + texture2D(u_Source, v_TexCoord - u_Direction * 2.0)) * 0.131514;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction * 3.0)
            + texture2D(u_Source, v_TexCoord - u_Direction * 3.0)) * 0.071303;
    } else {
        sum = texture2D(u_Source, v_TexCoord) * 0.171834;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction)
            + texture2D(u_Source, v_TexCoord - u_Direction)) * 0.156756;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction * 2.0)
            + texture2D(u_Source, v_TexCoord - u_Direction * 2.0)) * 0.119007;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction * 3.0)
            + texture2D(u_Source, v_TexCoord - u_Direction * 3.0)) * 0.075189;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction * 4.0)
            + texture2D(u_Source, v_TexCoord - u_Direction * 4.0)) * 0.039533;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction * 5.0)
            + texture2D(u_Source, v_TexCoord - u_Direction * 5.0)) * 0.017298;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction * 6.0)
            + texture2D(u_Source, v_TexCoord - u_Direction * 6.0)) * 0.006299;
    }
    gl_FragColor = min(sum, vec4(1.0));
}
`;

const BLUR_COMBINE_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Blurred;
uniform sampler2D u_Mask;
uniform bool u_HasMask;
uniform vec2 u_CompositeOffset;
uniform int u_Composite;
uniform int u_BlendMode;
uniform bool u_CompositeMono;
uniform vec3 u_CompositeColor;
uniform float u_CompositeAlpha;
uniform bool u_KeepAlpha;
${WE_BLEND_GLSL}
float combineLuma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
    // Mirrors Wallpaper Engine's blur_combine.frag. WE's composite maths is
    // written against straight alpha, so the premultiplied inputs are
    // un-premultiplied here and the result is premultiplied again on output to
    // match the rest of the renderer.
    vec4 original = texture2D(u_Source, v_TexCoord);
    vec4 blurred = texture2D(u_Blurred, v_TexCoord + u_CompositeOffset);

    vec3 originalStraight = original.a > 0.0 ? original.rgb / original.a : original.rgb;
    vec4 effect = vec4(blurred.a > 0.0 ? blurred.rgb / blurred.a : blurred.rgb, blurred.a);
    if (u_CompositeMono) effect.rgb = vec3(combineLuma(effect.rgb));
    effect.rgb *= u_CompositeColor;

    float compositeAlpha = min(1.0, u_CompositeAlpha);
    vec3 resultRgb;
    float resultAlpha;
    if (u_Composite == 0) {
        resultRgb = effect.rgb;
        resultAlpha = effect.a;
    } else if (u_Composite == 1) {
        resultRgb = applyWeBlend(u_BlendMode, originalStraight, effect.rgb, effect.a * compositeAlpha);
        resultAlpha = max(effect.a * compositeAlpha, original.a);
    } else if (u_Composite == 2) {
        float overAlpha = effect.a * compositeAlpha;
        resultRgb = mix(effect.rgb, originalStraight, original.a);
        resultAlpha = overAlpha + original.a * (1.0 - overAlpha);
    } else {
        float underAlpha = effect.a * compositeAlpha * (1.0 - original.a);
        resultRgb = effect.rgb;
        resultAlpha = underAlpha;
    }

    float mask = u_HasMask ? texture2D(u_Mask, v_TexCoord).r : 1.0;
    vec3 finalRgb = mix(originalStraight, resultRgb, mask);
    float finalAlpha = u_KeepAlpha ? original.a : mix(original.a, resultAlpha, mask);
    gl_FragColor = vec4(finalRgb * finalAlpha, finalAlpha);
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


/**
 * Worley/Voronoi pattern standing in for Wallpaper Engine's built-in
 * `pattern/voronoi_local` and `pattern/voronoi` textures.
 *
 * `watercaustics` samples both: `voronoi_local` supplies the bright cell borders
 * that form the caustic web, `voronoi` the surrounding cell-interior glow. Those
 * textures ship with the engine rather than inside a scene archive, so they are
 * approximated here — which is why the effect is reported as `partial`.
 *
 * @param edgeMode true for border-weighted (voronoi_local), false for
 * centre-weighted (voronoi).
 */
const createBuiltinVoronoiCanvas = (edgeMode: boolean): HTMLCanvasElement => {
    const size = 256;
    const cells = 8;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas is unavailable for Wallpaper Engine built-in Voronoi pattern.');
    const imageData = context.createImageData(size, size);

    const hash = (x: number, y: number): number => {
        let value = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) >>> 0;
        value = Math.imul(value ^ (value >>> 13), 1274126177) >>> 0;
        return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
    };
    // Wrapping the cell coordinates keeps the pattern tileable, which matters
    // because the shader samples it with a repeat wrap.
    const wrap = (value: number): number => ((value % cells) + cells) % cells;

    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const gx = (x / size) * cells;
            const gy = (y / size) * cells;
            const cellX = Math.floor(gx);
            const cellY = Math.floor(gy);
            let nearest = 8;
            let second = 8;

            for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
                for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
                    const sampleX = cellX + offsetX;
                    const sampleY = cellY + offsetY;
                    const pointX = sampleX + hash(wrap(sampleX), wrap(sampleY));
                    const pointY = sampleY + hash(wrap(sampleX) + 71, wrap(sampleY) + 131);
                    const dx = pointX - gx;
                    const dy = pointY - gy;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < nearest) {
                        second = nearest;
                        nearest = distance;
                    } else if (distance < second) {
                        second = distance;
                    }
                }
            }

            // F2 - F1 is small on cell borders, F1 is small at cell centres.
            const value = edgeMode
                ? 1 - Math.max(0, Math.min(1, (second - nearest) * 1.6))
                : 1 - Math.max(0, Math.min(1, nearest * 0.9));
            const gray = Math.round(value * 255);
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
    if (effect.kind === 'iris') {
        return [
            'iris',
            effect.maskPath ?? '',
            effect.scale.x,
            effect.scale.y,
            effect.speed,
            effect.rough,
            effect.noiseAmount,
            effect.phase,
            effect.background ? 1 : 0,
        ].join(':');
    }
    if (effect.kind === 'cloudMotion') {
        return [
            'cloudMotion',
            effect.maskPath ?? '',
            effect.noisePath ?? '',
            effect.amount,
            effect.direction,
            effect.speed,
            effect.scale,
            effect.scaleX,
        ].join(':');
    }
    if (effect.kind === 'skew') {
        return [
            'skew',
            effect.top,
            effect.bottom,
            effect.left,
            effect.right,
            effect.repeat ? 1 : 0,
        ].join(':');
    }
    if (effect.kind === 'swing') {
        return [
            'swing',
            effect.maskPath ?? '',
            effect.noisePath ?? '',
            effect.point0.x,
            effect.point0.y,
            effect.point1.x,
            effect.point1.y,
            effect.size,
            effect.center,
            effect.feather,
            effect.amount,
            effect.speed,
            effect.phase,
            effect.noiseSpeed,
            effect.noiseAmount,
            effect.doubleSided ? 1 : 0,
            effect.noiseEnabled ? 1 : 0,
        ].join(':');
    }
    if (effect.kind === 'filmGrain') {
        return [
            'filmGrain',
            effect.maskPath ?? '',
            effect.noisePath ?? '',
            effect.strength,
            effect.power,
            effect.scale,
            effect.greyscale ? 1 : 0,
            effect.blendMode,
        ].join(':');
    }
    if (effect.kind === 'pulse') {
        return [
            'pulse',
            effect.maskPath ?? '',
            effect.speed,
            effect.phase,
            effect.amount,
            effect.bounds.x,
            effect.bounds.y,
            effect.noiseSpeed,
            effect.noiseAmount,
            effect.power,
            effect.tintLow.r,
            effect.tintLow.g,
            effect.tintLow.b,
            effect.tintHigh.r,
            effect.tintHigh.g,
            effect.tintHigh.b,
            effect.blendMode,
            effect.pulseAlpha ? 1 : 0,
            effect.pulseColor ? 1 : 0,
        ].join(':');
    }
    if (effect.kind === 'clouds') {
        return [
            'clouds',
            effect.cloudPath ?? '',
            effect.maskPath ?? '',
            effect.alpha,
            effect.threshold,
            effect.feather,
            effect.colorStart.r,
            effect.colorStart.g,
            effect.colorStart.b,
            effect.colorEnd.r,
            effect.colorEnd.g,
            effect.colorEnd.b,
            ...effect.speed,
            ...effect.scale,
            effect.shading ? 1 : 0,
            effect.blendMode,
            effect.writeAlpha ? 1 : 0,
        ].join(':');
    }
    if (effect.kind === 'blurRadial') {
        return [
            'blurRadial',
            effect.maskPath ?? '',
            effect.scale,
            effect.center.x,
            effect.center.y,
            effect.kernel,
            effect.keepAlpha ? 1 : 0,
        ].join(':');
    }
    if (effect.kind === 'lightShafts') {
        return [
            'lightShafts',
            effect.noisePath ?? '',
            ...effect.transform,
            effect.speed,
            effect.scale.x,
            effect.scale.y,
            effect.smoothness,
            effect.feather.x,
            effect.feather.y,
            effect.exponent,
            effect.intensity,
            effect.colorStart.r,
            effect.colorStart.g,
            effect.colorStart.b,
            effect.colorEnd.r,
            effect.colorEnd.g,
            effect.colorEnd.b,
            effect.blendMode,
        ].join(':');
    }
    if (effect.kind === 'glitter') {
        return [
            'glitter',
            effect.maskPath ?? '',
            effect.speed,
            effect.density,
            effect.scale,
            effect.alpha,
            effect.color.r,
            effect.color.g,
            effect.color.b,
            effect.blendMode,
        ].join(':');
    }
    if (effect.kind === 'waterCaustics') {
        return [
            'waterCaustics',
            effect.maskPath ?? '',
            effect.causticPath ?? '',
            effect.uniformPath ?? '',
            effect.perlinPath ?? '',
            effect.glowPath ?? '',
            effect.brightness,
            effect.glow,
            effect.granularity,
            effect.speed,
            effect.timeOffset,
            effect.distortion,
            effect.chromatic,
            effect.blur,
            effect.colorStart.r,
            effect.colorStart.g,
            effect.colorStart.b,
            effect.colorEnd.r,
            effect.colorEnd.g,
            effect.colorEnd.b,
            effect.mode,
            effect.blendMode,
        ].join(':');
    }
    if (effect.kind === 'depthParallax') {
        return [
            'depthParallax',
            effect.depthPath ?? '',
            effect.maskPath ?? '',
            effect.scale.x,
            effect.scale.y,
            effect.sens,
            effect.center,
            effect.quality,
        ].join(':');
    }
    if (effect.kind === 'blur') {
        return [
            'blur',
            effect.maskPath ?? '',
            effect.kernel,
            effect.scale.x,
            effect.scale.y,
            effect.composite,
            effect.blendMode,
            effect.compositeMono ? 1 : 0,
            effect.compositeAlpha,
            effect.compositeOffset.x,
            effect.compositeOffset.y,
            effect.compositeColor.r,
            effect.compositeColor.g,
            effect.compositeColor.b,
            effect.keepAlpha ? 1 : 0,
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
            const irisProgram = effects.some((effect) => effect.kind === 'iris')
                ? createProgram(gl, IRIS_FRAGMENT_SHADER)
                : null;
            const cloudMotionProgram = effects.some((effect) => effect.kind === 'cloudMotion')
                ? createProgram(gl, CLOUD_MOTION_FRAGMENT_SHADER)
                : null;
            const skewProgram = effects.some((effect) => effect.kind === 'skew')
                ? createProgram(gl, SKEW_FRAGMENT_SHADER)
                : null;
            const swingProgram = effects.some((effect) => effect.kind === 'swing')
                ? createProgram(gl, SWING_FRAGMENT_SHADER)
                : null;
            const filmGrainProgram = effects.some((effect) => effect.kind === 'filmGrain')
                ? createProgram(gl, FILM_GRAIN_FRAGMENT_SHADER)
                : null;
            const pulseProgram = effects.some((effect) => effect.kind === 'pulse')
                ? createProgram(gl, PULSE_FRAGMENT_SHADER)
                : null;
            const cloudsProgram = effects.some((effect) => effect.kind === 'clouds')
                ? createProgram(gl, CLOUDS_FRAGMENT_SHADER)
                : null;
            const blurRadialProgram = effects.some((effect) => effect.kind === 'blurRadial')
                ? createProgram(gl, BLUR_RADIAL_FRAGMENT_SHADER)
                : null;
            const lightShaftsProgram = effects.some((effect) => effect.kind === 'lightShafts')
                ? createProgram(gl, LIGHT_SHAFTS_FRAGMENT_SHADER)
                : null;
            const glitterProgram = effects.some((effect) => effect.kind === 'glitter')
                ? createProgram(gl, GLITTER_FRAGMENT_SHADER)
                : null;
            const waterCausticsProgram = effects.some((effect) => effect.kind === 'waterCaustics')
                ? createProgram(gl, WATER_CAUSTICS_FRAGMENT_SHADER)
                : null;
            const depthParallaxProgram = effects.some((effect) => effect.kind === 'depthParallax')
                ? createProgram(gl, DEPTH_PARALLAX_FRAGMENT_SHADER)
                : null;
            const hasBlurEffect = effects.some((effect) => effect.kind === 'blur');
            const blurDownsampleProgram = hasBlurEffect
                ? createProgram(gl, BLUR_DOWNSAMPLE_FRAGMENT_SHADER)
                : null;
            const blurGaussianProgram = hasBlurEffect
                ? createProgram(gl, BLUR_GAUSSIAN_FRAGMENT_SHADER)
                : null;
            const blurCombineProgram = hasBlurEffect
                ? createProgram(gl, BLUR_COMBINE_FRAGMENT_SHADER)
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
            if (irisProgram) deletePrograms.push(irisProgram);
            if (cloudMotionProgram) deletePrograms.push(cloudMotionProgram);
            if (skewProgram) deletePrograms.push(skewProgram);
            if (swingProgram) deletePrograms.push(swingProgram);
            if (filmGrainProgram) deletePrograms.push(filmGrainProgram);
            if (pulseProgram) deletePrograms.push(pulseProgram);
            if (cloudsProgram) deletePrograms.push(cloudsProgram);
            if (blurRadialProgram) deletePrograms.push(blurRadialProgram);
            if (lightShaftsProgram) deletePrograms.push(lightShaftsProgram);
            if (glitterProgram) deletePrograms.push(glitterProgram);
            if (waterCausticsProgram) deletePrograms.push(waterCausticsProgram);
            if (depthParallaxProgram) deletePrograms.push(depthParallaxProgram);
            if (blurDownsampleProgram) deletePrograms.push(blurDownsampleProgram);
            if (blurGaussianProgram) deletePrograms.push(blurGaussianProgram);
            if (blurCombineProgram) deletePrograms.push(blurCombineProgram);

            const sourceCanvas = scaledCanvas(sourceImage, renderWidth, renderHeight);
            const sourceContext = sourceCanvas.getContext('2d');
            if (!sourceContext) throw new Error('2D canvas is unavailable for Wallpaper Engine source-frame updates.');
            const sourceTexture = createTexture(gl, sourceCanvas, true);
            deleteTextures.push(sourceTexture);
            const needsBuiltinNoise = effects.some((effect) => {
                // Pulse's and glitter's canonical shaders always bind a noise
                // texture (their noise term is gated by a uniform, not by texture
                // presence).
                if (effect.kind === 'pulse' || effect.kind === 'glitter'
                    || effect.kind === 'waterCaustics') return true;
                if (effect.kind === 'swing' || effect.kind === 'filmGrain' || effect.kind === 'lightShafts') {
                    return !effect.noiseUrl;
                }
                return (effect.kind === 'foliageSway' || effect.kind === 'cloudMotion') && !effect.noiseUrl;
            });
            const builtinNoiseCanvas = needsBuiltinNoise ? createBuiltinNoiseCanvas() : null;
            const builtinNoiseTexture = builtinNoiseCanvas ? createTexture(gl, builtinNoiseCanvas, false, true) : null;
            if (builtinNoiseTexture) deleteTextures.push(builtinNoiseTexture);
            const builtinCloudNoiseCanvas = effects.some((effect) => (
                (effect.kind === 'shine' && effect.noiseEnabled && !effect.noiseUrl)
                || (effect.kind === 'clouds' && !effect.cloudUrl)
                || (effect.kind === 'waterCaustics' && !effect.perlinUrl)
            ))
                ? createBuiltinCloudNoiseCanvas()
                : null;
            const builtinCloudNoiseTexture = builtinCloudNoiseCanvas
                ? createTexture(gl, builtinCloudNoiseCanvas, false, true)
                : null;
            if (builtinCloudNoiseTexture) deleteTextures.push(builtinCloudNoiseTexture);

            // Water caustics samples two engine-shipped Voronoi patterns: cell
            // borders for the caustic web and cell interiors for its glow.
            const builtinVoronoiEdgeCanvas = effects.some((effect) => (
                effect.kind === 'waterCaustics' && !effect.causticUrl
            ))
                ? createBuiltinVoronoiCanvas(true)
                : null;
            const builtinVoronoiEdgeTexture = builtinVoronoiEdgeCanvas
                ? createTexture(gl, builtinVoronoiEdgeCanvas, false, true)
                : null;
            if (builtinVoronoiEdgeTexture) deleteTextures.push(builtinVoronoiEdgeTexture);

            const builtinVoronoiInteriorCanvas = effects.some((effect) => (
                effect.kind === 'waterCaustics' && !effect.glowUrl
            ))
                ? createBuiltinVoronoiCanvas(false)
                : null;
            const builtinVoronoiInteriorTexture = builtinVoronoiInteriorCanvas
                ? createTexture(gl, builtinVoronoiInteriorCanvas, false, true)
                : null;
            if (builtinVoronoiInteriorTexture) deleteTextures.push(builtinVoronoiInteriorTexture);
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
                if (effect.kind === 'iris') {
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    if (maskTexture) deleteTextures.push(maskTexture);
                    return { kind: 'iris' as const, maskTexture };
                }
                if (effect.kind === 'cloudMotion') {
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    const noiseImage = effect.noiseUrl ? loaded.get(effect.noiseUrl) : null;
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    // A null noise path means WE's built-in perlin sampler; the
                    // shared built-in noise stands in for it.
                    const noiseTexture = noiseImage ? createTexture(gl!, noiseImage, false, true) : builtinNoiseTexture;
                    if (maskTexture) deleteTextures.push(maskTexture);
                    if (noiseTexture && noiseTexture !== builtinNoiseTexture) deleteTextures.push(noiseTexture);
                    return { kind: 'cloudMotion' as const, maskTexture, noiseTexture };
                }
                if (effect.kind === 'swing') {
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    const noiseImage = effect.noiseUrl ? loaded.get(effect.noiseUrl) : null;
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    const noiseTexture = noiseImage ? createTexture(gl!, noiseImage, false, true) : builtinNoiseTexture;
                    if (maskTexture) deleteTextures.push(maskTexture);
                    if (noiseTexture && noiseTexture !== builtinNoiseTexture) deleteTextures.push(noiseTexture);
                    return { kind: 'swing' as const, maskTexture, noiseTexture };
                }
                if (effect.kind === 'filmGrain') {
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    const noiseImage = effect.noiseUrl ? loaded.get(effect.noiseUrl) : null;
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    const noiseTexture = noiseImage ? createTexture(gl!, noiseImage, false, true) : builtinNoiseTexture;
                    if (maskTexture) deleteTextures.push(maskTexture);
                    if (noiseTexture && noiseTexture !== builtinNoiseTexture) deleteTextures.push(noiseTexture);
                    return { kind: 'filmGrain' as const, maskTexture, noiseTexture };
                }
                if (effect.kind === 'pulse') {
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    if (maskTexture) deleteTextures.push(maskTexture);
                    // WE's pulse shader always binds util/noise; only the noise
                    // amount decides whether it contributes.
                    return { kind: 'pulse' as const, maskTexture, noiseTexture: builtinNoiseTexture };
                }
                if (effect.kind === 'clouds') {
                    const cloudImage = effect.cloudUrl ? loaded.get(effect.cloudUrl) : null;
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    // A null cloud path means WE's built-in util/clouds_256; the
                    // shared cloud-noise canvas stands in for it.
                    const cloudTexture = cloudImage
                        ? createTexture(gl!, cloudImage, false, true)
                        : builtinCloudNoiseTexture;
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    if (cloudTexture && cloudTexture !== builtinCloudNoiseTexture) deleteTextures.push(cloudTexture);
                    if (maskTexture) deleteTextures.push(maskTexture);
                    return { kind: 'clouds' as const, cloudTexture, maskTexture };
                }
                if (effect.kind === 'blurRadial') {
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    if (maskTexture) deleteTextures.push(maskTexture);
                    return { kind: 'blurRadial' as const, maskTexture };
                }
                if (effect.kind === 'lightShafts') {
                    const noiseImage = effect.noiseUrl ? loaded.get(effect.noiseUrl) : null;
                    const noiseTexture = noiseImage ? createTexture(gl!, noiseImage, false, true) : builtinNoiseTexture;
                    if (noiseTexture && noiseTexture !== builtinNoiseTexture) deleteTextures.push(noiseTexture);
                    return { kind: 'lightShafts' as const, noiseTexture };
                }
                if (effect.kind === 'glitter') {
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    if (maskTexture) deleteTextures.push(maskTexture);
                    return { kind: 'glitter' as const, maskTexture, noiseTexture: builtinNoiseTexture };
                }
                if (effect.kind === 'waterCaustics') {
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    const causticImage = effect.causticUrl ? loaded.get(effect.causticUrl) : null;
                    const uniformImage = effect.uniformUrl ? loaded.get(effect.uniformUrl) : null;
                    const perlinImage = effect.perlinUrl ? loaded.get(effect.perlinUrl) : null;
                    const glowImage = effect.glowUrl ? loaded.get(effect.glowUrl) : null;

                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    // Pattern/noise textures must keep their tiling; uploading the
                    // decoded image directly avoids canvas resampling blurring them.
                    const causticTexture = causticImage
                        ? createTexture(gl!, causticImage, false, true)
                        : builtinVoronoiEdgeTexture;
                    const uniformTexture = uniformImage
                        ? createTexture(gl!, uniformImage, false, true)
                        : builtinNoiseTexture;
                    const perlinTexture = perlinImage
                        ? createTexture(gl!, perlinImage, false, true)
                        : builtinCloudNoiseTexture;
                    const glowTexture = glowImage
                        ? createTexture(gl!, glowImage, false, true)
                        : builtinVoronoiInteriorTexture;

                    if (maskTexture) deleteTextures.push(maskTexture);
                    if (causticTexture && causticTexture !== builtinVoronoiEdgeTexture) deleteTextures.push(causticTexture);
                    if (uniformTexture && uniformTexture !== builtinNoiseTexture) deleteTextures.push(uniformTexture);
                    if (perlinTexture && perlinTexture !== builtinCloudNoiseTexture) deleteTextures.push(perlinTexture);
                    if (glowTexture && glowTexture !== builtinVoronoiInteriorTexture) deleteTextures.push(glowTexture);

                    return {
                        kind: 'waterCaustics' as const,
                        maskTexture,
                        causticTexture,
                        uniformTexture,
                        perlinTexture,
                        glowTexture,
                    };
                }
                if (effect.kind === 'depthParallax') {
                    const depthImage = effect.depthUrl ? loaded.get(effect.depthUrl) : null;
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    // Height maps carry data, not colour: upload the decoded image
                    // directly so resampling cannot blur the depth field.
                    const depthTexture = depthImage
                        ? createTexture(gl!, scaledCanvas(depthImage, renderWidth, renderHeight), false, true)
                        : null;
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    if (depthTexture) deleteTextures.push(depthTexture);
                    if (maskTexture) deleteTextures.push(maskTexture);
                    return { kind: 'depthParallax' as const, depthTexture, maskTexture };
                }
                if (effect.kind === 'blur') {
                    const maskImage = effect.maskUrl ? loaded.get(effect.maskUrl) : null;
                    const maskTexture = maskImage ? createTexture(gl!, scaledCanvas(maskImage, renderWidth, renderHeight)) : null;
                    if (maskTexture) deleteTextures.push(maskTexture);
                    return { kind: 'blur' as const, maskTexture };
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
            // The `blur` chain downsamples to a quarter of the layer size, then
            // runs the two Gaussian passes on that smaller surface. Two scratch
            // targets let the passes ping-pong without aliasing the effect input
            // (or the full-size inter-effect target).
            const blurQuarterWidth = Math.max(2, Math.floor(renderWidth / 4));
            const blurQuarterHeight = Math.max(2, Math.floor(renderHeight / 4));
            const blurQuarterTargets = hasBlurEffect
                ? [
                    createRenderTarget(gl, blurQuarterWidth, blurQuarterHeight),
                    createRenderTarget(gl, blurQuarterWidth, blurQuarterHeight),
                ]
                : [];
            blurQuarterTargets.forEach((target) => {
                deleteTextures.push(target.texture);
                deleteFramebuffers.push(target.framebuffer);
            });
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
            const irisLocations = irisProgram ? {
                position: gl.getAttribLocation(irisProgram, 'a_Position'),
                source: gl.getUniformLocation(irisProgram, 'u_Source'),
                mask: gl.getUniformLocation(irisProgram, 'u_Mask'),
                hasMask: gl.getUniformLocation(irisProgram, 'u_HasMask'),
                time: gl.getUniformLocation(irisProgram, 'u_Time'),
                scale: gl.getUniformLocation(irisProgram, 'u_Scale'),
                speed: gl.getUniformLocation(irisProgram, 'u_Speed'),
                rough: gl.getUniformLocation(irisProgram, 'u_Rough'),
                noiseAmount: gl.getUniformLocation(irisProgram, 'u_NoiseAmount'),
                phase: gl.getUniformLocation(irisProgram, 'u_Phase'),
            } : null;
            const cloudMotionLocations = cloudMotionProgram ? {
                position: gl.getAttribLocation(cloudMotionProgram, 'a_Position'),
                source: gl.getUniformLocation(cloudMotionProgram, 'u_Source'),
                mask: gl.getUniformLocation(cloudMotionProgram, 'u_Mask'),
                noise: gl.getUniformLocation(cloudMotionProgram, 'u_Noise'),
                hasMask: gl.getUniformLocation(cloudMotionProgram, 'u_HasMask'),
                time: gl.getUniformLocation(cloudMotionProgram, 'u_Time'),
                amount: gl.getUniformLocation(cloudMotionProgram, 'u_Amount'),
                direction: gl.getUniformLocation(cloudMotionProgram, 'u_Direction'),
                speed: gl.getUniformLocation(cloudMotionProgram, 'u_Speed'),
                scale: gl.getUniformLocation(cloudMotionProgram, 'u_Scale'),
                scaleX: gl.getUniformLocation(cloudMotionProgram, 'u_ScaleX'),
                aspect: gl.getUniformLocation(cloudMotionProgram, 'u_Aspect'),
            } : null;
            const skewLocations = skewProgram ? {
                position: gl.getAttribLocation(skewProgram, 'a_Position'),
                source: gl.getUniformLocation(skewProgram, 'u_Source'),
                top: gl.getUniformLocation(skewProgram, 'u_Top'),
                bottom: gl.getUniformLocation(skewProgram, 'u_Bottom'),
                left: gl.getUniformLocation(skewProgram, 'u_Left'),
                right: gl.getUniformLocation(skewProgram, 'u_Right'),
                repeat: gl.getUniformLocation(skewProgram, 'u_Repeat'),
            } : null;
            const swingLocations = swingProgram ? {
                position: gl.getAttribLocation(swingProgram, 'a_Position'),
                source: gl.getUniformLocation(swingProgram, 'u_Source'),
                mask: gl.getUniformLocation(swingProgram, 'u_Mask'),
                noise: gl.getUniformLocation(swingProgram, 'u_Noise'),
                hasMask: gl.getUniformLocation(swingProgram, 'u_HasMask'),
                noiseEnabled: gl.getUniformLocation(swingProgram, 'u_NoiseEnabled'),
                doubleSided: gl.getUniformLocation(swingProgram, 'u_DoubleSided'),
                time: gl.getUniformLocation(swingProgram, 'u_Time'),
                point0: gl.getUniformLocation(swingProgram, 'u_Point0'),
                point1: gl.getUniformLocation(swingProgram, 'u_Point1'),
                size: gl.getUniformLocation(swingProgram, 'u_Size'),
                center: gl.getUniformLocation(swingProgram, 'u_Center'),
                feather: gl.getUniformLocation(swingProgram, 'u_Feather'),
                amount: gl.getUniformLocation(swingProgram, 'u_Amount'),
                speed: gl.getUniformLocation(swingProgram, 'u_Speed'),
                phase: gl.getUniformLocation(swingProgram, 'u_Phase'),
                noiseSpeed: gl.getUniformLocation(swingProgram, 'u_NoiseSpeed'),
                noiseAmount: gl.getUniformLocation(swingProgram, 'u_NoiseAmount'),
                aspect: gl.getUniformLocation(swingProgram, 'u_Aspect'),
            } : null;
            const filmGrainLocations = filmGrainProgram ? {
                position: gl.getAttribLocation(filmGrainProgram, 'a_Position'),
                source: gl.getUniformLocation(filmGrainProgram, 'u_Source'),
                noise: gl.getUniformLocation(filmGrainProgram, 'u_Noise'),
                mask: gl.getUniformLocation(filmGrainProgram, 'u_Mask'),
                hasMask: gl.getUniformLocation(filmGrainProgram, 'u_HasMask'),
                time: gl.getUniformLocation(filmGrainProgram, 'u_Time'),
                strength: gl.getUniformLocation(filmGrainProgram, 'u_Strength'),
                power: gl.getUniformLocation(filmGrainProgram, 'u_Power'),
                scale: gl.getUniformLocation(filmGrainProgram, 'u_Scale'),
                aspect: gl.getUniformLocation(filmGrainProgram, 'u_Aspect'),
                greyscale: gl.getUniformLocation(filmGrainProgram, 'u_Greyscale'),
                blendMode: gl.getUniformLocation(filmGrainProgram, 'u_BlendMode'),
            } : null;
            const pulseLocations = pulseProgram ? {
                position: gl.getAttribLocation(pulseProgram, 'a_Position'),
                source: gl.getUniformLocation(pulseProgram, 'u_Source'),
                noise: gl.getUniformLocation(pulseProgram, 'u_Noise'),
                mask: gl.getUniformLocation(pulseProgram, 'u_Mask'),
                hasMask: gl.getUniformLocation(pulseProgram, 'u_HasMask'),
                time: gl.getUniformLocation(pulseProgram, 'u_Time'),
                speed: gl.getUniformLocation(pulseProgram, 'u_Speed'),
                phase: gl.getUniformLocation(pulseProgram, 'u_Phase'),
                amount: gl.getUniformLocation(pulseProgram, 'u_Amount'),
                bounds: gl.getUniformLocation(pulseProgram, 'u_Bounds'),
                noiseSpeed: gl.getUniformLocation(pulseProgram, 'u_NoiseSpeed'),
                noiseAmount: gl.getUniformLocation(pulseProgram, 'u_NoiseAmount'),
                power: gl.getUniformLocation(pulseProgram, 'u_Power'),
                tintLow: gl.getUniformLocation(pulseProgram, 'u_TintLow'),
                tintHigh: gl.getUniformLocation(pulseProgram, 'u_TintHigh'),
                blendMode: gl.getUniformLocation(pulseProgram, 'u_BlendMode'),
                pulseAlpha: gl.getUniformLocation(pulseProgram, 'u_PulseAlpha'),
                pulseColor: gl.getUniformLocation(pulseProgram, 'u_PulseColor'),
            } : null;
            const cloudsLocations = cloudsProgram ? {
                position: gl.getAttribLocation(cloudsProgram, 'a_Position'),
                source: gl.getUniformLocation(cloudsProgram, 'u_Source'),
                clouds: gl.getUniformLocation(cloudsProgram, 'u_Clouds'),
                mask: gl.getUniformLocation(cloudsProgram, 'u_Mask'),
                hasMask: gl.getUniformLocation(cloudsProgram, 'u_HasMask'),
                time: gl.getUniformLocation(cloudsProgram, 'u_Time'),
                alpha: gl.getUniformLocation(cloudsProgram, 'u_Alpha'),
                threshold: gl.getUniformLocation(cloudsProgram, 'u_Threshold'),
                feather: gl.getUniformLocation(cloudsProgram, 'u_Feather'),
                colorStart: gl.getUniformLocation(cloudsProgram, 'u_ColorStart'),
                colorEnd: gl.getUniformLocation(cloudsProgram, 'u_ColorEnd'),
                speed: gl.getUniformLocation(cloudsProgram, 'u_Speed'),
                scale: gl.getUniformLocation(cloudsProgram, 'u_Scale'),
                aspect: gl.getUniformLocation(cloudsProgram, 'u_Aspect'),
                shading: gl.getUniformLocation(cloudsProgram, 'u_Shading'),
                blendMode: gl.getUniformLocation(cloudsProgram, 'u_BlendMode'),
                writeAlpha: gl.getUniformLocation(cloudsProgram, 'u_WriteAlpha'),
            } : null;
            const blurRadialLocations = blurRadialProgram ? {
                position: gl.getAttribLocation(blurRadialProgram, 'a_Position'),
                source: gl.getUniformLocation(blurRadialProgram, 'u_Source'),
                mask: gl.getUniformLocation(blurRadialProgram, 'u_Mask'),
                hasMask: gl.getUniformLocation(blurRadialProgram, 'u_HasMask'),
                scale: gl.getUniformLocation(blurRadialProgram, 'u_Scale'),
                center: gl.getUniformLocation(blurRadialProgram, 'u_Center'),
                kernel: gl.getUniformLocation(blurRadialProgram, 'u_Kernel'),
                keepAlpha: gl.getUniformLocation(blurRadialProgram, 'u_KeepAlpha'),
            } : null;
            const lightShaftsLocations = lightShaftsProgram ? {
                position: gl.getAttribLocation(lightShaftsProgram, 'a_Position'),
                source: gl.getUniformLocation(lightShaftsProgram, 'u_Source'),
                noise: gl.getUniformLocation(lightShaftsProgram, 'u_Noise'),
                xform0: gl.getUniformLocation(lightShaftsProgram, 'u_Xform0'),
                xform1: gl.getUniformLocation(lightShaftsProgram, 'u_Xform1'),
                xform2: gl.getUniformLocation(lightShaftsProgram, 'u_Xform2'),
                time: gl.getUniformLocation(lightShaftsProgram, 'u_Time'),
                speed: gl.getUniformLocation(lightShaftsProgram, 'u_Speed'),
                scale: gl.getUniformLocation(lightShaftsProgram, 'u_Scale'),
                smoothness: gl.getUniformLocation(lightShaftsProgram, 'u_Smoothness'),
                feather: gl.getUniformLocation(lightShaftsProgram, 'u_Feather'),
                exponent: gl.getUniformLocation(lightShaftsProgram, 'u_Exponent'),
                intensity: gl.getUniformLocation(lightShaftsProgram, 'u_Intensity'),
                colorStart: gl.getUniformLocation(lightShaftsProgram, 'u_ColorStart'),
                colorEnd: gl.getUniformLocation(lightShaftsProgram, 'u_ColorEnd'),
                blendMode: gl.getUniformLocation(lightShaftsProgram, 'u_BlendMode'),
            } : null;
            const glitterLocations = glitterProgram ? {
                position: gl.getAttribLocation(glitterProgram, 'a_Position'),
                source: gl.getUniformLocation(glitterProgram, 'u_Source'),
                noise: gl.getUniformLocation(glitterProgram, 'u_Noise'),
                mask: gl.getUniformLocation(glitterProgram, 'u_Mask'),
                hasMask: gl.getUniformLocation(glitterProgram, 'u_HasMask'),
                time: gl.getUniformLocation(glitterProgram, 'u_Time'),
                speed: gl.getUniformLocation(glitterProgram, 'u_Speed'),
                density: gl.getUniformLocation(glitterProgram, 'u_Density'),
                scale: gl.getUniformLocation(glitterProgram, 'u_Scale'),
                alpha: gl.getUniformLocation(glitterProgram, 'u_Alpha'),
                color: gl.getUniformLocation(glitterProgram, 'u_Color'),
                blendMode: gl.getUniformLocation(glitterProgram, 'u_BlendMode'),
                aspect: gl.getUniformLocation(glitterProgram, 'u_Aspect'),
            } : null;
            const waterCausticsLocations = waterCausticsProgram ? {
                position: gl.getAttribLocation(waterCausticsProgram, 'a_Position'),
                source: gl.getUniformLocation(waterCausticsProgram, 'u_Source'),
                mask: gl.getUniformLocation(waterCausticsProgram, 'u_Mask'),
                caustic: gl.getUniformLocation(waterCausticsProgram, 'u_Caustic'),
                uniform: gl.getUniformLocation(waterCausticsProgram, 'u_Uniform'),
                perlin: gl.getUniformLocation(waterCausticsProgram, 'u_Perlin'),
                glow: gl.getUniformLocation(waterCausticsProgram, 'u_Glow'),
                glowPattern: gl.getUniformLocation(waterCausticsProgram, 'u_GlowPattern'),
                hasMask: gl.getUniformLocation(waterCausticsProgram, 'u_HasMask'),
                time: gl.getUniformLocation(waterCausticsProgram, 'u_Time'),
                brightness: gl.getUniformLocation(waterCausticsProgram, 'u_Brightness'),
                granularity: gl.getUniformLocation(waterCausticsProgram, 'u_Granularity'),
                distortion: gl.getUniformLocation(waterCausticsProgram, 'u_Distortion'),
                chromatic: gl.getUniformLocation(waterCausticsProgram, 'u_Chromatic'),
                blur: gl.getUniformLocation(waterCausticsProgram, 'u_Blur'),
                colorStart: gl.getUniformLocation(waterCausticsProgram, 'u_ColorStart'),
                colorEnd: gl.getUniformLocation(waterCausticsProgram, 'u_ColorEnd'),
                mode: gl.getUniformLocation(waterCausticsProgram, 'u_Mode'),
                blendMode: gl.getUniformLocation(waterCausticsProgram, 'u_BlendMode'),
                aspect: gl.getUniformLocation(waterCausticsProgram, 'u_Aspect'),
            } : null;
            const depthParallaxLocations = depthParallaxProgram ? {
                position: gl.getAttribLocation(depthParallaxProgram, 'a_Position'),
                source: gl.getUniformLocation(depthParallaxProgram, 'u_Source'),
                depth: gl.getUniformLocation(depthParallaxProgram, 'u_Depth'),
                mask: gl.getUniformLocation(depthParallaxProgram, 'u_Mask'),
                hasDepth: gl.getUniformLocation(depthParallaxProgram, 'u_HasDepth'),
                hasMask: gl.getUniformLocation(depthParallaxProgram, 'u_HasMask'),
                scale: gl.getUniformLocation(depthParallaxProgram, 'u_Scale'),
                sens: gl.getUniformLocation(depthParallaxProgram, 'u_Sens'),
                center: gl.getUniformLocation(depthParallaxProgram, 'u_Center'),
                parallaxPosition: gl.getUniformLocation(depthParallaxProgram, 'u_ParallaxPosition'),
                quality: gl.getUniformLocation(depthParallaxProgram, 'u_Quality'),
            } : null;
            const blurDownsampleLocations = blurDownsampleProgram ? {
                position: gl.getAttribLocation(blurDownsampleProgram, 'a_Position'),
                source: gl.getUniformLocation(blurDownsampleProgram, 'u_Source'),
                texelSize: gl.getUniformLocation(blurDownsampleProgram, 'u_TexelSize'),
            } : null;
            const blurGaussianLocations = blurGaussianProgram ? {
                position: gl.getAttribLocation(blurGaussianProgram, 'a_Position'),
                source: gl.getUniformLocation(blurGaussianProgram, 'u_Source'),
                direction: gl.getUniformLocation(blurGaussianProgram, 'u_Direction'),
                kernel: gl.getUniformLocation(blurGaussianProgram, 'u_Kernel'),
            } : null;
            const blurCombineLocations = blurCombineProgram ? {
                position: gl.getAttribLocation(blurCombineProgram, 'a_Position'),
                source: gl.getUniformLocation(blurCombineProgram, 'u_Source'),
                blurred: gl.getUniformLocation(blurCombineProgram, 'u_Blurred'),
                mask: gl.getUniformLocation(blurCombineProgram, 'u_Mask'),
                hasMask: gl.getUniformLocation(blurCombineProgram, 'u_HasMask'),
                compositeOffset: gl.getUniformLocation(blurCombineProgram, 'u_CompositeOffset'),
                composite: gl.getUniformLocation(blurCombineProgram, 'u_Composite'),
                blendMode: gl.getUniformLocation(blurCombineProgram, 'u_BlendMode'),
                compositeMono: gl.getUniformLocation(blurCombineProgram, 'u_CompositeMono'),
                compositeColor: gl.getUniformLocation(blurCombineProgram, 'u_CompositeColor'),
                compositeAlpha: gl.getUniformLocation(blurCombineProgram, 'u_CompositeAlpha'),
                keepAlpha: gl.getUniformLocation(blurCombineProgram, 'u_KeepAlpha'),
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
                    } else if (effect.kind === 'iris') {
                        const textures = effectTextures[index];
                        if (!irisProgram || !irisLocations || !textures || textures.kind !== 'iris') {
                            throw new Error('Wallpaper Engine iris program is unavailable.');
                        }
                        bindProgram(irisProgram, irisLocations.position, irisLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.uniform1i(irisLocations.mask, 1);
                        gl!.uniform1i(irisLocations.hasMask, textures.maskTexture ? 1 : 0);
                        gl!.uniform1f(irisLocations.time, timeSeconds);
                        gl!.uniform2f(irisLocations.scale, effect.scale.x, effect.scale.y);
                        gl!.uniform1f(irisLocations.speed, effect.speed);
                        gl!.uniform1f(irisLocations.rough, effect.rough);
                        gl!.uniform1f(irisLocations.noiseAmount, effect.noiseAmount);
                        gl!.uniform1f(irisLocations.phase, effect.phase);
                    } else if (effect.kind === 'cloudMotion') {
                        const textures = effectTextures[index];
                        if (!cloudMotionProgram || !cloudMotionLocations || !textures
                            || textures.kind !== 'cloudMotion' || !textures.noiseTexture) {
                            throw new Error('Wallpaper Engine cloud-motion program is unavailable.');
                        }
                        bindProgram(cloudMotionProgram, cloudMotionLocations.position, cloudMotionLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.noiseTexture);
                        gl!.uniform1i(cloudMotionLocations.mask, 1);
                        gl!.uniform1i(cloudMotionLocations.noise, 2);
                        gl!.uniform1i(cloudMotionLocations.hasMask, textures.maskTexture ? 1 : 0);
                        gl!.uniform1f(cloudMotionLocations.time, timeSeconds);
                        gl!.uniform1f(cloudMotionLocations.amount, effect.amount);
                        gl!.uniform1f(cloudMotionLocations.direction, effect.direction);
                        gl!.uniform1f(cloudMotionLocations.speed, effect.speed);
                        gl!.uniform1f(cloudMotionLocations.scale, effect.scale);
                        gl!.uniform1f(cloudMotionLocations.scaleX, effect.scaleX);
                        gl!.uniform1f(cloudMotionLocations.aspect, renderWidth / renderHeight);
                    } else if (effect.kind === 'skew') {
                        if (!skewProgram || !skewLocations) {
                            throw new Error('Wallpaper Engine skew program is unavailable.');
                        }
                        bindProgram(skewProgram, skewLocations.position, skewLocations.source);
                        gl!.uniform1f(skewLocations.top, effect.top);
                        gl!.uniform1f(skewLocations.bottom, effect.bottom);
                        gl!.uniform1f(skewLocations.left, effect.left);
                        gl!.uniform1f(skewLocations.right, effect.right);
                        gl!.uniform1i(skewLocations.repeat, effect.repeat ? 1 : 0);
                    } else if (effect.kind === 'swing') {
                        const textures = effectTextures[index];
                        if (!swingProgram || !swingLocations || !textures
                            || textures.kind !== 'swing' || !textures.noiseTexture) {
                            throw new Error('Wallpaper Engine swing program is unavailable.');
                        }
                        bindProgram(swingProgram, swingLocations.position, swingLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.noiseTexture);
                        gl!.uniform1i(swingLocations.mask, 1);
                        gl!.uniform1i(swingLocations.noise, 2);
                        gl!.uniform1i(swingLocations.hasMask, textures.maskTexture ? 1 : 0);
                        gl!.uniform1i(swingLocations.noiseEnabled, effect.noiseEnabled ? 1 : 0);
                        gl!.uniform1i(swingLocations.doubleSided, effect.doubleSided ? 1 : 0);
                        gl!.uniform1f(swingLocations.time, timeSeconds);
                        gl!.uniform2f(swingLocations.point0, effect.point0.x, effect.point0.y);
                        gl!.uniform2f(swingLocations.point1, effect.point1.x, effect.point1.y);
                        gl!.uniform1f(swingLocations.size, effect.size);
                        gl!.uniform1f(swingLocations.center, effect.center);
                        gl!.uniform1f(swingLocations.feather, effect.feather);
                        gl!.uniform1f(swingLocations.amount, effect.amount);
                        gl!.uniform1f(swingLocations.speed, effect.speed);
                        gl!.uniform1f(swingLocations.phase, effect.phase);
                        gl!.uniform1f(swingLocations.noiseSpeed, effect.noiseSpeed);
                        gl!.uniform1f(swingLocations.noiseAmount, effect.noiseAmount);
                        gl!.uniform1f(swingLocations.aspect, renderWidth / renderHeight);
                    } else if (effect.kind === 'filmGrain') {
                        const textures = effectTextures[index];
                        if (!filmGrainProgram || !filmGrainLocations || !textures
                            || textures.kind !== 'filmGrain' || !textures.noiseTexture) {
                            throw new Error('Wallpaper Engine film-grain program is unavailable.');
                        }
                        bindProgram(filmGrainProgram, filmGrainLocations.position, filmGrainLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.noiseTexture);
                        gl!.uniform1i(filmGrainLocations.mask, 1);
                        gl!.uniform1i(filmGrainLocations.noise, 2);
                        gl!.uniform1i(filmGrainLocations.hasMask, textures.maskTexture ? 1 : 0);
                        gl!.uniform1f(filmGrainLocations.time, timeSeconds);
                        gl!.uniform1f(filmGrainLocations.strength, effect.strength);
                        gl!.uniform1f(filmGrainLocations.power, effect.power);
                        gl!.uniform1f(filmGrainLocations.scale, effect.scale);
                        gl!.uniform1f(filmGrainLocations.aspect, renderWidth / renderHeight);
                        gl!.uniform1i(filmGrainLocations.greyscale, effect.greyscale ? 1 : 0);
                        gl!.uniform1i(filmGrainLocations.blendMode, effect.blendMode);
                    } else if (effect.kind === 'pulse') {
                        const textures = effectTextures[index];
                        if (!pulseProgram || !pulseLocations || !textures
                            || textures.kind !== 'pulse' || !textures.noiseTexture) {
                            throw new Error('Wallpaper Engine pulse program is unavailable.');
                        }
                        bindProgram(pulseProgram, pulseLocations.position, pulseLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.noiseTexture);
                        gl!.uniform1i(pulseLocations.mask, 1);
                        gl!.uniform1i(pulseLocations.noise, 2);
                        gl!.uniform1i(pulseLocations.hasMask, textures.maskTexture ? 1 : 0);
                        gl!.uniform1f(pulseLocations.time, timeSeconds);
                        gl!.uniform1f(pulseLocations.speed, effect.speed);
                        gl!.uniform1f(pulseLocations.phase, effect.phase);
                        gl!.uniform1f(pulseLocations.amount, effect.amount);
                        gl!.uniform2f(pulseLocations.bounds, effect.bounds.x, effect.bounds.y);
                        gl!.uniform1f(pulseLocations.noiseSpeed, effect.noiseSpeed);
                        gl!.uniform1f(pulseLocations.noiseAmount, effect.noiseAmount);
                        gl!.uniform1f(pulseLocations.power, effect.power);
                        gl!.uniform3f(pulseLocations.tintLow, effect.tintLow.r, effect.tintLow.g, effect.tintLow.b);
                        gl!.uniform3f(pulseLocations.tintHigh, effect.tintHigh.r, effect.tintHigh.g, effect.tintHigh.b);
                        gl!.uniform1i(pulseLocations.blendMode, effect.blendMode);
                        gl!.uniform1i(pulseLocations.pulseAlpha, effect.pulseAlpha ? 1 : 0);
                        gl!.uniform1i(pulseLocations.pulseColor, effect.pulseColor ? 1 : 0);
                    } else if (effect.kind === 'clouds') {
                        const textures = effectTextures[index];
                        if (!cloudsProgram || !cloudsLocations || !textures
                            || textures.kind !== 'clouds' || !textures.cloudTexture) {
                            throw new Error('Wallpaper Engine clouds program is unavailable.');
                        }
                        bindProgram(cloudsProgram, cloudsLocations.position, cloudsLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.cloudTexture);
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.uniform1i(cloudsLocations.clouds, 1);
                        gl!.uniform1i(cloudsLocations.mask, 2);
                        gl!.uniform1i(cloudsLocations.hasMask, textures.maskTexture ? 1 : 0);
                        gl!.uniform1f(cloudsLocations.time, timeSeconds);
                        gl!.uniform1f(cloudsLocations.alpha, effect.alpha);
                        gl!.uniform1f(cloudsLocations.threshold, effect.threshold);
                        gl!.uniform1f(cloudsLocations.feather, effect.feather);
                        gl!.uniform3f(cloudsLocations.colorStart, effect.colorStart.r, effect.colorStart.g, effect.colorStart.b);
                        gl!.uniform3f(cloudsLocations.colorEnd, effect.colorEnd.r, effect.colorEnd.g, effect.colorEnd.b);
                        gl!.uniform4f(cloudsLocations.speed, effect.speed[0], effect.speed[1], effect.speed[2], effect.speed[3]);
                        gl!.uniform4f(cloudsLocations.scale, effect.scale[0], effect.scale[1], effect.scale[2], effect.scale[3]);
                        gl!.uniform1f(cloudsLocations.aspect, renderWidth / renderHeight);
                        gl!.uniform1i(cloudsLocations.shading, effect.shading ? 1 : 0);
                        gl!.uniform1i(cloudsLocations.blendMode, effect.blendMode);
                        gl!.uniform1i(cloudsLocations.writeAlpha, effect.writeAlpha ? 1 : 0);
                    } else if (effect.kind === 'blurRadial') {
                        const textures = effectTextures[index];
                        if (!blurRadialProgram || !blurRadialLocations || !textures || textures.kind !== 'blurRadial') {
                            throw new Error('Wallpaper Engine radial-blur program is unavailable.');
                        }
                        bindProgram(blurRadialProgram, blurRadialLocations.position, blurRadialLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.uniform1i(blurRadialLocations.mask, 1);
                        gl!.uniform1i(blurRadialLocations.hasMask, textures.maskTexture ? 1 : 0);
                        gl!.uniform1f(blurRadialLocations.scale, effect.scale);
                        gl!.uniform2f(blurRadialLocations.center, effect.center.x, effect.center.y);
                        gl!.uniform1i(blurRadialLocations.kernel, effect.kernel);
                        gl!.uniform1i(blurRadialLocations.keepAlpha, effect.keepAlpha ? 1 : 0);
                    } else if (effect.kind === 'lightShafts') {
                        const textures = effectTextures[index];
                        if (!lightShaftsProgram || !lightShaftsLocations || !textures
                            || textures.kind !== 'lightShafts' || !textures.noiseTexture) {
                            throw new Error('Wallpaper Engine light-shafts program is unavailable.');
                        }
                        const xform = effect.transform;
                        bindProgram(lightShaftsProgram, lightShaftsLocations.position, lightShaftsLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.noiseTexture);
                        gl!.uniform1i(lightShaftsLocations.noise, 1);
                        gl!.uniform3f(lightShaftsLocations.xform0, xform[0], xform[1], xform[2]);
                        gl!.uniform3f(lightShaftsLocations.xform1, xform[3], xform[4], xform[5]);
                        gl!.uniform3f(lightShaftsLocations.xform2, xform[6], xform[7], xform[8]);
                        gl!.uniform1f(lightShaftsLocations.time, timeSeconds);
                        gl!.uniform1f(lightShaftsLocations.speed, effect.speed);
                        gl!.uniform2f(lightShaftsLocations.scale, effect.scale.x, effect.scale.y);
                        gl!.uniform1f(lightShaftsLocations.smoothness, effect.smoothness);
                        gl!.uniform2f(lightShaftsLocations.feather, effect.feather.x, effect.feather.y);
                        gl!.uniform1f(lightShaftsLocations.exponent, effect.exponent);
                        gl!.uniform1f(lightShaftsLocations.intensity, effect.intensity);
                        gl!.uniform3f(lightShaftsLocations.colorStart, effect.colorStart.r, effect.colorStart.g, effect.colorStart.b);
                        gl!.uniform3f(lightShaftsLocations.colorEnd, effect.colorEnd.r, effect.colorEnd.g, effect.colorEnd.b);
                        gl!.uniform1i(lightShaftsLocations.blendMode, effect.blendMode);
                    } else if (effect.kind === 'glitter') {
                        const textures = effectTextures[index];
                        if (!glitterProgram || !glitterLocations || !textures
                            || textures.kind !== 'glitter' || !textures.noiseTexture) {
                            throw new Error('Wallpaper Engine glitter program is unavailable.');
                        }
                        bindProgram(glitterProgram, glitterLocations.position, glitterLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.noiseTexture);
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.uniform1i(glitterLocations.noise, 1);
                        gl!.uniform1i(glitterLocations.mask, 2);
                        gl!.uniform1i(glitterLocations.hasMask, textures.maskTexture ? 1 : 0);
                        gl!.uniform1f(glitterLocations.time, timeSeconds);
                        gl!.uniform1f(glitterLocations.speed, effect.speed);
                        gl!.uniform1f(glitterLocations.density, effect.density);
                        gl!.uniform1f(glitterLocations.scale, effect.scale);
                        gl!.uniform1f(glitterLocations.alpha, effect.alpha);
                        gl!.uniform3f(glitterLocations.color, effect.color.r, effect.color.g, effect.color.b);
                        gl!.uniform1i(glitterLocations.blendMode, effect.blendMode);
                        gl!.uniform1f(glitterLocations.aspect, renderWidth / renderHeight);
                    } else if (effect.kind === 'waterCaustics') {
                        const textures = effectTextures[index];
                        if (!waterCausticsProgram || !waterCausticsLocations || !textures
                            || textures.kind !== 'waterCaustics' || !textures.causticTexture
                            || !textures.uniformTexture || !textures.perlinTexture || !textures.glowTexture) {
                            throw new Error('Wallpaper Engine water-caustics program is unavailable.');
                        }
                        bindProgram(waterCausticsProgram, waterCausticsLocations.position, waterCausticsLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.causticTexture);
                        gl!.activeTexture(gl!.TEXTURE3);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.uniformTexture);
                        gl!.activeTexture(gl!.TEXTURE4);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.perlinTexture);
                        gl!.activeTexture(gl!.TEXTURE5);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.glowTexture);
                        gl!.uniform1i(waterCausticsLocations.mask, 1);
                        gl!.uniform1i(waterCausticsLocations.caustic, 2);
                        gl!.uniform1i(waterCausticsLocations.uniform, 3);
                        gl!.uniform1i(waterCausticsLocations.perlin, 4);
                        gl!.uniform1i(waterCausticsLocations.glowPattern, 5);
                        gl!.uniform1i(waterCausticsLocations.hasMask, textures.maskTexture ? 1 : 0);
                        // WE scales the effect clock by `speed` and offsets it, so
                        // the combined value is what the shader consumes.
                        gl!.uniform1f(
                            waterCausticsLocations.time,
                            timeSeconds * effect.speed + effect.timeOffset
                        );
                        gl!.uniform1f(waterCausticsLocations.brightness, effect.brightness);
                        gl!.uniform1f(waterCausticsLocations.granularity, effect.granularity);
                        gl!.uniform1f(waterCausticsLocations.distortion, effect.distortion);
                        gl!.uniform1f(waterCausticsLocations.chromatic, effect.chromatic);
                        gl!.uniform1f(waterCausticsLocations.blur, effect.blur);
                        gl!.uniform1f(waterCausticsLocations.glow, effect.glow);
                        gl!.uniform3f(waterCausticsLocations.colorStart, effect.colorStart.r, effect.colorStart.g, effect.colorStart.b);
                        gl!.uniform3f(waterCausticsLocations.colorEnd, effect.colorEnd.r, effect.colorEnd.g, effect.colorEnd.b);
                        gl!.uniform1i(waterCausticsLocations.mode, effect.mode);
                        gl!.uniform1i(waterCausticsLocations.blendMode, effect.blendMode);
                        gl!.uniform1f(waterCausticsLocations.aspect, renderWidth / renderHeight);
                    } else if (effect.kind === 'depthParallax') {
                        const textures = effectTextures[index];
                        if (!depthParallaxProgram || !depthParallaxLocations || !textures
                            || textures.kind !== 'depthParallax') {
                            throw new Error('Wallpaper Engine depth-parallax program is unavailable.');
                        }
                        bindProgram(depthParallaxProgram, depthParallaxLocations.position, depthParallaxLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.depthTexture);
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.uniform1i(depthParallaxLocations.depth, 1);
                        gl!.uniform1i(depthParallaxLocations.mask, 2);
                        gl!.uniform1i(depthParallaxLocations.hasDepth, textures.depthTexture ? 1 : 0);
                        gl!.uniform1i(depthParallaxLocations.hasMask, textures.maskTexture ? 1 : 0);
                        gl!.uniform2f(depthParallaxLocations.scale, effect.scale.x, effect.scale.y);
                        gl!.uniform1f(depthParallaxLocations.sens, effect.sens);
                        gl!.uniform1f(depthParallaxLocations.center, effect.center);
                        // No pointer feed yet: the neutral centred pose is the
                        // static-frame behaviour WE itself renders.
                        gl!.uniform2f(depthParallaxLocations.parallaxPosition, 0.5, 0.5);
                        gl!.uniform1i(depthParallaxLocations.quality, effect.quality);
                    } else if (effect.kind === 'blur') {
                        const textures = effectTextures[index];
                        if (!blurDownsampleProgram || !blurDownsampleLocations
                            || !blurGaussianProgram || !blurGaussianLocations
                            || !blurCombineProgram || !blurCombineLocations
                            || !textures || textures.kind !== 'blur'
                            || blurQuarterTargets.length < 2) {
                            throw new Error('Wallpaper Engine blur program is unavailable.');
                        }
                        const effectInputTexture = inputTexture;
                        const [quarterA, quarterB] = blurQuarterTargets;
                        const quarterWidth = Math.max(2, Math.floor(renderWidth / 4));
                        const quarterHeight = Math.max(2, Math.floor(renderHeight / 4));

                        // Pass 0: 4-tap downsample into the first quarter buffer.
                        gl!.bindFramebuffer(gl!.FRAMEBUFFER, quarterA.framebuffer);
                        gl!.viewport(0, 0, quarterWidth, quarterHeight);
                        gl!.activeTexture(gl!.TEXTURE0);
                        gl!.bindTexture(gl!.TEXTURE_2D, effectInputTexture);
                        bindProgram(blurDownsampleProgram, blurDownsampleLocations.position, blurDownsampleLocations.source);
                        gl!.uniform2f(blurDownsampleLocations.texelSize, 1 / renderWidth, 1 / renderHeight);
                        gl!.drawArrays(gl!.TRIANGLES, 0, 6);

                        // Pass 1: horizontal Gaussian.
                        gl!.bindFramebuffer(gl!.FRAMEBUFFER, quarterB.framebuffer);
                        gl!.viewport(0, 0, quarterWidth, quarterHeight);
                        gl!.activeTexture(gl!.TEXTURE0);
                        gl!.bindTexture(gl!.TEXTURE_2D, quarterA.texture);
                        bindProgram(blurGaussianProgram, blurGaussianLocations.position, blurGaussianLocations.source);
                        gl!.uniform2f(blurGaussianLocations.direction, effect.scale.x / quarterWidth, 0);
                        gl!.uniform1i(blurGaussianLocations.kernel, effect.kernel);
                        gl!.drawArrays(gl!.TRIANGLES, 0, 6);

                        // Pass 2: vertical Gaussian, ping-ponged back into the first.
                        gl!.bindFramebuffer(gl!.FRAMEBUFFER, quarterA.framebuffer);
                        gl!.viewport(0, 0, quarterWidth, quarterHeight);
                        gl!.activeTexture(gl!.TEXTURE0);
                        gl!.bindTexture(gl!.TEXTURE_2D, quarterB.texture);
                        bindProgram(blurGaussianProgram, blurGaussianLocations.position, blurGaussianLocations.source);
                        gl!.uniform2f(blurGaussianLocations.direction, 0, effect.scale.y / quarterHeight);
                        gl!.uniform1i(blurGaussianLocations.kernel, effect.kernel);
                        gl!.drawArrays(gl!.TRIANGLES, 0, 6);

                        // Pass 3: composite the blurred buffer against the original.
                        gl!.bindFramebuffer(gl!.FRAMEBUFFER, target?.framebuffer ?? null);
                        gl!.viewport(0, 0, renderWidth, renderHeight);
                        gl!.activeTexture(gl!.TEXTURE0);
                        gl!.bindTexture(gl!.TEXTURE_2D, effectInputTexture);
                        bindProgram(blurCombineProgram, blurCombineLocations.position, blurCombineLocations.source);
                        gl!.activeTexture(gl!.TEXTURE1);
                        gl!.bindTexture(gl!.TEXTURE_2D, quarterA.texture);
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, textures.maskTexture);
                        gl!.uniform1i(blurCombineLocations.blurred, 1);
                        gl!.uniform1i(blurCombineLocations.mask, 2);
                        gl!.uniform1i(blurCombineLocations.hasMask, textures.maskTexture ? 1 : 0);
                        // WE expresses the composite offset in blurred-texel units.
                        gl!.uniform2f(
                            blurCombineLocations.compositeOffset,
                            effect.compositeOffset.x / quarterWidth,
                            effect.compositeOffset.y / quarterHeight
                        );
                        gl!.uniform1i(blurCombineLocations.composite, effect.composite);
                        gl!.uniform1i(blurCombineLocations.blendMode, effect.blendMode);
                        gl!.uniform1i(blurCombineLocations.compositeMono, effect.compositeMono ? 1 : 0);
                        gl!.uniform3f(
                            blurCombineLocations.compositeColor,
                            effect.compositeColor.r,
                            effect.compositeColor.g,
                            effect.compositeColor.b
                        );
                        gl!.uniform1f(blurCombineLocations.compositeAlpha, effect.compositeAlpha);
                        gl!.uniform1i(blurCombineLocations.keepAlpha, effect.keepAlpha ? 1 : 0);
                        gl!.drawArrays(gl!.TRIANGLES, 0, 6);
                        if (target) inputTexture = target.texture;
                        return;
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
