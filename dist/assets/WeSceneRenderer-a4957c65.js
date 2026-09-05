import{j as C,h as Kt,i as qt,bt as Zt}from"./main-d5c89c2c.js";import{R as M}from"./vendor-react-d4bca6d7.js";import{g as Qt,p as xt,c as Jt,a as Xt,s as eo,b as to,d as oo,e as ro,f as no}from"./wallpaperEnginePuppetModel-258cb088.js";import"./vendor-utils-654bd828.js";const io=new Set(["MULTIPLE_TEXTURES_PRIMARY_ONLY","UNKNOWN_SOURCE_SIZE","FRAME_SIZE_MISMATCH","SCENE_SIZE_INFERRED","SCENE_SIZE_FALLBACK","UNSUPPORTED_PUPPET_MODEL","UNSUPPORTED_PUPPET_ANIMATION"]),L=e=>typeof e=="object"&&e!==null&&!Array.isArray(e),g=e=>typeof e=="number"&&Number.isFinite(e),Xe=e=>g(e)&&e>0,Oe=e=>Number.isSafeInteger(e)&&e>=0,Te=e=>typeof e=="string",X=e=>Te(e)&&e.length>0,nt=e=>e===void 0||Te(e),pt=e=>Array.isArray(e)&&e.every(g),Ht=e=>L(e)&&X(e.id)&&nt(e.name)&&Oe(e.animationId)&&typeof e.additive=="boolean"&&g(e.blend)&&typeof e.blendIn=="boolean"&&typeof e.blendOut=="boolean"&&g(e.blendTime)&&e.blendTime>=0&&g(e.rate)&&typeof e.visible=="boolean",ao=e=>{if(!L(e)||!pt(e.positions)||e.positions3d!==void 0&&!pt(e.positions3d)||!pt(e.uvs)||!Array.isArray(e.indices)||!e.indices.every(Oe)||!L(e.bounds)||!g(e.bounds.minX)||!g(e.bounds.minY)||!g(e.bounds.maxX)||!g(e.bounds.maxY))return!1;const t=e.positions.length/2;return e.positions.length>=6&&e.positions.length%2===0&&(e.positions3d===void 0||e.positions3d.length===t*3)&&e.uvs.length===e.positions.length&&e.indices.length>=3&&e.indices.length%3===0&&e.indices.every(r=>r<t)&&e.bounds.maxX>e.bounds.minX&&e.bounds.maxY>e.bounds.minY},ee=e=>L(e)&&g(e.x)&&g(e.y),Gt=e=>L(e)&&Xe(e.width)&&Xe(e.height),Rt=e=>L(e)&&g(e.a)&&g(e.b)&&g(e.c)&&g(e.d)&&g(e.tx)&&g(e.ty),so=e=>L(e)&&X(e.name)&&X(e.parentLayerId)&&X(e.parentModelPath)&&Array.isArray(e.parentAnimationLayers)&&e.parentAnimationLayers.every(Ht)&&(e.parentAnimationMode===void 0||e.parentAnimationMode==="2d"||e.parentAnimationMode==="orthographic3d")&&ee(e.parentOrigin)&&ee(e.parentScale)&&g(e.parentRotationDeg)&&Oe(e.boneIndex)&&Rt(e.localMatrix)&&Rt(e.bindTransform)&&ee(e.localCenter)&&ee(e.localScale)&&g(e.localRotationDeg),lo=e=>e===null||Gt(e),$e=e=>L(e)&&g(e.r)&&e.r>=0&&e.r<=1&&g(e.g)&&e.g>=0&&e.g<=1&&g(e.b)&&e.b>=0&&e.b<=1,uo=e=>!L(e)||!Te(e.kind)?!1:e.kind==="literal"?Te(e.value):e.kind==="hour"?typeof e.use24Hour=="boolean"&&typeof e.twoDigit=="boolean":e.kind==="minute"||e.kind==="second"?typeof e.twoDigit=="boolean":e.kind==="dayPeriod"?Te(e.am)&&Te(e.pm):e.kind==="number"?(e.field==="dayOfMonth"||e.field==="month"||e.field==="year")&&typeof e.twoDigit=="boolean"&&Te(e.digitSeparator):e.kind==="lookup"?!Array.isArray(e.values)||!e.values.every(Te)?!1:e.field==="month"?e.values.length>=12:e.field==="weekday"?e.values.length>=7:e.field==="dayOfMonth"?e.values.length>=32:!1:!1,co=e=>L(e)&&e.kind==="dateTime"&&(e.refresh==="second"||e.refresh==="minute"||e.refresh==="day")&&Array.isArray(e.parts)&&e.parts.length>0&&e.parts.every(uo),mo=e=>L(e)&&ee(e.offset)&&$e(e.color)&&g(e.alpha)&&e.alpha>=0&&e.alpha<=1&&typeof e.drawBorder=="boolean",po=e=>!L(e)||!Te(e.kind)?!1:e.kind==="tint"?$e(e.color)&&g(e.alpha)&&e.alpha>=0&&e.alpha<=1:e.kind==="blend"?X(e.texturePath)&&(e.maskPath===null||X(e.maskPath))&&g(e.multiply)&&e.multiply>=0:e.kind==="transform"?ee(e.offset)&&ee(e.scale)&&g(e.angle):e.kind==="fisheye"?ee(e.center)&&g(e.distortion)&&e.distortion>=0&&Xe(e.size)&&typeof e.transparentOutside=="boolean":e.kind==="opacity"?(e.maskPath===null||X(e.maskPath))&&g(e.alpha)&&e.alpha>=0&&e.alpha<=1:!1,ho=e=>!L(e)||!Te(e.kind)?!1:e.kind==="solidColor"?$e(e.color):e.kind==="text"?Te(e.text)&&(e.fontReference===void 0||X(e.fontReference))&&(e.fontPath===null||X(e.fontPath))&&Xe(e.pointSize)&&$e(e.color)&&(e.horizontalAlign==="left"||e.horizontalAlign==="center"||e.horizontalAlign==="right")&&(e.verticalAlign==="top"||e.verticalAlign==="center"||e.verticalAlign==="bottom")&&g(e.padding)&&e.padding>=0&&(e.limitWidth===void 0||typeof e.limitWidth=="boolean")&&(e.maxWidth===void 0||e.maxWidth===null||g(e.maxWidth))&&(e.limitRows===void 0||typeof e.limitRows=="boolean")&&(e.maxRows===void 0||e.maxRows===null||g(e.maxRows))&&(e.useEllipsis===void 0||typeof e.useEllipsis=="boolean")&&(e.spacing===void 0||ee(e.spacing))&&(e.textShadow===void 0||mo(e.textShadow))&&(e.dynamicText===void 0||co(e.dynamicText)):e.kind==="composition"?Array.isArray(e.effects)&&e.effects.length>0&&e.effects.every(po):lo(e.pixelSize)?e.kind==="image"?X(e.path):e.kind==="puppetMesh"?X(e.path)&&ao(e.mesh)&&(e.modelPath===void 0||X(e.modelPath))&&(e.animationLayers===void 0||Array.isArray(e.animationLayers)&&e.animationLayers.every(Ht))&&(e.animationMode===void 0||e.animationMode==="2d"||e.animationMode==="orthographic3d"):e.kind==="frameAnimation"?Array.isArray(e.frames)&&e.frames.every(X)&&(e.fps===null||Xe(e.fps)):!1:!1,fo=e=>L(e)&&Oe(e.weObjectIndex)&&X(e.weModelPath)&&X(e.weMaterialPath)&&(e.weColorBlendMode===null||g(e.weColorBlendMode))&&typeof e.ignoredEffects=="boolean",St=e=>L(e)&&g(e.frame)&&e.frame>=0&&g(e.value),xo=e=>L(e)&&Xe(e.fps)&&Xe(e.lengthFrames)&&(e.mode==="single"||e.mode==="loop"||e.mode==="mirror")&&Array.isArray(e.x)&&e.x.length>0&&e.x.every(St)&&Array.isArray(e.y)&&e.y.length>0&&e.y.every(St),zt=e=>L(e)&&(e.maskPath===null||X(e.maskPath))&&g(e.alpha)&&e.alpha>=0&&e.alpha<=1,$t=e=>L(e)&&(e.maskPath===null||X(e.maskPath))&&(e.timeOffsetPath===null||X(e.timeOffsetPath))&&g(e.direction)&&g(e.speed)&&e.speed>=0&&g(e.scale)&&e.scale>=0&&g(e.exponent)&&e.exponent>0&&g(e.strength)&&e.strength>=0,go=e=>L(e)&&e.kind==="scroll"&&g(e.speedX)&&g(e.speedY)&&ee(e.repeat)&&e.repeat.x>0&&e.repeat.y>0,_o=e=>L(e)&&e.kind==="transform"&&ee(e.offset)&&ee(e.scale)&&g(e.angle)&&typeof e.repeat=="boolean",bo=e=>L(e)&&e.kind==="spin"&&ee(e.center)&&g(e.speed)&&g(e.ratio)&&Math.abs(e.ratio)>=1e-6&&g(e.axis)&&g(e.phase)&&g(e.size)&&e.size>=0&&g(e.feather)&&e.feather>=0&&typeof e.repeat=="boolean"&&typeof e.elliptical=="boolean"&&typeof e.aspectCorrect=="boolean"&&typeof e.softMask=="boolean",Eo=e=>L(e)&&e.kind==="perspective"&&Array.isArray(e.points)&&e.points.length===4&&e.points.every(ee)&&typeof e.repeat=="boolean",To=e=>L(e)&&e.kind==="foliageSway"&&(e.maskPath===null||X(e.maskPath))&&(e.noisePath===null||X(e.noisePath))&&g(e.speed)&&g(e.strength)&&e.strength>=0&&g(e.phase)&&g(e.power)&&e.power>0&&g(e.noiseScale)&&e.noiseScale>=0&&g(e.ratio)&&e.ratio>0&&g(e.direction),yo=e=>L(e)&&e.kind==="waterFlow"&&(e.flowMapPath===null||X(e.flowMapPath))&&X(e.phasePath)&&g(e.speed)&&e.speed>=0&&g(e.strength)&&e.strength>=0&&g(e.phaseScale)&&e.phaseScale>0&&(e.phaseMode==="legacy"||e.phaseMode==="dual")&&(e.feather===null||g(e.feather)&&e.feather>=0&&e.feather<=.5),Ro=e=>L(e)&&e.kind==="shake"&&(e.directionMapPath===null||X(e.directionMapPath))&&g(e.speed)&&e.speed>=0&&g(e.strength)&&e.strength>=0&&ee(e.friction)&&e.friction.x>0&&e.friction.y>0&&ee(e.bounds)&&e.bounds.y>e.bounds.x&&(e.directionMode===0||e.directionMode===1||e.directionMode===2),So=e=>L(e)&&e.kind==="blurPrecise"&&(e.maskPath===null||X(e.maskPath))&&ee(e.scale)&&e.scale.x>0&&e.scale.y>0&&e.horizontalKernel===0&&e.verticalKernel===0&&typeof e.blurAlpha=="boolean",ko=e=>L(e)&&e.kind==="shimmer"&&g(e.brightness)&&e.brightness>=0&&$e(e.color)&&g(e.delay)&&e.delay>=0&&g(e.direction)&&g(e.granularity)&&e.granularity>0&&g(e.offset)&&g(e.speed),wo=e=>L(e)&&e.kind==="shine"&&(e.maskPath===null||X(e.maskPath))&&(e.noisePath===null||X(e.noisePath))&&g(e.threshold)&&e.threshold>=0&&e.threshold<=1&&g(e.noiseAmount)&&e.noiseAmount>=0&&g(e.noiseScale)&&e.noiseScale>0&&g(e.noiseSpeed)&&$e(e.rayColor)&&g(e.rayDirection)&&g(e.raySpeed)&&g(e.rayIntensity)&&e.rayIntensity>=0&&g(e.rayLength)&&e.rayLength>=0&&(e.edges===2||e.edges===3||e.edges===4||e.edges===5)&&(e.sampleMode===0||e.sampleMode===1||e.sampleMode===2||e.sampleMode===3||e.sampleMode===4)&&ee(e.blurScale)&&e.blurScale.x>0&&e.blurScale.y>0&&e.kernel===0&&g(e.blendMode)&&Number.isInteger(e.blendMode)&&e.blendMode>=0&&e.blendMode<=32&&e.copyBackground===!1&&typeof e.noiseEnabled=="boolean",Ao=e=>L(e)&&e.kind==="godRays"&&(e.maskPath===null||X(e.maskPath))&&g(e.threshold)&&e.threshold>=0&&e.threshold<=1&&L(e.caster)&&(e.caster.mode==="radial"&&ee(e.caster.center)||e.caster.mode==="directional"&&g(e.caster.direction))&&g(e.rayLength)&&e.rayLength>0&&e.rayLength<=1&&g(e.rayIntensity)&&e.rayIntensity>=0&&e.rayIntensity<=2&&$e(e.colorStart)&&$e(e.colorEnd)&&(e.sampleMode===0||e.sampleMode===1||e.sampleMode===2)&&ee(e.blurScale)&&e.blurScale.x>0&&e.blurScale.y>0&&(e.kernel===0||e.kernel===1||e.kernel===2)&&g(e.blendMode)&&Number.isInteger(e.blendMode)&&e.blendMode>=0&&e.blendMode<=32,Mo=e=>L(e)&&e.kind==="waterRipple"&&(e.maskPath===null||X(e.maskPath))&&X(e.normalPath)&&g(e.animationSpeed)&&g(e.scale)&&e.scale>=0&&g(e.scrollSpeed)&&g(e.direction)&&g(e.ratio)&&e.ratio>=0&&g(e.strength)&&e.strength>=0,Po=e=>L(e)&&e.kind==="opacity"&&zt(e)||go(e)||_o(e)||bo(e)||Eo(e)||To(e)||yo(e)||Ro(e)||So(e)||ko(e)||wo(e)||Ao(e)||Mo(e)||L(e)&&e.kind==="waterWaves"&&$t(e),Do=e=>L(e)?X(e.id)&&nt(e.name)&&g(e.zIndex)&&ho(e.source)&&ee(e.center)&&Gt(e.size)&&ee(e.scale)&&g(e.rotationDeg)&&g(e.opacity)&&e.opacity>=0&&e.opacity<=1&&(e.opacityEffects===void 0||Array.isArray(e.opacityEffects)&&e.opacityEffects.every(zt))&&(e.waterWavesEffects===void 0||Array.isArray(e.waterWavesEffects)&&e.waterWavesEffects.every($t))&&(e.textureEffects===void 0||Array.isArray(e.textureEffects)&&e.textureEffects.every(Po))&&typeof e.visible=="boolean"&&(e.parallax===null||ee(e.parallax))&&(e.puppetAttachment===void 0||so(e.puppetAttachment))&&(e.centerAnimations===void 0||Array.isArray(e.centerAnimations)&&e.centerAnimations.every(xo))&&(e.blendMode===null||e.blendMode==="normal"||e.blendMode==="screen")&&fo(e.compatibility):!1,Uo=e=>L(e)&&Xe(e.width)&&Xe(e.height)&&(e.sizing==="explicit"||e.sizing==="inferred"||e.sizing==="fallback")&&g(e.coordinateOffsetX)&&g(e.coordinateOffsetY),vo=e=>L(e)&&typeof e.enabled=="boolean"&&g(e.amount)&&e.amount>=0&&g(e.delay)&&e.delay>=0&&g(e.mouseInfluence)&&e.mouseInfluence>=0,Lo=e=>!L(e)||e.kind!=="chromaticAberration"?!1:ee(e.center)&&g(e.centerFalloff)&&e.centerFalloff>=0&&e.centerFalloff<=1&&g(e.strength)&&e.strength>=0&&g(e.direction)&&(e.mode===0||e.mode===1||e.mode===2||e.mode===3)&&(e.variation===0||e.variation===1||e.variation===2),Co=e=>L(e)&&(e.level==="warning"||e.level==="info")&&typeof e.code=="string"&&io.has(e.code)&&Te(e.message)&&nt(e.layerId)&&nt(e.path),Fo=e=>L(e)&&Te(e.code)&&Te(e.message)&&(e.objectIndex===void 0||Oe(e.objectIndex))&&nt(e.path),Io=e=>L(e)&&Oe(e.particleCount)&&Oe(e.otherObjectCount)&&Oe(e.unresolvedImageCount)&&Oe(e.effectLayerCount),No=e=>L(e)?e.format==="tablab-we-scene"&&e.version===1&&X(e.sourceDescriptorPath)&&Uo(e.canvas)&&(e.cameraParallax===void 0||vo(e.cameraParallax))&&(e.postProcessEffects===void 0||Array.isArray(e.postProcessEffects)&&e.postProcessEffects.every(Lo))&&Array.isArray(e.layers)&&e.layers.every(Do)&&Array.isArray(e.diagnostics)&&e.diagnostics.every(Co)&&Array.isArray(e.resourceDiagnostics)&&e.resourceDiagnostics.every(Fo)&&Io(e.unsupported):!1,ut=1e-8,Bo=e=>[{x:e[3].x,y:1-e[3].y},{x:e[2].x,y:1-e[2].y},{x:e[1].x,y:1-e[1].y},{x:e[0].x,y:1-e[0].y}],Wo=e=>{const[t,r,n,i,d,h,p,a,f]=e,_=d*f-h*a,l=-(i*f-h*p),b=i*a-d*p,T=-(r*f-n*a),E=t*f-n*p,R=-(t*a-r*p),A=r*h-n*d,x=-(t*h-n*i),S=t*d-r*i,m=t*_+r*l+n*b;if(!Number.isFinite(m)||Math.abs(m)<ut)return null;const s=1/m;return[_*s,T*s,A*s,l*s,E*s,x*s,b*s,R*s,S*s]},Oo=e=>{const[t,r,n,i]=e,d=r.x-n.x,h=i.x-n.x,p=t.x-r.x+n.x-i.x,a=r.y-n.y,f=i.y-n.y,_=t.y-r.y+n.y-i.y;let l=0,b=0;if(Math.abs(p)>=ut||Math.abs(_)>=ut){const R=d*f-h*a;if(!Number.isFinite(R)||Math.abs(R)<ut)return null;l=(p*f-h*_)/R,b=(d*_-p*a)/R}const T=[r.x-t.x+l*r.x,i.x-t.x+b*i.x,t.x,r.y-t.y+l*r.y,i.y-t.y+b*i.y,t.y,l,b,1],E=Wo(T);return!E||E.some(R=>!Number.isFinite(R))?null:new Float32Array([E[0],E[3],E[6],E[1],E[4],E[7],E[2],E[5],E[8]])},Xo=30,Ho=6,Go=e=>typeof e=="number"&&Number.isFinite(e)&&e>0?{fps:e,timingSource:"metadata"}:{fps:Xo,timingSource:"fallback"},kt=.85,wt=.15,zo=.25,$o=.05,jo=e=>{const t=[],r=[];let n=!1,i=!1;for(const p of e){if(p.opacity<=0||p.size.width<=0||p.size.height<=0)continue;const a=Math.abs(p.parallax?.x??0),f=Math.abs(p.parallax?.y??0);a>0?t.push(a):n=!0,f>0?r.push(f):i=!0}const d=n&&t.length>0?Math.min(wt,Math.max(...t)*kt):0,h=i&&r.length>0?Math.min(wt,Math.max(...r)*kt):0;return d>0||h>0?{cameraDepth:{x:d,y:h},relativeScale:zo,relativeDepthCap:$o}:null},Yo=e=>e.textureEffects?e.textureEffects.map(t=>t.kind==="scroll"?{...t,speedY:t.speedY===0?0:-t.speedY,repeat:{...t.repeat}}:t.kind==="transform"?{...t,offset:{x:t.offset.x,y:t.offset.y===0?0:-t.offset.y},scale:{...t.scale}}:t.kind==="spin"?{...t,center:{x:t.center.x,y:1-t.center.y},speed:t.speed===0?0:-t.speed,axis:t.axis===0?0:-t.axis,phase:t.phase===0?0:-t.phase}:t.kind==="perspective"?{...t,points:Bo(t.points)}:t.kind==="foliageSway"?{...t,direction:t.direction===0?0:-t.direction}:t.kind==="shake"?{...t,friction:{...t.friction},bounds:{...t.bounds}}:t.kind==="blurPrecise"?{...t,scale:{...t.scale}}:t.kind==="shine"?{...t,rayColor:{...t.rayColor},blurScale:{...t.blurScale},rayDirection:t.rayDirection===0?0:-t.rayDirection,raySpeed:t.raySpeed===0?0:-t.raySpeed}:t.kind==="godRays"?{...t,caster:t.caster.mode==="radial"?{mode:"radial",center:{x:t.caster.center.x,y:1-t.caster.center.y}}:{mode:"directional",direction:t.caster.direction===0?0:-t.caster.direction},colorStart:{...t.colorStart},colorEnd:{...t.colorEnd},blurScale:{...t.blurScale}}:t.kind==="waterRipple"?{...t,direction:t.direction===0?0:-t.direction}:{...t}):(e.waterWavesEffects??[]).map(t=>({kind:"waterWaves",...t})),Vo=(e,t)=>{e.kind==="opacity"?e.maskPath&&t.add(e.maskPath):e.kind==="waterWaves"?(e.maskPath&&t.add(e.maskPath),e.timeOffsetPath&&t.add(e.timeOffsetPath)):e.kind==="foliageSway"?(e.maskPath&&t.add(e.maskPath),e.noisePath&&t.add(e.noisePath)):e.kind==="waterFlow"?(e.flowMapPath&&t.add(e.flowMapPath),t.add(e.phasePath)):e.kind==="shake"?e.directionMapPath&&t.add(e.directionMapPath):e.kind==="blurPrecise"?e.maskPath&&t.add(e.maskPath):e.kind==="shine"?(e.maskPath&&t.add(e.maskPath),e.noisePath&&t.add(e.noisePath)):e.kind==="godRays"?e.maskPath&&t.add(e.maskPath):e.kind==="waterRipple"&&(e.maskPath&&t.add(e.maskPath),t.add(e.normalPath))},Ko=e=>{if(!No(e))return null;const t=e,r=[],n=new Set;let i=0,d=0,h=0;for(const a of t.layers){if(!a.visible||a.opacity<=0)continue;let f;if(a.source.kind==="solidColor")f={kind:"solidColor",color:{...a.source.color}};else if(a.source.kind==="text"){a.source.fontPath&&n.add(a.source.fontPath);const x=a.source.fontReference??(a.source.fontPath===null&&a.compatibility.weMaterialPath!=="builtin:font-fallback"?a.compatibility.weMaterialPath:void 0);f={kind:"text",text:a.source.text,fontReference:x,fontPath:a.source.fontPath,pointSize:a.source.pointSize,color:{...a.source.color},horizontalAlign:a.source.horizontalAlign,verticalAlign:a.source.verticalAlign,padding:a.source.padding,limitWidth:a.source.limitWidth??!1,maxWidth:a.source.maxWidth??null,limitRows:a.source.limitRows??!1,maxRows:a.source.maxRows??null,useEllipsis:a.source.useEllipsis??!1,spacing:a.source.spacing?{...a.source.spacing}:{x:0,y:0},textShadow:a.source.textShadow?{offset:{...a.source.textShadow.offset},color:{...a.source.textShadow.color},alpha:a.source.textShadow.alpha,drawBorder:a.source.textShadow.drawBorder}:void 0,dynamicText:a.source.dynamicText?{kind:a.source.dynamicText.kind,refresh:a.source.dynamicText.refresh,parts:a.source.dynamicText.parts.map(S=>S.kind==="lookup"?{...S,values:[...S.values]}:{...S})}:void 0}}else if(a.source.kind==="image")n.add(a.source.path),f={kind:"image",path:a.source.path};else if(a.source.kind==="puppetMesh")n.add(a.source.path),a.source.modelPath&&n.add(a.source.modelPath),f={kind:"puppetMesh",path:a.source.path,mesh:{positions:[...a.source.mesh.positions],positions3d:a.source.mesh.positions3d?[...a.source.mesh.positions3d]:void 0,uvs:[...a.source.mesh.uvs],indices:[...a.source.mesh.indices],bounds:{...a.source.mesh.bounds}},modelPath:a.source.modelPath??null,animationLayers:(a.source.animationLayers??[]).map(x=>({...x})),animationMode:a.source.animationMode};else if(a.source.kind==="composition"){for(const x of a.source.effects)x.kind==="blend"?(n.add(x.texturePath),x.maskPath&&n.add(x.maskPath)):x.kind==="opacity"&&x.maskPath&&n.add(x.maskPath);f={kind:"composition",effects:a.source.effects.map(x=>x.kind==="tint"?{...x,color:{...x.color}}:x.kind==="transform"?{...x,offset:{...x.offset},scale:{...x.scale}}:x.kind==="fisheye"?{...x,center:{...x.center}}:{...x})}}else{if(a.source.frames.length===0)continue;const x=Go(a.source.fps);i+=1,x.timingSource==="fallback"&&(h+=1),f={kind:"frameAnimation",frames:[...a.source.frames],fps:x.fps,timingSource:x.timingSource}}const _=a.opacityEffects??[],l=_.map(x=>x.maskPath).filter(x=>x!==null);l.forEach(x=>n.add(x));const b=_.reduce((x,S)=>x*S.alpha,1),T=(a.waterWavesEffects??[]).map(x=>({...x}));for(const x of T)x.maskPath&&n.add(x.maskPath),x.timeOffsetPath&&n.add(x.timeOffsetPath);const E=Yo(a);E.forEach(x=>Vo(x,n));const R=a.puppetAttachment?{...a.puppetAttachment,parentAnimationLayers:a.puppetAttachment.parentAnimationLayers.map(x=>({...x})),parentOrigin:{...a.puppetAttachment.parentOrigin},parentScale:{...a.puppetAttachment.parentScale},localMatrix:{...a.puppetAttachment.localMatrix},bindTransform:{...a.puppetAttachment.bindTransform},localCenter:{...a.puppetAttachment.localCenter},localScale:{...a.puppetAttachment.localScale}}:void 0;R&&n.add(R.parentModelPath);const A=(a.centerAnimations??[]).map(x=>({fps:x.fps,lengthFrames:x.lengthFrames,mode:x.mode,x:x.x.map(S=>({...S})),y:x.y.map(S=>({...S}))}));A.length>0&&(d+=1),r.push({id:a.id,name:a.name,zIndex:a.zIndex,source:f,center:{...a.center},size:{...a.size},scale:{...a.scale},rotationDeg:a.rotationDeg,opacity:Math.min(1,Math.max(0,a.opacity*b)),blendMode:a.blendMode==="screen"||a.blendMode===null&&a.compatibility.weColorBlendMode===7?"screen":a.blendMode==="normal"?"normal":void 0,opacityMaskPaths:l,waterWavesEffects:T,textureEffects:E,parallax:a.parallax?{...a.parallax}:null,...R?{puppetAttachment:R}:{},centerAnimations:A})}r.sort((a,f)=>a.zIndex-f.zIndex);const p=jo(r);return{canvas:{width:t.canvas.width,height:t.canvas.height},cameraParallax:t.cameraParallax?{...t.cameraParallax}:{enabled:!1,amount:0,delay:0,mouseInfluence:0},cameraParallaxSceneMotion:p,postProcessEffects:(t.postProcessEffects??[]).map(a=>({...a,center:{...a.center}})),layers:r,animationLayerCount:i,propertyAnimationLayerCount:d,fallbackTimingLayerCount:h,staticResourcePaths:[...n]}},jt=(e,t)=>{if(!Number.isFinite(t)||t<=0||!Number.isFinite(e.fps)||e.fps<=0||!Number.isFinite(e.lengthFrames)||e.lengthFrames<=0)return 0;const r=t*e.fps/1e3;if(e.mode==="single")return Math.min(r,e.lengthFrames);if(e.mode==="loop")return r%e.lengthFrames;const n=e.lengthFrames*2,i=r%n;return i<=e.lengthFrames?i:n-i},At=(e,t,r)=>{const n=e[0],i=e[e.length-1];if(!n||!i)return 0;if(r.mode==="loop"&&e.length>1){if(t<n.frame){const d=i.frame-r.lengthFrames,h=n.frame-d,p=h>0?(t-d)/h:1;return i.value+(n.value-i.value)*p}if(t>i.frame&&r.lengthFrames>i.frame){const h=n.frame+r.lengthFrames-i.frame,p=h>0?(t-i.frame)/h:0;return i.value+(n.value-i.value)*p}}if(t<=n.frame)return n.value;for(let d=1;d<e.length;d+=1){const h=e[d];if(t>h.frame)continue;const p=e[d-1],a=h.frame-p.frame;if(a<=0)return h.value;const f=(t-p.frame)/a;return p.value+(h.value-p.value)*f}return i.value},qo=(e,t)=>{const r=jt(e,t);return{x:At(e.x,r,e),y:At(e.y,r,e)}},Zo=(e,t)=>{let r=e.center.x,n=e.center.y;for(const i of e.centerAnimations){const d=qo(i,t);r+=d.x,n+=d.y}return{x:r,y:n}},dt=(e,t,r)=>!Number.isFinite(e)||e<=0||!Number.isFinite(t)||t<=0||!Number.isSafeInteger(r)||r<=1?0:Math.floor(e*t/1e3)%r,Qo=(e,t)=>{const r=dt(t,e.fps,e.frames.length),n=e.frames.length>1?(r+1)%e.frames.length:r;return{currentIndex:r,nextIndex:n,currentPath:e.frames[r],nextPath:e.frames[n]}},Jo=(e,t)=>{const r=new Set(e.staticResourcePaths);for(const n of e.layers){if(n.source.kind!=="frameAnimation")continue;const i=n.source.frames.length,d=dt(t,n.source.fps,i),h=Math.min(i,Ho);for(let p=0;p<h;p+=1)r.add(n.source.frames[(d+p)%i])}return[...r]},er=(e,t)=>e.source.kind==="solidColor"||e.source.kind==="text"||e.source.kind==="composition"?null:e.source.kind==="image"||e.source.kind==="puppetMesh"?e.source.path:Qo(e.source,t).currentPath,tr=(e,t,r=null)=>{if(e.source.kind==="solidColor"||e.source.kind==="text"||e.source.kind==="composition")return[];if(e.source.kind==="image"||e.source.kind==="puppetMesh")return[e.source.path];const n=e.source.frames.length;if(n===0)return[];const i=dt(t,e.source.fps,n),d=[e.source.frames[i],e.source.frames[(i-1+n)%n],e.source.frames[(i+1)%n]];return r&&d.push(r),[...new Set(d)]},at=e=>typeof e=="number"&&Number.isFinite(e)&&e>0,or=(e,t)=>!at(e.width)||!at(e.height)||!at(t.width)||!at(t.height)?1:Math.max(t.width/e.width,t.height/e.height),ct=e=>String(e).padStart(2,"0"),rr=(e,t)=>t?[...e].join(t):e,nr=(e,t)=>{let r;e.field==="dayOfMonth"?r=t.getDate():e.field==="month"?r=t.getMonth()+1:r=t.getFullYear();const n=e.twoDigit?ct(r):String(r);return rr(n,e.digitSeparator)},ir=(e,t)=>{const r=e.field==="month"?t.getMonth():e.field==="weekday"?t.getDay():t.getDate();return e.values[r]??""},ar=(e,t)=>{if(e.kind!=="dateTime")return"";let r="";for(const n of e.parts)if(n.kind==="literal")r+=n.value;else if(n.kind==="hour"){let i=t.getHours();n.use24Hour||(i=i%12||12),r+=n.twoDigit?ct(i):String(i)}else if(n.kind==="minute"){const i=t.getMinutes();r+=n.twoDigit?ct(i):String(i)}else if(n.kind==="second"){const i=t.getSeconds();r+=n.twoDigit?ct(i):String(i)}else n.kind==="dayPeriod"?r+=t.getHours()>=12?n.pm:n.am:n.kind==="number"?r+=nr(n,t):n.kind==="lookup"&&(r+=ir(n,t));return r},st=()=>({x:0,y:0}),lt=e=>Math.abs(e)<1e-12?0:e,sr=(e,t)=>{if(!Number.isFinite(t.strength)||t.strength<=0)return{red:st(),green:st(),blue:st()};const r=Math.max(1,e.width,e.height),n=t.mode===1?1:.5,i=t.strength*.01*r*n;let d=1,h=0;t.mode===1&&(d=-Math.sin(t.direction),h=Math.cos(t.direction));const p=.75+Math.min(1,Math.max(0,t.centerFalloff))*.25,a={x:lt(d*i*p),y:lt(h*i*p)},f={x:lt(-a.x),y:lt(-a.y)},_=st();return t.variation===1?{red:_,green:f,blue:a}:t.variation===2?{red:f,green:a,blue:_}:{red:a,green:_,blue:f}},lr=e=>Math.max(.1,e)*4,ur=({width:e,height:t,scaleX:r,scaleY:n,rotationDeg:i,horizontalAlign:d,verticalAlign:h})=>{const p=d==="left"?e/2:d==="right"?-e/2:0,a=h==="top"?t/2:h==="bottom"?-t/2:0,f=p*r,_=a*n,l=i*(Math.PI/180),b=Math.cos(l),T=Math.sin(l);return{x:f*b-_*T,y:f*T+_*b}},Mt=e=>Math.min(1,Math.max(-1,e)),cr=(e,t,r)=>({x:r.width>0?Mt(e/r.width*2-1):0,y:r.height>0?Mt(t/r.height*2-1):0}),dr=(e,t,r,n,i=null)=>{if(!t.enabled||t.amount<=0||t.mouseInfluence<=0)return{x:0,y:0};if(!r)return{x:0,y:0};const d=f=>{if(!i)return f;const _=f*i.relativeScale,l=Math.max(0,i.relativeDepthCap);return Math.max(-l,Math.min(l,_))},h=t.amount*t.mouseInfluence,p=-n.x*e.width*.5*h*d(r.x),a=-n.y*e.height*.5*h*d(r.y);return{x:p===0?0:p,y:a===0?0:a}},mr=(e,t,r,n)=>{if(!r||!t.enabled||t.amount<=0||t.mouseInfluence<=0)return{x:0,y:0};const i=t.amount*t.mouseInfluence,d=-n.x*e.width*.5*i*r.cameraDepth.x,h=-n.y*e.height*.5*i*r.cameraDepth.y;return{x:d===0?0:d,y:h===0?0:h}},pr=(e,t,r)=>{if(!r||!t.enabled||t.amount<=0||t.mouseInfluence<=0)return 1;const n=t.amount*t.mouseInfluence,i=Math.abs(r.cameraDepth.x)*.5*n,d=Math.abs(r.cameraDepth.y)*.5*n;return 1+Math.min(.08,Math.max(i,d)*2)},hr=(e,t,r,n)=>{if(!Number.isFinite(r)||r<=0)return{...t};if(!Number.isFinite(n)||n<=0)return{...e};const i=Math.max(1,r*1e3),d=1-Math.exp(-n/i);return{x:e.x+(t.x-e.x)*d,y:e.y+(t.y-e.y)*d}},fr=e=>e.enabled&&e.amount>0&&e.mouseInfluence>0,xr=`
attribute vec2 a_position;
attribute vec2 a_uv;
uniform vec2 u_resolution;
varying vec2 v_uv;
void main() {
    vec2 zeroToOne = a_position / u_resolution;
    vec2 clip = zeroToOne * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    v_uv = a_uv;
}`,gr=`
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_uv;
void main() {
    gl_FragColor = texture2D(u_texture, v_uv);
}`,Pt=(e,t,r)=>{const n=e.createShader(t);return n?(e.shaderSource(n,r),e.compileShader(n),e.getShaderParameter(n,e.COMPILE_STATUS)?n:(e.deleteShader(n),null)):null};class _r{canvas=null;gl=null;program=null;positionBuffer=null;uvBuffer=null;indexBuffer=null;positionLocation=-1;uvLocation=-1;resolutionLocation=null;textureLocation=null;textures=new Map;invalid=!1;resetResources(){this.gl=null,this.program=null,this.positionBuffer=null,this.uvBuffer=null,this.indexBuffer=null,this.positionLocation=-1,this.uvLocation=-1,this.resolutionLocation=null,this.textureLocation=null,this.textures.clear()}initialize(){if(typeof document>"u")return!1;const t=document.createElement("canvas");t.width=1,t.height=1;const r=t.getContext("webgl",{alpha:!0,antialias:!0,premultipliedAlpha:!0,preserveDrawingBuffer:!0});if(!r)return!1;const n=Pt(r,r.VERTEX_SHADER,xr),i=Pt(r,r.FRAGMENT_SHADER,gr);if(!n||!i)return!1;const d=r.createProgram();if(!d)return!1;if(r.attachShader(d,n),r.attachShader(d,i),r.linkProgram(d),r.deleteShader(n),r.deleteShader(i),!r.getProgramParameter(d,r.LINK_STATUS))return r.deleteProgram(d),!1;const h=r.createBuffer(),p=r.createBuffer(),a=r.createBuffer();return!h||!p||!a?(r.deleteProgram(d),!1):(this.canvas=t,this.gl=r,this.program=d,this.positionBuffer=h,this.uvBuffer=p,this.indexBuffer=a,this.positionLocation=r.getAttribLocation(d,"a_position"),this.uvLocation=r.getAttribLocation(d,"a_uv"),this.resolutionLocation=r.getUniformLocation(d,"u_resolution"),this.textureLocation=r.getUniformLocation(d,"u_texture"),this.invalid=!1,t.addEventListener("webglcontextlost",f=>{f.preventDefault(),this.invalid=!0}),r.clearColor(0,0,0,0),r.enable(r.BLEND),r.blendFunc(r.ONE,r.ONE_MINUS_SRC_ALPHA),!0)}ensureReady(t,r){if((!this.gl||!this.canvas||!this.program||this.invalid||this.gl.isContextLost())&&(this.resetResources(),this.canvas=null,!this.initialize()))return!1;const n=this.canvas;if(!n)return!1;const i=Math.max(n.width,Math.max(1,Math.ceil(t))),d=Math.max(n.height,Math.max(1,Math.ceil(r)));return n.width!==i&&(n.width=i),n.height!==d&&(n.height=d),!0}resolveTexture(t,r,n){const i=this.gl;if(!i)return null;let d=this.textures.get(t);if(!d){const h=i.createTexture();if(!h)return null;d={texture:h,revision:Number.NaN},this.textures.set(t,d)}return i.activeTexture(i.TEXTURE0),i.bindTexture(i.TEXTURE_2D,d.texture),d.revision!==n&&(i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,1),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,i.RGBA,i.UNSIGNED_BYTE,r),d.revision=n),d.texture}render(t){const r=Math.max(1,Math.ceil(t.width)),n=Math.max(1,Math.ceil(t.height));if(!this.ensureReady(r,n))return!1;const i=this.gl,d=this.canvas,h=this.program,p=this.positionBuffer,a=this.uvBuffer,f=this.indexBuffer;if(!i||!d||!h||!p||!a||!f||!this.resolveTexture(t.textureKey,t.textureSource,t.textureRevision))return!1;i.useProgram(h),i.uniform2f(this.resolutionLocation,r,n),i.uniform1i(this.textureLocation,0),i.bindBuffer(i.ARRAY_BUFFER,p),i.bufferData(i.ARRAY_BUFFER,t.positions,i.DYNAMIC_DRAW),i.enableVertexAttribArray(this.positionLocation),i.vertexAttribPointer(this.positionLocation,2,i.FLOAT,!1,0,0),i.bindBuffer(i.ARRAY_BUFFER,a),i.bufferData(i.ARRAY_BUFFER,t.uvs,i.STATIC_DRAW),i.enableVertexAttribArray(this.uvLocation),i.vertexAttribPointer(this.uvLocation,2,i.FLOAT,!1,0,0),i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,f),i.bufferData(i.ELEMENT_ARRAY_BUFFER,t.indices,i.STATIC_DRAW),i.viewport(0,d.height-n,r,n),i.clear(i.COLOR_BUFFER_BIT),i.drawElements(i.TRIANGLES,t.indices.length,i.UNSIGNED_SHORT,0),i.flush();const l=t.target.getContext("2d");return l?(l.clearRect(0,0,r,n),l.drawImage(d,0,0,r,n,0,0,r,n),!0):!1}releaseTexture(t){const r=this.textures.get(t);if(!r)return;const n=this.gl;n&&!n.isContextLost()&&n.deleteTexture(r.texture),this.textures.delete(t)}}let gt=null;const br=()=>(gt??=new _r,gt),Er=e=>br().render(e),Tr=e=>{gt?.releaseTexture(e)},yr=`
attribute vec2 a_position;
attribute vec2 a_uv;
uniform vec2 u_resolution;
varying vec2 v_uv;
void main() {
    vec2 zeroToOne = a_position / u_resolution;
    vec2 clip = zeroToOne * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    v_uv = a_uv;
}`,Rr=`
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_uv;
void main() {
    gl_FragColor = texture2D(u_texture, v_uv);
}`,Dt=(e,t,r)=>{const n=e.createShader(t);return n?(e.shaderSource(n,r),e.compileShader(n),e.getShaderParameter(n,e.COMPILE_STATUS)?n:(e.deleteShader(n),null)):null},bt=M.forwardRef(({src:e,mesh:t,modelSrc:r=null,animationLayers:n=[],animationMode:i,timeOriginMs:d=0,className:h,style:p,dataSource:a},f)=>{const _=M.useRef(null),l=M.useRef(null),b=M.useMemo(()=>i!=="orthographic3d"?t.bounds:Qt(t)??t.bounds,[i,t]),T=Math.max(1,Math.ceil(b.maxX-b.minX)),E=Math.max(1,Math.ceil(b.maxY-b.minY));M.useImperativeHandle(f,()=>({updateTexture:A=>l.current?.(A)}),[]);const R=M.useMemo(()=>n.map(A=>[A.animationId,A.additive?1:0,A.blend,A.blendIn?1:0,A.blendOut?1:0,A.rate,A.visible?1:0].join(":")).join("|"),[n]);return M.useEffect(()=>{const A=_.current;if(!A)return;const x=T,S=E;if(A.width=x,A.height=S,i==="orthographic3d"){const G=A.getContext("2d");if(!G)return;const v=new Float32Array(t.positions.length);(O=>{for(let pe=0;pe<v.length;pe+=2)v[pe]=O[pe]-b.minX,v[pe+1]=b.maxY-O[pe+1]})(t.positions);const oe=new Float32Array(t.uvs),V=new Uint16Array(t.indices),re={};let K=!1,j=0,de=null,Q=0;const me=()=>{K||!de||Er({target:A,textureKey:re,textureSource:de,textureRevision:Q,width:x,height:S,positions:v,uvs:oe,indices:V})},_e=O=>{K||(de=O,Q+=1,me())};l.current=_e;const J=new Image;return J.decoding="async",J.onload=()=>_e(J),J.src=e,r&&n.some(O=>O.visible)&&fetch(r).then(O=>{if(!O.ok)throw new Error(`HTTP ${O.status}`);return O.arrayBuffer()}).then(O=>{if(K)return;const pe=xt(new Uint8Array(O));if(!pe||pe.positions.length!==t.positions.length)return;const Ve=Jt(pe,n);if(!Ve||!pe.positions3d)return;const et=new Float32Array(pe.positions3d.length),tt=Ke=>{if(j=0,!K){if(!document.hidden){const it=Math.max(0,Ke-d),Ge=eo(Ve,it,et);if(Ge){for(let ye=0;ye<v.length/2;ye+=1)v[ye*2]=Ge[ye*3]-b.minX,v[ye*2+1]=b.maxY-Ge[ye*3+1];me()}}j=window.requestAnimationFrame(tt)}};j=window.requestAnimationFrame(tt)}).catch(O=>{}),()=>{K=!0,l.current=null,J.onload=null,j&&window.cancelAnimationFrame(j),Tr(re),G.clearRect(0,0,x,S)}}const m=A.getContext("webgl",{alpha:!0,antialias:!0,premultipliedAlpha:!0});if(!m)return;const s=Dt(m,m.VERTEX_SHADER,yr),o=Dt(m,m.FRAGMENT_SHADER,Rr);if(!s||!o)return;const F=m.createProgram();if(!F)return;if(m.attachShader(F,s),m.attachShader(F,o),m.linkProgram(F),m.deleteShader(s),m.deleteShader(o),!m.getProgramParameter(F,m.LINK_STATUS)){m.deleteProgram(F);return}const ie=m.createBuffer(),H=m.createBuffer(),W=m.createBuffer(),U=m.createTexture();if(!ie||!H||!W||!U){m.deleteProgram(F);return}const ae=new Float32Array(t.positions.length),k=G=>{for(let v=0;v<ae.length;v+=2)ae[v]=G[v]-b.minX,ae[v+1]=b.maxY-G[v+1]};k(t.positions);const De=new Float32Array(t.uvs),I=new Uint16Array(t.indices);m.bindBuffer(m.ARRAY_BUFFER,ie),m.bufferData(m.ARRAY_BUFFER,ae,m.DYNAMIC_DRAW),m.bindBuffer(m.ARRAY_BUFFER,H),m.bufferData(m.ARRAY_BUFFER,De,m.STATIC_DRAW),m.bindBuffer(m.ELEMENT_ARRAY_BUFFER,W),m.bufferData(m.ELEMENT_ARRAY_BUFFER,I,m.STATIC_DRAW),m.useProgram(F);const Y=m.getAttribLocation(F,"a_position"),P=m.getAttribLocation(F,"a_uv"),Ue=m.getUniformLocation(F,"u_resolution"),He=m.getUniformLocation(F,"u_texture");m.uniform2f(Ue,x,S),m.uniform1i(He,0),m.bindBuffer(m.ARRAY_BUFFER,ie),m.enableVertexAttribArray(Y),m.vertexAttribPointer(Y,2,m.FLOAT,!1,0,0),m.bindBuffer(m.ARRAY_BUFFER,H),m.enableVertexAttribArray(P),m.vertexAttribPointer(P,2,m.FLOAT,!1,0,0),m.bindBuffer(m.ELEMENT_ARRAY_BUFFER,W),m.viewport(0,0,x,S),m.clearColor(0,0,0,0),m.enable(m.BLEND),m.blendFunc(m.ONE,m.ONE_MINUS_SRC_ALPHA);let N=!1,B=0,ce=!1;const ue=()=>{N||!ce||(m.clear(m.COLOR_BUFFER_BIT),m.drawElements(m.TRIANGLES,I.length,m.UNSIGNED_SHORT,0))},ne=G=>{N||(m.activeTexture(m.TEXTURE0),m.bindTexture(m.TEXTURE_2D,U),m.pixelStorei(m.UNPACK_PREMULTIPLY_ALPHA_WEBGL,1),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_WRAP_S,m.CLAMP_TO_EDGE),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_WRAP_T,m.CLAMP_TO_EDGE),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_MIN_FILTER,m.LINEAR),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_MAG_FILTER,m.LINEAR),m.texImage2D(m.TEXTURE_2D,0,m.RGBA,m.RGBA,m.UNSIGNED_BYTE,G),ce=!0,ue())};l.current=ne;const $=new Image;return $.decoding="async",$.onload=()=>ne($),$.src=e,r&&n.some(G=>G.visible)&&fetch(r).then(G=>{if(!G.ok)throw new Error(`HTTP ${G.status}`);return G.arrayBuffer()}).then(G=>{if(N)return;const v=xt(new Uint8Array(G));if(!v||v.positions.length!==t.positions.length)return;const q=Xt(v,n);if(!q)return;const oe=new Float32Array(v.positions.length),V=re=>{if(B=0,!N){if(!document.hidden){const K=Math.max(0,re-d);if(q&&oe){const j=to(q,K,oe);j&&(k(j),m.bindBuffer(m.ARRAY_BUFFER,ie),m.bufferSubData(m.ARRAY_BUFFER,0,ae),ue())}}B=window.requestAnimationFrame(V)}};B=window.requestAnimationFrame(V)}).catch(G=>{}),()=>{N=!0,l.current=null,$.onload=null,B&&window.cancelAnimationFrame(B),m.deleteTexture(U),m.deleteBuffer(ie),m.deleteBuffer(H),m.deleteBuffer(W),m.deleteProgram(F)}},[n,i,R,t,r,b,E,T,e,d]),C.jsx("canvas",{ref:_,className:h,"data-we-source":a,style:i==="orthographic3d"?{...p,width:`${T}px`,height:`${E}px`}:p},i==="orthographic3d"?"shared-orthographic3d":"local-webgl")});bt.displayName="WePuppetMeshLayer";const ht=e=>`matrix(${e.a}, ${e.b}, ${e.c}, ${e.d}, ${e.tx}, ${e.ty})`,ft=new Map,Sr=e=>{const t=ft.get(e);if(t)return t;const r=fetch(e).then(n=>{if(!n.ok)throw new Error(`HTTP ${n.status}`);return n.arrayBuffer()}).then(n=>xt(new Uint8Array(n))).catch(n=>{throw ft.delete(e),n});return ft.set(e,r),r},kr=({binding:e,modelSrc:t,timeOriginMs:r,parallaxOffset:n,zIndex:i,children:d})=>{const h=M.useRef(null);return M.useEffect(()=>{const p=h.current;if(!p||(p.style.transform=ht(e.bindTransform),!t||e.parentAnimationMode!=="2d"))return;let a=!1,f=0;const _=()=>{f&&window.cancelAnimationFrame(f),f=0};return Sr(t).then(l=>{if(a||!l)return;const b=l.attachments.find(R=>R.name===e.name&&R.boneIndex===e.boneIndex);if(!b)return;const T=Xt(l,e.parentAnimationLayers);if(!T)return;const E=R=>{if(f=0,!a){if(!document.hidden){const A=oo(T,b,Math.max(0,R-r));A&&(p.style.transform=ht(ro(A)))}f=window.requestAnimationFrame(E)}};f=window.requestAnimationFrame(E)}).catch(l=>{}),()=>{a=!0,_()}},[e,t,r]),C.jsx("div",{style:{position:"absolute",left:`${e.parentOrigin.x+n.x}px`,top:`${e.parentOrigin.y+n.y}px`,zIndex:i,transformOrigin:"0 0",transform:`rotate(${e.parentRotationDeg}deg) scale(${e.parentScale.x}, ${e.parentScale.y})`,pointerEvents:"none"},children:C.jsx("div",{ref:h,style:{position:"absolute",left:0,top:0,transformOrigin:"0 0",transform:ht(e.bindTransform)},children:d})})},wr=`
attribute vec2 a_Position;
varying vec2 v_TexCoord;
void main() {
    gl_Position = vec4(a_Position, 0.0, 1.0);
    v_TexCoord = a_Position * 0.5 + 0.5;
}
`,Ar=`
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
`,Mr=`
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
`,Pr=`
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
`,Dr=`
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
`,Ur=`
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
`,vr=`
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
`,Lr=`
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
`,Cr=`
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
`,Fr=`
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
`,Ir=`
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
`,Nr=`
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
`,Br=`
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
`,Wr=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Rays;
uniform sampler2D u_Original;
uniform int u_BlendMode;

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
`,Or=`
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
`,Xr=`
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
`,Hr=`
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
`,Gr=`
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
`,zr=`
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
`,$r=2048,Ut=e=>new Promise((t,r)=>{const n=new Image;n.onload=()=>t(n),n.onerror=()=>r(new Error(`Failed to load Wallpaper Engine effect texture: ${e}`)),n.src=e}),vt=(e,t,r)=>{const n=e.createShader(t);if(!n)throw new Error("Unable to allocate WebGL shader.");if(e.shaderSource(n,r),e.compileShader(n),!e.getShaderParameter(n,e.COMPILE_STATUS)){const i=e.getShaderInfoLog(n)||"Unknown shader compile error.";throw e.deleteShader(n),new Error(i)}return n},se=(e,t)=>{const r=vt(e,e.VERTEX_SHADER,wr),n=vt(e,e.FRAGMENT_SHADER,t),i=e.createProgram();if(!i)throw new Error("Unable to allocate WebGL program.");if(e.attachShader(i,r),e.attachShader(i,n),e.linkProgram(i),e.deleteShader(r),e.deleteShader(n),!e.getProgramParameter(i,e.LINK_STATUS)){const d=e.getProgramInfoLog(i)||"Unknown program link error.";throw e.deleteProgram(i),new Error(d)}return i},We=(e,t,r)=>{const n=document.createElement("canvas");n.width=t,n.height=r;const i=n.getContext("2d");if(!i)throw new Error("2D canvas is unavailable for Wallpaper Engine texture scaling.");return i.drawImage(e,0,0,t,r),n},Lt=e=>{const t=e.naturalWidth||e.width,r=e.naturalHeight||e.height;if(t<=0||r<=0)return!1;const n=Math.min(128,t),i=Math.min(128,r),d=document.createElement("canvas");d.width=n,d.height=i;const h=d.getContext("2d");if(!h)return!1;try{h.imageSmoothingEnabled=!1,h.drawImage(e,0,0,n,i);const p=h.getImageData(0,0,n,i).data,a=n*i;let f=0,_=0;for(let l=0;l<p.length;l+=4){const b=p[l],T=p[l+1],E=p[l+2],R=p[l+3];Math.abs(b-T)<=1&&Math.abs(b-E)<=1&&Math.abs(T-E)<=1&&(f+=1),Math.abs(R-b)>1&&(_+=1)}return f/a>=.999&&_>=Math.max(1,Math.ceil(a*1e-4))}catch{return!1}},jr=()=>{const e=document.createElement("canvas");e.width=1,e.height=1;const t=e.getContext("2d");if(!t)throw new Error("2D canvas is unavailable for Wallpaper Engine neutral flow map.");const r=t.createImageData(1,1);return r.data.set([127,127,0,255]),t.putImageData(r,0,0),e},Yr=()=>{const t=document.createElement("canvas");t.width=256,t.height=256;const r=t.getContext("2d");if(!r)throw new Error("2D canvas is unavailable for Wallpaper Engine built-in noise.");const n=r.createImageData(256,256);let i=1831565813;for(let d=0;d<n.data.length;d+=4){i=Math.imul(i,1664525)+1013904223>>>0;const h=i>>>24;i=Math.imul(i,1664525)+1013904223>>>0;const p=i>>>24;i=Math.imul(i,1664525)+1013904223>>>0;const a=i>>>24;n.data[d]=h,n.data[d+1]=p,n.data[d+2]=a,n.data[d+3]=255}return r.putImageData(n,0,0),t},Vr=()=>{const t=document.createElement("canvas");t.width=256,t.height=256;const r=t.getContext("2d");if(!r)throw new Error("2D canvas is unavailable for Wallpaper Engine built-in cloud noise.");const n=r.createImageData(256,256),i=(p,a,f)=>{let _=Math.imul(p+f*17,374761393)+Math.imul(a+f*31,668265263)>>>0;return _=Math.imul(_^_>>>13,1274126177)>>>0,((_^_>>>16)>>>0)/4294967295},d=p=>p*p*(3-2*p),h=(p,a,f,_)=>{const l=p/256*f,b=a/256*f,T=Math.floor(l),E=Math.floor(b),R=d(l-T),A=d(b-E),x=H=>(H%f+f)%f,S=i(x(T),x(E),_),m=i(x(T+1),x(E),_),s=i(x(T),x(E+1),_),o=i(x(T+1),x(E+1),_),F=S+(m-S)*R,ie=s+(o-s)*R;return F+(ie-F)*A};for(let p=0;p<256;p+=1)for(let a=0;a<256;a+=1){let f=0,_=1,l=0;for(let E=0;E<4;E+=1)f+=h(a,p,4<<E,91+E*37)*_,l+=_,_*=.5;const b=Math.round(Math.max(0,Math.min(1,f/l))*255),T=(p*256+a)*4;n.data[T]=b,n.data[T+1]=b,n.data[T+2]=b,n.data[T+3]=255}return r.putImageData(n,0,0),t},Ct=e=>e>0&&(e&e-1)===0,le=(e,t,r=!1,n=!1)=>{const i=e.createTexture();if(!i)throw new Error("Unable to allocate WebGL texture.");e.bindTexture(e.TEXTURE_2D,i),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,r?1:0),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR);const d="width"in t?Number(t.width):0,h="height"in t?Number(t.height):0,p=n&&Ct(d)&&Ct(h);return e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,p?e.REPEAT:e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,p?e.REPEAT:e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t),i},Kr=(e,t,r,n=!1)=>{e.bindTexture(e.TEXTURE_2D,t),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,n?1:0),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,r)},rt=(e,t,r)=>{const n=e.createTexture(),i=e.createFramebuffer();if(!n||!i)throw new Error("Unable to allocate Wallpaper Engine render target.");if(e.bindTexture(e.TEXTURE_2D,n),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,t,r,0,e.RGBA,e.UNSIGNED_BYTE,null),e.bindFramebuffer(e.FRAMEBUFFER,i),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,n,0),e.checkFramebufferStatus(e.FRAMEBUFFER)!==e.FRAMEBUFFER_COMPLETE)throw new Error("Wallpaper Engine image-effect framebuffer is incomplete.");return{texture:n,framebuffer:i}},qr=e=>e.map(t=>t.kind==="opacity"?["opacity",t.maskPath??"",t.alpha].join(":"):t.kind==="scroll"?["scroll",t.speedX,t.speedY,t.repeat.x,t.repeat.y].join(":"):t.kind==="transform"?["transform",t.offset.x,t.offset.y,t.scale.x,t.scale.y,t.angle,t.repeat?1:0].join(":"):t.kind==="spin"?["spin",t.center.x,t.center.y,t.speed,t.ratio,t.axis,t.phase,t.size,t.feather,t.repeat?1:0,t.elliptical?1:0,t.aspectCorrect?1:0,t.softMask?1:0].join(":"):t.kind==="perspective"?["perspective",...t.points.flatMap(r=>[r.x,r.y]),t.repeat?1:0].join(":"):t.kind==="foliageSway"?["foliageSway",t.maskPath??"",t.noisePath??"",t.speed,t.strength,t.phase,t.power,t.noiseScale,t.ratio,t.direction].join(":"):t.kind==="waterFlow"?["waterFlow",t.flowMapPath??"",t.phasePath,t.speed,t.strength,t.phaseScale,t.phaseMode,t.feather??""].join(":"):t.kind==="shake"?["shake",t.directionMapPath??"",t.speed,t.strength,t.friction.x,t.friction.y,t.bounds.x,t.bounds.y,t.directionMode].join(":"):t.kind==="blurPrecise"?["blurPrecise",t.maskPath??"",t.scale.x,t.scale.y,t.horizontalKernel,t.verticalKernel,t.blurAlpha?1:0].join(":"):t.kind==="shimmer"?["shimmer",t.brightness,t.color.r,t.color.g,t.color.b,t.delay,t.direction,t.granularity,t.offset,t.speed].join(":"):t.kind==="shine"?["shine",t.maskPath??"",t.noisePath??"",t.threshold,t.noiseAmount,t.noiseScale,t.noiseSpeed,t.rayColor.r,t.rayColor.g,t.rayColor.b,t.rayDirection,t.raySpeed,t.rayIntensity,t.rayLength,t.edges,t.sampleMode,t.blurScale.x,t.blurScale.y,t.kernel,t.blendMode,t.copyBackground?1:0,t.noiseEnabled?1:0].join(":"):t.kind==="godRays"?["godRays",t.maskPath??"",t.threshold,t.caster.mode,...t.caster.mode==="radial"?[t.caster.center.x,t.caster.center.y]:[t.caster.direction],t.rayLength,t.rayIntensity,t.colorStart.r,t.colorStart.g,t.colorStart.b,t.colorEnd.r,t.colorEnd.g,t.colorEnd.b,t.sampleMode,t.blurScale.x,t.blurScale.y,t.kernel,t.blendMode].join(":"):t.kind==="waterRipple"?["waterRipple",t.maskPath??"",t.normalPath,t.animationSpeed,t.scale,t.scrollSpeed,t.direction,t.ratio,t.strength].join(":"):["waterWaves",t.maskPath??"",t.timeOffsetPath??"",t.direction,t.speed,t.scale,t.exponent,t.strength].join(":")).join("|"),Et=({src:e,effects:t,className:r,style:n,dataSource:i,dataTiming:d,timeOriginMs:h,onFrame:p})=>{const a=M.useRef(null),f=M.useRef(e),_=M.useRef(null),l=M.useRef(p),[b,T]=M.useState(!1),E=qr(t);return M.useEffect(()=>{l.current=p},[p]),M.useEffect(()=>{f.current=e,_.current?.(e)},[e]),M.useEffect(()=>{const R=a.current;if(!R||t.length===0)return;let A=!1,x=0;const S=[],m=[],s=[];let o=null,F=null,ie=!1,H=0,W=!1;const U=t.some(I=>I.kind==="shine"),ae=t.some(I=>I.kind==="godRays");T(!1);const k=I=>{A||W||(W=!0,x&&(window.cancelAnimationFrame(x),x=0),_.current=null,T(!1))};return(async()=>{const I=f.current,Y=new Set([I]);t.forEach(c=>{c.kind==="opacity"?c.maskUrl&&Y.add(c.maskUrl):c.kind==="waterWaves"?(c.maskUrl&&Y.add(c.maskUrl),c.timeOffsetUrl&&Y.add(c.timeOffsetUrl)):c.kind==="foliageSway"?(c.maskUrl&&Y.add(c.maskUrl),c.noiseUrl&&Y.add(c.noiseUrl)):c.kind==="waterFlow"?(c.flowMapUrl&&Y.add(c.flowMapUrl),c.phaseUrl&&Y.add(c.phaseUrl)):c.kind==="shake"?c.directionMapUrl&&Y.add(c.directionMapUrl):c.kind==="blurPrecise"?c.maskUrl&&Y.add(c.maskUrl):c.kind==="shine"?(c.maskUrl&&Y.add(c.maskUrl),c.noiseUrl&&Y.add(c.noiseUrl)):c.kind==="godRays"?c.maskUrl&&Y.add(c.maskUrl):c.kind==="waterRipple"&&(c.maskUrl&&Y.add(c.maskUrl),c.normalUrl&&Y.add(c.normalUrl))});const P=new Map;if(await Promise.all([...Y].map(async c=>{P.set(c,await Ut(c))})),A)return;const Ue=P.get(I);if(!Ue)throw new Error("Wallpaper Engine image-effect source image is unavailable.");const He=Math.min(1,$r/Math.max(Ue.naturalWidth,Ue.naturalHeight)),N=Math.max(1,Math.round(Ue.naturalWidth*He)),B=Math.max(1,Math.round(Ue.naturalHeight*He));if(R.width=N,R.height=B,o=R.getContext("webgl",{alpha:!0,premultipliedAlpha:!0}),!o)throw new Error("WebGL is unavailable for Wallpaper Engine image-effect rendering.");if(o.viewport(0,0,N,B),F=o.createBuffer(),!F)throw new Error("Unable to allocate Wallpaper Engine image-effect vertex buffer.");o.bindBuffer(o.ARRAY_BUFFER,F),o.bufferData(o.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),o.STATIC_DRAW);const ce=t.some(c=>c.kind==="opacity")?se(o,Ar):null,ue=t.some(c=>c.kind==="scroll")?se(o,Mr):null,ne=t.some(c=>c.kind==="transform")?se(o,Pr):null,$=t.some(c=>c.kind==="spin")?se(o,Dr):null,G=t.some(c=>c.kind==="perspective")?se(o,Ur):null,v=t.some(c=>c.kind==="foliageSway")?se(o,vr):null,q=t.some(c=>c.kind==="waterFlow")?se(o,Lr):null,oe=t.some(c=>c.kind==="shake")?se(o,Cr):null,V=t.some(c=>c.kind==="blurPrecise"||c.kind==="shine")?se(o,Fr):null,re=t.some(c=>c.kind==="shimmer")?se(o,Ir):null,K=t.some(c=>c.kind==="shine")?se(o,Nr):null,j=t.some(c=>c.kind==="shine")?se(o,Br):null,de=ae?se(o,Or):null,Q=ae?se(o,Xr):null,me=ae?se(o,Hr):null,_e=U||ae?se(o,Wr):null,J=t.some(c=>c.kind==="waterRipple")?se(o,Gr):null,O=t.some(c=>c.kind==="waterWaves")?se(o,zr):null;ce&&s.push(ce),ue&&s.push(ue),ne&&s.push(ne),$&&s.push($),G&&s.push(G),v&&s.push(v),q&&s.push(q),oe&&s.push(oe),V&&s.push(V),re&&s.push(re),K&&s.push(K),j&&s.push(j),de&&s.push(de),Q&&s.push(Q),me&&s.push(me),_e&&s.push(_e),J&&s.push(J),O&&s.push(O);const pe=We(Ue,N,B),Ve=pe.getContext("2d");if(!Ve)throw new Error("2D canvas is unavailable for Wallpaper Engine source-frame updates.");const et=le(o,pe,!0);S.push(et);const tt=t.some(c=>c.kind==="foliageSway"&&!c.noiseUrl)?Yr():null,Ke=tt?le(o,tt,!1,!0):null;Ke&&S.push(Ke);const it=t.some(c=>c.kind==="shine"&&c.noiseEnabled&&!c.noiseUrl)?Vr():null,Ge=it?le(o,it,!1,!0):null;Ge&&S.push(Ge);const ye=t.some(c=>c.kind==="waterFlow"&&!c.flowMapUrl||c.kind==="shake"&&!c.directionMapUrl)?le(o,jr()):null;ye&&S.push(ye);const Fe=t.map(c=>{if(c.kind==="opacity"){const w=c.maskUrl?P.get(c.maskUrl):null,D=w?le(o,We(w,N,B)):null;return D&&S.push(D),{kind:"opacity",maskTexture:D}}if(c.kind==="waterWaves"){const w=c.maskUrl?P.get(c.maskUrl):null,D=c.timeOffsetUrl?P.get(c.timeOffsetUrl):null,Z=w?le(o,We(w,N,B)):null,u=D?le(o,We(D,N,B)):null;return Z&&S.push(Z),u&&S.push(u),{kind:"waterWaves",maskTexture:Z,timeOffsetTexture:u}}if(c.kind==="foliageSway"){const w=c.maskUrl?P.get(c.maskUrl):null,D=c.noiseUrl?P.get(c.noiseUrl):null,Z=w?le(o,We(w,N,B)):null,u=D?le(o,D,!1,!0):Ke;return Z&&S.push(Z),u&&u!==Ke&&S.push(u),{kind:"foliageSway",maskTexture:Z,noiseTexture:u}}if(c.kind==="waterFlow"){const w=c.flowMapUrl?P.get(c.flowMapUrl):null;if(!c.phaseUrl)throw new Error("Wallpaper Engine water-flow phase URL is unavailable.");const D=P.get(c.phaseUrl);if(!D)throw new Error("Wallpaper Engine water-flow phase texture is unavailable.");const Z=w?Lt(w):!1,u=w?le(o,w):ye,ge=le(o,D,!1,!0);return u&&u!==ye&&S.push(u),S.push(ge),{kind:"waterFlow",flowMapTexture:u,phaseTexture:ge,flowMapPackedRg88:Z}}if(c.kind==="shake"){const w=c.directionMapUrl?P.get(c.directionMapUrl):null,D=w?Lt(w):!1,Z=w?le(o,w):ye;if(!Z)throw new Error("Wallpaper Engine shake direction map is unavailable.");return Z!==ye&&S.push(Z),{kind:"shake",directionMapTexture:Z,directionMapPackedRg88:D}}if(c.kind==="blurPrecise"){const w=c.maskUrl?P.get(c.maskUrl):null,D=w?le(o,We(w,N,B)):null;return D&&S.push(D),{kind:"blurPrecise",maskTexture:D}}if(c.kind==="shine"){const w=c.maskUrl?P.get(c.maskUrl):null,D=c.noiseUrl?P.get(c.noiseUrl):null,Z=w?le(o,We(w,N,B)):null,u=D?le(o,D,!1,!0):Ge;return Z&&S.push(Z),u&&u!==Ge&&S.push(u),{kind:"shine",maskTexture:Z,noiseTexture:u}}if(c.kind==="godRays"){const w=c.maskUrl?P.get(c.maskUrl):null,D=w?le(o,We(w,N,B)):null;return D&&S.push(D),{kind:"godRays",maskTexture:D}}if(c.kind==="waterRipple"){const w=c.maskUrl?P.get(c.maskUrl):null;if(!c.normalUrl)throw new Error("Wallpaper Engine water-ripple normal URL is unavailable.");const D=P.get(c.normalUrl);if(!D)throw new Error("Wallpaper Engine water-ripple normal texture is unavailable.");const Z=w?le(o,We(w,N,B)):null,u=le(o,D,!1,!0);return Z&&S.push(Z),S.push(u),{kind:"waterRipple",maskTexture:Z,normalTexture:u}}return null}),Yt=t.map(c=>{if(c.kind!=="perspective")return null;const w=Oo(c.points);if(!w)throw new Error("Wallpaper Engine perspective quad is degenerate.");return w}),Tt=t.length>1?[rt(o,N,B),rt(o,N,B)]:[];Tt.forEach(c=>{S.push(c.texture),m.push(c.framebuffer)});const qe=t.some(c=>c.kind==="blurPrecise")?rt(o,N,B):null;qe&&(S.push(qe.texture),m.push(qe.framebuffer));const Re=Math.max(1,Math.round(N/2)),Se=Math.max(1,Math.round(B/2)),Ze=t.some(c=>c.kind==="shine"||c.kind==="godRays")?[rt(o,Re,Se),rt(o,Re,Se)]:null;Ze&&Ze.forEach(c=>{S.push(c.texture),m.push(c.framebuffer)});const Qe=ce?{position:o.getAttribLocation(ce,"a_Position"),source:o.getUniformLocation(ce,"u_Source"),mask:o.getUniformLocation(ce,"u_Mask"),hasMask:o.getUniformLocation(ce,"u_HasMask"),alpha:o.getUniformLocation(ce,"u_Alpha")}:null,je=ue?{position:o.getAttribLocation(ue,"a_Position"),source:o.getUniformLocation(ue,"u_Source"),time:o.getUniformLocation(ue,"u_Time"),speedX:o.getUniformLocation(ue,"u_SpeedX"),speedY:o.getUniformLocation(ue,"u_SpeedY"),repeat:o.getUniformLocation(ue,"u_Repeat")}:null,Ye=ne?{position:o.getAttribLocation(ne,"a_Position"),source:o.getUniformLocation(ne,"u_Source"),offset:o.getUniformLocation(ne,"u_Offset"),scale:o.getUniformLocation(ne,"u_Scale"),angle:o.getUniformLocation(ne,"u_Angle"),repeat:o.getUniformLocation(ne,"u_Repeat")}:null,fe=$?{position:o.getAttribLocation($,"a_Position"),source:o.getUniformLocation($,"u_Source"),time:o.getUniformLocation($,"u_Time"),center:o.getUniformLocation($,"u_Center"),speed:o.getUniformLocation($,"u_Speed"),ratio:o.getUniformLocation($,"u_Ratio"),axis:o.getUniformLocation($,"u_Axis"),phase:o.getUniformLocation($,"u_Phase"),size:o.getUniformLocation($,"u_Size"),feather:o.getUniformLocation($,"u_Feather"),aspect:o.getUniformLocation($,"u_Aspect"),repeat:o.getUniformLocation($,"u_Repeat"),elliptical:o.getUniformLocation($,"u_Elliptical"),softMask:o.getUniformLocation($,"u_SoftMask")}:null,ot=G?{position:o.getAttribLocation(G,"a_Position"),source:o.getUniformLocation(G,"u_Source"),matrix:o.getUniformLocation(G,"u_QuadToSquare"),repeat:o.getUniformLocation(G,"u_Repeat")}:null,xe=v?{position:o.getAttribLocation(v,"a_Position"),source:o.getUniformLocation(v,"u_Source"),mask:o.getUniformLocation(v,"u_Mask"),noise:o.getUniformLocation(v,"u_Noise"),hasMask:o.getUniformLocation(v,"u_HasMask"),time:o.getUniformLocation(v,"u_Time"),speed:o.getUniformLocation(v,"u_Speed"),strength:o.getUniformLocation(v,"u_Strength"),phase:o.getUniformLocation(v,"u_Phase"),power:o.getUniformLocation(v,"u_Power"),noiseScale:o.getUniformLocation(v,"u_NoiseScale"),ratio:o.getUniformLocation(v,"u_Ratio"),direction:o.getUniformLocation(v,"u_Direction"),aspect:o.getUniformLocation(v,"u_Aspect")}:null,ke=q?{position:o.getAttribLocation(q,"a_Position"),source:o.getUniformLocation(q,"u_Source"),flowMap:o.getUniformLocation(q,"u_FlowMap"),phase:o.getUniformLocation(q,"u_Phase"),flowMapPackedRg88:o.getUniformLocation(q,"u_FlowMapPackedRg88"),time:o.getUniformLocation(q,"u_Time"),speed:o.getUniformLocation(q,"u_Speed"),strength:o.getUniformLocation(q,"u_Strength"),phaseScale:o.getUniformLocation(q,"u_PhaseScale"),legacy:o.getUniformLocation(q,"u_Legacy"),hasFeather:o.getUniformLocation(q,"u_HasFeather"),feather:o.getUniformLocation(q,"u_Feather")}:null,ve=oe?{position:o.getAttribLocation(oe,"a_Position"),source:o.getUniformLocation(oe,"u_Source"),directionMap:o.getUniformLocation(oe,"u_DirectionMap"),directionMapPackedRg88:o.getUniformLocation(oe,"u_DirectionMapPackedRg88"),time:o.getUniformLocation(oe,"u_Time"),speed:o.getUniformLocation(oe,"u_Speed"),strength:o.getUniformLocation(oe,"u_Strength"),friction:o.getUniformLocation(oe,"u_Friction"),bounds:o.getUniformLocation(oe,"u_Bounds"),directionMode:o.getUniformLocation(oe,"u_DirectionMode")}:null,z=V?{position:o.getAttribLocation(V,"a_Position"),source:o.getUniformLocation(V,"u_Source"),original:o.getUniformLocation(V,"u_Original"),mask:o.getUniformLocation(V,"u_Mask"),direction:o.getUniformLocation(V,"u_Direction"),finalPass:o.getUniformLocation(V,"u_FinalPass"),hasMask:o.getUniformLocation(V,"u_HasMask"),blurAlpha:o.getUniformLocation(V,"u_BlurAlpha")}:null,Le=re?{position:o.getAttribLocation(re,"a_Position"),source:o.getUniformLocation(re,"u_Source"),time:o.getUniformLocation(re,"u_Time"),color:o.getUniformLocation(re,"u_Color"),brightness:o.getUniformLocation(re,"u_Brightness"),direction:o.getUniformLocation(re,"u_Direction"),granularity:o.getUniformLocation(re,"u_Granularity"),offset:o.getUniformLocation(re,"u_Offset"),speed:o.getUniformLocation(re,"u_Speed"),delay:o.getUniformLocation(re,"u_Delay")}:null,Ae=K?{position:o.getAttribLocation(K,"a_Position"),source:o.getUniformLocation(K,"u_Source"),mask:o.getUniformLocation(K,"u_Mask"),noise:o.getUniformLocation(K,"u_Noise"),hasMask:o.getUniformLocation(K,"u_HasMask"),noiseEnabled:o.getUniformLocation(K,"u_NoiseEnabled"),time:o.getUniformLocation(K,"u_Time"),threshold:o.getUniformLocation(K,"u_Threshold"),noiseAmount:o.getUniformLocation(K,"u_NoiseAmount"),noiseScale:o.getUniformLocation(K,"u_NoiseScale"),noiseSpeed:o.getUniformLocation(K,"u_NoiseSpeed")}:null,Me=j?{position:o.getAttribLocation(j,"a_Position"),source:o.getUniformLocation(j,"u_Source"),time:o.getUniformLocation(j,"u_Time"),direction:o.getUniformLocation(j,"u_Direction"),speed:o.getUniformLocation(j,"u_Speed"),rayLength:o.getUniformLocation(j,"u_RayLength"),intensity:o.getUniformLocation(j,"u_Intensity"),color:o.getUniformLocation(j,"u_Color"),aspect:o.getUniformLocation(j,"u_Aspect"),edges:o.getUniformLocation(j,"u_Edges"),sampleMode:o.getUniformLocation(j,"u_SampleMode")}:null,Je=de?{position:o.getAttribLocation(de,"a_Position"),source:o.getUniformLocation(de,"u_Source"),mask:o.getUniformLocation(de,"u_Mask"),hasMask:o.getUniformLocation(de,"u_HasMask"),threshold:o.getUniformLocation(de,"u_Threshold")}:null,be=Q?{position:o.getAttribLocation(Q,"a_Position"),source:o.getUniformLocation(Q,"u_Source"),casterMode:o.getUniformLocation(Q,"u_CasterMode"),center:o.getUniformLocation(Q,"u_Center"),direction:o.getUniformLocation(Q,"u_Direction"),rayLength:o.getUniformLocation(Q,"u_RayLength"),intensity:o.getUniformLocation(Q,"u_Intensity"),colorStart:o.getUniformLocation(Q,"u_ColorStart"),colorEnd:o.getUniformLocation(Q,"u_ColorEnd"),sampleMode:o.getUniformLocation(Q,"u_SampleMode")}:null,Ie=me?{position:o.getAttribLocation(me,"a_Position"),source:o.getUniformLocation(me,"u_Source"),direction:o.getUniformLocation(me,"u_Direction"),kernel:o.getUniformLocation(me,"u_Kernel")}:null,Ce=_e?{position:o.getAttribLocation(_e,"a_Position"),rays:o.getUniformLocation(_e,"u_Rays"),original:o.getUniformLocation(_e,"u_Original"),blendMode:o.getUniformLocation(_e,"u_BlendMode")}:null,Ee=J?{position:o.getAttribLocation(J,"a_Position"),source:o.getUniformLocation(J,"u_Source"),mask:o.getUniformLocation(J,"u_Mask"),normal:o.getUniformLocation(J,"u_Normal"),hasMask:o.getUniformLocation(J,"u_HasMask"),time:o.getUniformLocation(J,"u_Time"),animationSpeed:o.getUniformLocation(J,"u_AnimationSpeed"),scale:o.getUniformLocation(J,"u_Scale"),scrollSpeed:o.getUniformLocation(J,"u_ScrollSpeed"),direction:o.getUniformLocation(J,"u_Direction"),ratio:o.getUniformLocation(J,"u_Ratio"),strength:o.getUniformLocation(J,"u_Strength"),aspect:o.getUniformLocation(J,"u_Aspect")}:null,we=O?{position:o.getAttribLocation(O,"a_Position"),source:o.getUniformLocation(O,"u_Source"),mask:o.getUniformLocation(O,"u_Mask"),timeOffset:o.getUniformLocation(O,"u_TimeOffset"),hasMask:o.getUniformLocation(O,"u_HasMask"),hasTimeOffset:o.getUniformLocation(O,"u_HasTimeOffset"),time:o.getUniformLocation(O,"u_Time"),direction:o.getUniformLocation(O,"u_Direction"),speed:o.getUniformLocation(O,"u_Speed"),scale:o.getUniformLocation(O,"u_Scale"),exponent:o.getUniformLocation(O,"u_Exponent"),strength:o.getUniformLocation(O,"u_Strength")}:null,te=(c,w,D)=>{o.useProgram(c),o.bindBuffer(o.ARRAY_BUFFER,F),o.enableVertexAttribArray(w),o.vertexAttribPointer(w,2,o.FLOAT,!1,0,0),o.uniform1i(D,0)},yt=c=>{if(c===I&&H===0)return;const w=++H;Ut(c).then(D=>{A||w!==H||f.current!==c||!o||(Ve.clearRect(0,0,N,B),Ve.drawImage(D,0,0,N,B),Kr(o,et,pe,!0))}).catch(D=>{})};_.current=yt,f.current!==I&&yt(f.current);const mt=c=>{try{Vt(c)}catch{k()}},Vt=c=>{if(A||W||!o)return;if(document.hidden){x=window.requestAnimationFrame(mt);return}const w=Math.max(0,(c-h)/1e3);let D=et;t.forEach((u,ge)=>{const Pe=ge===t.length-1?null:Tt[ge%2];if(o.bindFramebuffer(o.FRAMEBUFFER,Pe?.framebuffer??null),o.viewport(0,0,N,B),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,D),u.kind==="shine"){const y=Fe[ge];if(!K||!Ae||!j||!Me||!_e||!Ce||!V||!z||!Ze||!y||y.kind!=="shine"||u.kernel!==0||u.blendMode<0||u.blendMode>32||u.copyBackground||u.noiseEnabled&&!y.noiseTexture)throw new Error("Wallpaper Engine shine multipass program is unavailable.");const ze=D,[Ne,Be]=Ze;o.bindFramebuffer(o.FRAMEBUFFER,Ne.framebuffer),o.viewport(0,0,Re,Se),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,ze),te(K,Ae.position,Ae.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,y.maskTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,y.noiseTexture),o.uniform1i(Ae.mask,1),o.uniform1i(Ae.noise,2),o.uniform1i(Ae.hasMask,y.maskTexture?1:0),o.uniform1i(Ae.noiseEnabled,u.noiseEnabled?1:0),o.uniform1f(Ae.time,w),o.uniform1f(Ae.threshold,u.threshold),o.uniform1f(Ae.noiseAmount,u.noiseAmount),o.uniform1f(Ae.noiseScale,u.noiseScale),o.uniform1f(Ae.noiseSpeed,u.noiseSpeed),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,Be.framebuffer),o.viewport(0,0,Re,Se),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,Ne.texture),te(j,Me.position,Me.source),o.uniform1f(Me.time,w),o.uniform1f(Me.direction,u.rayDirection),o.uniform1f(Me.speed,u.raySpeed),o.uniform1f(Me.rayLength,u.rayLength),o.uniform1f(Me.intensity,u.rayIntensity),o.uniform3f(Me.color,u.rayColor.r,u.rayColor.g,u.rayColor.b),o.uniform1f(Me.aspect,Re/Se),o.uniform1i(Me.edges,u.edges),o.uniform1i(Me.sampleMode,u.sampleMode),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,Ne.framebuffer),o.viewport(0,0,Re,Se),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,Be.texture),te(V,z.position,z.source),o.uniform2f(z.direction,u.blurScale.x/Re,0),o.uniform1i(z.finalPass,0),o.uniform1i(z.hasMask,0),o.uniform1i(z.blurAlpha,1),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,Be.framebuffer),o.viewport(0,0,Re,Se),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,Ne.texture),te(V,z.position,z.source),o.uniform2f(z.direction,0,u.blurScale.y/Se),o.uniform1i(z.finalPass,0),o.uniform1i(z.hasMask,0),o.uniform1i(z.blurAlpha,1),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,Pe?.framebuffer??null),o.viewport(0,0,N,B),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,Be.texture),te(_e,Ce.position,Ce.rays),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,ze),o.uniform1i(Ce.original,1),o.uniform1i(Ce.blendMode,u.blendMode),o.drawArrays(o.TRIANGLES,0,6),Pe&&(D=Pe.texture);return}if(u.kind==="godRays"){const y=Fe[ge];if(!de||!Je||!Q||!be||!me||!Ie||!_e||!Ce||!Ze||!y||y.kind!=="godRays"||u.blendMode<0||u.blendMode>32)throw new Error("Wallpaper Engine God Rays multipass program is unavailable.");const ze=D,[Ne,Be]=Ze;o.bindFramebuffer(o.FRAMEBUFFER,Ne.framebuffer),o.viewport(0,0,Re,Se),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,ze),te(de,Je.position,Je.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,y.maskTexture),o.uniform1i(Je.mask,1),o.uniform1i(Je.hasMask,y.maskTexture?1:0),o.uniform1f(Je.threshold,u.threshold),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,Be.framebuffer),o.viewport(0,0,Re,Se),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,Ne.texture),te(Q,be.position,be.source),u.caster.mode==="radial"?(o.uniform1i(be.casterMode,0),o.uniform2f(be.center,u.caster.center.x,u.caster.center.y),o.uniform1f(be.direction,0)):(o.uniform1i(be.casterMode,1),o.uniform2f(be.center,.5,.5),o.uniform1f(be.direction,u.caster.direction)),o.uniform1f(be.rayLength,u.rayLength),o.uniform1f(be.intensity,u.rayIntensity),o.uniform3f(be.colorStart,u.colorStart.r,u.colorStart.g,u.colorStart.b),o.uniform3f(be.colorEnd,u.colorEnd.r,u.colorEnd.g,u.colorEnd.b),o.uniform1i(be.sampleMode,u.sampleMode),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,Ne.framebuffer),o.viewport(0,0,Re,Se),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,Be.texture),te(me,Ie.position,Ie.source),o.uniform2f(Ie.direction,u.blurScale.x/Re,0),o.uniform1i(Ie.kernel,u.kernel),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,Be.framebuffer),o.viewport(0,0,Re,Se),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,Ne.texture),te(me,Ie.position,Ie.source),o.uniform2f(Ie.direction,0,u.blurScale.y/Se),o.uniform1i(Ie.kernel,u.kernel),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,Pe?.framebuffer??null),o.viewport(0,0,N,B),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,Be.texture),te(_e,Ce.position,Ce.rays),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,ze),o.uniform1i(Ce.original,1),o.uniform1i(Ce.blendMode,u.blendMode),o.drawArrays(o.TRIANGLES,0,6),Pe&&(D=Pe.texture);return}if(u.kind==="blurPrecise"){const y=Fe[ge];if(!V||!z||!qe||!y||y.kind!=="blurPrecise"||u.horizontalKernel!==0||u.verticalKernel!==0)throw new Error("Wallpaper Engine precise-blur program is unavailable.");const ze=D;o.bindFramebuffer(o.FRAMEBUFFER,qe.framebuffer),o.viewport(0,0,N,B),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,ze),te(V,z.position,z.source),o.uniform2f(z.direction,u.scale.x/N,0),o.uniform1i(z.finalPass,0),o.uniform1i(z.hasMask,0),o.uniform1i(z.blurAlpha,1),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,Pe?.framebuffer??null),o.viewport(0,0,N,B),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,qe.texture),te(V,z.position,z.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,ze),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,y.maskTexture),o.uniform1i(z.original,1),o.uniform1i(z.mask,2),o.uniform2f(z.direction,0,u.scale.y/B),o.uniform1i(z.finalPass,1),o.uniform1i(z.hasMask,y.maskTexture?1:0),o.uniform1i(z.blurAlpha,u.blurAlpha?1:0),o.drawArrays(o.TRIANGLES,0,6),Pe&&(D=Pe.texture);return}if(u.kind==="opacity"){const y=Fe[ge];if(!ce||!Qe||!y||y.kind!=="opacity")throw new Error("Wallpaper Engine opacity program is unavailable.");te(ce,Qe.position,Qe.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,y.maskTexture),o.uniform1i(Qe.mask,1),o.uniform1i(Qe.hasMask,y.maskTexture?1:0),o.uniform1f(Qe.alpha,u.alpha)}else if(u.kind==="scroll"){if(!ue||!je)throw new Error("Wallpaper Engine scroll program is unavailable.");te(ue,je.position,je.source),o.uniform1f(je.time,w),o.uniform1f(je.speedX,u.speedX),o.uniform1f(je.speedY,u.speedY),o.uniform2f(je.repeat,u.repeat.x,u.repeat.y)}else if(u.kind==="transform"){if(!ne||!Ye)throw new Error("Wallpaper Engine transform program is unavailable.");te(ne,Ye.position,Ye.source),o.uniform2f(Ye.offset,u.offset.x,u.offset.y),o.uniform2f(Ye.scale,u.scale.x,u.scale.y),o.uniform1f(Ye.angle,u.angle),o.uniform1i(Ye.repeat,u.repeat?1:0)}else if(u.kind==="spin"){if(!$||!fe)throw new Error("Wallpaper Engine spin program is unavailable.");te($,fe.position,fe.source),o.uniform1f(fe.time,w),o.uniform2f(fe.center,u.center.x,u.center.y),o.uniform1f(fe.speed,u.speed),o.uniform1f(fe.ratio,u.ratio),o.uniform1f(fe.axis,u.axis),o.uniform1f(fe.phase,u.phase),o.uniform1f(fe.size,u.size),o.uniform1f(fe.feather,u.feather),o.uniform1f(fe.aspect,u.aspectCorrect?N/B:1),o.uniform1i(fe.repeat,u.repeat?1:0),o.uniform1i(fe.elliptical,u.elliptical?1:0),o.uniform1i(fe.softMask,u.softMask?1:0)}else if(u.kind==="perspective"){const y=Yt[ge];if(!G||!ot||!y)throw new Error("Wallpaper Engine perspective program is unavailable.");te(G,ot.position,ot.source),o.uniformMatrix3fv(ot.matrix,!1,y),o.uniform1i(ot.repeat,u.repeat?1:0)}else if(u.kind==="foliageSway"){const y=Fe[ge];if(!v||!xe||!y||y.kind!=="foliageSway"||!y.noiseTexture)throw new Error("Wallpaper Engine foliage-sway program is unavailable.");te(v,xe.position,xe.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,y.maskTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,y.noiseTexture),o.uniform1i(xe.mask,1),o.uniform1i(xe.noise,2),o.uniform1i(xe.hasMask,y.maskTexture?1:0),o.uniform1f(xe.time,w),o.uniform1f(xe.speed,u.speed),o.uniform1f(xe.strength,u.strength),o.uniform1f(xe.phase,u.phase),o.uniform1f(xe.power,u.power),o.uniform1f(xe.noiseScale,u.noiseScale),o.uniform1f(xe.ratio,u.ratio),o.uniform1f(xe.direction,u.direction),o.uniform1f(xe.aspect,N/B)}else if(u.kind==="waterFlow"){const y=Fe[ge];if(!q||!ke||!y||y.kind!=="waterFlow"||!y.flowMapTexture)throw new Error("Wallpaper Engine water-flow program is unavailable.");te(q,ke.position,ke.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,y.flowMapTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,y.phaseTexture),o.uniform1i(ke.flowMap,1),o.uniform1i(ke.phase,2),o.uniform1i(ke.flowMapPackedRg88,y.flowMapPackedRg88?1:0),o.uniform1f(ke.time,w),o.uniform1f(ke.speed,u.speed),o.uniform1f(ke.strength,u.strength),o.uniform1f(ke.phaseScale,u.phaseScale),o.uniform1i(ke.legacy,u.phaseMode==="legacy"?1:0),o.uniform1i(ke.hasFeather,u.feather===null?0:1),o.uniform1f(ke.feather,u.feather??0)}else if(u.kind==="shake"){const y=Fe[ge];if(!oe||!ve||!y||y.kind!=="shake"||!y.directionMapTexture)throw new Error("Wallpaper Engine shake program is unavailable.");te(oe,ve.position,ve.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,y.directionMapTexture),o.uniform1i(ve.directionMap,1),o.uniform1i(ve.directionMapPackedRg88,y.directionMapPackedRg88?1:0),o.uniform1f(ve.time,w),o.uniform1f(ve.speed,u.speed),o.uniform1f(ve.strength,u.strength),o.uniform2f(ve.friction,u.friction.x,u.friction.y),o.uniform2f(ve.bounds,u.bounds.x,u.bounds.y),o.uniform1f(ve.directionMode,u.directionMode)}else if(u.kind==="shimmer"){if(!re||!Le)throw new Error("Wallpaper Engine shimmer program is unavailable.");te(re,Le.position,Le.source),o.uniform1f(Le.time,w),o.uniform3f(Le.color,u.color.r,u.color.g,u.color.b),o.uniform1f(Le.brightness,u.brightness),o.uniform1f(Le.direction,u.direction),o.uniform1f(Le.granularity,u.granularity),o.uniform1f(Le.offset,u.offset),o.uniform1f(Le.speed,u.speed),o.uniform1f(Le.delay,u.delay)}else if(u.kind==="waterRipple"){const y=Fe[ge];if(!J||!Ee||!y||y.kind!=="waterRipple"||!y.normalTexture)throw new Error("Wallpaper Engine water-ripple program is unavailable.");te(J,Ee.position,Ee.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,y.maskTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,y.normalTexture),o.uniform1i(Ee.mask,1),o.uniform1i(Ee.normal,2),o.uniform1i(Ee.hasMask,y.maskTexture?1:0),o.uniform1f(Ee.time,w),o.uniform1f(Ee.animationSpeed,u.animationSpeed),o.uniform1f(Ee.scale,u.scale),o.uniform1f(Ee.scrollSpeed,u.scrollSpeed),o.uniform1f(Ee.direction,u.direction),o.uniform1f(Ee.ratio,u.ratio),o.uniform1f(Ee.strength,u.strength),o.uniform1f(Ee.aspect,N/B)}else{const y=Fe[ge];if(!O||!we||!y||y.kind!=="waterWaves")throw new Error("Wallpaper Engine water-waves program is unavailable.");te(O,we.position,we.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,y.maskTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,y.timeOffsetTexture),o.uniform1i(we.mask,1),o.uniform1i(we.timeOffset,2),o.uniform1i(we.hasMask,y.maskTexture?1:0),o.uniform1i(we.hasTimeOffset,y.timeOffsetTexture?1:0),o.uniform1f(we.time,w),o.uniform1f(we.direction,u.direction),o.uniform1f(we.speed,u.speed),o.uniform1f(we.scale,u.scale),o.uniform1f(we.exponent,u.exponent),o.uniform1f(we.strength,u.strength)}o.drawArrays(o.TRIANGLES,0,6),Pe&&(D=Pe.texture)});const Z=l.current;Z&&(o.flush(),Z(R)),ie||(ie=!0,T(!0)),x=window.requestAnimationFrame(mt)};x=window.requestAnimationFrame(mt)})().catch(k),()=>{A=!0,H+=1,_.current=null,x&&window.cancelAnimationFrame(x),o&&(S.forEach(I=>o.deleteTexture(I)),m.forEach(I=>o.deleteFramebuffer(I)),s.forEach(I=>o.deleteProgram(I)),F&&o.deleteBuffer(F))}},[E,h]),C.jsxs(C.Fragment,{children:[!b&&C.jsx("img",{src:e,alt:"",draggable:!1,className:r,"data-we-source":i,"data-we-timing":d,style:n}),C.jsx("canvas",{ref:a,className:r,"data-we-source":i,"data-we-effect":t.map(R=>R.kind).join(","),"data-we-timing":d,style:{...n,visibility:b?"visible":"hidden"}})]})},Zr=({src:e,mesh:t,modelSrc:r=null,animationLayers:n=[],animationMode:i,effects:d,className:h,style:p,dataSource:a,timeOriginMs:f})=>{const _=M.useRef(null),l=M.useCallback(b=>{_.current?.updateTexture(b)},[]);return C.jsxs(C.Fragment,{children:[C.jsx(bt,{ref:_,src:e,mesh:t,modelSrc:r,animationLayers:n,animationMode:i,timeOriginMs:f,className:h,dataSource:a,style:p}),C.jsx(Et,{src:e,effects:d,className:"",dataSource:"puppetAtlas",timeOriginMs:f,onFrame:l,style:{display:"none"}})]})},Qr=`
attribute vec2 a_Position;
varying vec2 v_TexCoord;
void main() {
    gl_Position = vec4(a_Position, 0.0, 1.0);
    v_TexCoord = a_Position * 0.5 + 0.5;
}
`,Jr=`
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
`,en=2048,tn=e=>new Promise((t,r)=>{const n=new Image;n.onload=()=>t(n),n.onerror=()=>r(new Error(`Failed to load Wallpaper Engine composition texture: ${e}`)),n.src=e}),Ft=(e,t,r)=>{const n=e.createShader(t);if(!n)throw new Error("Unable to allocate Wallpaper Engine composition shader.");if(e.shaderSource(n,r),e.compileShader(n),!e.getShaderParameter(n,e.COMPILE_STATUS)){const i=e.getShaderInfoLog(n)||"Unknown composition shader compile error.";throw e.deleteShader(n),new Error(i)}return n},on=e=>{const t=Ft(e,e.VERTEX_SHADER,Qr),r=Ft(e,e.FRAGMENT_SHADER,Jr),n=e.createProgram();if(!n)throw new Error("Unable to allocate Wallpaper Engine composition program.");if(e.attachShader(n,t),e.attachShader(n,r),e.linkProgram(n),e.deleteShader(t),e.deleteShader(r),!e.getProgramParameter(n,e.LINK_STATUS)){const i=e.getProgramInfoLog(n)||"Unknown composition program link error.";throw e.deleteProgram(n),new Error(i)}return n},rn=(e,t,r)=>{const n=document.createElement("canvas");n.width=t,n.height=r;const i=n.getContext("2d");if(!i)throw new Error("2D canvas is unavailable for Wallpaper Engine composition scaling.");return i.drawImage(e,0,0,t,r),n},nn=(e,t)=>{const r=e.createTexture();if(!r)throw new Error("Unable to allocate Wallpaper Engine composition texture.");return e.bindTexture(e.TEXTURE_2D,r),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,0),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t),r},It=(e,t,r)=>{const n=e.createTexture(),i=e.createFramebuffer();if(!n||!i)throw new Error("Unable to allocate Wallpaper Engine composition render target.");if(e.bindTexture(e.TEXTURE_2D,n),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,t,r,0,e.RGBA,e.UNSIGNED_BYTE,null),e.bindFramebuffer(e.FRAMEBUFFER,i),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,n,0),e.checkFramebufferStatus(e.FRAMEBUFFER)!==e.FRAMEBUFFER_COMPLETE)throw new Error("Wallpaper Engine composition framebuffer is incomplete.");return{texture:n,framebuffer:i}},an=e=>e.kind==="tint"?0:e.kind==="blend"?1:e.kind==="transform"?2:e.kind==="fisheye"?3:4,sn=e=>e.map(t=>t.kind==="tint"?["tint",t.color.r,t.color.g,t.color.b,t.alpha].join(":"):t.kind==="blend"?["blend",t.texturePath,t.maskPath??"",t.multiply].join(":"):t.kind==="transform"?["transform",t.offset.x,t.offset.y,t.scale.x,t.scale.y,t.angle].join(":"):t.kind==="fisheye"?["fisheye",t.center.x,t.center.y,t.distortion,t.size,t.transparentOutside?1:0].join(":"):["opacity",t.maskPath??"",t.alpha].join(":")).join("|"),ln=({effects:e,logicalSize:t,className:r,style:n,dataSource:i})=>{const d=M.useRef(null),[h,p]=M.useState(!1),a=sn(e);return M.useEffect(()=>{const f=d.current;if(!f||e.length===0)return;let _=!1,l=null,b=null,T=null;const E=[],R=[];return p(!1),(async()=>{const x=new Set;e.forEach(k=>{k.kind==="blend"?(x.add(k.textureUrl),k.maskUrl&&x.add(k.maskUrl)):k.kind==="opacity"&&k.maskUrl&&x.add(k.maskUrl)});const S=new Map;if(await Promise.all([...x].map(async k=>S.set(k,await tn(k)))),_)return;const m=Math.min(1,en/Math.max(t.width,t.height)),s=Math.max(1,Math.round(t.width*m)),o=Math.max(1,Math.round(t.height*m));if(f.width=s,f.height=o,l=f.getContext("webgl",{alpha:!0,premultipliedAlpha:!0}),!l)throw new Error("WebGL is unavailable for Wallpaper Engine composition rendering.");if(b=on(l),l.useProgram(b),l.viewport(0,0,s,o),T=l.createBuffer(),!T)throw new Error("Unable to allocate Wallpaper Engine composition vertex buffer.");l.bindBuffer(l.ARRAY_BUFFER,T),l.bufferData(l.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),l.STATIC_DRAW);const F=l.getAttribLocation(b,"a_Position");l.enableVertexAttribArray(F),l.vertexAttribPointer(F,2,l.FLOAT,!1,0,0);const ie=[It(l,s,o),It(l,s,o)];ie.forEach(k=>{E.push(k.texture),R.push(k.framebuffer),l.bindFramebuffer(l.FRAMEBUFFER,k.framebuffer),l.clearColor(0,0,0,0),l.clear(l.COLOR_BUFFER_BIT)});const H=new Map;for(const[k,De]of S){const I=nn(l,rn(De,s,o));H.set(k,I),E.push(I)}const W=k=>l.getUniformLocation(b,k),U={input:W("u_Input"),aux:W("u_Aux"),mask:W("u_Mask"),mode:W("u_Mode"),hasMask:W("u_HasMask"),transparentOutside:W("u_TransparentOutside"),finalPass:W("u_FinalPass"),color:W("u_Color"),alpha:W("u_Alpha"),multiply:W("u_Multiply"),offset:W("u_Offset"),scale:W("u_Scale"),angle:W("u_Angle"),center:W("u_Center"),distortion:W("u_Distortion"),size:W("u_Size")};l.uniform1i(U.input,0),l.uniform1i(U.aux,1),l.uniform1i(U.mask,2);let ae=0;e.forEach((k,De)=>{const I=De===e.length-1,Y=ae===0?1:0;l.bindFramebuffer(l.FRAMEBUFFER,I?null:ie[Y].framebuffer),l.viewport(0,0,s,o),l.activeTexture(l.TEXTURE0),l.bindTexture(l.TEXTURE_2D,ie[ae].texture),l.activeTexture(l.TEXTURE1),l.bindTexture(l.TEXTURE_2D,null),l.activeTexture(l.TEXTURE2),l.bindTexture(l.TEXTURE_2D,null),l.uniform1i(U.mode,an(k)),l.uniform1i(U.hasMask,0),l.uniform1i(U.transparentOutside,0),l.uniform1i(U.finalPass,I?1:0),l.uniform3f(U.color,0,0,0),l.uniform1f(U.alpha,1),l.uniform1f(U.multiply,1),l.uniform2f(U.offset,0,0),l.uniform2f(U.scale,1,1),l.uniform1f(U.angle,0),l.uniform2f(U.center,.5,.5),l.uniform1f(U.distortion,1),l.uniform1f(U.size,1),k.kind==="tint"?(l.uniform3f(U.color,k.color.r,k.color.g,k.color.b),l.uniform1f(U.alpha,k.alpha)):k.kind==="blend"?(l.activeTexture(l.TEXTURE1),l.bindTexture(l.TEXTURE_2D,H.get(k.textureUrl)??null),k.maskUrl&&(l.activeTexture(l.TEXTURE2),l.bindTexture(l.TEXTURE_2D,H.get(k.maskUrl)??null),l.uniform1i(U.hasMask,1)),l.uniform1f(U.multiply,k.multiply)):k.kind==="transform"?(l.uniform2f(U.offset,k.offset.x,k.offset.y),l.uniform2f(U.scale,k.scale.x,k.scale.y),l.uniform1f(U.angle,k.angle)):k.kind==="fisheye"?(l.uniform2f(U.center,k.center.x,k.center.y),l.uniform1f(U.distortion,k.distortion),l.uniform1f(U.size,k.size),l.uniform1i(U.transparentOutside,k.transparentOutside?1:0)):(k.maskUrl&&(l.activeTexture(l.TEXTURE2),l.bindTexture(l.TEXTURE_2D,H.get(k.maskUrl)??null),l.uniform1i(U.hasMask,1)),l.uniform1f(U.alpha,k.alpha)),l.drawArrays(l.TRIANGLES,0,6),I||(ae=Y)}),_||p(!0)})().catch(x=>{}),()=>{_=!0,l&&(E.forEach(x=>l.deleteTexture(x)),R.forEach(x=>l.deleteFramebuffer(x)),T&&l.deleteBuffer(T),b&&l.deleteProgram(b))}},[a,t.height,t.width]),C.jsx("canvas",{ref:d,className:r,"data-we-source":i,"data-we-effect":"composition",style:{...n,visibility:h?"visible":"hidden"}})},un=e=>e.replace(/\r\n?/g,`
`).split(`
`),cn=(e,t,r,n,i,d,h)=>{const p=Math.max(1,Math.round(t.width)),a=Math.max(1,Math.round(t.height)),f=document.createElement("canvas");f.width=p,f.height=a;const _=f.getContext("2d");if(!_)throw new Error("2D canvas is unavailable for Wallpaper Engine text rasterization.");_.clearRect(0,0,p,a),_.font=`${n}px ${r}`,_.fillStyle=i,_.textAlign=d,_.textBaseline="middle";const l=un(e),b=n*1.2,T=Math.max(b,l.length*b),E=h==="center"?(a-T)/2:h==="bottom"?a-T:0,R=d==="center"?p/2:d==="right"?p:0;return l.forEach((A,x)=>{_.fillText(A,R,E+b*(x+.5))}),f.toDataURL("image/png")},dn=({text:e,logicalSize:t,fontFamily:r,fontSize:n,color:i,horizontalAlign:d,verticalAlign:h,effects:p,className:a,fallbackClassName:f,style:_,fallbackStyle:l,dataSource:b,timeOriginMs:T})=>{const[E,R]=M.useState(null);return M.useEffect(()=>{let A=!1;return(async()=>{if(typeof document<"u"&&"fonts"in document)try{await document.fonts.load(`${n}px ${r}`,e||"0")}catch{}if(A)return;const S=cn(e,t,r,n,i,d,h);A||R(S)})().catch(S=>{A||R(null)}),()=>{A=!0}},[i,r,n,d,t.height,t.width,e,h]),E?C.jsx(Et,{src:E,effects:p,className:a,style:_,dataSource:b,timeOriginMs:T}):C.jsx("div",{className:f,"data-we-source":b,"data-we-effect-pending":"true",style:l,children:e})},mn="_root_153c4_1",pn="_stage_153c4_8",hn="_postProcessDefinitions_153c4_15",fn="_layer_153c4_23",xn="_preload_153c4_33",gn="_textLayer_153c4_43",_n="_textContent_153c4_55",he={root:mn,stage:pn,postProcessDefinitions:hn,layer:fn,preload:xn,textLayer:gn,textContent:_n},_t=()=>({width:typeof window>"u"?1:Math.max(1,window.innerWidth),height:typeof window>"u"?1:Math.max(1,window.innerHeight)}),Nt=e=>{let t=2166136261;for(let r=0;r<e.length;r+=1)t^=e.charCodeAt(r),t=Math.imul(t,16777619);return`tablab-we-font-${(t>>>0).toString(36)}`},bn=()=>{const[e,t]=M.useState(_t);return M.useEffect(()=>{const r=()=>t(_t());return window.addEventListener("resize",r),()=>window.removeEventListener("resize",r)},[]),e},Bt=(e,t)=>{const r=[];for(const n of e.layers)n.source.kind==="frameAnimation"&&r.push(`${n.id}:f${dt(t,n.source.fps,n.source.frames.length)}`),n.centerAnimations.forEach((i,d)=>{r.push(`${n.id}:p${d}:${Math.floor(jt(i,t))}`)});return r.join("|")},En=(e,t)=>{const[r,n]=M.useState(0);return M.useEffect(()=>{if(n(0),!e||e.animationLayerCount===0&&e.propertyAnimationLayerCount===0||typeof document>"u")return;let i=0,d=0,h=null,p=Bt(e,0),a=!1;const f=()=>{i&&window.cancelAnimationFrame(i),i=0},_=T=>{if(i=0,a||document.hidden)return;h===null&&(h=T);const E=d+(T-h),R=Bt(e,E);R!==p&&(p=R,n(E)),i=window.requestAnimationFrame(_)},l=()=>{!a&&!document.hidden&&!i&&(i=window.requestAnimationFrame(_))},b=()=>{const T=window.performance.now();if(document.hidden){h!==null&&(d+=T-h),h=null,f();return}h=null,l()};return document.addEventListener("visibilitychange",b),l(),()=>{a=!0,f(),document.removeEventListener("visibilitychange",b)}},[e,t]),r},Tn=e=>{if(!e)return null;let t=null;const r={day:0,minute:1,second:2};for(const n of e.layers){if(n.source.kind!=="text"||!n.source.dynamicText)continue;const i=n.source.dynamicText.refresh;(!t||r[i]>r[t])&&(t=i)}return t},yn=(e,t)=>{const r=new Date(t);if(e==="second")return Math.max(25,1e3-r.getMilliseconds()+25);if(e==="minute")return Math.max(25,(60-r.getSeconds())*1e3-r.getMilliseconds()+25);const n=new Date(r.getFullYear(),r.getMonth(),r.getDate()+1,0,0,0,25);return Math.max(25,n.getTime()-t)},Rn=(e,t)=>{const[r,n]=M.useState(()=>Date.now()),i=Tn(e);return M.useEffect(()=>{if(n(Date.now()),!i||typeof document>"u"||typeof window>"u")return;let d=0,h=!1;const p=()=>{d&&window.clearTimeout(d),d=0},a=()=>{if(p(),h||document.hidden)return;const _=Date.now();d=window.setTimeout(()=>{d=0,!(h||document.hidden)&&(n(Date.now()),a())},yn(i,_))},f=()=>{p(),!document.hidden&&(n(Date.now()),a())};return document.addEventListener("visibilitychange",f),a(),()=>{h=!0,p(),document.removeEventListener("visibilitychange",f)}},[i,t]),r},Sn=(e,t)=>{const[r,n]=M.useState({x:0,y:0});return M.useEffect(()=>{if(n({x:0,y:0}),!e||!fr(e.cameraParallax)||typeof window>"u")return;let i={x:0,y:0},d={x:0,y:0},h=0,p=window.performance.now(),a=!1;const f=()=>{h&&window.cancelAnimationFrame(h),h=0},_=A=>{if(h=0,a)return;const x=hr(i,d,e.cameraParallax.delay,A-p);p=A;const S=Math.abs(x.x-i.x)>1e-4||Math.abs(x.y-i.y)>1e-4,m=Math.abs(d.x-x.x)>5e-4||Math.abs(d.y-x.y)>5e-4;i=x,S&&n(x),m&&(h=window.requestAnimationFrame(_))},l=()=>Math.abs(d.x-i.x)>5e-4||Math.abs(d.y-i.y)>5e-4,b=()=>{!h&&!a&&!document.hidden&&l()&&(p=window.performance.now(),h=window.requestAnimationFrame(_))},T=A=>{d=cr(A.clientX,A.clientY,_t()),b()},E=()=>{d={x:0,y:0},b()},R=()=>{if(document.hidden){f();return}p=window.performance.now(),b()};return window.addEventListener("pointermove",T,{passive:!0}),window.addEventListener("blur",E),document.addEventListener("mouseleave",E),document.addEventListener("visibilitychange",R),()=>{a=!0,f(),window.removeEventListener("pointermove",T),window.removeEventListener("blur",E),document.removeEventListener("mouseleave",E),document.removeEventListener("visibilitychange",R)}},[e,t]),r},kn=(e,t)=>{const r=M.useRef(new Map),n=M.useRef(new Set),[i,d]=M.useState(()=>new Map),h=t.join("\0");return M.useEffect(()=>{n.current=new Set(t);let p=!1;const a=()=>{for(const b of r.current.values())URL.revokeObjectURL(b);r.current.clear()},f=async()=>{if(typeof document<"u"&&document.visibilityState==="hidden")return;const b=t.filter(E=>!r.current.has(E)),T=await Zt(e,b);if(!(p||typeof document<"u"&&document.visibilityState==="hidden")){for(const E of b){if(p||!n.current.has(E)||r.current.has(E))continue;const R=T.get(E);R&&r.current.set(E,URL.createObjectURL(R.data))}if(!p){for(const[E,R]of r.current)n.current.has(E)||(URL.revokeObjectURL(R),r.current.delete(E));d(new Map(r.current))}}},_=()=>{f().catch(b=>{})},l=()=>{document.visibilityState==="hidden"?a():_()};return document.addEventListener("visibilitychange",l),_(),()=>{p=!0,document.removeEventListener("visibilitychange",l)}},[h,e]),M.useEffect(()=>()=>{for(const p of r.current.values())URL.revokeObjectURL(p);r.current.clear(),n.current.clear()},[e]),i},wn=(e,t,r)=>{if(!t.length)return e;const n=t.map(f=>r.get(f)).filter(f=>!!f);if(n.length!==t.length)return e;const i=n.map(f=>`url("${f}")`).join(", "),d=n.map(()=>"luminance").join(", "),h=n.map(()=>"100% 100%").join(", "),p=n.map(()=>"no-repeat").join(", "),a=n.map(()=>"intersect").join(", ");return{...e,maskImage:i,maskMode:d,maskSize:h,maskRepeat:p,maskComposite:a}},Wt=(e,t)=>e.map(r=>r.kind==="opacity"?{...r,maskUrl:r.maskPath?t.get(r.maskPath)??null:null}:r.kind==="waterWaves"?{...r,maskUrl:r.maskPath?t.get(r.maskPath)??null:null,timeOffsetUrl:r.timeOffsetPath?t.get(r.timeOffsetPath)??null:null}:r.kind==="foliageSway"?{...r,maskUrl:r.maskPath?t.get(r.maskPath)??null:null,noiseUrl:r.noisePath?t.get(r.noisePath)??null:null}:r.kind==="waterFlow"?{...r,flowMapUrl:r.flowMapPath?t.get(r.flowMapPath)??null:null,phaseUrl:t.get(r.phasePath)??null}:r.kind==="shake"?{...r,directionMapUrl:r.directionMapPath?t.get(r.directionMapPath)??null:null}:r.kind==="blurPrecise"?{...r,maskUrl:r.maskPath?t.get(r.maskPath)??null:null}:r.kind==="shine"?{...r,maskUrl:r.maskPath?t.get(r.maskPath)??null:null,noiseUrl:r.noisePath?t.get(r.noisePath)??null:null}:r.kind==="godRays"?{...r,maskUrl:r.maskPath?t.get(r.maskPath)??null:null}:r.kind==="waterRipple"?{...r,maskUrl:r.maskPath?t.get(r.maskPath)??null:null,normalUrl:t.get(r.normalPath)??null}:r),Ot=e=>e.every(t=>t.kind==="opacity"?!t.maskPath||!!t.maskUrl:t.kind==="waterWaves"?(!t.maskPath||!!t.maskUrl)&&(!t.timeOffsetPath||!!t.timeOffsetUrl):t.kind==="foliageSway"?(!t.maskPath||!!t.maskUrl)&&(!t.noisePath||!!t.noiseUrl):t.kind==="waterFlow"?(!t.flowMapPath||!!t.flowMapUrl)&&!!t.phaseUrl:t.kind==="shake"?!t.directionMapPath||!!t.directionMapUrl:t.kind==="blurPrecise"?!t.maskPath||!!t.maskUrl:t.kind==="shine"?(!t.maskPath||!!t.maskUrl)&&(!t.noisePath||!!t.noiseUrl):t.kind==="godRays"?!t.maskPath||!!t.maskUrl:t.kind==="waterRipple"?(!t.maskPath||!!t.maskUrl)&&!!t.normalUrl:!0),An=(e,t,r,n)=>{if(e.source.kind==="solidColor"||e.source.kind==="text"||e.source.kind==="composition")return null;const i=e.source.kind==="frameAnimation"?n.get(e.id)??null:null,d=tr(e,t,i);for(const h of d){const p=r.get(h);if(p)return e.source.kind==="frameAnimation"&&n.set(e.id,h),p}return null},Ln=({wallpaperId:e})=>{const[t,r]=M.useState(null),n=M.useRef(new Map),i=M.useId().replace(/[^a-zA-Z0-9_-]/g,""),d=bn(),h=M.useMemo(()=>typeof performance>"u"?0:performance.now(),[e]);M.useEffect(()=>{let s=!1;const o=async()=>{const F=await Kt.get(e);if(s||!F||!qt(F))return;const ie=Ko(F.scene);ie&&(s||r(ie))};return n.current.clear(),r(null),o().catch(F=>{}),()=>{s=!0}},[e]);const p=En(t,e),a=Rn(t,e),f=Sn(t,e),_=M.useMemo(()=>t?Jo(t,p):[],[p,t]),l=kn(e,_);if(!t)return null;const b=or(t.canvas,d),T=mr(t.canvas,t.cameraParallax,t.cameraParallaxSceneMotion,f),E=pr(t.canvas,t.cameraParallax,t.cameraParallaxSceneMotion),R=t.postProcessEffects.filter(s=>s.kind==="chromaticAberration"&&s.strength>0).map((s,o)=>({id:`we-chromatic-${i}-${o}`,offsets:sr(t.canvas,s)})),A=R.length>0?R.map(s=>`url(#${s.id})`).join(" "):void 0,x=new Set;for(const s of t.layers){if(s.source.kind!=="frameAnimation")continue;const o=er(s,p);o&&x.add(o)}const S=new Set;for(const s of _){if(x.has(s)||t.staticResourcePaths.includes(s))continue;const o=l.get(s);o&&S.add(o)}const m=new Map;for(const s of t.layers){if(s.source.kind!=="text")continue;if(s.source.fontPath){const F=l.get(s.source.fontPath);F&&m.set(s.source.fontPath,F);continue}const o=no(s.source.fontReference);!o||typeof document>"u"||m.set(s.source.fontReference,new URL(o,document.baseURI).href)}return C.jsxs("div",{className:he.root,"data-we-renderer":"frame-animation",children:[R.length>0&&C.jsx("svg",{"aria-hidden":"true",width:"0",height:"0",className:he.postProcessDefinitions,children:C.jsx("defs",{children:R.map(({id:s,offsets:o})=>C.jsxs("filter",{id:s,x:-t.canvas.width*.05,y:-t.canvas.height*.05,width:t.canvas.width*1.1,height:t.canvas.height*1.1,filterUnits:"userSpaceOnUse",primitiveUnits:"userSpaceOnUse",colorInterpolationFilters:"sRGB",children:[C.jsx("feColorMatrix",{in:"SourceGraphic",type:"matrix",values:"1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",result:"red"}),C.jsx("feColorMatrix",{in:"SourceGraphic",type:"matrix",values:"0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",result:"green"}),C.jsx("feColorMatrix",{in:"SourceGraphic",type:"matrix",values:"0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",result:"blue"}),C.jsx("feOffset",{in:"red",dx:o.red.x,dy:o.red.y,result:"redShift"}),C.jsx("feOffset",{in:"green",dx:o.green.x,dy:o.green.y,result:"greenShift"}),C.jsx("feOffset",{in:"blue",dx:o.blue.x,dy:o.blue.y,result:"blueShift"}),C.jsx("feComposite",{in:"redShift",in2:"greenShift",operator:"arithmetic",k1:"0",k2:"1",k3:"1",k4:"0",result:"redGreen"}),C.jsx("feComposite",{in:"redGreen",in2:"blueShift",operator:"arithmetic",k1:"0",k2:"1",k3:"1",k4:"0"})]},s))})}),C.jsxs("div",{className:he.stage,style:{width:`${t.canvas.width}px`,height:`${t.canvas.height}px`,transform:`translate(-50%, -50%) scale(${b*E}) translate(${T.x}px, ${T.y}px)`,filter:A},children:[[...m].map(([s,o])=>C.jsx("style",{children:`@font-face{font-family:"${Nt(s)}";src:url("${o}");font-display:swap;}`},`font:${s}`)),t.layers.map(s=>{const o=Zo(s,p),F=dr(t.canvas,t.cameraParallax,s.parallax,f,t.cameraParallaxSceneMotion),ie=s.source.kind==="text"?ur({width:s.size.width,height:s.size.height,scaleX:s.scale.x,scaleY:s.scale.y,rotationDeg:s.rotationDeg,horizontalAlign:s.source.horizontalAlign,verticalAlign:s.source.verticalAlign}):{x:0,y:0},H=s.puppetAttachment,W=wn({left:H?`${H.localCenter.x}px`:`${o.x+F.x+ie.x}px`,top:H?`${H.localCenter.y}px`:`${o.y+F.y+ie.y}px`,width:`${s.size.width}px`,height:`${s.size.height}px`,opacity:s.opacity,zIndex:H?void 0:s.zIndex,mixBlendMode:s.blendMode==="screen"?"screen":void 0,transform:H?`translate(-50%, -50%) rotate(${H.localRotationDeg}deg) scale(${H.localScale.x}, ${H.localScale.y})`:`translate(-50%, -50%) rotate(${s.rotationDeg}deg) scale(${s.scale.x}, ${s.scale.y})`},s.opacityMaskPaths,l);if(s.source.kind==="solidColor"){const{r:I,g:Y,b:P}=s.source.color;return C.jsx("div",{className:he.layer,"data-we-source":s.source.kind,style:{...W,backgroundColor:`rgb(${Math.round(I*255)} ${Math.round(Y*255)} ${Math.round(P*255)})`}},s.id)}if(s.source.kind==="text"){const{r:I,g:Y,b:P}=s.source.color,Ue=s.source.dynamicText?ar(s.source.dynamicText,new Date(a)):s.source.text,He=s.source.fontPath??(s.source.fontReference&&m.has(s.source.fontReference)?s.source.fontReference:null),N=He?Nt(He):"sans-serif",B=He?`"${N}"`:N,ce=lr(s.source.pointSize),ue=`rgb(${Math.round(I*255)} ${Math.round(Y*255)} ${Math.round(P*255)})`,ne=s.source.textShadow,$=ne?(()=>{const{r:K,g:j,b:de}=ne.color,Q=`rgba(${Math.round(K*255)}, ${Math.round(j*255)}, ${Math.round(de*255)}, ${ne.alpha})`,me=`${ne.offset.x}px ${ne.offset.y}px 0 ${Q}`;return ne.drawBorder?[me,`1px 0 0 ${Q}`,`-1px 0 0 ${Q}`,`0 1px 0 ${Q}`,`0 -1px 0 ${Q}`].join(", "):me})():void 0,G=s.source.horizontalAlign==="center"?"center":s.source.horizontalAlign==="right"?"flex-end":"flex-start",v=s.source.verticalAlign==="center"?"center":s.source.verticalAlign==="bottom"?"flex-end":"flex-start",q={...W,color:ue,fontFamily:B,fontSize:`${ce}px`,letterSpacing:s.source.spacing.x!==0?`${s.source.spacing.x}px`:void 0,justifyContent:G,alignItems:v,textAlign:s.source.horizontalAlign,textShadow:$},oe={width:s.source.limitWidth?"100%":"max-content",height:s.source.limitRows?"100%":"max-content",whiteSpace:s.source.limitWidth?"pre-wrap":"pre",overflowWrap:s.source.limitWidth?"break-word":"normal",overflow:s.source.limitWidth||s.source.limitRows?"hidden":"visible",textOverflow:s.source.limitWidth&&s.source.useEllipsis?"ellipsis":void 0},V=Wt(s.textureEffects,l),re=Ot(V);return V.length>0&&re?C.jsx(dn,{text:Ue,logicalSize:s.size,fontFamily:B,fontSize:ce,color:ue,horizontalAlign:s.source.horizontalAlign,verticalAlign:s.source.verticalAlign,effects:V,className:he.layer,fallbackClassName:`${he.layer} ${he.textLayer}`,style:W,fallbackStyle:q,dataSource:s.source.kind,timeOriginMs:h},s.id):C.jsx("div",{className:`${he.layer} ${he.textLayer}`,"data-we-source":s.source.kind,style:q,children:C.jsx("span",{className:he.textContent,style:oe,children:Ue})},s.id)}if(s.source.kind==="composition"){const I=s.source.effects.map(P=>P.kind==="blend"?{...P,textureUrl:l.get(P.texturePath)??"",maskUrl:P.maskPath?l.get(P.maskPath)??null:null}:P.kind==="opacity"?{...P,maskUrl:P.maskPath?l.get(P.maskPath)??null:null}:P);return I.every(P=>P.kind==="blend"?!!P.textureUrl&&(!P.maskPath||!!P.maskUrl):P.kind==="opacity"?!P.maskPath||!!P.maskUrl:!0)?C.jsx(ln,{effects:I,logicalSize:s.size,className:he.layer,dataSource:s.source.kind,style:W},s.id):null}const U=An(s,p,l,n.current);if(!U)return null;const ae=Wt(s.textureEffects,l),k=Ot(ae),De=I=>H?C.jsx(kr,{binding:H,modelSrc:l.get(H.parentModelPath)??null,timeOriginMs:h,parallaxOffset:F,zIndex:s.zIndex,children:I},`attachment:${s.id}`):I;return s.source.kind==="puppetMesh"?ae.length>0&&k?De(C.jsx(Zr,{src:U,mesh:s.source.mesh,modelSrc:s.source.modelPath?l.get(s.source.modelPath)??null:null,animationLayers:s.source.animationLayers,animationMode:s.source.animationMode,effects:ae,className:he.layer,dataSource:s.source.kind,timeOriginMs:h,style:W},s.id)):De(C.jsx(bt,{src:U,mesh:s.source.mesh,modelSrc:s.source.modelPath?l.get(s.source.modelPath)??null:null,animationLayers:s.source.animationLayers,animationMode:s.source.animationMode,timeOriginMs:h,className:he.layer,dataSource:s.source.kind,style:W},s.id)):ae.length>0&&k?De(C.jsx(Et,{src:U,effects:ae,className:he.layer,dataSource:s.source.kind,dataTiming:s.source.kind==="frameAnimation"?s.source.timingSource:void 0,timeOriginMs:h,style:W},s.id)):De(C.jsx("img",{src:U,alt:"",draggable:!1,className:he.layer,"data-we-source":s.source.kind,"data-we-timing":s.source.kind==="frameAnimation"?s.source.timingSource:void 0,style:W},s.id))}),[...S].map(s=>C.jsx("img",{src:s,alt:"","aria-hidden":"true",draggable:!1,className:he.preload},s))]})]})};export{Ln as WeSceneRenderer};
