import * as React from "react"
import { useEffect, useRef } from "react"

/*
 * VoxelCoin: a rotating 3D voxel gold coin with a raised rupee symbol.
 * Self-contained React + WebGL. No external libraries.
 *
 * Usage:
 *   <div style={{ width: 180, height: 180 }}>
 *     <VoxelCoin />
 *   </div>
 *
 * The coin fills its parent, so give the parent a size.
 */

// The rupee symbol on a pixel grid: "1" = raised voxel. Redraw freely.
const SYMBOL = [
    "11111111111", "11111111111", "00000001110", "00000000111",
    "11111111111", "11111111111", "00000000111", "00000001110",
    "11111111100", "11111111000", "00111000000", "00011100000",
    "00001110000", "00000111000", "00000011100", "00000001110",
]
const GRID = 32 // coin face is a 32 x 32 voxel circle
const THICKNESS = 2 // body thickness in voxels
const DEPTH_SCALE = 0.7 // squash depth: 0.7 = 30% thinner
const RIM_HEIGHT = 1 // raised rim, in voxels
const SYMBOL_HEIGHT = 1 // raised symbol, in voxels

export interface VoxelCoinProps {
    coinColor?: string // any CSS hex or rgb() colour
    symbolColor?: string
    secondsPerTurn?: number
    tilt?: number // degrees
    shine?: number // 0 (matte) to 1 (very metallic)
    style?: React.CSSProperties
}

// CSS colour (hex or rgb) to linear RGB in 0..1.
function toLinear(input: string): number[] {
    let s = (input || "").trim()
    const rgbAt = s.indexOf("rgb")
    if (rgbAt >= 0) s = s.slice(rgbAt)
    let rgb = [255, 196, 0]
    if (s.startsWith("#")) {
        let h = s.slice(1)
        if (h.length === 3) h = h.split("").map((c) => c + c).join("")
        const n = parseInt(h.slice(0, 6), 16)
        rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    } else {
        const m = s.match(/[\d.]+/g)
        if (m && m.length >= 3) rgb = [Number(m[0]), Number(m[1]), Number(m[2])]
    }
    return rgb.map((v) => {
        const c = v / 255
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
}

// Voxel centres for the coin body/rim and for the raised symbol.
function buildVoxels() {
    const c = (GRID - 1) / 2
    const r = GRID / 2
    const inside = (x: number, y: number) =>
        x >= 0 && y >= 0 && x < GRID && y < GRID && (x - c) ** 2 + (y - c) ** 2 <= r * r
    const isRim = (x: number, y: number) => {
        if (!inside(x, y)) return false
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) if (!inside(x + dx, y + dy)) return true
        return false
    }
    const h = SYMBOL.length
    const w = SYMBOL[0].length
    const ox = Math.floor((GRID - w) / 2)
    const oy = Math.floor((GRID - h) / 2)
    const isSymbol = (x: number, y: number) => {
        const sx = x - ox
        const sy = y - oy
        return sy >= 0 && sy < h && sx >= 0 && sx < w && SYMBOL[sy][sx] === "1" && inside(x, y) && !isRim(x, y)
    }
    const body: number[][] = []
    const marks: number[][] = []
    const half = THICKNESS / 2
    for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
            if (!inside(x, y)) continue
            const px = x - c
            const py = c - y
            const rim = isRim(x, y)
            for (let z = 0; z < THICKNESS; z++) {
                const outer = z === 0 || z === THICKNESS - 1
                if (!rim && !outer) continue
                body.push([px, py, z - half + 0.5])
            }
            if (rim) {
                for (let k = 0; k < RIM_HEIGHT; k++) {
                    body.push([px, py, half + 0.5 + k])
                    body.push([px, py, -half - 0.5 - k])
                }
            }
            if (isSymbol(x, y)) for (let k = 0; k < SYMBOL_HEIGHT; k++) marks.push([px, py, half + 0.5 + k])
            // Back face: mirrored so the symbol reads correctly from behind.
            if (isSymbol(GRID - 1 - x, y)) for (let k = 0; k < SYMBOL_HEIGHT; k++) marks.push([px, py, -half - 0.5 - k])
        }
    }
    return { body, marks }
}

const FACES = [
    { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
    { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
    { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
    { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
    { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
]

// One mesh containing only the outside faces, so flat areas are seamless.
function buildMesh(coinRGB: number[], symbolRGB: number[]) {
    const { body, marks } = buildVoxels()
    const key = (x: number, y: number, z: number) =>
        Math.round(x * 2) + "," + Math.round(y * 2) + "," + Math.round(z * 2)
    const filled = new Set<string>()
    for (const v of body) filled.add(key(v[0], v[1], v[2]))
    for (const v of marks) filled.add(key(v[0], v[1], v[2]))
    const pos: number[] = []
    const nor: number[] = []
    const col: number[] = []
    const idx: number[] = []
    const add = (list: number[][], rgb: number[]) => {
        for (const [x, y, z] of list) {
            for (const f of FACES) {
                if (filled.has(key(x + f.n[0], y + f.n[1], z + f.n[2]))) continue
                const base = pos.length / 3
                for (const k of f.c) {
                    pos.push(x - 0.5 + k[0], y - 0.5 + k[1], (z - 0.5 + k[2]) * DEPTH_SCALE)
                    nor.push(f.n[0], f.n[1], f.n[2])
                    col.push(rgb[0], rgb[1], rgb[2])
                }
                idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
            }
        }
    }
    add(body, coinRGB)
    add(marks, symbolRGB)
    return {
        pos: new Float32Array(pos),
        nor: new Float32Array(nor),
        col: new Float32Array(col),
        idx: new Uint16Array(idx),
    }
}

// Column-major 4x4 matrix helpers.
function perspective(fovy: number, aspect: number, near: number, far: number) {
    const f = 1 / Math.tan(fovy / 2)
    const nf = 1 / (near - far)
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]
}
function multiply(a: number[], b: number[]) {
    const o = new Array(16).fill(0)
    for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
            for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]
    return o
}
function rotX(a: number) {
    const c = Math.cos(a), s = Math.sin(a)
    return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]
}
function rotY(a: number) {
    const c = Math.cos(a), s = Math.sin(a)
    return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]
}
function translate(x: number, y: number, z: number) {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]
}

const VERT = [
    "attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aCol;",
    "uniform mat4 uMVP; uniform mat4 uModel;",
    "varying vec3 vN; varying vec3 vCol; varying vec3 vW;",
    "void main() {",
    "  vW = (uModel * vec4(aPos, 1.0)).xyz;",
    "  vN = (uModel * vec4(aNor, 0.0)).xyz;",
    "  vCol = aCol;",
    "  gl_Position = uMVP * vec4(aPos, 1.0);",
    "}",
].join("\n")

// Warm key light from the top-left, cool fill from the right, a fake studio
// reflection and Blinn specular, so the gold reads as metal while it turns.
const FRAG = [
    "precision mediump float;",
    "varying vec3 vN; varying vec3 vCol; varying vec3 vW;",
    "uniform vec3 uCam; uniform float uShine;",
    "void main() {",
    "  vec3 N = normalize(vN);",
    "  vec3 V = normalize(uCam - vW);",
    "  vec3 L1 = normalize(vec3(-0.6, 0.7, 0.6)); vec3 C1 = vec3(1.0, 0.88, 0.70) * 2.0;",
    "  vec3 L2 = normalize(vec3(0.9, 0.1, 0.4));  vec3 C2 = vec3(0.75, 0.85, 1.0) * 0.6;",
    "  vec3 base = vCol;",
    "  float d1 = max(dot(N, L1), 0.0);",
    "  float d2 = max(dot(N, L2), 0.0);",
    "  vec3 diffuse = base * (0.22 + (d1 * C1 + d2 * C2) * (1.0 - uShine * 0.5));",
    "  float p = mix(18.0, 80.0, uShine);",
    "  vec3 H1 = normalize(L1 + V); vec3 H2 = normalize(L2 + V);",
    "  vec3 specCol = mix(vec3(1.0), base, uShine * 0.7);",
    "  vec3 spec = specCol * (pow(max(dot(N, H1), 0.0), p) * C1 + pow(max(dot(N, H2), 0.0), p) * C2) * (0.5 + uShine);",
    "  vec3 R = reflect(-V, N);",
    "  vec3 env = mix(vec3(0.30, 0.27, 0.22), vec3(1.0, 0.97, 0.90), clamp(R.y * 0.5 + 0.5, 0.0, 1.0));",
    "  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);",
    "  vec3 col = diffuse + spec + env * base * uShine * 0.6 + env * fres * 0.12;",
    "  col = col / (col + vec3(0.9)) * 1.7;",
    "  gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);",
    "}",
].join("\n")

export default function VoxelCoin({
    coinColor = "#FFC400",
    symbolColor = "#D98400",
    secondsPerTurn = 6,
    tilt = 10,
    shine = 0.6,
    style,
}: VoxelCoinProps) {
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const root = rootRef.current
        if (!canvas || !root) return
        const gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true })
        if (!gl) return

        const compile = (type: number, src: string) => {
            const s = gl.createShader(type)!
            gl.shaderSource(s, src)
            gl.compileShader(s)
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
        gl.useProgram(prog)

        const mesh = buildMesh(toLinear(coinColor), toLinear(symbolColor))
        const attrib = (name: string, data: Float32Array) => {
            const buf = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
            const loc = gl.getAttribLocation(prog, name)
            gl.enableVertexAttribArray(loc)
            gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0)
            return buf
        }
        const buffers = [attrib("aPos", mesh.pos), attrib("aNor", mesh.nor), attrib("aCol", mesh.col)]
        const ibo = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW)

        const uMVP = gl.getUniformLocation(prog, "uMVP")
        const uModel = gl.getUniformLocation(prog, "uModel")
        const uCam = gl.getUniformLocation(prog, "uCam")
        const uShine = gl.getUniformLocation(prog, "uShine")
        gl.enable(gl.DEPTH_TEST)
        gl.enable(gl.CULL_FACE)
        gl.clearColor(0, 0, 0, 0)

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const w = Math.max(1, Math.round(root.clientWidth * dpr))
            const h = Math.max(1, Math.round(root.clientHeight * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
            gl.viewport(0, 0, w, h)
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        const speed = (Math.PI * 2) / Math.max(1, secondsPerTurn)
        const tiltRad = (tilt * Math.PI) / 180
        let angle = reduce ? -0.55 : 0
        let last = performance.now()
        let raf = 0

        const draw = () => {
            const aspect = canvas.width / canvas.height
            const proj = perspective((30 * Math.PI) / 180, aspect, 40, 130)
            const view = translate(0, 0, -82)
            const model = multiply(rotX(tiltRad), rotY(angle))
            gl.uniformMatrix4fv(uMVP, false, new Float32Array(multiply(proj, multiply(view, model))))
            gl.uniformMatrix4fv(uModel, false, new Float32Array(model))
            gl.uniform3f(uCam, 0, 0, 82)
            gl.uniform1f(uShine, Math.min(1, Math.max(0, shine)))
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0)
        }
        const tick = (now: number) => {
            raf = requestAnimationFrame(tick)
            if (document.hidden) {
                last = now
                return
            }
            const dt = Math.min((now - last) / 1000, 0.1)
            last = now
            angle += speed * dt
            draw()
        }
        if (reduce) draw()
        else raf = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            buffers.forEach((b) => gl.deleteBuffer(b))
            gl.deleteBuffer(ibo)
            gl.deleteProgram(prog)
        }
    }, [coinColor, symbolColor, secondsPerTurn, tilt, shine])

    return (
        <div
            ref={rootRef}
            role="img"
            aria-label="Gold coin with a rupee symbol"
            style={{ ...style, position: "relative", width: "100%", height: "100%" }}
        >
            <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
        </div>
    )
}
