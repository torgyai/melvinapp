/**
 * WebXR floor tracing.
 *
 * The phone's own AR tracking gives a point on the floor in metres, so tapping
 * the corners of a room produces a real outline with no reference measurement
 * and no scaling step. Supported today on Android Chrome with ARCore; every
 * other device falls back to the wall-by-wall or photo-tap modes.
 */

export interface ArPoint {
  x: number;
  z: number;
}

export interface ArTracker {
  stop(): void;
  /** Corner points so far, in metres on the floor plane. */
  points(): ArPoint[];
  undo(): void;
  clear(): void;
}

export interface ArCallbacks {
  onPoints(points: ArPoint[]): void;
  onReticle(visible: boolean): void;
  onEnd(): void;
  onError(message: string): void;
}

export async function isArSupported(): Promise<boolean> {
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
  if (!xr) return false;
  try {
    return await xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

const VERT = `
attribute vec3 position;
uniform mat4 projection;
uniform mat4 view;
uniform mat4 model;
void main() { gl_Position = projection * view * model * vec4(position, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec4 color;
void main() { gl_FragColor = color; }
`;

/** A flat ring on the floor showing where the next corner will land. */
function reticleGeometry(): Float32Array {
  const verts: number[] = [];
  const segments = 40;
  const inner = 0.055;
  const outer = 0.075;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    verts.push(
      Math.cos(a0) * inner, 0, Math.sin(a0) * inner,
      Math.cos(a0) * outer, 0, Math.sin(a0) * outer,
      Math.cos(a1) * outer, 0, Math.sin(a1) * outer,
      Math.cos(a0) * inner, 0, Math.sin(a0) * inner,
      Math.cos(a1) * outer, 0, Math.sin(a1) * outer,
      Math.cos(a1) * inner, 0, Math.sin(a1) * inner,
    );
  }
  return new Float32Array(verts);
}

function compile(gl: WebGLRenderingContext): { program: WebGLProgram; loc: Record<string, WebGLUniformLocation | number> } {
  const make = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader');
    return sh;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, make(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, make(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'program');
  return {
    program,
    loc: {
      position: gl.getAttribLocation(program, 'position'),
      projection: gl.getUniformLocation(program, 'projection')!,
      view: gl.getUniformLocation(program, 'view')!,
      model: gl.getUniformLocation(program, 'model')!,
      color: gl.getUniformLocation(program, 'color')!,
    },
  };
}

function translationMatrix(x: number, y: number, z: number): Float32Array {
  // column-major, as WebGL expects
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
}

/**
 * Start an AR session. `overlayRoot` is the element WebXR shows on top of the
 * camera feed, so the buttons stay ordinary HTML.
 */
export async function startArTracking(overlayRoot: HTMLElement, cb: ArCallbacks): Promise<ArTracker> {
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
  if (!xr) throw new Error('Deze telefoon ondersteunt geen AR in de browser.');

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { xrCompatible: true, alpha: true, antialias: true }) as WebGLRenderingContext | null;
  if (!gl) throw new Error('WebGL is niet beschikbaar.');

  const session = await xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test', 'local-floor'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: overlayRoot },
  });

  await gl.makeXRCompatible();
  session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });

  const refSpace = await session.requestReferenceSpace('local-floor');
  const viewerSpace = await session.requestReferenceSpace('viewer');
  const hitTestSource = await session.requestHitTestSource?.({ space: viewerSpace });

  const { program, loc } = compile(gl);
  const buffer = gl.createBuffer()!;
  const geometry = reticleGeometry();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, geometry, gl.STATIC_DRAW);

  let points: ArPoint[] = [];
  let lastHit: { x: number; y: number; z: number } | null = null;
  let running = true;

  const onSelect = () => {
    if (!lastHit) return;
    points = [...points, { x: lastHit.x, z: lastHit.z }];
    cb.onPoints(points);
  };
  session.addEventListener('select', onSelect);

  const onEnd = () => {
    running = false;
    cb.onEnd();
  };
  session.addEventListener('end', onEnd);

  const draw = (matrix: Float32Array, x: number, y: number, z: number, color: [number, number, number, number], view: XRView) => {
    gl.uniformMatrix4fv(loc.projection as WebGLUniformLocation, false, view.projectionMatrix);
    gl.uniformMatrix4fv(loc.view as WebGLUniformLocation, false, view.transform.inverse.matrix);
    gl.uniformMatrix4fv(loc.model as WebGLUniformLocation, false, matrix);
    gl.uniform4fv(loc.color as WebGLUniformLocation, color);
    gl.drawArrays(gl.TRIANGLES, 0, geometry.length / 3);
    void x;
    void y;
    void z;
  };

  const onFrame: XRFrameRequestCallback = (_time, frame) => {
    if (!running) return;
    session.requestAnimationFrame(onFrame);
    const pose = frame.getViewerPose(refSpace);
    if (!pose) return;

    const layer = session.renderState.baseLayer!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(loc.position as number);
    gl.vertexAttribPointer(loc.position as number, 3, gl.FLOAT, false, 0, 0);

    let hit: { x: number; y: number; z: number } | null = null;
    if (hitTestSource) {
      const results = frame.getHitTestResults(hitTestSource);
      const first = results[0];
      if (first) {
        const hitPose = first.getPose(refSpace);
        if (hitPose) {
          const p = hitPose.transform.position;
          hit = { x: p.x, y: p.y, z: p.z };
        }
      }
    }
    lastHit = hit;
    cb.onReticle(Boolean(hit));

    for (const view of pose.views) {
      const vp = layer.getViewport(view)!;
      gl.viewport(vp.x, vp.y, vp.width, vp.height);
      if (hit) draw(translationMatrix(hit.x, hit.y + 0.005, hit.z), hit.x, hit.y, hit.z, [0.973, 0.675, 0.004, 0.95], view);
      const floorY = hit ? hit.y : 0;
      points.forEach((pt) =>
        draw(translationMatrix(pt.x, floorY + 0.004, pt.z), pt.x, floorY, pt.z, [0.008, 0.282, 0.278, 0.95], view),
      );
    }
  };
  session.requestAnimationFrame(onFrame);

  return {
    stop() {
      running = false;
      session.removeEventListener('select', onSelect);
      session.removeEventListener('end', onEnd);
      void session.end().catch(() => undefined);
    },
    points: () => points,
    undo() {
      points = points.slice(0, -1);
      cb.onPoints(points);
    },
    clear() {
      points = [];
      cb.onPoints(points);
    },
  };
}
