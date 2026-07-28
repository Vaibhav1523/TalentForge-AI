"use client";

import { useLayoutEffect, useRef } from "react";

export function AuroraCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // useLayoutEffect runs before browser paint so the first frame is drawn
  // before the user sees the page, reducing "blank then animation" delay.
  useLayoutEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const glRaw = canvas.getContext("webgl", { alpha: true, antialias: true });
    if (!glRaw) return;
    const gl: WebGLRenderingContext = glRaw;

    const dpr = () => Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);

    function resize() {
      const r = dpr();
      canvas.width = Math.floor(window.innerWidth * r);
      canvas.height = Math.floor(window.innerHeight * r);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener("resize", resize);

    const vs = `attribute vec2 p; void main(){ gl_Position=vec4(p,0.0,1.0);} `;
    const fs = `
      precision highp float;
      uniform float time;
      uniform vec2 resolution;
      uniform float scrollY;

      float rand(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        vec2 u=f*f*(3.0-2.0*f);
        return mix(
          mix(rand(i), rand(i+vec2(1.0,0.0)), u.x),
          mix(rand(i+vec2(0.0,1.0)), rand(i+vec2(1.0,1.0)), u.x),
          u.y
        );
      }
      float fbm(vec2 p){
        float v=0.0, a=0.5;
        for(int i=0;i<4;i++){
          v += a*noise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main(){
        vec2 frag = vec2(gl_FragCoord.x, gl_FragCoord.y + scrollY);
        vec2 uv = frag / resolution.xy;

        uv -= 0.5;
        uv.x *= resolution.x / resolution.y;

        vec2 flow = uv * 2.6;
        flow.y += time * 0.06;

        float n = fbm(flow + fbm(flow + time*0.12));
        float light = smoothstep(0.22, 0.78, n);

        vec3 col1 = vec3(0.02, 0.06, 0.10);
        vec3 col2 = vec3(0.00, 0.85, 0.75);
        vec3 col3 = vec3(0.35, 0.55, 1.00);

        vec3 color = mix(col1, col2, light);
        color = mix(color, col3, n * 0.35);

        float vignette = smoothstep(0.95, 0.15, length(uv));
        color *= vignette;

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function compile(type: number, src: string) {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s) || "Shader compile error");
      }
      return s;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(prog);
      throw new Error(`Program link failed: ${info ?? "unknown error"}`);
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(prog, "time");
    const resLoc = gl.getUniformLocation(prog, "resolution");
    const scrollLoc = gl.getUniformLocation(prog, "scrollY");

    let scrollY = 0;
    const onScroll = () => {
      scrollY = window.scrollY * dpr();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    let animationFrameId: number;
    const start = performance.now();
    function render() {
      if (!canvas || !gl) return;
      gl.uniform1f(timeLoc!, (performance.now() - start) / 1000);
      gl.uniform2f(resLoc!, canvas.width, canvas.height);
      gl.uniform1f(scrollLoc!, scrollY);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    }
    render();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas id="gl" ref={canvasRef} aria-hidden="true" />;
}
