type Vec3=[number,number,number];
type Mat=Float32Array;
const I=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function mul(a:Mat,b:Mat){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
function rotate(axis:number,t:number){const m=I(),c=Math.cos(t),s=Math.sin(t);if(axis===0){m[5]=m[10]=c;m[6]=s;m[9]=-s;}else if(axis===1){m[0]=m[10]=c;m[2]=-s;m[8]=s;}else{m[0]=m[5]=c;m[1]=s;m[4]=-s;}return m;}
function translate(x:number,y:number,z:number,scale=1){const m=I();m[0]=m[5]=m[10]=scale;m[12]=x;m[13]=y;m[14]=z;return m;}
const normal=(v:Vec3):Vec3=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l) as Vec3;};
const cross=(a:Vec3,b:Vec3):Vec3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function camera(){const eye:Vec3=[0,.75,5],target:Vec3=[0,-.13,0],z=normal(eye.map((x,i)=>x-target[i]) as Vec3),x=normal(cross([0,1,0],z)),y=cross(z,x),m=I();for(let j=0;j<3;j++){m[j*4]=x[j];m[j*4+1]=y[j];m[j*4+2]=z[j];}m[12]=-x.reduce((n,v,i)=>n+v*eye[i],0);m[13]=-y.reduce((n,v,i)=>n+v*eye[i],0);m[14]=-z.reduce((n,v,i)=>n+v*eye[i],0);return m;}
function ortho(aspect:number){const h=1.58,w=h*aspect,m=I();m[0]=1/w;m[5]=1/h;m[10]=-2/20;m[14]=-1;return m;}

type Geometry={positions:number[];normals:number[]};
function ring(radius:number,profile:number[][]):Geometry {
  const positions:number[]=[],normals:number[]=[];
  const at=(i:number,p:number[])=>{const t=i/160*Math.PI*2;return [Math.cos(t)*(radius+p[0]),Math.sin(t)*(radius+p[0]),p[1]] as Vec3;};
  for(let i=0;i<160;i++)for(let j=0;j<profile.length;j++){
    const a=profile[j],b=profile[(j+1)%profile.length],dr=b[0]-a[0],dz=b[1]-a[1];
    for(const [u,v] of [[i,a],[i+1,a],[i+1,b],[i,a],[i+1,b],[i,b]] as [number,number[]][]){
      const t=u/160*Math.PI*2;positions.push(...at(u,v));normals.push(...normal([Math.cos(t)*dz,Math.sin(t)*dz,-dr]));
    }
  }return {positions,normals};
}
function star():Geometry {
  const positions:number[]=[],normals:number[]=[];
  for(const side of [1,-1])for(let i=0;i<64;i++){
    const point=(j:number):Vec3=>{const t=j/64*Math.PI*2,c=Math.cos(t),s=Math.sin(t);return [Math.sign(c)*Math.pow(Math.abs(c),3.4)*.43,Math.sign(s)*Math.pow(Math.abs(s),3.4)*.43,0];};
    const a:Vec3=[0,0,.13*side],b=point(i),c=point((i+1)%64),n=normal(cross(b.map((x,j)=>x-a[j]) as Vec3,c.map((x,j)=>x-a[j]) as Vec3));
    for(const p of [a,b,c]){positions.push(...p);normals.push(...n.map(v=>side===1?v:-v));}
  }return {positions,normals};
}
function pedestal():Geometry {
  const positions:number[]=[],normals:number[]=[],profile=[[0,-1.43],[.78,-1.43],[.84,-1.39],[.84,-1.28],[.79,-1.245],[0,-1.245]];
  for(let i=0;i<128;i++)for(let j=0;j<profile.length-1;j++){
    const a=profile[j],b=profile[j+1],dr=b[0]-a[0],dy=b[1]-a[1];
    for(const [u,v] of [[i,a],[i+1,a],[i+1,b],[i,a],[i+1,b],[i,b]] as [number,number[]][]){const t=u/128*Math.PI*2;positions.push(Math.cos(t)*v[0],v[1],Math.sin(t)*v[0]);normals.push(...normal([Math.cos(t)*dy,-dr,Math.sin(t)*dy]));}
  }return {positions,normals};
}

/** Small local WebGL scene: real depth, lit metal ribbons and a faceted star. */
export function createOrbitScene(canvas:HTMLCanvasElement){
  const gl=canvas.getContext("webgl",{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:"low-power"});
  if(!gl)throw new Error("WebGL unavailable");
  const shaders:WebGLShader[]=[],buffers:WebGLBuffer[]=[];
  function shader(type:number,source:string){const s=gl!.createShader(type)!;gl!.shaderSource(s,source);gl!.compileShader(s);if(!gl!.getShaderParameter(s,gl!.COMPILE_STATUS)){gl!.deleteShader(s);throw new Error("Orbit shader unavailable");}shaders.push(s);return s;}
  const program=gl.createProgram()!;
  gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uModel;uniform mat4 uViewProjection;varying vec3 vWorld;varying vec3 vNormal;void main(){vec4 w=uModel*vec4(aPosition,1.0);vWorld=w.xyz;vNormal=mat3(uModel)*aNormal;gl_Position=uViewProjection*w;}`));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision highp float;varying vec3 vWorld;varying vec3 vNormal;uniform vec3 uColor;uniform float uStone;uniform float uEmission;float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}void main(){vec3 n=normalize(vNormal);vec3 l=normalize(vec3(-2.8,4.2,5.0)-vWorld);vec3 v=normalize(vec3(0.0,0.75,5.0)-vWorld);float diffuse=max(dot(n,l),0.0);float spec=pow(max(dot(n,normalize(l+v)),0.0),mix(65.0,10.0,uStone));float grain=(hash(floor(vWorld*230.0))-.5)*mix(.016,.1,uStone);vec3 highlight=mix(vec3(.8,.86,1.0),vec3(1.0,.9,.57),min(uEmission*2.0,1.0));vec3 color=uColor*(.42+diffuse*.65+grain+uEmission)+highlight*spec*mix(.65,.07,uStone);color+=pow(1.0-max(dot(n,v),0.0),3.0)*.075;gl_FragColor=vec4(color,1.0);}`));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error("Orbit program unavailable");
  gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
  const pos=gl.getAttribLocation(program,"aPosition"),nor=gl.getAttribLocation(program,"aNormal");
  const model=gl.getUniformLocation(program,"uModel"),vp=gl.getUniformLocation(program,"uViewProjection"),color=gl.getUniformLocation(program,"uColor"),stone=gl.getUniformLocation(program,"uStone"),emission=gl.getUniformLocation(program,"uEmission");
  function mesh(geometry:Geometry){const result=[];for(const data of [geometry.positions,geometry.normals]){const buffer=gl!.createBuffer()!;buffers.push(buffer);gl!.bindBuffer(gl!.ARRAY_BUFFER,buffer);gl!.bufferData(gl!.ARRAY_BUFFER,new Float32Array(data),gl!.STATIC_DRAW);result.push(buffer);}return {buffers:result,count:geometry.positions.length/3};}
  const band=mesh(ring(1.1,[[-.085,-.012],[-.074,-.025],[.074,-.025],[.085,-.012],[.085,.012],[.074,.025],[-.074,.025],[-.085,.012]]));
  const wire=mesh(ring(1.12,Array.from({length:12},(_,i)=>[Math.cos(i/12*Math.PI*2)*.024,Math.sin(i/12*Math.PI*2)*.024])));
  const gem=mesh(star()),base=mesh(pedestal());
  function drawMesh(object:ReturnType<typeof mesh>,matrix:Mat,ink:number[],textured=0,light=0){gl!.uniformMatrix4fv(model,false,matrix);gl!.uniform3fv(color,ink);gl!.uniform1f(stone,textured);gl!.uniform1f(emission,light);for(const [i,location] of [pos,nor].entries()){gl!.bindBuffer(gl!.ARRAY_BUFFER,object.buffers[i]);gl!.enableVertexAttribArray(location);gl!.vertexAttribPointer(location,3,gl!.FLOAT,false,0,0);}gl!.drawArrays(gl!.TRIANGLES,0,object.count);}
  return {
    draw(seconds:number){
      const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,1.75);
      if(!w||!h)return;
      if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
      gl!.viewport(0,0,canvas.width,canvas.height);gl!.clear(gl!.COLOR_BUFFER_BIT|gl!.DEPTH_BUFFER_BIT);gl!.uniformMatrix4fv(vp,false,mul(ortho(w/h),camera()));
      drawMesh(base,I(),[.57,.61,.79],.85);
      // Broader, faster precession keeps both rings visibly three-dimensional.
      const outer=mul(rotate(1,Math.sin(seconds*.4)*.55),mul(rotate(2,-.58+Math.sin(seconds*.32)*.16),rotate(0,.76+Math.sin(seconds*.36)*.18)));
      const inner=mul(rotate(1,Math.sin(seconds*.5+.5)*.48),mul(rotate(2,.4+Math.sin(seconds*.38)*.2),rotate(0,1.03+Math.sin(seconds*.43)*.2)));
      drawMesh(band,outer,[.43,.24,.79],.08);drawMesh(wire,inner,[.17,.45,.95]);
      const twinkle=.14+Math.pow(.5+.5*Math.sin(seconds*2.6),2)*.48;
      drawMesh(gem,mul(translate(0,.03+Math.sin(seconds*.8)*.04,0,1.08),rotate(1,Math.sin(seconds*.7)*.5)),[1,.65,.09],0,twinkle);
      for(let i=0;i<4;i++){const t=seconds*.7+i*Math.PI/2;const matrix=mul(inner,mul(translate(Math.cos(t)*1.12,Math.sin(t)*1.12,0,.075),rotate(1,seconds*.9)));drawMesh(gem,matrix,i%2?[.58,.77,1]:[1,.76,.25],0,.25);}
    },
    dispose(){buffers.forEach(b=>gl!.deleteBuffer(b));shaders.forEach(s=>gl!.deleteShader(s));gl!.deleteProgram(program);}
  };
}
