/* The original V7 three-half-twist surface, with two renderers sharing its geometry.
   Rendering is invalidated by the page controller, never self-scheduled here. */
(() => {
  const tau = Math.PI * 2;
  const sides = [1,-1];
  const lamps = [
    [[-.78, .85, 1.45], [1.00, .85, .59], [.27, .44, .72]],
    [[-.96, .22, 1.38], [1.00, .58, .76], [.35, .39, .89]],
    [[.97, .55, 1.15], [.66, .82, 1.00], [.75, .30, .40]]
  ];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function surface(u,v) {
    const twist = u * 1.5;
    const r = 1.18 + v * Math.cos(twist);
    return [r * Math.cos(u), r * Math.sin(u), v * Math.sin(twist)];
  }
  function mesh(rings, strips) {
    const vertices = [], indices = [];
    for (let i = 0; i <= rings; i++) for (let j = 0; j <= strips; j++) {
      const u = i/rings * tau, v = (j/strips - .5)*1.14;
      const p = surface(u,v);
      const a = surface(u+.0001,v).map((x,k)=>x-p[k]);
      const b = surface(u,v+.0001).map((x,k)=>x-p[k]);
      const n = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
      const l = Math.hypot(...n) || 1;
      vertices.push(...p, ...n.map(x=>x/l), j/strips);
      if (i < rings && j < strips) {
        const x=i*(strips+1)+j,y=x+strips+1;
        indices.push(x,y,x+1,y,y+1,x+1);
      }
    }
    return {vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};
  }
  const norm = (x,y,z) => {const n=Math.hypot(x,y,z)||1; return [x/n,y/n,z/n];};
  function orient(yaw,pitch) {
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch);
    const cz=.9211,sz=-.3894;
    // Rz · Rx · Ry, in OpenGL column-major order.
    return [cz*cy-sz*sx*sy,sz*cy+cz*sx*sy,-cx*sy,
      -sz*cx,cz*cx,sx,cz*sy+sz*sx*cy,sz*sy-cz*sx*cy,cx*cy];
  }
  function settings(state, canvas, software) {
    const {width,height,quality,lampMix,yaw,pitch} = state;
    const pixels = software ? (quality==='full'?310000:185000) : (quality==='full'?1550000:740000);
    const maxDpr = software ? 1 : quality==='full' ? 1.85 : 1.25;
    const scale = Math.min(devicePixelRatio||1,maxDpr,Math.sqrt(pixels/(width*height)));
    const w=Math.max(2,Math.floor(width*scale)),h=Math.max(2,Math.floor(height*scale));
    const sizeChanged=canvas.width!==w || canvas.height!==h;
    if (sizeChanged) {canvas.width=w;canvas.height=h;}
    // Blend the three original light rigs before sending the uniforms, keeping
    // material shading and geometry identical in both renderers.
    const [light,key,fill]=lamps[0].map((components,i)=>components.map((_,j)=>
      lamps[0][i][j]*lampMix[0]+lamps[1][i][j]*lampMix[1]+lamps[2][i][j]*lampMix[2]));
    const l=norm(light[0]+state.lightX*.54,light[1]-state.lightY*.46,light[2]);
    return {w,h,sizeChanged,m:orient(yaw,pitch),l,key,fill,
      focal: Math.min(1,w/h*1.08)*2.43 };
  }
  const vert=`
    attribute vec3 p,n;
    attribute float edge;
    uniform mat3 model;
    uniform float aspect,focal;
    varying vec3 v,N;
    varying float band;
    void main(){
      v=model*p;N=model*n;band=edge;
      float w=4.6-v.z;
      gl_Position=vec4(v.x*focal/aspect,(v.y-.13)*focal,.9*w-.42,w);
    }`;
  const frag=`
    precision mediump float;
    uniform vec3 light,key,fill;
    varying vec3 v,N;
    varying float band;
    void main(){
      vec3 n=normalize(N);if(!gl_FrontFacing)n=-n;
      vec3 V=normalize(vec3(0.,0.,4.6)-v);
      vec3 f=vec3(.761,-.198,.618);
      float d=max(0.,dot(n,light)),d2=max(0.,dot(n,f));
      vec3 R=reflect(-V,n);
      float f0=max(0.,1.-dot(n,V));
      float fresnel=f0*f0*f0;
      float card=smoothstep(.55,.96,dot(R,light));
      float stripe=smoothstep(.78,.97,dot(R,vec3(-.162,.931,.328)));
      float pin=pow(max(0.,dot(R,light)),38.);
      float cut=pow(max(0.,dot(R,f)),9.);
      float rim=smoothstep(.453,.5,abs(band-.5));
      vec3 base=vec3(.175,.091,.034)+vec3(.76,.49,.18)*(.66*d+.24*d2);
      base+=key*(.58*card+.36*pin+.21*stripe)+fill*(.36*cut+.32*fresnel)+vec3(.26,.14,.04)*rim;
      gl_FragColor=vec4(pow(clamp(base,0.,1.),vec3(.83)),1.);
    }`;
  function gpu(canvas,onLost) {
    let gl;
    try {gl=canvas.getContext('webgl',{alpha:true,depth:true,antialias:true,failIfMajorPerformanceCaveat:true,preserveDrawingBuffer:false});} catch (_) {}
    if (!gl) return null;
    const program=gl.createProgram(), packed=new Map();
    const loc={};
    function attach(type,source) {
      const shader=gl.createShader(type);
      gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw new Error('Ribbon shader failed');}
      gl.attachShader(program,shader);gl.deleteShader(shader);
    }
    try {
      attach(gl.VERTEX_SHADER,vert);attach(gl.FRAGMENT_SHADER,frag);
      gl.bindAttribLocation(program,0,'p');gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Ribbon program failed');
    } catch (_) {gl.deleteProgram(program);return null;}
    gl.useProgram(program);
    for (const key of ['model','aspect','focal','light','key','fill']) loc[key]=gl.getUniformLocation(program,key);
    const attr=['p','n','edge'].map(k=>gl.getAttribLocation(program,k));
    function geometry(quality) {
      if (packed.has(quality)) return packed.get(quality);
      const d=quality==='full'?mesh(144,30):mesh(96,22);
      function buffer(target, data) {const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);return b;}
      const g={v:buffer(gl.ARRAY_BUFFER,d.vertices),i:buffer(gl.ELEMENT_ARRAY_BUFFER,d.indices),length:d.indices.length};
      packed.set(quality,g);return g;
    }
    function lost(e) {e.preventDefault();onLost();}
    canvas.addEventListener('webglcontextlost',lost);
    gl.enable(gl.DEPTH_TEST);
    return {
      canvas, type:'webgl',
      draw(state) {
        if (gl.isContextLost()) return null;
        const f=settings(state,canvas,false),g=geometry(state.quality);
        gl.viewport(0,0,f.w,f.h);
        gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER,g.v);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,g.i);
        attr.forEach((i,k)=>{gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,k===2?1:3,gl.FLOAT,false,28,k*12);});
        gl.uniformMatrix3fv(loc.model,false,f.m);
        gl.uniform1f(loc.aspect,f.w/f.h);gl.uniform1f(loc.focal,f.focal);
        gl.uniform3fv(loc.light,f.l);gl.uniform3fv(loc.key,f.key);gl.uniform3fv(loc.fill,f.fill);
        gl.drawElements(gl.TRIANGLES,g.length,gl.UNSIGNED_SHORT,0);
        return {width:f.w,height:f.h,triangles:g.length/3};
      },
      dispose() {canvas.removeEventListener('webglcontextlost',lost);packed.forEach(g=>{gl.deleteBuffer(g.v);gl.deleteBuffer(g.i);});gl.deleteProgram(program);}
    };
  }
  // A bounded software renderer, not a baked turntable: perspective projection,
  // two-sided vertex lighting, Gouraud interpolation, and a per-pixel Z buffer.
  // It is also the fallback if a GPU context goes away mid-session.
  function cpu(canvas) {
    const ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx)return null;
    const {vertices,indices}=mesh(64,20),count=vertices.length/7;
    const sx=new Float32Array(count),sy=new Float32Array(count),sz=new Float32Array(count);
    const front=new Float32Array(count*3),back=new Float32Array(count*3);
    let depth, image;
    function smooth(a,b,x){const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
    return {
      canvas,type:'software',
      draw(state) {
        const f=settings(state,canvas,true),{w,h,m,l,key,fill,focal}=f;
        if (!image || f.sizeChanged) {image=ctx.createImageData(w,h);depth=new Float32Array(w*h);}
        const pixels=image.data;
        pixels.fill(0);depth.fill(-8);
        const scale=focal*h*.5;
        for(let i=0;i<count;i++){
          const j=i*7;
          const x=vertices[j],y=vertices[j+1],z=vertices[j+2];
          const vx=m[0]*x+m[3]*y+m[6]*z,vy=m[1]*x+m[4]*y+m[7]*z,vz=m[2]*x+m[5]*y+m[8]*z;
          const q=scale/(4.6-vz);
          sx[i]=w*.5+vx*q;sy[i]=h*.5-(vy-.13)*q;sz[i]=vz;
          const nx=vertices[j+3],ny=vertices[j+4],nz=vertices[j+5];
          const A=m[0]*nx+m[3]*ny+m[6]*nz,B=m[1]*nx+m[4]*ny+m[7]*nz,C=m[2]*nx+m[5]*ny+m[8]*nz;
          const distance=Math.hypot(vx,vy,4.6-vz),vx1=-vx/distance,vy1=-vy/distance,vz1=(4.6-vz)/distance;
          const angle=A*vx1+B*vy1+C*vz1,rim=smooth(.453,.5,Math.abs(vertices[j+6]-.5));
          const rx=2*angle*A-vx1,ry=2*angle*B-vy1,rz=2*angle*C-vz1;
          const raw=rx*l[0]+ry*l[1]+rz*l[2];
          const card=smooth(.55,.96,raw)*.58+Math.pow(Math.max(0,raw),38)*.36+smooth(.78,.97,-.162*rx+.931*ry+.328*rz)*.21;
          const cut=Math.pow(Math.max(0,.761*rx-.198*ry+.618*rz),9)*.36;
          for(const side of sides){
            const out=side===1?front:back,ii=i*3;
            const d= Math.max(0,side*(A*l[0]+B*l[1]+C*l[2]))*.66 + Math.max(0,side*(.761*A-.198*B+.618*C))*.24;
            const fresnel=cut+Math.pow(clamp(1-side*angle,0,1),3)*.32;
            out[ii]=255*Math.pow(Math.min(1,.175+.76*d+key[0]*card+fill[0]*fresnel+.26*rim),.83);
            out[ii+1]=255*Math.pow(Math.min(1,.091+.49*d+key[1]*card+fill[1]*fresnel+.14*rim),.83);
            out[ii+2]=255*Math.pow(Math.min(1,.034+.18*d+key[2]*card+fill[2]*fresnel+.04*rim),.83);
          }
        }
        for(let i=0;i<indices.length;i+=3){
          const a=indices[i],b=indices[i+1],c=indices[i+2];
          const ax=sx[a],ay=sy[a],bx=sx[b],by=sy[b],cx=sx[c],cy=sy[c];
          const abx=bx-ax,aby=by-ay,acx=cx-ax,acy=cy-ay;
          const area=abx*acy-aby*acx;
          if(Math.abs(area)<.008)continue;
          const minX=Math.max(0,Math.floor(Math.min(ax,bx,cx)));
          const maxX=Math.min(w-1,Math.ceil(Math.max(ax,bx,cx)));
          const minY=Math.max(0,Math.floor(Math.min(ay,by,cy)));
          const maxY=Math.min(h-1,Math.ceil(Math.max(ay,by,cy)));
          const col=area<0?front:back,aa=a*3,bb=b*3,cc=c*3;
          const f1=acy/area,f2=-acx/area,f3=-aby/area,f4=abx/area;
          for(let y=minY;y<=maxY;y++){
            let u=(minX+.5-ax)*f1+(y+.5-ay)*f2;
            let v=(minX+.5-ax)*f3+(y+.5-ay)*f4;
            for(let x=minX;x<=maxX;x++,u+=f1,v+=f3){
              const t=1-u-v;
              if(t<0||u<0||v<0)continue;
              const z=t*sz[a]+u*sz[b]+v*sz[c];
              const at=y*w+x;
              if(z<=depth[at])continue;
              depth[at]=z;
              const p=at*4;
              for(let k=0;k<3;k++)pixels[p+k]=t*col[aa+k]+u*col[bb+k]+v*col[cc+k];
              pixels[p+3]=255;
            }
          }
        }
        ctx.putImageData(image,0,0);
        return {width:w,height:h,triangles:indices.length/3};
      },
      dispose(){image=null;depth=null;canvas.width=2;canvas.height=2;}
    };
  }
  window.installUniverseRibbon = (canvas, onLost, softwareOnly = false) => {
    const hardware=!softwareOnly && gpu(canvas,onLost);
    if(hardware)return hardware;
    // Some browsers keep an unusable WebGL context attached after a compile
    // failure. The separate Canvas2D surface permits a clean fallback.
    const replacement=document.createElement('canvas');
    replacement.dataset.software='';
    replacement.setAttribute('aria-hidden','true');
    replacement.hidden=true;
    canvas.after(replacement);
    return cpu(replacement);
  };
})();
