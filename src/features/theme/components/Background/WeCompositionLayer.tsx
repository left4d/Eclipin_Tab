import React from 'react';
import type { ImportedWeCompositionEffect, ImportedWeSize } from '@/features/theme/utils/wallpaperEngineImportedScene';

type ResolvedCompositionEffect =
    | Extract<ImportedWeCompositionEffect, { kind: 'tint' }>
    | (Extract<ImportedWeCompositionEffect, { kind: 'blend' }> & {
        textureUrl: string;
        maskUrl: string | null;
    })
    | Extract<ImportedWeCompositionEffect, { kind: 'transform' }>
    | Extract<ImportedWeCompositionEffect, { kind: 'fisheye' }>
    | (Extract<ImportedWeCompositionEffect, { kind: 'opacity' }> & {
        maskUrl: string | null;
    });

interface WeCompositionLayerProps {
    effects: ResolvedCompositionEffect[];
    logicalSize: ImportedWeSize;
    className: string;
    style: React.CSSProperties;
    dataSource: string;
}

const VERTEX_SHADER = `
attribute vec2 a_Position;
varying vec2 v_TexCoord;
void main() {
    gl_Position = vec4(a_Position, 0.0, 1.0);
    v_TexCoord = a_Position * 0.5 + 0.5;
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Input;
uniform sampler2D u_Aux;
uniform sampler2D u_Mask;
uniform int u_Mode;
uniform bool u_HasMask;
uniform bool u_TransparentOutside;
uniform bool u_FinalPass;
uniform vec3 u_Color;
uniform float u_Alpha;
uniform float u_Multiply;
uniform vec2 u_Offset;
uniform vec2 u_Scale;
uniform float u_Angle;
uniform vec2 u_Center;
uniform float u_Distortion;
uniform float u_Size;

vec2 rotateVec2(vec2 value, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(value.x * c - value.y * s, value.x * s + value.y * c);
}

void main() {
    vec4 outColor = texture2D(u_Input, v_TexCoord);

    if (u_Mode == 0) {
        outColor.rgb = mix(outColor.rgb, u_Color, clamp(u_Alpha, 0.0, 1.0));
        outColor.a = 1.0;
    } else if (u_Mode == 1) {
        vec4 blendColor = texture2D(u_Aux, v_TexCoord);
        float amount = blendColor.a * u_Multiply;
        if (u_HasMask) amount *= texture2D(u_Mask, v_TexCoord).r;
        amount = clamp(amount, 0.0, 1.0);
        outColor.rgb = mix(outColor.rgb, blendColor.rgb, amount);
    } else if (u_Mode == 2) {
        vec2 uv = rotateVec2(v_TexCoord - vec2(0.5), u_Angle);
        uv = (uv + u_Offset) * u_Scale + vec2(0.5);
        outColor = texture2D(u_Input, uv);
    } else if (u_Mode == 3) {
        float apertureHalf = 0.5 * 178.0 * (3.14159265359 / 180.0);
        float maxFactor = sin(apertureHalf);
        vec2 xy = (v_TexCoord - u_Center) * 2.0 / u_Size;
        float d = length(xy);
        vec2 uv = v_TexCoord;
        float outsideAlpha = 1.0;
        if (d < (2.0 - maxFactor)) {
            d = length(xy * maxFactor);
            d = min(d, 0.999999);
            float z = sqrt(max(0.0, 1.0 - d * d));
            float r = atan(d, z) / 3.14159265359;
            float phi = atan(xy.y, xy.x);
            uv.x = r * cos(phi) * u_Size + u_Center.x;
            uv.y = r * sin(phi) * u_Size + u_Center.y;
        } else if (u_TransparentOutside) {
            outsideAlpha = 0.0;
        }
        outColor = texture2D(u_Input, mix(v_TexCoord, uv, u_Distortion));
        outColor.a *= outsideAlpha;
    } else if (u_Mode == 4) {
        float mask = u_HasMask ? texture2D(u_Mask, v_TexCoord).r : 1.0;
        outColor.a *= mask * u_Alpha;
    }

    if (u_FinalPass) outColor.rgb *= outColor.a;
    gl_FragColor = outColor;
}
`;

const MAX_RENDER_DIMENSION = 2048;

const loadImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load Wallpaper Engine composition texture: ${url}`));
    image.src = url;
});

const compileShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Unable to allocate Wallpaper Engine composition shader.');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) || 'Unknown composition shader compile error.';
        gl.deleteShader(shader);
        throw new Error(message);
    }
    return shader;
};

const createProgram = (gl: WebGLRenderingContext): WebGLProgram => {
    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!program) throw new Error('Unable to allocate Wallpaper Engine composition program.');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const message = gl.getProgramInfoLog(program) || 'Unknown composition program link error.';
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
    if (!context) throw new Error('2D canvas is unavailable for Wallpaper Engine composition scaling.');
    context.drawImage(image, 0, 0, width, height);
    return canvas;
};

const createTexture = (
    gl: WebGLRenderingContext,
    source: TexImageSource,
): WebGLTexture => {
    const texture = gl.createTexture();
    if (!texture) throw new Error('Unable to allocate Wallpaper Engine composition texture.');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    return texture;
};

const createRenderTarget = (
    gl: WebGLRenderingContext,
    width: number,
    height: number,
): { texture: WebGLTexture; framebuffer: WebGLFramebuffer } => {
    const texture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    if (!texture || !framebuffer) throw new Error('Unable to allocate Wallpaper Engine composition render target.');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error('Wallpaper Engine composition framebuffer is incomplete.');
    }
    return { texture, framebuffer };
};

const effectMode = (effect: ResolvedCompositionEffect): number => {
    if (effect.kind === 'tint') return 0;
    if (effect.kind === 'blend') return 1;
    if (effect.kind === 'transform') return 2;
    if (effect.kind === 'fisheye') return 3;
    return 4;
};

const compositionEffectSignature = (effects: ResolvedCompositionEffect[]): string => effects.map((effect) => {
    if (effect.kind === 'tint') {
        return ['tint', effect.color.r, effect.color.g, effect.color.b, effect.alpha].join(':');
    }
    if (effect.kind === 'blend') {
        return ['blend', effect.texturePath, effect.maskPath ?? '', effect.multiply].join(':');
    }
    if (effect.kind === 'transform') {
        return ['transform', effect.offset.x, effect.offset.y, effect.scale.x, effect.scale.y, effect.angle].join(':');
    }
    if (effect.kind === 'fisheye') {
        return [
            'fisheye',
            effect.center.x,
            effect.center.y,
            effect.distortion,
            effect.size,
            effect.transparentOutside ? 1 : 0,
        ].join(':');
    }
    return ['opacity', effect.maskPath ?? '', effect.alpha].join(':');
}).join('|');

export const WeCompositionLayer: React.FC<WeCompositionLayerProps> = ({
    effects,
    logicalSize,
    className,
    style,
    dataSource,
}) => {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const [ready, setReady] = React.useState(false);
    const effectSignature = compositionEffectSignature(effects);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || effects.length === 0) return undefined;

        let disposed = false;
        let gl: WebGLRenderingContext | null = null;
        let program: WebGLProgram | null = null;
        let buffer: WebGLBuffer | null = null;
        const deleteTextures: WebGLTexture[] = [];
        const deleteFramebuffers: WebGLFramebuffer[] = [];
        setReady(false);

        const run = async () => {
            const urls = new Set<string>();
            effects.forEach((effect) => {
                if (effect.kind === 'blend') {
                    urls.add(effect.textureUrl);
                    if (effect.maskUrl) urls.add(effect.maskUrl);
                } else if (effect.kind === 'opacity' && effect.maskUrl) {
                    urls.add(effect.maskUrl);
                }
            });
            const loaded = new Map<string, HTMLImageElement>();
            await Promise.all([...urls].map(async (url) => loaded.set(url, await loadImage(url))));
            if (disposed) return;

            const scale = Math.min(1, MAX_RENDER_DIMENSION / Math.max(logicalSize.width, logicalSize.height));
            const renderWidth = Math.max(1, Math.round(logicalSize.width * scale));
            const renderHeight = Math.max(1, Math.round(logicalSize.height * scale));
            canvas.width = renderWidth;
            canvas.height = renderHeight;

            gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true });
            if (!gl) throw new Error('WebGL is unavailable for Wallpaper Engine composition rendering.');
            program = createProgram(gl);
            gl.useProgram(program);
            gl.viewport(0, 0, renderWidth, renderHeight);

            buffer = gl.createBuffer();
            if (!buffer) throw new Error('Unable to allocate Wallpaper Engine composition vertex buffer.');
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
            const position = gl.getAttribLocation(program, 'a_Position');
            gl.enableVertexAttribArray(position);
            gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

            const targets = [
                createRenderTarget(gl, renderWidth, renderHeight),
                createRenderTarget(gl, renderWidth, renderHeight),
            ];
            targets.forEach((target) => {
                deleteTextures.push(target.texture);
                deleteFramebuffers.push(target.framebuffer);
                gl!.bindFramebuffer(gl!.FRAMEBUFFER, target.framebuffer);
                gl!.clearColor(0, 0, 0, 0);
                gl!.clear(gl!.COLOR_BUFFER_BIT);
            });

            const imageTextures = new Map<string, WebGLTexture>();
            for (const [url, image] of loaded) {
                const texture = createTexture(gl, scaledCanvas(image, renderWidth, renderHeight));
                imageTextures.set(url, texture);
                deleteTextures.push(texture);
            }

            const location = (name: string) => gl!.getUniformLocation(program!, name);
            const uniforms = {
                input: location('u_Input'),
                aux: location('u_Aux'),
                mask: location('u_Mask'),
                mode: location('u_Mode'),
                hasMask: location('u_HasMask'),
                transparentOutside: location('u_TransparentOutside'),
                finalPass: location('u_FinalPass'),
                color: location('u_Color'),
                alpha: location('u_Alpha'),
                multiply: location('u_Multiply'),
                offset: location('u_Offset'),
                scale: location('u_Scale'),
                angle: location('u_Angle'),
                center: location('u_Center'),
                distortion: location('u_Distortion'),
                size: location('u_Size'),
            };
            gl.uniform1i(uniforms.input, 0);
            gl.uniform1i(uniforms.aux, 1);
            gl.uniform1i(uniforms.mask, 2);

            let inputIndex = 0;
            effects.forEach((effect, index) => {
                const last = index === effects.length - 1;
                const targetIndex = inputIndex === 0 ? 1 : 0;
                gl!.bindFramebuffer(gl!.FRAMEBUFFER, last ? null : targets[targetIndex].framebuffer);
                gl!.viewport(0, 0, renderWidth, renderHeight);
                gl!.activeTexture(gl!.TEXTURE0);
                gl!.bindTexture(gl!.TEXTURE_2D, targets[inputIndex].texture);
                gl!.activeTexture(gl!.TEXTURE1);
                gl!.bindTexture(gl!.TEXTURE_2D, null);
                gl!.activeTexture(gl!.TEXTURE2);
                gl!.bindTexture(gl!.TEXTURE_2D, null);

                gl!.uniform1i(uniforms.mode, effectMode(effect));
                gl!.uniform1i(uniforms.hasMask, 0);
                gl!.uniform1i(uniforms.transparentOutside, 0);
                gl!.uniform1i(uniforms.finalPass, last ? 1 : 0);
                gl!.uniform3f(uniforms.color, 0, 0, 0);
                gl!.uniform1f(uniforms.alpha, 1);
                gl!.uniform1f(uniforms.multiply, 1);
                gl!.uniform2f(uniforms.offset, 0, 0);
                gl!.uniform2f(uniforms.scale, 1, 1);
                gl!.uniform1f(uniforms.angle, 0);
                gl!.uniform2f(uniforms.center, 0.5, 0.5);
                gl!.uniform1f(uniforms.distortion, 1);
                gl!.uniform1f(uniforms.size, 1);

                if (effect.kind === 'tint') {
                    gl!.uniform3f(uniforms.color, effect.color.r, effect.color.g, effect.color.b);
                    gl!.uniform1f(uniforms.alpha, effect.alpha);
                } else if (effect.kind === 'blend') {
                    gl!.activeTexture(gl!.TEXTURE1);
                    gl!.bindTexture(gl!.TEXTURE_2D, imageTextures.get(effect.textureUrl) ?? null);
                    if (effect.maskUrl) {
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, imageTextures.get(effect.maskUrl) ?? null);
                        gl!.uniform1i(uniforms.hasMask, 1);
                    }
                    gl!.uniform1f(uniforms.multiply, effect.multiply);
                } else if (effect.kind === 'transform') {
                    gl!.uniform2f(uniforms.offset, effect.offset.x, effect.offset.y);
                    gl!.uniform2f(uniforms.scale, effect.scale.x, effect.scale.y);
                    gl!.uniform1f(uniforms.angle, effect.angle);
                } else if (effect.kind === 'fisheye') {
                    gl!.uniform2f(uniforms.center, effect.center.x, effect.center.y);
                    gl!.uniform1f(uniforms.distortion, effect.distortion);
                    gl!.uniform1f(uniforms.size, effect.size);
                    gl!.uniform1i(uniforms.transparentOutside, effect.transparentOutside ? 1 : 0);
                } else {
                    if (effect.maskUrl) {
                        gl!.activeTexture(gl!.TEXTURE2);
                        gl!.bindTexture(gl!.TEXTURE_2D, imageTextures.get(effect.maskUrl) ?? null);
                        gl!.uniform1i(uniforms.hasMask, 1);
                    }
                    gl!.uniform1f(uniforms.alpha, effect.alpha);
                }

                gl!.drawArrays(gl!.TRIANGLES, 0, 6);
                if (!last) inputIndex = targetIndex;
            });

            if (!disposed) setReady(true);
        };

        void run().catch((error) => {
            if (!disposed) console.warn('Wallpaper Engine composition renderer could not render this layer:', error);
        });

        return () => {
            disposed = true;
            if (gl) {
                deleteTextures.forEach((texture) => gl!.deleteTexture(texture));
                deleteFramebuffers.forEach((framebuffer) => gl!.deleteFramebuffer(framebuffer));
                if (buffer) gl.deleteBuffer(buffer);
                if (program) gl.deleteProgram(program);
            }
        };
    }, [effectSignature, logicalSize.height, logicalSize.width]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            data-we-source={dataSource}
            data-we-effect="composition"
            style={{ ...style, visibility: ready ? 'visible' : 'hidden' }}
        />
    );
};
