/**
 * Shared WebGL scratch renderer for WE puppet meshes.
 *
 * Chromium-class browsers cap the number of simultaneously active WebGL
 * contexts. A scene with many independently animated Puppet layers can exceed
 * that budget if every layer owns a WebGL canvas. Orthographic 3D Puppet
 * instances therefore render through this single hidden WebGL surface and copy
 * each completed transparent frame into the layer's ordinary 2D canvas.
 *
 * This is a renderer-resource policy only: geometry, UVs, texture alpha,
 * animation order and DOM z-order remain per-layer and unchanged.
 */

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

interface SharedTextureEntry {
    texture: WebGLTexture;
    revision: number;
}

export interface WallpaperEngineSharedPuppetFrame {
    target: HTMLCanvasElement;
    textureKey: object;
    textureSource: TexImageSource;
    textureRevision: number;
    width: number;
    height: number;
    positions: Float32Array;
    uvs: Float32Array;
    indices: Uint16Array;
}

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

class WallpaperEngineSharedPuppetRenderer {
    private canvas: HTMLCanvasElement | null = null;
    private gl: WebGLRenderingContext | null = null;
    private program: WebGLProgram | null = null;
    private positionBuffer: WebGLBuffer | null = null;
    private uvBuffer: WebGLBuffer | null = null;
    private indexBuffer: WebGLBuffer | null = null;
    private positionLocation = -1;
    private uvLocation = -1;
    private resolutionLocation: WebGLUniformLocation | null = null;
    private textureLocation: WebGLUniformLocation | null = null;
    private textures = new Map<object, SharedTextureEntry>();
    private invalid = false;

    private resetResources(): void {
        this.gl = null;
        this.program = null;
        this.positionBuffer = null;
        this.uvBuffer = null;
        this.indexBuffer = null;
        this.positionLocation = -1;
        this.uvLocation = -1;
        this.resolutionLocation = null;
        this.textureLocation = null;
        this.textures.clear();
    }

    private initialize(): boolean {
        if (typeof document === 'undefined') return false;

        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const gl = canvas.getContext('webgl', {
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
            // drawImage() copies the just-rendered shared surface synchronously.
            preserveDrawingBuffer: true,
        });
        if (!gl) return false;

        const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
        const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
        if (!vertexShader || !fragmentShader) return false;

        const program = gl.createProgram();
        if (!program) return false;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.deleteProgram(program);
            return false;
        }

        const positionBuffer = gl.createBuffer();
        const uvBuffer = gl.createBuffer();
        const indexBuffer = gl.createBuffer();
        if (!positionBuffer || !uvBuffer || !indexBuffer) {
            gl.deleteProgram(program);
            return false;
        }

        this.canvas = canvas;
        this.gl = gl;
        this.program = program;
        this.positionBuffer = positionBuffer;
        this.uvBuffer = uvBuffer;
        this.indexBuffer = indexBuffer;
        this.positionLocation = gl.getAttribLocation(program, 'a_position');
        this.uvLocation = gl.getAttribLocation(program, 'a_uv');
        this.resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
        this.textureLocation = gl.getUniformLocation(program, 'u_texture');
        this.invalid = false;

        canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.invalid = true;
        });

        gl.clearColor(0, 0, 0, 0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        return true;
    }

    private ensureReady(width: number, height: number): boolean {
        if (!this.gl || !this.canvas || !this.program || this.invalid || this.gl.isContextLost()) {
            this.resetResources();
            this.canvas = null;
            if (!this.initialize()) return false;
        }

        const canvas = this.canvas;
        if (!canvas) return false;
        const nextWidth = Math.max(canvas.width, Math.max(1, Math.ceil(width)));
        const nextHeight = Math.max(canvas.height, Math.max(1, Math.ceil(height)));
        if (canvas.width !== nextWidth) canvas.width = nextWidth;
        if (canvas.height !== nextHeight) canvas.height = nextHeight;
        return true;
    }

    private resolveTexture(key: object, source: TexImageSource, revision: number): WebGLTexture | null {
        const gl = this.gl;
        if (!gl) return null;

        let entry = this.textures.get(key);
        if (!entry) {
            const texture = gl.createTexture();
            if (!texture) return null;
            entry = { texture, revision: Number.NaN };
            this.textures.set(key, entry);
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, entry.texture);
        if (entry.revision !== revision) {
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
            entry.revision = revision;
        }
        return entry.texture;
    }

    render(frame: WallpaperEngineSharedPuppetFrame): boolean {
        const width = Math.max(1, Math.ceil(frame.width));
        const height = Math.max(1, Math.ceil(frame.height));
        if (!this.ensureReady(width, height)) return false;

        const gl = this.gl;
        const canvas = this.canvas;
        const program = this.program;
        const positionBuffer = this.positionBuffer;
        const uvBuffer = this.uvBuffer;
        const indexBuffer = this.indexBuffer;
        if (!gl || !canvas || !program || !positionBuffer || !uvBuffer || !indexBuffer) return false;

        const texture = this.resolveTexture(frame.textureKey, frame.textureSource, frame.textureRevision);
        if (!texture) return false;

        gl.useProgram(program);
        gl.uniform2f(this.resolutionLocation, width, height);
        gl.uniform1i(this.textureLocation, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, frame.positions, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, frame.uvs, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.uvLocation);
        gl.vertexAttribPointer(this.uvLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, frame.indices, gl.STATIC_DRAW);

        // Keep the requested layer in the top-left of the grow-only shared
        // backing surface so Canvas2D can copy a stable source rectangle.
        gl.viewport(0, canvas.height - height, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, frame.indices.length, gl.UNSIGNED_SHORT, 0);
        gl.flush();

        const targetContext = frame.target.getContext('2d');
        if (!targetContext) return false;
        targetContext.clearRect(0, 0, width, height);
        targetContext.drawImage(canvas, 0, 0, width, height, 0, 0, width, height);
        return true;
    }

    releaseTexture(key: object): void {
        const entry = this.textures.get(key);
        if (!entry) return;
        const gl = this.gl;
        if (gl && !gl.isContextLost()) gl.deleteTexture(entry.texture);
        this.textures.delete(key);
    }
}

let sharedRenderer: WallpaperEngineSharedPuppetRenderer | null = null;

const getSharedRenderer = (): WallpaperEngineSharedPuppetRenderer => {
    sharedRenderer ??= new WallpaperEngineSharedPuppetRenderer();
    return sharedRenderer;
};

export const renderWallpaperEngineSharedPuppetFrame = (frame: WallpaperEngineSharedPuppetFrame): boolean => (
    getSharedRenderer().render(frame)
);

export const releaseWallpaperEngineSharedPuppetTexture = (key: object): void => {
    sharedRenderer?.releaseTexture(key);
};
