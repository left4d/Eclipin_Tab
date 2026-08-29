import React from 'react';
import type {
    ImportedWePuppetAnimationLayer,
    ImportedWePuppetMesh,
} from '@/features/theme/utils/wallpaperEngineImportedScene';
import {
    createWallpaperEnginePuppet2dSkinningState,
    createWallpaperEnginePuppet3dSkinningState,
    getWallpaperEnginePuppetOrthographicBounds,
    sampleWallpaperEnginePuppet2dPositions,
    sampleWallpaperEnginePuppet3dPositions,
} from '@/features/theme/utils/wallpaperEnginePuppetAnimation';
import { parseWallpaperEnginePuppetModel } from '@/features/theme/utils/wallpaperEnginePuppetModel';
import {
    releaseWallpaperEngineSharedPuppetTexture,
    renderWallpaperEngineSharedPuppetFrame,
} from '@/features/theme/utils/wallpaperEnginePuppetSharedRenderer';

interface WePuppetMeshLayerProps {
    src: string;
    mesh: ImportedWePuppetMesh;
    /** Blob URL for the retained raw MDLV0023 model. */
    modelSrc?: string | null;
    animationLayers?: ImportedWePuppetAnimationLayer[];
    animationMode?: '2d' | 'orthographic3d';
    /** Shared scene/effect time origin so atlas effects and deformation stay aligned. */
    timeOriginMs?: number;
    className?: string;
    style?: React.CSSProperties;
    dataSource?: string;
}

export interface WePuppetMeshLayerHandle {
    /** Replace the atlas sampled by the puppet mesh without rebuilding geometry. */
    updateTexture: (source: TexImageSource) => void;
}

const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_uv;
uniform vec2 u_resolution;
varying vec2 v_uv;
void main() {
    vec2 zeroToOne = a_position / u_resolution;
    vec2 clip = zeroToOne * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    v_uv = a_uv;
}`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_uv;
void main() {
    gl_FragColor = texture2D(u_texture, v_uv);
}`;

const compileShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
    }
    return shader;
};

/**
 * Render a WE MDLV0023 puppet. Step 18 adds the corpus-validated
 * orthographic 3D path; Step 18.1 keeps its geometry/animation semantics but
 * routes orthographic instances through one shared WebGL scratch renderer so
 * scenes with many Puppet layers do not allocate one GPU context per layer.
 */
export const WePuppetMeshLayer = React.forwardRef<WePuppetMeshLayerHandle, WePuppetMeshLayerProps>((
    {
        src,
        mesh,
        modelSrc = null,
        animationLayers = [],
        animationMode,
        timeOriginMs = 0,
        className,
        style,
        dataSource,
    },
    ref,
) => {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const updateTextureRef = React.useRef<((source: TexImageSource) => void) | null>(null);

    const renderBounds = React.useMemo(() => {
        if (animationMode !== 'orthographic3d') return mesh.bounds;
        return getWallpaperEnginePuppetOrthographicBounds(mesh) ?? mesh.bounds;
    }, [animationMode, mesh]);
    const renderWidth = Math.max(1, Math.ceil(renderBounds.maxX - renderBounds.minX));
    const renderHeight = Math.max(1, Math.ceil(renderBounds.maxY - renderBounds.minY));

    React.useImperativeHandle(ref, () => ({
        updateTexture: (source: TexImageSource) => updateTextureRef.current?.(source),
    }), []);

    const animationSignature = React.useMemo(
        () => animationLayers.map((layer) => [
            layer.animationId,
            layer.additive ? 1 : 0,
            layer.blend,
            layer.blendIn ? 1 : 0,
            layer.blendOut ? 1 : 0,
            layer.rate,
            layer.visible ? 1 : 0,
        ].join(':')).join('|'),
        [animationLayers],
    );

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        const width = renderWidth;
        const height = renderHeight;
        canvas.width = width;
        canvas.height = height;

        // Step 18.1: orthographic 3D scenes can contain many Puppet instances.
        // Rendering every instance through its own WebGL canvas can exhaust the
        // browser's active-context budget. Keep each DOM layer as a transparent
        // 2D canvas (so z-order remains exact) and use one shared hidden WebGL
        // scratch surface for the actual mesh draw.
        if (animationMode === 'orthographic3d') {
            const targetContext = canvas.getContext('2d');
            if (!targetContext) return undefined;

            const positions = new Float32Array(mesh.positions.length);
            const mapModelPositionsToCanvas = (modelPositions: ArrayLike<number>) => {
                for (let index = 0; index < positions.length; index += 2) {
                    positions[index] = modelPositions[index] - renderBounds.minX;
                    positions[index + 1] = renderBounds.maxY - modelPositions[index + 1];
                }
            };
            mapModelPositionsToCanvas(mesh.positions);
            const uvs = new Float32Array(mesh.uvs);
            const indices = new Uint16Array(mesh.indices);
            const textureKey = {};

            let disposed = false;
            let rafId = 0;
            let textureSource: TexImageSource | null = null;
            let textureRevision = 0;

            const draw = () => {
                if (disposed || !textureSource) return;
                renderWallpaperEngineSharedPuppetFrame({
                    target: canvas,
                    textureKey,
                    textureSource,
                    textureRevision,
                    width,
                    height,
                    positions,
                    uvs,
                    indices,
                });
            };
            const uploadAtlas = (source: TexImageSource) => {
                if (disposed) return;
                textureSource = source;
                textureRevision += 1;
                draw();
            };
            updateTextureRef.current = uploadAtlas;

            const image = new Image();
            image.decoding = 'async';
            image.onload = () => uploadAtlas(image);
            image.src = src;

            if (modelSrc && animationLayers.some((layer) => layer.visible)) {
                void fetch(modelSrc)
                    .then((response) => {
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        return response.arrayBuffer();
                    })
                    .then((buffer) => {
                        if (disposed) return;
                        const model = parseWallpaperEnginePuppetModel(new Uint8Array(buffer));
                        if (!model || model.positions.length !== mesh.positions.length) return;
                        const skinning3d = createWallpaperEnginePuppet3dSkinningState(model, animationLayers);
                        if (!skinning3d || !model.positions3d) return;

                        const skinnedPositions3d = new Float32Array(model.positions3d.length);
                        const tick = (now: number) => {
                            rafId = 0;
                            if (disposed) return;
                            if (!document.hidden) {
                                const elapsedMs = Math.max(0, now - timeOriginMs);
                                const sampled = sampleWallpaperEnginePuppet3dPositions(
                                    skinning3d,
                                    elapsedMs,
                                    skinnedPositions3d,
                                );
                                if (sampled) {
                                    for (let vertex = 0; vertex < positions.length / 2; vertex += 1) {
                                        positions[vertex * 2] = sampled[vertex * 3] - renderBounds.minX;
                                        positions[vertex * 2 + 1] = renderBounds.maxY - sampled[vertex * 3 + 1];
                                    }
                                    draw();
                                }
                            }
                            rafId = window.requestAnimationFrame(tick);
                        };
                        rafId = window.requestAnimationFrame(tick);
                    })
                    .catch((error) => {
                        if (!disposed) console.warn('Wallpaper Engine puppet 3D animation retained the reference pose:', error);
                    });
            }

            return () => {
                disposed = true;
                updateTextureRef.current = null;
                image.onload = null;
                if (rafId) window.cancelAnimationFrame(rafId);
                releaseWallpaperEngineSharedPuppetTexture(textureKey);
                targetContext.clearRect(0, 0, width, height);
            };
        }

        const gl = canvas.getContext('webgl', {
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
        });
        if (!gl) return undefined;

        const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
        const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
        if (!vertexShader || !fragmentShader) return undefined;

        const program = gl.createProgram();
        if (!program) return undefined;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.deleteProgram(program);
            return undefined;
        }

        const positionBuffer = gl.createBuffer();
        const uvBuffer = gl.createBuffer();
        const indexBuffer = gl.createBuffer();
        const texture = gl.createTexture();
        if (!positionBuffer || !uvBuffer || !indexBuffer || !texture) {
            gl.deleteProgram(program);
            return undefined;
        }

        const positions = new Float32Array(mesh.positions.length);
        const mapModelPositionsToCanvas = (modelPositions: ArrayLike<number>) => {
            for (let index = 0; index < positions.length; index += 2) {
                positions[index] = modelPositions[index] - renderBounds.minX;
                positions[index + 1] = renderBounds.maxY - modelPositions[index + 1];
            }
        };
        mapModelPositionsToCanvas(mesh.positions);
        const uvs = new Float32Array(mesh.uvs);
        const indices = new Uint16Array(mesh.indices);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        gl.useProgram(program);
        const positionLocation = gl.getAttribLocation(program, 'a_position');
        const uvLocation = gl.getAttribLocation(program, 'a_uv');
        const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
        const textureLocation = gl.getUniformLocation(program, 'u_texture');
        gl.uniform2f(resolutionLocation, width, height);
        gl.uniform1i(textureLocation, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.enableVertexAttribArray(uvLocation);
        gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        gl.viewport(0, 0, width, height);
        gl.clearColor(0, 0, 0, 0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        let disposed = false;
        let rafId = 0;
        let textureReady = false;
        const draw = () => {
            if (disposed || !textureReady) return;
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        };
        const uploadAtlas = (source: TexImageSource) => {
            if (disposed) return;
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
            textureReady = true;
            draw();
        };
        updateTextureRef.current = uploadAtlas;

        const image = new Image();
        image.decoding = 'async';
        image.onload = () => uploadAtlas(image);
        image.src = src;

        if (modelSrc && animationLayers.some((layer) => layer.visible)) {
            void fetch(modelSrc)
                .then((response) => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.arrayBuffer();
                })
                .then((buffer) => {
                    if (disposed) return;
                    const model = parseWallpaperEnginePuppetModel(new Uint8Array(buffer));
                    if (!model || model.positions.length !== mesh.positions.length) return;
                    const skinning2d = createWallpaperEnginePuppet2dSkinningState(model, animationLayers);
                    if (!skinning2d) return;

                    const skinnedPositions2d = new Float32Array(model.positions.length);
                    const tick = (now: number) => {
                        rafId = 0;
                        if (disposed) return;
                        if (!document.hidden) {
                            const elapsedMs = Math.max(0, now - timeOriginMs);
                            if (skinning2d && skinnedPositions2d) {
                                const sampled = sampleWallpaperEnginePuppet2dPositions(
                                    skinning2d,
                                    elapsedMs,
                                    skinnedPositions2d,
                                );
                                if (sampled) {
                                    mapModelPositionsToCanvas(sampled);
                                    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                                    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
                                    draw();
                                }
                            }
                        }
                        rafId = window.requestAnimationFrame(tick);
                    };
                    rafId = window.requestAnimationFrame(tick);
                })
                .catch((error) => {
                    if (!disposed) console.warn('Wallpaper Engine puppet animation retained the reference pose:', error);
                });
        }

        return () => {
            disposed = true;
            updateTextureRef.current = null;
            image.onload = null;
            if (rafId) window.cancelAnimationFrame(rafId);
            gl.deleteTexture(texture);
            gl.deleteBuffer(positionBuffer);
            gl.deleteBuffer(uvBuffer);
            gl.deleteBuffer(indexBuffer);
            gl.deleteProgram(program);
        };
    }, [animationLayers, animationMode, animationSignature, mesh, modelSrc, renderBounds, renderHeight, renderWidth, src, timeOriginMs]);

    return (
        <canvas
            key={animationMode === 'orthographic3d' ? 'shared-orthographic3d' : 'local-webgl'}
            ref={canvasRef}
            className={className}
            data-we-source={dataSource}
            style={animationMode === 'orthographic3d' ? { ...style, width: `${renderWidth}px`, height: `${renderHeight}px` } : style}
        />
    );
});

WePuppetMeshLayer.displayName = 'WePuppetMeshLayer';
