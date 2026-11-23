/* Prototype-only, on-demand WebGL lighting study of the V7 ribbon surface. */
(() => {
  'use strict';
  const VERT = `
    attribute vec3 pos, normal;
    uniform float yaw, aspect;
    varying vec3 n, v;
    void main() {
      float c=cos(yaw), s=sin(yaw);
      mat3 ry=mat3(c,0.,-s, 0.,1.,0., s,0.,c);
      mat3 rx=mat3(1.,0.,0., 0.,.782,.623, 0.,-.623,.782);
      mat3 rz=mat3(.961,-.276,0., .276,.961,0., 0.,0.,1.);
      mat3 orientation = rz*rx*ry;
      v = orientation*pos;
      n = orientation*normal;
      float w = 4.7 - v.z;
      gl_Position = vec4(v.x*2.34/aspect, v.y*2.34+.075, 1.01*w-.29, w);
    }`;
  const FRAG = `
    precision mediump float;
    varying vec3 n, v;
    uniform bool wire;
    void main() {
      if (wire) { gl_FragColor=vec4(.58,.87,.91,.7);return; }
      vec3 N=normalize(n);
      if(!gl_FrontFacing)N=-N;
      vec3 V=normalize(vec3(0.,0.,4.7)-v);
      vec3 L=normalize(vec3(-1.1,1.5,1.35));
      vec3 F=normalize(vec3(1.8,-.25,.5));
      vec3 R=reflect(-V,N);
      float key=max(dot(N,L),0.);
      float fill=max(dot(N,F),0.);
      float box=smoothstep(.40,.92,dot(R,normalize(vec3(-.45,.76,.96))));
      float shine=pow(max(dot(N,normalize(L+V)),0.),36.);
      float grazing=pow(1.-max(dot(N,V),0.),3.);
      vec3 gold=vec3(.15,.08,.026)+vec3(.76,.45,.17)*(key*.78+fill*.29);
      gold+=vec3(1.,.83,.53)*(box*.82+shine*.46);
      gold+=vec3(.22,.46,.53)*grazing*(.22+fill*.7);
      gl_FragColor=vec4(pow(clamp(gold,0.,1.),vec3(.85)),1.);
    }`;
  const bands=96, strips=18;
  const depth = .56;
  function surface(u,v) {
    const r=1.18+v*Math.cos(1.5*u);
    return [r*Math.cos(u),r*Math.sin(u),v*Math.sin(1.5*u)];
  }
  function geometry() {
    const verts=[],tris=[],wires=[];
    for(let i=0;i<=bands;i++)for(let j=0;j<=strips;j++){
      const u=i/bands*2*Math.PI, v=(j/strips-.5)*2*depth;
      const p=surface(u,v), a=surface(u+.0001,v).map((x,k)=>x-p[k]), b=surface(u,v+.0001).map((x,k)=>x-p[k]);
      const N=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
      const d=Math.hypot(...N)||1;
      verts.push(...p,...N.map(x=>x/d));
      const x=i*(strips+1)+j, y=x+strips+1;
      if(i<bands && j<strips)tris.push(x,y,x+1,y,y+1,x+1);
      if(i<bands && j%3===0)wires.push(x,y);
      if(i%4===0 && j<strips)wires.push(x,x+1);
    }
    return [new Float32Array(verts),new Uint16Array(tris),new Uint16Array(wires)];
  }
  window.mountStudioRibbon=(canvas, fallback)=>{
    const gl=canvas.getContext('webgl',{alpha:true,depth:true,antialias:true,failIfMajorPerformanceCaveat:true});
    if(!gl)return null;
    const shader=(type, code)=>{
      const s=gl.createShader(type); gl.shaderSource(s,code);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) {
        gl.deleteShader(s); throw new Error('Studio ribbon shader unavailable');
      }
      return s;
    };
    const [verts,tris,lines]=geometry(), program=gl.createProgram();
    const vs=shader(gl.VERTEX_SHADER,VERT), fs=shader(gl.FRAGMENT_SHADER,FRAG);
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) {
      gl.deleteProgram(program); throw new Error('Studio ribbon program unavailable');
    }
    gl.useProgram(program);
    const buffer=(type,data)=>{
      const b=gl.createBuffer();
      gl.bindBuffer(type,b);gl.bufferData(type,data,gl.STATIC_DRAW);return b;
    };
    const v=buffer(gl.ARRAY_BUFFER,verts), solid=buffer(gl.ELEMENT_ARRAY_BUFFER,tris), grid=buffer(gl.ELEMENT_ARRAY_BUFFER,lines);
    for(const [name,offset] of [['pos',0],['normal',12]]){
      const location=gl.getAttribLocation(program,name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location,3,gl.FLOAT,false,24,offset);
    }
    const uniforms=Object.fromEntries(['yaw','aspect','wire'].map(name=>[name,gl.getUniformLocation(program,name)]));
    let angle=-.3,wire=false,enabled=false,job=0,visible=true,disposed=false;
    const parent=canvas.parentElement;
    function draw(){
      job=0;
      if(!enabled||!visible||document.hidden||disposed||gl.isContextLost())return;
      const w=parent.clientWidth,h=parent.clientHeight;
      if(!w||!h)return;
      const scale=Math.min(devicePixelRatio||1,1.5,Math.sqrt(400000/(w*h)));
      const px=Math.max(1,Math.floor(w*scale)), py=Math.max(1,Math.floor(h*scale));
      if(canvas.width!==px || canvas.height!==py){
        canvas.width=px;canvas.height=py;
      }
      gl.viewport(0,0,px,py);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniform1f(uniforms.yaw,angle);
      gl.uniform1f(uniforms.aspect,px/py);
      gl.uniform1i(uniforms.wire,Number(wire));
      if(wire)gl.disable(gl.DEPTH_TEST);else gl.enable(gl.DEPTH_TEST);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,wire?grid:solid);
      gl.drawElements(wire?gl.LINES:gl.TRIANGLES,wire?lines.length:tris.length,gl.UNSIGNED_SHORT,0);
    }
    function invalidate(){
      if(enabled&&visible&&!document.hidden&&!disposed&&!job) job=requestAnimationFrame(draw);
    }
    const resize = typeof ResizeObserver==='function'?new ResizeObserver(invalidate):null;
    const observer = typeof IntersectionObserver==='function'?new IntersectionObserver(([e])=>{visible=e.isIntersecting;invalidate();}):null;
    function pause(){
      enabled=false;if(job)cancelAnimationFrame(job);job=0;
      resize?.disconnect();observer?.disconnect();
      window.removeEventListener('resize',invalidate);
      document.removeEventListener('visibilitychange',invalidate);
    }
    function lose(event){event.preventDefault(); fallback();}
    canvas.addEventListener('webglcontextlost',lose);
    return {
      start(){if(disposed)return;enabled=true;visible=true;resize?.observe(parent);observer?.observe(parent);
        if(!resize)window.addEventListener('resize',invalidate,{passive:true});document.addEventListener('visibilitychange',invalidate);invalidate();},
      pause,
      setAngle(value){angle=value*Math.PI/180-.3;invalidate();},
      setMaterial(value){wire=value==='wire';invalidate();},
      dispose(){pause();disposed=true;canvas.removeEventListener('webglcontextlost',lose);[v,solid,grid].forEach(b=>gl.deleteBuffer(b));gl.deleteProgram(program);}
    };
  };
})();
