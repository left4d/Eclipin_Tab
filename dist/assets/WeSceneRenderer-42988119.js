import{j as H,h as $r,i as Yr,bt as Vr}from"./main-b541ee2c.js";import{R as N}from"./vendor-react-d4bca6d7.js";import{g as Kr,p as ar,c as qr,a as Ir,s as Qr,b as Zr,d as Jr,e as et,f as ot}from"./wallpaperEnginePuppetModel-258cb088.js";import"./vendor-utils-654bd828.js";const rt=new Set(["MULTIPLE_TEXTURES_PRIMARY_ONLY","UNKNOWN_SOURCE_SIZE","FRAME_SIZE_MISMATCH","SCENE_SIZE_INFERRED","SCENE_SIZE_FALLBACK","UNSUPPORTED_PUPPET_MODEL","UNSUPPORTED_PUPPET_ANIMATION"]),M=e=>typeof e=="object"&&e!==null&&!Array.isArray(e),c=e=>typeof e=="number"&&Number.isFinite(e),Eo=e=>c(e)&&e>0,Xe=e=>Number.isSafeInteger(e)&&e>=0,Ye=e=>typeof e=="string",D=e=>Ye(e)&&e.length>0,Xo=e=>e===void 0||Ye(e),Bo=e=>Array.isArray(e)&&e.every(c),Wr=e=>M(e)&&D(e.id)&&Xo(e.name)&&Xe(e.animationId)&&typeof e.additive=="boolean"&&c(e.blend)&&typeof e.blendIn=="boolean"&&typeof e.blendOut=="boolean"&&c(e.blendTime)&&e.blendTime>=0&&c(e.rate)&&typeof e.visible=="boolean",tt=e=>{if(!M(e)||!Bo(e.positions)||e.positions3d!==void 0&&!Bo(e.positions3d)||!Bo(e.uvs)||!Array.isArray(e.indices)||!e.indices.every(Xe)||!M(e.bounds)||!c(e.bounds.minX)||!c(e.bounds.minY)||!c(e.bounds.maxX)||!c(e.bounds.maxY))return!1;const r=e.positions.length/2;return e.positions.length>=6&&e.positions.length%2===0&&(e.positions3d===void 0||e.positions3d.length===r*3)&&e.uvs.length===e.positions.length&&e.indices.length>=3&&e.indices.length%3===0&&e.indices.every(t=>t<r)&&e.bounds.maxX>e.bounds.minX&&e.bounds.maxY>e.bounds.minY},G=e=>M(e)&&c(e.x)&&c(e.y),Xr=e=>M(e)&&Eo(e.width)&&Eo(e.height),br=e=>M(e)&&c(e.a)&&c(e.b)&&c(e.c)&&c(e.d)&&c(e.tx)&&c(e.ty),nt=e=>M(e)&&D(e.name)&&D(e.parentLayerId)&&D(e.parentModelPath)&&Array.isArray(e.parentAnimationLayers)&&e.parentAnimationLayers.every(Wr)&&(e.parentAnimationMode===void 0||e.parentAnimationMode==="2d"||e.parentAnimationMode==="orthographic3d")&&G(e.parentOrigin)&&G(e.parentScale)&&c(e.parentRotationDeg)&&Xe(e.boneIndex)&&br(e.localMatrix)&&br(e.bindTransform)&&G(e.localCenter)&&G(e.localScale)&&c(e.localRotationDeg),it=e=>e===null||Xr(e),Le=e=>M(e)&&c(e.r)&&e.r>=0&&e.r<=1&&c(e.g)&&e.g>=0&&e.g<=1&&c(e.b)&&e.b>=0&&e.b<=1,at=e=>!M(e)||!Ye(e.kind)?!1:e.kind==="literal"?Ye(e.value):e.kind==="hour"?typeof e.use24Hour=="boolean"&&typeof e.twoDigit=="boolean":e.kind==="minute"||e.kind==="second"?typeof e.twoDigit=="boolean":e.kind==="dayPeriod"?Ye(e.am)&&Ye(e.pm):e.kind==="number"?(e.field==="dayOfMonth"||e.field==="month"||e.field==="year")&&typeof e.twoDigit=="boolean"&&Ye(e.digitSeparator):e.kind==="lookup"?!Array.isArray(e.values)||!e.values.every(Ye)?!1:e.field==="month"?e.values.length>=12:e.field==="weekday"?e.values.length>=7:e.field==="dayOfMonth"?e.values.length>=32:!1:!1,st=e=>M(e)&&e.kind==="dateTime"&&(e.refresh==="second"||e.refresh==="minute"||e.refresh==="day")&&Array.isArray(e.parts)&&e.parts.length>0&&e.parts.every(at),ut=e=>M(e)&&G(e.offset)&&Le(e.color)&&c(e.alpha)&&e.alpha>=0&&e.alpha<=1&&typeof e.drawBorder=="boolean",lt=e=>!M(e)||!Ye(e.kind)?!1:e.kind==="tint"?Le(e.color)&&c(e.alpha)&&e.alpha>=0&&e.alpha<=1:e.kind==="blend"?D(e.texturePath)&&(e.maskPath===null||D(e.maskPath))&&c(e.multiply)&&e.multiply>=0:e.kind==="transform"?G(e.offset)&&G(e.scale)&&c(e.angle):e.kind==="fisheye"?G(e.center)&&c(e.distortion)&&e.distortion>=0&&Eo(e.size)&&typeof e.transparentOutside=="boolean":e.kind==="opacity"?(e.maskPath===null||D(e.maskPath))&&c(e.alpha)&&e.alpha>=0&&e.alpha<=1:!1,dt=e=>!M(e)||!Ye(e.kind)?!1:e.kind==="solidColor"?Le(e.color):e.kind==="text"?Ye(e.text)&&(e.fontReference===void 0||D(e.fontReference))&&(e.fontPath===null||D(e.fontPath))&&Eo(e.pointSize)&&Le(e.color)&&(e.horizontalAlign==="left"||e.horizontalAlign==="center"||e.horizontalAlign==="right")&&(e.verticalAlign==="top"||e.verticalAlign==="center"||e.verticalAlign==="bottom")&&c(e.padding)&&e.padding>=0&&(e.limitWidth===void 0||typeof e.limitWidth=="boolean")&&(e.maxWidth===void 0||e.maxWidth===null||c(e.maxWidth))&&(e.limitRows===void 0||typeof e.limitRows=="boolean")&&(e.maxRows===void 0||e.maxRows===null||c(e.maxRows))&&(e.useEllipsis===void 0||typeof e.useEllipsis=="boolean")&&(e.spacing===void 0||G(e.spacing))&&(e.textShadow===void 0||ut(e.textShadow))&&(e.dynamicText===void 0||st(e.dynamicText)):e.kind==="composition"?Array.isArray(e.effects)&&e.effects.length>0&&e.effects.every(lt):it(e.pixelSize)?e.kind==="image"?D(e.path):e.kind==="puppetMesh"?D(e.path)&&tt(e.mesh)&&(e.modelPath===void 0||D(e.modelPath))&&(e.animationLayers===void 0||Array.isArray(e.animationLayers)&&e.animationLayers.every(Wr))&&(e.animationMode===void 0||e.animationMode==="2d"||e.animationMode==="orthographic3d"):e.kind==="frameAnimation"?Array.isArray(e.frames)&&e.frames.every(D)&&(e.fps===null||Eo(e.fps)):!1:!1,ct=e=>M(e)&&Xe(e.weObjectIndex)&&D(e.weModelPath)&&D(e.weMaterialPath)&&(e.weColorBlendMode===null||c(e.weColorBlendMode))&&typeof e.ignoredEffects=="boolean",Tr=e=>M(e)&&c(e.frame)&&e.frame>=0&&c(e.value),mt=e=>M(e)&&Eo(e.fps)&&Eo(e.lengthFrames)&&(e.mode==="single"||e.mode==="loop"||e.mode==="mirror")&&Array.isArray(e.x)&&e.x.length>0&&e.x.every(Tr)&&Array.isArray(e.y)&&e.y.length>0&&e.y.every(Tr),Or=e=>M(e)&&(e.maskPath===null||D(e.maskPath))&&c(e.alpha)&&e.alpha>=0&&e.alpha<=1,Hr=e=>M(e)&&(e.maskPath===null||D(e.maskPath))&&(e.timeOffsetPath===null||D(e.timeOffsetPath))&&c(e.direction)&&c(e.speed)&&e.speed>=0&&c(e.scale)&&e.scale>=0&&c(e.exponent)&&e.exponent>0&&c(e.strength)&&e.strength>=0,pt=e=>M(e)&&e.kind==="scroll"&&c(e.speedX)&&c(e.speedY)&&G(e.repeat)&&e.repeat.x>0&&e.repeat.y>0,ht=e=>M(e)&&e.kind==="transform"&&G(e.offset)&&G(e.scale)&&c(e.angle)&&typeof e.repeat=="boolean",_t=e=>M(e)&&e.kind==="spin"&&G(e.center)&&c(e.speed)&&c(e.ratio)&&Math.abs(e.ratio)>=1e-6&&c(e.axis)&&c(e.phase)&&c(e.size)&&e.size>=0&&c(e.feather)&&e.feather>=0&&typeof e.repeat=="boolean"&&typeof e.elliptical=="boolean"&&typeof e.aspectCorrect=="boolean"&&typeof e.softMask=="boolean",gt=e=>M(e)&&e.kind==="perspective"&&Array.isArray(e.points)&&e.points.length===4&&e.points.every(G)&&typeof e.repeat=="boolean",ft=e=>M(e)&&e.kind==="foliageSway"&&(e.maskPath===null||D(e.maskPath))&&(e.noisePath===null||D(e.noisePath))&&c(e.speed)&&c(e.strength)&&e.strength>=0&&c(e.phase)&&c(e.power)&&e.power>0&&c(e.noiseScale)&&e.noiseScale>=0&&c(e.ratio)&&e.ratio>0&&c(e.direction),xt=e=>M(e)&&e.kind==="waterFlow"&&(e.flowMapPath===null||D(e.flowMapPath))&&D(e.phasePath)&&c(e.speed)&&e.speed>=0&&c(e.strength)&&e.strength>=0&&c(e.phaseScale)&&e.phaseScale>0&&(e.phaseMode==="legacy"||e.phaseMode==="dual")&&(e.feather===null||c(e.feather)&&e.feather>=0&&e.feather<=.5),bt=e=>M(e)&&e.kind==="shake"&&(e.directionMapPath===null||D(e.directionMapPath))&&c(e.speed)&&e.speed>=0&&c(e.strength)&&e.strength>=0&&G(e.friction)&&e.friction.x>0&&e.friction.y>0&&G(e.bounds)&&e.bounds.y>e.bounds.x&&(e.directionMode===0||e.directionMode===1||e.directionMode===2),Tt=e=>M(e)&&e.kind==="blurPrecise"&&(e.maskPath===null||D(e.maskPath))&&G(e.scale)&&e.scale.x>0&&e.scale.y>0&&e.horizontalKernel===0&&e.verticalKernel===0&&typeof e.blurAlpha=="boolean",Et=e=>M(e)&&e.kind==="shimmer"&&c(e.brightness)&&e.brightness>=0&&Le(e.color)&&c(e.delay)&&e.delay>=0&&c(e.direction)&&c(e.granularity)&&e.granularity>0&&c(e.offset)&&c(e.speed),kt=e=>M(e)&&e.kind==="shine"&&(e.maskPath===null||D(e.maskPath))&&(e.noisePath===null||D(e.noisePath))&&c(e.threshold)&&e.threshold>=0&&e.threshold<=1&&c(e.noiseAmount)&&e.noiseAmount>=0&&c(e.noiseScale)&&e.noiseScale>0&&c(e.noiseSpeed)&&Le(e.rayColor)&&c(e.rayDirection)&&c(e.raySpeed)&&c(e.rayIntensity)&&e.rayIntensity>=0&&c(e.rayLength)&&e.rayLength>=0&&(e.edges===2||e.edges===3||e.edges===4||e.edges===5)&&(e.sampleMode===0||e.sampleMode===1||e.sampleMode===2||e.sampleMode===3||e.sampleMode===4)&&G(e.blurScale)&&e.blurScale.x>0&&e.blurScale.y>0&&e.kernel===0&&c(e.blendMode)&&Number.isInteger(e.blendMode)&&e.blendMode>=0&&e.blendMode<=32&&e.copyBackground===!1&&typeof e.noiseEnabled=="boolean",St=e=>M(e)&&e.kind==="godRays"&&(e.maskPath===null||D(e.maskPath))&&c(e.threshold)&&e.threshold>=0&&e.threshold<=1&&M(e.caster)&&(e.caster.mode==="radial"&&G(e.caster.center)||e.caster.mode==="directional"&&c(e.caster.direction))&&c(e.rayLength)&&e.rayLength>0&&e.rayLength<=1&&c(e.rayIntensity)&&e.rayIntensity>=0&&e.rayIntensity<=2&&Le(e.colorStart)&&Le(e.colorEnd)&&(e.sampleMode===0||e.sampleMode===1||e.sampleMode===2)&&G(e.blurScale)&&e.blurScale.x>0&&e.blurScale.y>0&&(e.kernel===0||e.kernel===1||e.kernel===2)&&c(e.blendMode)&&Number.isInteger(e.blendMode)&&e.blendMode>=0&&e.blendMode<=32,yt=e=>M(e)&&e.kind==="waterRipple"&&(e.maskPath===null||D(e.maskPath))&&D(e.normalPath)&&c(e.animationSpeed)&&c(e.scale)&&e.scale>=0&&c(e.scrollSpeed)&&c(e.direction)&&c(e.ratio)&&e.ratio>=0&&c(e.strength)&&e.strength>=0,wt=e=>M(e)&&e.kind==="iris"&&(e.maskPath===null||D(e.maskPath))&&G(e.scale)&&c(e.speed)&&c(e.rough)&&e.rough>=0&&e.rough<=1&&c(e.noiseAmount)&&c(e.phase)&&typeof e.background=="boolean",Pt=e=>M(e)&&e.kind==="cloudMotion"&&(e.maskPath===null||D(e.maskPath))&&(e.noisePath===null||D(e.noisePath))&&c(e.amount)&&c(e.direction)&&c(e.speed)&&c(e.scale)&&c(e.scaleX),Ut=e=>M(e)&&e.kind==="skew"&&c(e.top)&&c(e.bottom)&&c(e.left)&&c(e.right)&&typeof e.repeat=="boolean",Rt=e=>M(e)&&e.kind==="swing"&&(e.maskPath===null||D(e.maskPath))&&(e.noisePath===null||D(e.noisePath))&&G(e.point0)&&G(e.point1)&&c(e.size)&&c(e.center)&&c(e.feather)&&c(e.amount)&&c(e.speed)&&c(e.phase)&&c(e.noiseSpeed)&&c(e.noiseAmount)&&typeof e.doubleSided=="boolean"&&typeof e.noiseEnabled=="boolean",At=e=>M(e)&&e.kind==="filmGrain"&&(e.maskPath===null||D(e.maskPath))&&(e.noisePath===null||D(e.noisePath))&&c(e.strength)&&c(e.power)&&c(e.scale)&&typeof e.greyscale=="boolean"&&Xe(e.blendMode),Mt=e=>M(e)&&e.kind==="pulse"&&(e.maskPath===null||D(e.maskPath))&&c(e.speed)&&c(e.phase)&&c(e.amount)&&G(e.bounds)&&c(e.noiseSpeed)&&c(e.noiseAmount)&&c(e.power)&&Le(e.tintLow)&&Le(e.tintHigh)&&Xe(e.blendMode)&&typeof e.pulseAlpha=="boolean"&&typeof e.pulseColor=="boolean",Dt=e=>M(e)&&e.kind==="clouds"&&(e.cloudPath===null||D(e.cloudPath))&&(e.maskPath===null||D(e.maskPath))&&c(e.alpha)&&c(e.threshold)&&c(e.feather)&&Le(e.colorStart)&&Le(e.colorEnd)&&Bo(e.speed)&&e.speed.length===4&&Bo(e.scale)&&e.scale.length===4&&typeof e.shading=="boolean"&&Xe(e.blendMode)&&typeof e.writeAlpha=="boolean",Lt=e=>M(e)&&e.kind==="blurRadial"&&(e.maskPath===null||D(e.maskPath))&&c(e.scale)&&G(e.center)&&(e.kernel===0||e.kernel===1||e.kernel===2)&&typeof e.keepAlpha=="boolean",vt=e=>M(e)&&e.kind==="lightShafts"&&(e.noisePath===null||D(e.noisePath))&&Bo(e.transform)&&e.transform.length===9&&c(e.speed)&&G(e.scale)&&c(e.smoothness)&&G(e.feather)&&c(e.exponent)&&c(e.intensity)&&Le(e.colorStart)&&Le(e.colorEnd)&&Xe(e.blendMode),Ct=e=>M(e)&&e.kind==="glitter"&&(e.maskPath===null||D(e.maskPath))&&c(e.speed)&&c(e.density)&&c(e.scale)&&c(e.alpha)&&Le(e.color)&&Xe(e.blendMode),Ft=e=>M(e)&&e.kind==="waterCaustics"&&(e.maskPath===null||D(e.maskPath))&&(e.causticPath===null||D(e.causticPath))&&(e.uniformPath===null||D(e.uniformPath))&&(e.perlinPath===null||D(e.perlinPath))&&(e.glowPath===null||D(e.glowPath))&&c(e.brightness)&&c(e.glow)&&c(e.granularity)&&c(e.speed)&&c(e.timeOffset)&&c(e.distortion)&&c(e.chromatic)&&c(e.blur)&&Le(e.colorStart)&&Le(e.colorEnd)&&(e.mode===0||e.mode===1)&&Xe(e.blendMode),Bt=e=>M(e)&&e.kind==="depthParallax"&&(e.depthPath===null||D(e.depthPath))&&(e.maskPath===null||D(e.maskPath))&&G(e.scale)&&c(e.sens)&&c(e.center)&&(e.quality===0||e.quality===1||e.quality===2),Nt=e=>M(e)&&e.kind==="blur"&&(e.maskPath===null||D(e.maskPath))&&(e.kernel===0||e.kernel===1||e.kernel===2)&&G(e.scale)&&(e.composite===0||e.composite===1||e.composite===2||e.composite===3)&&Xe(e.blendMode)&&typeof e.compositeMono=="boolean"&&c(e.compositeAlpha)&&G(e.compositeOffset)&&Le(e.compositeColor)&&typeof e.keepAlpha=="boolean",It=e=>M(e)&&e.kind==="opacity"&&Or(e)||pt(e)||ht(e)||_t(e)||gt(e)||ft(e)||xt(e)||bt(e)||Tt(e)||Et(e)||kt(e)||St(e)||yt(e)||wt(e)||Pt(e)||Ut(e)||Rt(e)||At(e)||Mt(e)||Dt(e)||Lt(e)||vt(e)||Ct(e)||Ft(e)||Bt(e)||Nt(e)||M(e)&&e.kind==="waterWaves"&&Hr(e),Wt=e=>M(e)?D(e.id)&&Xo(e.name)&&c(e.zIndex)&&dt(e.source)&&G(e.center)&&Xr(e.size)&&G(e.scale)&&c(e.rotationDeg)&&c(e.opacity)&&e.opacity>=0&&e.opacity<=1&&(e.opacityEffects===void 0||Array.isArray(e.opacityEffects)&&e.opacityEffects.every(Or))&&(e.waterWavesEffects===void 0||Array.isArray(e.waterWavesEffects)&&e.waterWavesEffects.every(Hr))&&(e.textureEffects===void 0||Array.isArray(e.textureEffects)&&e.textureEffects.every(It))&&typeof e.visible=="boolean"&&(e.parallax===null||G(e.parallax))&&(e.puppetAttachment===void 0||nt(e.puppetAttachment))&&(e.centerAnimations===void 0||Array.isArray(e.centerAnimations)&&e.centerAnimations.every(mt))&&(e.blendMode===null||e.blendMode==="normal"||e.blendMode==="screen")&&ct(e.compatibility):!1,Xt=e=>M(e)&&Eo(e.width)&&Eo(e.height)&&(e.sizing==="explicit"||e.sizing==="inferred"||e.sizing==="fallback")&&c(e.coordinateOffsetX)&&c(e.coordinateOffsetY),Ot=e=>M(e)&&typeof e.enabled=="boolean"&&c(e.amount)&&e.amount>=0&&c(e.delay)&&e.delay>=0&&c(e.mouseInfluence)&&e.mouseInfluence>=0,Ht=e=>!M(e)||e.kind!=="chromaticAberration"?!1:G(e.center)&&c(e.centerFalloff)&&e.centerFalloff>=0&&e.centerFalloff<=1&&c(e.strength)&&e.strength>=0&&c(e.direction)&&(e.mode===0||e.mode===1||e.mode===2||e.mode===3)&&(e.variation===0||e.variation===1||e.variation===2),Gt=e=>M(e)&&(e.level==="warning"||e.level==="info")&&typeof e.code=="string"&&rt.has(e.code)&&Ye(e.message)&&Xo(e.layerId)&&Xo(e.path),zt=e=>M(e)&&Ye(e.code)&&Ye(e.message)&&(e.objectIndex===void 0||Xe(e.objectIndex))&&Xo(e.path),jt=e=>M(e)&&Xe(e.particleCount)&&Xe(e.otherObjectCount)&&Xe(e.unresolvedImageCount)&&Xe(e.effectLayerCount),$t=e=>M(e)?e.format==="tablab-we-scene"&&e.version===1&&D(e.sourceDescriptorPath)&&Xt(e.canvas)&&(e.cameraParallax===void 0||Ot(e.cameraParallax))&&(e.postProcessEffects===void 0||Array.isArray(e.postProcessEffects)&&e.postProcessEffects.every(Ht))&&Array.isArray(e.layers)&&e.layers.every(Wt)&&Array.isArray(e.diagnostics)&&e.diagnostics.every(Gt)&&Array.isArray(e.resourceDiagnostics)&&e.resourceDiagnostics.every(zt)&&jt(e.unsupported):!1,qo=1e-8,Yt=e=>[{x:e[3].x,y:1-e[3].y},{x:e[2].x,y:1-e[2].y},{x:e[1].x,y:1-e[1].y},{x:e[0].x,y:1-e[0].y}],Vt=e=>{const[r,t,i,a,m,g,_,l,f]=e,T=m*f-g*l,d=-(a*f-g*_),k=a*l-m*_,U=-(t*f-i*l),S=r*f-i*_,R=-(r*l-t*_),C=t*g-i*m,x=-(r*g-i*a),B=r*m-t*a,h=r*T+t*d+i*k;if(!Number.isFinite(h)||Math.abs(h)<qo)return null;const u=1/h;return[T*u,U*u,C*u,d*u,S*u,x*u,k*u,R*u,B*u]},Kt=e=>{const[r,t,i,a]=e,m=t.x-i.x,g=a.x-i.x,_=r.x-t.x+i.x-a.x,l=t.y-i.y,f=a.y-i.y,T=r.y-t.y+i.y-a.y;let d=0,k=0;if(Math.abs(_)>=qo||Math.abs(T)>=qo){const R=m*f-g*l;if(!Number.isFinite(R)||Math.abs(R)<qo)return null;d=(_*f-g*T)/R,k=(m*T-_*l)/R}const U=[t.x-r.x+d*t.x,a.x-r.x+k*a.x,r.x,t.y-r.y+d*t.y,a.y-r.y+k*a.y,r.y,d,k,1],S=Vt(U);return!S||S.some(R=>!Number.isFinite(R))?null:new Float32Array([S[0],S[3],S[6],S[1],S[4],S[7],S[2],S[5],S[8]])},qt=30,Qt=6,Zt=e=>typeof e=="number"&&Number.isFinite(e)&&e>0?{fps:e,timingSource:"metadata"}:{fps:qt,timingSource:"fallback"},Er=.85,kr=.15,Jt=.25,en=.05,on=e=>{const r=[],t=[];let i=!1,a=!1;for(const _ of e){if(_.opacity<=0||_.size.width<=0||_.size.height<=0)continue;const l=Math.abs(_.parallax?.x??0),f=Math.abs(_.parallax?.y??0);l>0?r.push(l):i=!0,f>0?t.push(f):a=!0}const m=i&&r.length>0?Math.min(kr,Math.max(...r)*Er):0,g=a&&t.length>0?Math.min(kr,Math.max(...t)*Er):0;return m>0||g>0?{cameraDepth:{x:m,y:g},relativeScale:Jt,relativeDepthCap:en}:null},rn=e=>e.textureEffects?e.textureEffects.map(r=>r.kind==="scroll"?{...r,speedY:r.speedY===0?0:-r.speedY,repeat:{...r.repeat}}:r.kind==="transform"?{...r,offset:{x:r.offset.x,y:r.offset.y===0?0:-r.offset.y},scale:{...r.scale}}:r.kind==="spin"?{...r,center:{x:r.center.x,y:1-r.center.y},speed:r.speed===0?0:-r.speed,axis:r.axis===0?0:-r.axis,phase:r.phase===0?0:-r.phase}:r.kind==="perspective"?{...r,points:Yt(r.points)}:r.kind==="foliageSway"?{...r,direction:r.direction===0?0:-r.direction}:r.kind==="shake"?{...r,friction:{...r.friction},bounds:{...r.bounds}}:r.kind==="blurPrecise"?{...r,scale:{...r.scale}}:r.kind==="shine"?{...r,rayColor:{...r.rayColor},blurScale:{...r.blurScale},rayDirection:r.rayDirection===0?0:-r.rayDirection,raySpeed:r.raySpeed===0?0:-r.raySpeed}:r.kind==="godRays"?{...r,caster:r.caster.mode==="radial"?{mode:"radial",center:{x:r.caster.center.x,y:1-r.caster.center.y}}:{mode:"directional",direction:r.caster.direction===0?0:-r.caster.direction},colorStart:{...r.colorStart},colorEnd:{...r.colorEnd},blurScale:{...r.blurScale}}:r.kind==="waterRipple"?{...r,direction:r.direction===0?0:-r.direction}:{...r}):(e.waterWavesEffects??[]).map(r=>({kind:"waterWaves",...r})),tn=(e,r)=>{e.kind==="opacity"?e.maskPath&&r.add(e.maskPath):e.kind==="waterWaves"?(e.maskPath&&r.add(e.maskPath),e.timeOffsetPath&&r.add(e.timeOffsetPath)):e.kind==="foliageSway"?(e.maskPath&&r.add(e.maskPath),e.noisePath&&r.add(e.noisePath)):e.kind==="waterFlow"?(e.flowMapPath&&r.add(e.flowMapPath),r.add(e.phasePath)):e.kind==="shake"?e.directionMapPath&&r.add(e.directionMapPath):e.kind==="blurPrecise"?e.maskPath&&r.add(e.maskPath):e.kind==="shine"?(e.maskPath&&r.add(e.maskPath),e.noisePath&&r.add(e.noisePath)):e.kind==="godRays"?e.maskPath&&r.add(e.maskPath):e.kind==="waterRipple"?(e.maskPath&&r.add(e.maskPath),r.add(e.normalPath)):e.kind==="iris"?e.maskPath&&r.add(e.maskPath):e.kind==="cloudMotion"||e.kind==="swing"||e.kind==="filmGrain"?(e.maskPath&&r.add(e.maskPath),e.noisePath&&r.add(e.noisePath)):e.kind==="pulse"?e.maskPath&&r.add(e.maskPath):e.kind==="clouds"?(e.cloudPath&&r.add(e.cloudPath),e.maskPath&&r.add(e.maskPath)):e.kind==="blurRadial"?e.maskPath&&r.add(e.maskPath):e.kind==="lightShafts"?e.noisePath&&r.add(e.noisePath):e.kind==="glitter"?e.maskPath&&r.add(e.maskPath):e.kind==="waterCaustics"?(e.maskPath&&r.add(e.maskPath),e.causticPath&&r.add(e.causticPath),e.uniformPath&&r.add(e.uniformPath),e.perlinPath&&r.add(e.perlinPath),e.glowPath&&r.add(e.glowPath)):e.kind==="depthParallax"?(e.depthPath&&r.add(e.depthPath),e.maskPath&&r.add(e.maskPath)):e.kind==="blur"&&e.maskPath&&r.add(e.maskPath)},nn=e=>{if(!$t(e))return null;const r=e,t=[],i=new Set;let a=0,m=0,g=0;for(const l of r.layers){if(!l.visible||l.opacity<=0)continue;let f;if(l.source.kind==="solidColor")f={kind:"solidColor",color:{...l.source.color}};else if(l.source.kind==="text"){l.source.fontPath&&i.add(l.source.fontPath);const x=l.source.fontReference??(l.source.fontPath===null&&l.compatibility.weMaterialPath!=="builtin:font-fallback"?l.compatibility.weMaterialPath:void 0);f={kind:"text",text:l.source.text,fontReference:x,fontPath:l.source.fontPath,pointSize:l.source.pointSize,color:{...l.source.color},horizontalAlign:l.source.horizontalAlign,verticalAlign:l.source.verticalAlign,padding:l.source.padding,limitWidth:l.source.limitWidth??!1,maxWidth:l.source.maxWidth??null,limitRows:l.source.limitRows??!1,maxRows:l.source.maxRows??null,useEllipsis:l.source.useEllipsis??!1,spacing:l.source.spacing?{...l.source.spacing}:{x:0,y:0},textShadow:l.source.textShadow?{offset:{...l.source.textShadow.offset},color:{...l.source.textShadow.color},alpha:l.source.textShadow.alpha,drawBorder:l.source.textShadow.drawBorder}:void 0,dynamicText:l.source.dynamicText?{kind:l.source.dynamicText.kind,refresh:l.source.dynamicText.refresh,parts:l.source.dynamicText.parts.map(B=>B.kind==="lookup"?{...B,values:[...B.values]}:{...B})}:void 0}}else if(l.source.kind==="image")i.add(l.source.path),f={kind:"image",path:l.source.path};else if(l.source.kind==="puppetMesh")i.add(l.source.path),l.source.modelPath&&i.add(l.source.modelPath),f={kind:"puppetMesh",path:l.source.path,mesh:{positions:[...l.source.mesh.positions],positions3d:l.source.mesh.positions3d?[...l.source.mesh.positions3d]:void 0,uvs:[...l.source.mesh.uvs],indices:[...l.source.mesh.indices],bounds:{...l.source.mesh.bounds}},modelPath:l.source.modelPath??null,animationLayers:(l.source.animationLayers??[]).map(x=>({...x})),animationMode:l.source.animationMode};else if(l.source.kind==="composition"){for(const x of l.source.effects)x.kind==="blend"?(i.add(x.texturePath),x.maskPath&&i.add(x.maskPath)):x.kind==="opacity"&&x.maskPath&&i.add(x.maskPath);f={kind:"composition",effects:l.source.effects.map(x=>x.kind==="tint"?{...x,color:{...x.color}}:x.kind==="transform"?{...x,offset:{...x.offset},scale:{...x.scale}}:x.kind==="fisheye"?{...x,center:{...x.center}}:{...x})}}else{if(l.source.frames.length===0)continue;const x=Zt(l.source.fps);a+=1,x.timingSource==="fallback"&&(g+=1),f={kind:"frameAnimation",frames:[...l.source.frames],fps:x.fps,timingSource:x.timingSource}}const T=l.opacityEffects??[],d=T.map(x=>x.maskPath).filter(x=>x!==null);d.forEach(x=>i.add(x));const k=T.reduce((x,B)=>x*B.alpha,1),U=(l.waterWavesEffects??[]).map(x=>({...x}));for(const x of U)x.maskPath&&i.add(x.maskPath),x.timeOffsetPath&&i.add(x.timeOffsetPath);const S=rn(l);S.forEach(x=>tn(x,i));const R=l.puppetAttachment?{...l.puppetAttachment,parentAnimationLayers:l.puppetAttachment.parentAnimationLayers.map(x=>({...x})),parentOrigin:{...l.puppetAttachment.parentOrigin},parentScale:{...l.puppetAttachment.parentScale},localMatrix:{...l.puppetAttachment.localMatrix},bindTransform:{...l.puppetAttachment.bindTransform},localCenter:{...l.puppetAttachment.localCenter},localScale:{...l.puppetAttachment.localScale}}:void 0;R&&i.add(R.parentModelPath);const C=(l.centerAnimations??[]).map(x=>({fps:x.fps,lengthFrames:x.lengthFrames,mode:x.mode,x:x.x.map(B=>({...B})),y:x.y.map(B=>({...B}))}));C.length>0&&(m+=1),t.push({id:l.id,name:l.name,zIndex:l.zIndex,source:f,center:{...l.center},size:{...l.size},scale:{...l.scale},rotationDeg:l.rotationDeg,opacity:Math.min(1,Math.max(0,l.opacity*k)),blendMode:l.blendMode==="screen"||l.blendMode===null&&l.compatibility.weColorBlendMode===7?"screen":l.blendMode==="normal"?"normal":void 0,opacityMaskPaths:d,waterWavesEffects:U,textureEffects:S,parallax:l.parallax?{...l.parallax}:null,...R?{puppetAttachment:R}:{},centerAnimations:C})}t.sort((l,f)=>l.zIndex-f.zIndex);const _=on(t);return{canvas:{width:r.canvas.width,height:r.canvas.height},cameraParallax:r.cameraParallax?{...r.cameraParallax}:{enabled:!1,amount:0,delay:0,mouseInfluence:0},cameraParallaxSceneMotion:_,postProcessEffects:(r.postProcessEffects??[]).map(l=>({...l,center:{...l.center}})),layers:t,animationLayerCount:a,propertyAnimationLayerCount:m,fallbackTimingLayerCount:g,staticResourcePaths:[...i]}},Gr=(e,r)=>{if(!Number.isFinite(r)||r<=0||!Number.isFinite(e.fps)||e.fps<=0||!Number.isFinite(e.lengthFrames)||e.lengthFrames<=0)return 0;const t=r*e.fps/1e3;if(e.mode==="single")return Math.min(t,e.lengthFrames);if(e.mode==="loop")return t%e.lengthFrames;const i=e.lengthFrames*2,a=t%i;return a<=e.lengthFrames?a:i-a},Sr=(e,r,t)=>{const i=e[0],a=e[e.length-1];if(!i||!a)return 0;if(t.mode==="loop"&&e.length>1){if(r<i.frame){const m=a.frame-t.lengthFrames,g=i.frame-m,_=g>0?(r-m)/g:1;return a.value+(i.value-a.value)*_}if(r>a.frame&&t.lengthFrames>a.frame){const g=i.frame+t.lengthFrames-a.frame,_=g>0?(r-a.frame)/g:0;return a.value+(i.value-a.value)*_}}if(r<=i.frame)return i.value;for(let m=1;m<e.length;m+=1){const g=e[m];if(r>g.frame)continue;const _=e[m-1],l=g.frame-_.frame;if(l<=0)return g.value;const f=(r-_.frame)/l;return _.value+(g.value-_.value)*f}return a.value},an=(e,r)=>{const t=Gr(e,r);return{x:Sr(e.x,t,e),y:Sr(e.y,t,e)}},sn=(e,r)=>{let t=e.center.x,i=e.center.y;for(const a of e.centerAnimations){const m=an(a,r);t+=m.x,i+=m.y}return{x:t,y:i}},Zo=(e,r,t)=>!Number.isFinite(e)||e<=0||!Number.isFinite(r)||r<=0||!Number.isSafeInteger(t)||t<=1?0:Math.floor(e*r/1e3)%t,un=(e,r)=>{const t=Zo(r,e.fps,e.frames.length),i=e.frames.length>1?(t+1)%e.frames.length:t;return{currentIndex:t,nextIndex:i,currentPath:e.frames[t],nextPath:e.frames[i]}},ln=(e,r)=>{const t=new Set(e.staticResourcePaths);for(const i of e.layers){if(i.source.kind!=="frameAnimation")continue;const a=i.source.frames.length,m=Zo(r,i.source.fps,a),g=Math.min(a,Qt);for(let _=0;_<g;_+=1)t.add(i.source.frames[(m+_)%a])}return[...t]},dn=(e,r)=>e.source.kind==="solidColor"||e.source.kind==="text"||e.source.kind==="composition"?null:e.source.kind==="image"||e.source.kind==="puppetMesh"?e.source.path:un(e.source,r).currentPath,cn=(e,r,t=null)=>{if(e.source.kind==="solidColor"||e.source.kind==="text"||e.source.kind==="composition")return[];if(e.source.kind==="image"||e.source.kind==="puppetMesh")return[e.source.path];const i=e.source.frames.length;if(i===0)return[];const a=Zo(r,e.source.fps,i),m=[e.source.frames[a],e.source.frames[(a-1+i)%i],e.source.frames[(a+1)%i]];return t&&m.push(t),[...new Set(m)]},$o=e=>typeof e=="number"&&Number.isFinite(e)&&e>0,mn=(e,r)=>!$o(e.width)||!$o(e.height)||!$o(r.width)||!$o(r.height)?1:Math.max(r.width/e.width,r.height/e.height),Qo=e=>String(e).padStart(2,"0"),pn=(e,r)=>r?[...e].join(r):e,hn=(e,r)=>{let t;e.field==="dayOfMonth"?t=r.getDate():e.field==="month"?t=r.getMonth()+1:t=r.getFullYear();const i=e.twoDigit?Qo(t):String(t);return pn(i,e.digitSeparator)},_n=(e,r)=>{const t=e.field==="month"?r.getMonth():e.field==="weekday"?r.getDay():r.getDate();return e.values[t]??""},gn=(e,r)=>{if(e.kind!=="dateTime")return"";let t="";for(const i of e.parts)if(i.kind==="literal")t+=i.value;else if(i.kind==="hour"){let a=r.getHours();i.use24Hour||(a=a%12||12),t+=i.twoDigit?Qo(a):String(a)}else if(i.kind==="minute"){const a=r.getMinutes();t+=i.twoDigit?Qo(a):String(a)}else if(i.kind==="second"){const a=r.getSeconds();t+=i.twoDigit?Qo(a):String(a)}else i.kind==="dayPeriod"?t+=r.getHours()>=12?i.pm:i.am:i.kind==="number"?t+=hn(i,r):i.kind==="lookup"&&(t+=_n(i,r));return t},Yo=()=>({x:0,y:0}),Vo=e=>Math.abs(e)<1e-12?0:e,fn=(e,r)=>{if(!Number.isFinite(r.strength)||r.strength<=0)return{red:Yo(),green:Yo(),blue:Yo()};const t=Math.max(1,e.width,e.height),i=r.mode===1?1:.5,a=r.strength*.01*t*i;let m=1,g=0;r.mode===1&&(m=-Math.sin(r.direction),g=Math.cos(r.direction));const _=.75+Math.min(1,Math.max(0,r.centerFalloff))*.25,l={x:Vo(m*a*_),y:Vo(g*a*_)},f={x:Vo(-l.x),y:Vo(-l.y)},T=Yo();return r.variation===1?{red:T,green:f,blue:l}:r.variation===2?{red:f,green:l,blue:T}:{red:l,green:T,blue:f}},xn=e=>Math.max(.1,e)*4,bn=({width:e,height:r,scaleX:t,scaleY:i,rotationDeg:a,horizontalAlign:m,verticalAlign:g})=>{const _=m==="left"?e/2:m==="right"?-e/2:0,l=g==="top"?r/2:g==="bottom"?-r/2:0,f=_*t,T=l*i,d=a*(Math.PI/180),k=Math.cos(d),U=Math.sin(d);return{x:f*k-T*U,y:f*U+T*k}},yr=e=>Math.min(1,Math.max(-1,e)),Tn=(e,r,t)=>({x:t.width>0?yr(e/t.width*2-1):0,y:t.height>0?yr(r/t.height*2-1):0}),En=(e,r,t,i,a=null)=>{if(!r.enabled||r.amount<=0||r.mouseInfluence<=0)return{x:0,y:0};if(!t)return{x:0,y:0};const m=f=>{if(!a)return f;const T=f*a.relativeScale,d=Math.max(0,a.relativeDepthCap);return Math.max(-d,Math.min(d,T))},g=r.amount*r.mouseInfluence,_=-i.x*e.width*.5*g*m(t.x),l=-i.y*e.height*.5*g*m(t.y);return{x:_===0?0:_,y:l===0?0:l}},kn=(e,r,t,i)=>{if(!t||!r.enabled||r.amount<=0||r.mouseInfluence<=0)return{x:0,y:0};const a=r.amount*r.mouseInfluence,m=-i.x*e.width*.5*a*t.cameraDepth.x,g=-i.y*e.height*.5*a*t.cameraDepth.y;return{x:m===0?0:m,y:g===0?0:g}},Sn=(e,r,t)=>{if(!t||!r.enabled||r.amount<=0||r.mouseInfluence<=0)return 1;const i=r.amount*r.mouseInfluence,a=Math.abs(t.cameraDepth.x)*.5*i,m=Math.abs(t.cameraDepth.y)*.5*i;return 1+Math.min(.08,Math.max(a,m)*2)},yn=(e,r,t,i)=>{if(!Number.isFinite(t)||t<=0)return{...r};if(!Number.isFinite(i)||i<=0)return{...e};const a=Math.max(1,t*1e3),m=1-Math.exp(-i/a);return{x:e.x+(r.x-e.x)*m,y:e.y+(r.y-e.y)*m}},wn=e=>e.enabled&&e.amount>0&&e.mouseInfluence>0,Pn=`
attribute vec2 a_position;
attribute vec2 a_uv;
uniform vec2 u_resolution;
varying vec2 v_uv;
void main() {
    vec2 zeroToOne = a_position / u_resolution;
    vec2 clip = zeroToOne * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    v_uv = a_uv;
}`,Un=`
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_uv;
void main() {
    gl_FragColor = texture2D(u_texture, v_uv);
}`,wr=(e,r,t)=>{const i=e.createShader(r);return i?(e.shaderSource(i,t),e.compileShader(i),e.getShaderParameter(i,e.COMPILE_STATUS)?i:(e.deleteShader(i),null)):null};class Rn{canvas=null;gl=null;program=null;positionBuffer=null;uvBuffer=null;indexBuffer=null;positionLocation=-1;uvLocation=-1;resolutionLocation=null;textureLocation=null;textures=new Map;invalid=!1;resetResources(){this.gl=null,this.program=null,this.positionBuffer=null,this.uvBuffer=null,this.indexBuffer=null,this.positionLocation=-1,this.uvLocation=-1,this.resolutionLocation=null,this.textureLocation=null,this.textures.clear()}initialize(){if(typeof document>"u")return!1;const r=document.createElement("canvas");r.width=1,r.height=1;const t=r.getContext("webgl",{alpha:!0,antialias:!0,premultipliedAlpha:!0,preserveDrawingBuffer:!0});if(!t)return!1;const i=wr(t,t.VERTEX_SHADER,Pn),a=wr(t,t.FRAGMENT_SHADER,Un);if(!i||!a)return!1;const m=t.createProgram();if(!m)return!1;if(t.attachShader(m,i),t.attachShader(m,a),t.linkProgram(m),t.deleteShader(i),t.deleteShader(a),!t.getProgramParameter(m,t.LINK_STATUS))return t.deleteProgram(m),!1;const g=t.createBuffer(),_=t.createBuffer(),l=t.createBuffer();return!g||!_||!l?(t.deleteProgram(m),!1):(this.canvas=r,this.gl=t,this.program=m,this.positionBuffer=g,this.uvBuffer=_,this.indexBuffer=l,this.positionLocation=t.getAttribLocation(m,"a_position"),this.uvLocation=t.getAttribLocation(m,"a_uv"),this.resolutionLocation=t.getUniformLocation(m,"u_resolution"),this.textureLocation=t.getUniformLocation(m,"u_texture"),this.invalid=!1,r.addEventListener("webglcontextlost",f=>{f.preventDefault(),this.invalid=!0}),t.clearColor(0,0,0,0),t.enable(t.BLEND),t.blendFunc(t.ONE,t.ONE_MINUS_SRC_ALPHA),!0)}ensureReady(r,t){if((!this.gl||!this.canvas||!this.program||this.invalid||this.gl.isContextLost())&&(this.resetResources(),this.canvas=null,!this.initialize()))return!1;const i=this.canvas;if(!i)return!1;const a=Math.max(i.width,Math.max(1,Math.ceil(r))),m=Math.max(i.height,Math.max(1,Math.ceil(t)));return i.width!==a&&(i.width=a),i.height!==m&&(i.height=m),!0}resolveTexture(r,t,i){const a=this.gl;if(!a)return null;let m=this.textures.get(r);if(!m){const g=a.createTexture();if(!g)return null;m={texture:g,revision:Number.NaN},this.textures.set(r,m)}return a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,m.texture),m.revision!==i&&(a.pixelStorei(a.UNPACK_PREMULTIPLY_ALPHA_WEBGL,1),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR),a.texImage2D(a.TEXTURE_2D,0,a.RGBA,a.RGBA,a.UNSIGNED_BYTE,t),m.revision=i),m.texture}render(r){const t=Math.max(1,Math.ceil(r.width)),i=Math.max(1,Math.ceil(r.height));if(!this.ensureReady(t,i))return!1;const a=this.gl,m=this.canvas,g=this.program,_=this.positionBuffer,l=this.uvBuffer,f=this.indexBuffer;if(!a||!m||!g||!_||!l||!f||!this.resolveTexture(r.textureKey,r.textureSource,r.textureRevision))return!1;a.useProgram(g),a.uniform2f(this.resolutionLocation,t,i),a.uniform1i(this.textureLocation,0),a.bindBuffer(a.ARRAY_BUFFER,_),a.bufferData(a.ARRAY_BUFFER,r.positions,a.DYNAMIC_DRAW),a.enableVertexAttribArray(this.positionLocation),a.vertexAttribPointer(this.positionLocation,2,a.FLOAT,!1,0,0),a.bindBuffer(a.ARRAY_BUFFER,l),a.bufferData(a.ARRAY_BUFFER,r.uvs,a.STATIC_DRAW),a.enableVertexAttribArray(this.uvLocation),a.vertexAttribPointer(this.uvLocation,2,a.FLOAT,!1,0,0),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,f),a.bufferData(a.ELEMENT_ARRAY_BUFFER,r.indices,a.STATIC_DRAW),a.viewport(0,m.height-i,t,i),a.clear(a.COLOR_BUFFER_BIT),a.drawElements(a.TRIANGLES,r.indices.length,a.UNSIGNED_SHORT,0),a.flush();const d=r.target.getContext("2d");return d?(d.clearRect(0,0,t,i),d.drawImage(m,0,0,t,i,0,0,t,i),!0):!1}releaseTexture(r){const t=this.textures.get(r);if(!t)return;const i=this.gl;i&&!i.isContextLost()&&i.deleteTexture(t.texture),this.textures.delete(r)}}let sr=null;const An=()=>(sr??=new Rn,sr),Mn=e=>An().render(e),Dn=e=>{sr?.releaseTexture(e)},Ln=`
attribute vec2 a_position;
attribute vec2 a_uv;
uniform vec2 u_resolution;
varying vec2 v_uv;
void main() {
    vec2 zeroToOne = a_position / u_resolution;
    vec2 clip = zeroToOne * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    v_uv = a_uv;
}`,vn=`
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_uv;
void main() {
    gl_FragColor = texture2D(u_texture, v_uv);
}`,Pr=(e,r,t)=>{const i=e.createShader(r);return i?(e.shaderSource(i,t),e.compileShader(i),e.getShaderParameter(i,e.COMPILE_STATUS)?i:(e.deleteShader(i),null)):null},lr=N.forwardRef(({src:e,mesh:r,modelSrc:t=null,animationLayers:i=[],animationMode:a,timeOriginMs:m=0,className:g,style:_,dataSource:l},f)=>{const T=N.useRef(null),d=N.useRef(null),k=N.useMemo(()=>a!=="orthographic3d"?r.bounds:Kr(r)??r.bounds,[a,r]),U=Math.max(1,Math.ceil(k.maxX-k.minX)),S=Math.max(1,Math.ceil(k.maxY-k.minY));N.useImperativeHandle(f,()=>({updateTexture:C=>d.current?.(C)}),[]);const R=N.useMemo(()=>i.map(C=>[C.animationId,C.additive?1:0,C.blend,C.blendIn?1:0,C.blendOut?1:0,C.rate,C.visible?1:0].join(":")).join("|"),[i]);return N.useEffect(()=>{const C=T.current;if(!C)return;const x=U,B=S;if(C.width=x,C.height=B,a==="orthographic3d"){const P=C.getContext("2d");if(!P)return;const w=new Float32Array(r.positions.length);(V=>{for(let ue=0;ue<w.length;ue+=2)w[ue]=V[ue]-k.minX,w[ue+1]=k.maxY-V[ue+1]})(r.positions);const Ue=new Float32Array(r.uvs),fe=new Uint16Array(r.indices),Z={};let Ee=!1,Y=0,ae=null,te=0;const se=()=>{Ee||!ae||Mn({target:C,textureKey:Z,textureSource:ae,textureRevision:te,width:x,height:B,positions:w,uvs:Ue,indices:fe})},Re=V=>{Ee||(ae=V,te+=1,se())};d.current=Re;const de=new Image;return de.decoding="async",de.onload=()=>Re(de),de.src=e,t&&i.some(V=>V.visible)&&fetch(t).then(V=>{if(!V.ok)throw new Error(`HTTP ${V.status}`);return V.arrayBuffer()}).then(V=>{if(Ee)return;const ue=ar(new Uint8Array(V));if(!ue||ue.positions.length!==r.positions.length)return;const Ae=qr(ue,i);if(!Ae||!ue.positions3d)return;const no=new Float32Array(ue.positions3d.length),Ge=xe=>{if(Y=0,!Ee){if(!document.hidden){const ke=Math.max(0,xe-m),Se=Qr(Ae,ke,no);if(Se){for(let ne=0;ne<w.length/2;ne+=1)w[ne*2]=Se[ne*3]-k.minX,w[ne*2+1]=k.maxY-Se[ne*3+1];se()}}Y=window.requestAnimationFrame(Ge)}};Y=window.requestAnimationFrame(Ge)}).catch(V=>{}),()=>{Ee=!0,d.current=null,de.onload=null,Y&&window.cancelAnimationFrame(Y),Dn(Z),P.clearRect(0,0,x,B)}}const h=C.getContext("webgl",{alpha:!0,antialias:!0,premultipliedAlpha:!0});if(!h)return;const u=Pr(h,h.VERTEX_SHADER,Ln),v=Pr(h,h.FRAGMENT_SHADER,vn);if(!u||!v)return;const y=h.createProgram();if(!y)return;if(h.attachShader(y,u),h.attachShader(y,v),h.linkProgram(y),h.deleteShader(u),h.deleteShader(v),!h.getProgramParameter(y,h.LINK_STATUS)){h.deleteProgram(y);return}const o=h.createBuffer(),j=h.createBuffer(),X=h.createBuffer(),F=h.createTexture();if(!o||!j||!X||!F){h.deleteProgram(y);return}const ee=new Float32Array(r.positions.length),A=P=>{for(let w=0;w<ee.length;w+=2)ee[w]=P[w]-k.minX,ee[w+1]=k.maxY-P[w+1]};A(r.positions);const to=new Float32Array(r.uvs),re=new Uint16Array(r.indices);h.bindBuffer(h.ARRAY_BUFFER,o),h.bufferData(h.ARRAY_BUFFER,ee,h.DYNAMIC_DRAW),h.bindBuffer(h.ARRAY_BUFFER,j),h.bufferData(h.ARRAY_BUFFER,to,h.STATIC_DRAW),h.bindBuffer(h.ELEMENT_ARRAY_BUFFER,X),h.bufferData(h.ELEMENT_ARRAY_BUFFER,re,h.STATIC_DRAW),h.useProgram(y);const Ve=h.getAttribLocation(y,"a_position"),$=h.getAttribLocation(y,"a_uv"),Uo=h.getUniformLocation(y,"u_resolution"),ko=h.getUniformLocation(y,"u_texture");h.uniform2f(Uo,x,B),h.uniform1i(ko,0),h.bindBuffer(h.ARRAY_BUFFER,o),h.enableVertexAttribArray(Ve),h.vertexAttribPointer(Ve,2,h.FLOAT,!1,0,0),h.bindBuffer(h.ARRAY_BUFFER,j),h.enableVertexAttribArray($),h.vertexAttribPointer($,2,h.FLOAT,!1,0,0),h.bindBuffer(h.ELEMENT_ARRAY_BUFFER,X),h.viewport(0,0,x,B),h.clearColor(0,0,0,0),h.enable(h.BLEND),h.blendFunc(h.ONE,h.ONE_MINUS_SRC_ALPHA);let fo=!1,q=0,me=!1;const I=()=>{fo||!me||(h.clear(h.COLOR_BUFFER_BIT),h.drawElements(h.TRIANGLES,re.length,h.UNSIGNED_SHORT,0))},Be=P=>{fo||(h.activeTexture(h.TEXTURE0),h.bindTexture(h.TEXTURE_2D,F),h.pixelStorei(h.UNPACK_PREMULTIPLY_ALPHA_WEBGL,1),h.texParameteri(h.TEXTURE_2D,h.TEXTURE_WRAP_S,h.CLAMP_TO_EDGE),h.texParameteri(h.TEXTURE_2D,h.TEXTURE_WRAP_T,h.CLAMP_TO_EDGE),h.texParameteri(h.TEXTURE_2D,h.TEXTURE_MIN_FILTER,h.LINEAR),h.texParameteri(h.TEXTURE_2D,h.TEXTURE_MAG_FILTER,h.LINEAR),h.texImage2D(h.TEXTURE_2D,0,h.RGBA,h.RGBA,h.UNSIGNED_BYTE,P),me=!0,I())};d.current=Be;const ho=new Image;return ho.decoding="async",ho.onload=()=>Be(ho),ho.src=e,t&&i.some(P=>P.visible)&&fetch(t).then(P=>{if(!P.ok)throw new Error(`HTTP ${P.status}`);return P.arrayBuffer()}).then(P=>{if(fo)return;const w=ar(new Uint8Array(P));if(!w||w.positions.length!==r.positions.length)return;const Pe=Ir(w,i);if(!Pe)return;const Ue=new Float32Array(w.positions.length),fe=Z=>{if(q=0,!fo){if(!document.hidden){const Ee=Math.max(0,Z-m);if(Pe&&Ue){const Y=Zr(Pe,Ee,Ue);Y&&(A(Y),h.bindBuffer(h.ARRAY_BUFFER,o),h.bufferSubData(h.ARRAY_BUFFER,0,ee),I())}}q=window.requestAnimationFrame(fe)}};q=window.requestAnimationFrame(fe)}).catch(P=>{}),()=>{fo=!0,d.current=null,ho.onload=null,q&&window.cancelAnimationFrame(q),h.deleteTexture(F),h.deleteBuffer(o),h.deleteBuffer(j),h.deleteBuffer(X),h.deleteProgram(y),h.getExtension("WEBGL_lose_context")?.loseContext()}},[i,a,R,r,t,k,S,U,e,m]),H.jsx("canvas",{ref:T,className:g,"data-we-source":l,style:a==="orthographic3d"?{..._,width:`${U}px`,height:`${S}px`}:_},a==="orthographic3d"?"shared-orthographic3d":"local-webgl")});lr.displayName="WePuppetMeshLayer";const nr=e=>`matrix(${e.a}, ${e.b}, ${e.c}, ${e.d}, ${e.tx}, ${e.ty})`,ir=new Map,Cn=e=>{const r=ir.get(e);if(r)return r;const t=fetch(e).then(i=>{if(!i.ok)throw new Error(`HTTP ${i.status}`);return i.arrayBuffer()}).then(i=>ar(new Uint8Array(i))).catch(i=>{throw ir.delete(e),i});return ir.set(e,t),t},Fn=({binding:e,modelSrc:r,timeOriginMs:t,parallaxOffset:i,zIndex:a,children:m})=>{const g=N.useRef(null);return N.useEffect(()=>{const _=g.current;if(!_||(_.style.transform=nr(e.bindTransform),!r||e.parentAnimationMode!=="2d"))return;let l=!1,f=0;const T=()=>{f&&window.cancelAnimationFrame(f),f=0};return Cn(r).then(d=>{if(l||!d)return;const k=d.attachments.find(R=>R.name===e.name&&R.boneIndex===e.boneIndex);if(!k)return;const U=Ir(d,e.parentAnimationLayers);if(!U)return;const S=R=>{if(f=0,!l){if(!document.hidden){const C=Jr(U,k,Math.max(0,R-t));C&&(_.style.transform=nr(et(C)))}f=window.requestAnimationFrame(S)}};f=window.requestAnimationFrame(S)}).catch(d=>{}),()=>{l=!0,T()}},[e,r,t]),H.jsx("div",{style:{position:"absolute",left:`${e.parentOrigin.x+i.x}px`,top:`${e.parentOrigin.y+i.y}px`,zIndex:a,transformOrigin:"0 0",transform:`rotate(${e.parentRotationDeg}deg) scale(${e.parentScale.x}, ${e.parentScale.y})`,pointerEvents:"none"},children:H.jsx("div",{ref:g,style:{position:"absolute",left:0,top:0,transformOrigin:"0 0",transform:nr(e.bindTransform)},children:m})})},Bn=12;let Ko=0;const Nn=()=>{if(Ko>=Bn)return null;Ko+=1;let e=!1;return()=>{e||(e=!0,Ko=Math.max(0,Ko-1))}},In=`
attribute vec2 a_Position;
varying vec2 v_TexCoord;
void main() {
    gl_Position = vec4(a_Position, 0.0, 1.0);
    v_TexCoord = a_Position * 0.5 + 0.5;
}
`,Wn=`
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
`,Xn=`
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
`,On=`
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
`,Hn=`
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
`,Gn=`
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
`,zn=`
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
`,jn=`
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
`,$n=`
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
`,Yn=`
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
`,Vn=`
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
`,Kn=`
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
`,qn=`
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
`,Po=`
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
`,Qn=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Rays;
uniform sampler2D u_Original;
uniform int u_BlendMode;

${Po}

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
`,Zn=`
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
`,Jn=`
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
`,ei=`
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
`,oi=`
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
`,ri=`
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
`,ti=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Mask;
uniform bool u_HasMask;
uniform float u_Time;
uniform vec2 u_Scale;
uniform float u_Speed;
uniform float u_Rough;
uniform float u_NoiseAmount;
uniform float u_Phase;

void main() {
    // Mirrors Wallpaper Engine's effects/iris.vert: a two-beat breathing motion
    // interpolated across each integer cycle, plus a small sinusoidal wobble.
    float time = u_Time * u_Speed + u_Phase;
    float lowDt = floor(time);

    float startX = sin(1.9 * lowDt) + sin(2.5 * lowDt + 1.0);
    float startY = sin(1.9 * lowDt) + sin(2.5 * (lowDt + 1.0) + 2.0);
    float endX = sin(1.9 * (lowDt + 1.0)) + sin(2.5 * (lowDt + 1.0) + 1.0);
    float endY = sin(1.9 * (lowDt + 1.0)) + sin(2.5 * (lowDt + 1.0) + 2.0);

    // rough = 0 collapses the smoothstep edges; guard the degenerate range so
    // the division inside smoothstep cannot produce NaN.
    float edge = min(1.0 - u_Rough, 0.999);
    float blend = smoothstep(edge, 1.0, cos(fract(time) * 3.14159265359) * -0.5 + 0.5);

    vec2 offset = vec2(mix(startX, endX, blend), mix(startY, endY, blend));
    offset += vec2(sin(time), cos(time)) * u_NoiseAmount;
    offset *= u_Scale * 0.001;

    float mask = u_HasMask ? texture2D(u_Mask, v_TexCoord).r : 1.0;
    gl_FragColor = texture2D(u_Source, v_TexCoord + offset * mask);
}
`,ni=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Mask;
uniform sampler2D u_Noise;
uniform bool u_HasMask;
uniform float u_Time;
uniform float u_Amount;
uniform float u_Direction;
uniform float u_Speed;
uniform float u_Scale;
uniform float u_ScaleX;
uniform float u_Aspect;

void main() {
    // Mirrors Wallpaper Engine's effects/cloudmotion.vert + .frag: a perlin
    // sample drifts the UVs horizontally, rotated into the authored direction.
    vec2 noiseCoord = vec2(
        v_TexCoord.x * u_Aspect * u_Scale * u_ScaleX + u_Time * u_Speed,
        v_TexCoord.y * u_Scale
    );
    float drift = (texture2D(u_Noise, noiseCoord).r * 2.0 - 1.0) * u_Amount;
    float mask = u_HasMask ? texture2D(u_Mask, v_TexCoord).r : 1.0;

    float angle = u_Direction + 1.57079632679;
    float offset = drift * mask;
    vec2 displaced = v_TexCoord + vec2(offset * cos(angle), offset * sin(angle));

    // With a mask the destination is re-sampled so the drift fades out instead
    // of cutting off at the mask edge.
    if (u_HasMask) {
        displaced = mix(v_TexCoord, displaced, texture2D(u_Mask, displaced).r);
    }

    gl_FragColor = texture2D(u_Source, displaced);
}
`,ii=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform float u_Top;
uniform float u_Bottom;
uniform float u_Left;
uniform float u_Right;
uniform bool u_Repeat;

void main() {
    // Mirrors Wallpaper Engine's effects/skew.vert (MODE=0, UV shear). Both
    // quadrant tests use the ORIGINAL coordinate, not the running one.
    vec2 uv = v_TexCoord;
    uv.x -= v_TexCoord.y <= 0.5 ? u_Top : u_Bottom;
    uv.y += v_TexCoord.x <= 0.5 ? u_Left : u_Right;
    if (u_Repeat) uv = fract(uv);
    gl_FragColor = texture2D(u_Source, uv);
}
`,ai=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Mask;
uniform sampler2D u_Noise;
uniform bool u_HasMask;
uniform bool u_NoiseEnabled;
uniform bool u_DoubleSided;
uniform float u_Time;
uniform vec2 u_Point0;
uniform vec2 u_Point1;
uniform float u_Size;
uniform float u_Center;
uniform float u_Feather;
uniform float u_Amount;
uniform float u_Speed;
uniform float u_Phase;
uniform float u_NoiseSpeed;
uniform float u_NoiseAmount;
uniform float u_Aspect;

// Branches of the page mask run with edge0 > edge1 (a reversed ramp), which the
// GLSL built-in leaves undefined, so use the explicit formula.
float ss(float edge0, float edge1, float x) {
    float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

void main() {
    // vert: the authored swing amount, optionally perturbed by a noise sample.
    float anim = sin(u_Time * u_Speed + u_Phase * 6.28318530718) * u_Amount;
    if (u_NoiseEnabled) {
        float n = texture2D(u_Noise, vec2(
            u_Time * 0.08333333 * u_NoiseSpeed,
            u_Time * 0.02777777 * u_NoiseSpeed
        )).r * 6.28318530718;
        anim = clamp(anim + sin(n) * u_NoiseAmount, -1.0, 1.0);
    }

    // Axis and centre in aspect-corrected space.
    float ax0 = u_Point0.x * u_Aspect;
    float ay0 = u_Point0.y;
    float ax1 = u_Point1.x * u_Aspect;
    float ay1 = u_Point1.y;
    vec2 axis = vec2(ax1 - ax0, ay1 - ay0);
    axis /= max(length(axis), 1e-6);
    vec2 center = vec2(ax0 + (ax1 - ax0) * u_Center, ay0 + (ay1 - ay0) * u_Center);
    vec2 ortho = vec2(-axis.y, axis.x);

    float feather = max(u_Feather, 0.00001);
    float sizeMod = u_Size * (1.0 - abs(anim) * u_Amount * 0.5);

    vec2 pos = vec2(v_TexCoord.x * u_Aspect, v_TexCoord.y);
    vec2 rel = pos - center;
    float dAlong = dot(axis, rel);
    float dOrtho = dot(ortho, rel);
    vec2 warped = pos + axis * (anim * dOrtho) * dAlong + ortho * (anim * dOrtho * anim);

    // Page region: inside the p0-p1 band and within sizeMod of the axis.
    float mask = ss(feather, 0.0, dot(axis, warped - vec2(ax1, ay1)));
    mask *= ss(-feather, 0.0, dot(axis, warped - vec2(ax0, ay0)));
    mask *= ss(sizeMod + feather, sizeMod - feather, dOrtho);
    if (u_DoubleSided) mask *= ss(sizeMod + feather, sizeMod - feather, -dOrtho);
    else mask *= dOrtho >= 0.0 ? 1.0 : 0.0;
    if (u_HasMask) mask *= texture2D(u_Mask, v_TexCoord).r;

    vec2 uv = mix(v_TexCoord, vec2(warped.x / u_Aspect, warped.y), mask);
    gl_FragColor = texture2D(u_Source, uv);
}
`,si=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Noise;
uniform sampler2D u_Mask;
uniform bool u_HasMask;
uniform float u_Time;
uniform float u_Strength;
uniform float u_Power;
uniform float u_Scale;
uniform float u_Aspect;
uniform bool u_Greyscale;
uniform int u_BlendMode;
${Po}
float grainLuma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
    // Mirrors Wallpaper Engine's effects/filmgrain.vert + .frag: two noise
    // samples scrolling at different rates, multiplied per channel.
    vec4 albedo = texture2D(u_Source, v_TexCoord);
    float tf = fract(u_Time);
    vec3 n1 = texture2D(u_Noise, vec2(
        (v_TexCoord.x + tf) * u_Scale * u_Aspect,
        (v_TexCoord.y + tf) * u_Scale
    )).rgb;
    vec3 n2 = texture2D(u_Noise, vec2(
        (v_TexCoord.x - tf * 2.5) * u_Scale * 0.52 * u_Aspect,
        (v_TexCoord.y - tf * 2.5) * u_Scale * 0.52
    )).gbr;

    if (u_Greyscale) {
        n1 = vec3(grainLuma(n1));
        n2 = vec3(grainLuma(n2));
    }

    vec3 mul = clamp(n1 * n2, 0.0, 1.0);
    vec3 grain = vec3(
        pow(max(mul.r, 0.0), u_Power),
        pow(max(mul.g, 0.0), u_Power),
        pow(max(mul.b, 0.0), u_Power)
    );

    float amount = u_Strength;
    if (u_HasMask) amount *= texture2D(u_Mask, v_TexCoord).r;
    gl_FragColor = vec4(applyWeBlend(u_BlendMode, albedo.rgb, grain, amount), albedo.a);
}
`,ui=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Noise;
uniform sampler2D u_Mask;
uniform bool u_HasMask;
uniform float u_Time;
uniform float u_Speed;
uniform float u_Phase;
uniform float u_Amount;
uniform vec2 u_Bounds;
uniform float u_NoiseSpeed;
uniform float u_NoiseAmount;
uniform float u_Power;
uniform vec3 u_TintLow;
uniform vec3 u_TintHigh;
uniform int u_BlendMode;
uniform bool u_PulseAlpha;
uniform bool u_PulseColor;
${Po}
void main() {
    // Mirrors Wallpaper Engine's effects/pulse.vert + .frag. The engine's
    // g_PulsePhase uniform is in radians (range 0..2pi), not a normalised 0..1
    // value, so subtract pi/2 directly rather than phase * 2pi.
    vec4 albedo = texture2D(u_Source, v_TexCoord);

    float sv = sin(u_Time * u_Speed + (u_Phase - 1.57079632679)) * 0.5 + 0.5;
    float k = clamp((sv - u_Bounds.x) / max(1e-6, u_Bounds.y - u_Bounds.x), 0.0, 1.0);
    float pulse = (k * k * (3.0 - 2.0 * k)) * u_Amount;

    if (u_NoiseAmount > 0.0) {
        pulse += texture2D(u_Noise, vec2(
            u_Time * 0.08333333 * u_NoiseSpeed,
            u_Time * 0.02777777 * u_NoiseSpeed
        )).r * u_NoiseAmount;
    }
    pulse = pow(max(pulse, 0.0), u_Power);
    float pulseAmount = clamp(pulse, 0.0, 1.0);

    vec3 rgb = albedo.rgb;
    float alpha = albedo.a;
    if (u_PulseColor) {
        rgb = applyWeBlend(
            u_BlendMode,
            albedo.rgb * u_TintLow,
            albedo.rgb * u_TintHigh,
            pulseAmount
        );
    }
    if (u_PulseAlpha) alpha = albedo.a * pulseAmount;
    if (u_HasMask) {
        float mask = texture2D(u_Mask, v_TexCoord).r;
        rgb = mix(albedo.rgb, rgb, mask);
        alpha = mix(albedo.a, alpha, mask);
    }
    gl_FragColor = vec4(max(rgb, vec3(0.0)), alpha);
}
`,li=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Clouds;
uniform sampler2D u_Mask;
uniform bool u_HasMask;
uniform float u_Time;
uniform float u_Alpha;
uniform float u_Threshold;
uniform float u_Feather;
uniform vec3 u_ColorStart;
uniform vec3 u_ColorEnd;
uniform vec4 u_Speed;
uniform vec4 u_Scale;
uniform float u_Aspect;
uniform bool u_Shading;
uniform int u_BlendMode;
uniform bool u_WriteAlpha;
${Po}
void main() {
    // Mirrors Wallpaper Engine's effects/clouds.vert + .frag (PERSPECTIVE=0):
    // two samples of the cloud texture scroll at different rates, and the second
    // is sampled with its coordinates swapped.
    vec4 albedo = texture2D(u_Source, v_TexCoord);
    float ax = (v_TexCoord.x + u_Speed.x * u_Time) * u_Scale.x * u_Aspect;
    float ay = (v_TexCoord.y + u_Speed.y * u_Time) * u_Scale.y;
    float bz = (v_TexCoord.x + u_Speed.z * u_Time) * u_Scale.z * u_Aspect;
    float bw = (v_TexCoord.y + u_Speed.w * u_Time) * u_Scale.w;

    float cloud0 = texture2D(u_Clouds, vec2(ax, ay)).r;
    float cloud1 = texture2D(u_Clouds, vec2(-bw, bz)).r;
    float cloudBlend = smoothstep(u_Threshold, u_Threshold + max(u_Feather, 1e-5), cloud0 * cloud1);

    float blend = cloudBlend * u_Alpha;
    if (u_HasMask) blend *= texture2D(u_Mask, v_TexCoord).r;

    vec3 tint = mix(u_ColorEnd, u_ColorStart, blend);
    if (u_Shading) tint *= cloud0 * cloud1;

    vec3 rgb = applyWeBlend(u_BlendMode, albedo.rgb, tint, blend);
    gl_FragColor = vec4(rgb, u_WriteAlpha ? blend : albedo.a);
}
`,di=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Mask;
uniform bool u_HasMask;
uniform float u_Scale;
uniform vec2 u_Center;
uniform int u_Kernel;
uniform bool u_KeepAlpha;

// One symmetric tap pair: the centre-relative vector is rotated by the kernel
// angle and the two mirrored samples are averaged by the caller.
vec4 radialTap(vec2 delta, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    vec2 rotated = vec2(delta.x * c - delta.y * s, delta.x * s + delta.y * c);
    vec2 offset = rotated - delta;
    return texture2D(u_Source, u_Center + offset + delta)
        + texture2D(u_Source, u_Center - offset + delta);
}

void main() {
    // Mirrors Wallpaper Engine's effects/blur_radial_gaussian.frag: rotate the
    // centre-relative vector by a fixed angle per tap and average the pair. The
    // kernel offsets and weights come from common_blur.h.
    vec2 delta = v_TexCoord - u_Center;
    float amount = u_Scale * 0.025;
    vec4 accum = vec4(0.0);

    if (u_Kernel == 2) {
        accum += texture2D(u_Source, v_TexCoord) * 0.5;
        accum += radialTap(delta, 1.0 * amount) * 0.25;
    } else if (u_Kernel == 1) {
        accum += radialTap(delta, 2.3515644035337887 * amount) * 0.2028175528299753;
        accum += radialTap(delta, 0.4694337796983720 * amount) * 0.4044856614512112;
        accum += radialTap(delta, -1.4091998770852121 * amount) * 0.3213933537319605;
        accum += radialTap(delta, -3.0 * amount) * 0.0713034319868530;
    } else {
        accum += texture2D(u_Source, v_TexCoord) * 0.1976406528809576;
        accum += radialTap(delta, 1.4091998770852122 * amount) * 0.2959855056006557;
        accum += radialTap(delta, 3.2979348079914822 * amount) * 0.0935333619980593;
        accum += radialTap(delta, 5.2062900776825969 * amount) * 0.0116608059608062;
    }

    vec4 source = texture2D(u_Source, v_TexCoord);
    if (u_HasMask) accum = mix(source, accum, texture2D(u_Mask, v_TexCoord).r);
    if (u_KeepAlpha) accum.a = source.a;
    gl_FragColor = vec4(min(accum.rgb, vec3(1.0)), min(accum.a, 1.0));
}
`,ci=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Noise;
uniform vec3 u_Xform0;
uniform vec3 u_Xform1;
uniform vec3 u_Xform2;
uniform float u_Time;
uniform float u_Speed;
uniform vec2 u_Scale;
uniform float u_Smoothness;
uniform vec2 u_Feather;
uniform float u_Exponent;
uniform float u_Intensity;
uniform vec3 u_ColorStart;
uniform vec3 u_ColorEnd;
uniform int u_BlendMode;
${Po}
// Several shaft ramps run with edge0 > edge1, which the GLSL built-in leaves
// undefined; the explicit formula handles a reversed range.
float shaftRamp(float edge0, float edge1, float x) {
    float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

void main() {
    // Mirrors Wallpaper Engine's effects/lightshafts.vert + .frag with RAYMODE=0
    // (linear rays) and RENDERING=0 (colour gradient). The inverse
    // square-to-quad matrix is precomputed on the CPU.
    vec3 p = vec3(v_TexCoord, 1.0);
    float f2 = dot(u_Xform2, p);
    float f2Safe = abs(f2) < 1e-6 ? (f2 < 0.0 ? -1e-6 : 1e-6) : f2;
    vec2 fx = vec2(dot(u_Xform0, p), dot(u_Xform1, p)) / f2Safe;

    float featherX = max(u_Feather.x, 1e-5);
    float featherY = max(u_Feather.y, 1e-5);
    float mask = f2 >= 0.0 ? 1.0 : 0.0;
    mask *= shaftRamp(0.50001, 0.5 - featherX, abs(fx.x - 0.5));
    mask *= shaftRamp(0.50001, 0.5 - featherY, abs(fx.y - 0.5));
    mask *= 1.0 - fx.y;

    float n1 = texture2D(u_Noise, vec2(
        fx.x * 0.054111 * u_Scale.x + u_Time * u_Speed * 0.003,
        fx.y * 0.003111 * u_Scale.y + u_Time * u_Speed * 0.000375111
    )).r;
    float n2 = texture2D(u_Noise, vec2(
        fx.x * 0.07333 * u_Scale.x - u_Time * u_Speed * 0.0047111,
        fx.y * 0.005967111 * u_Scale.y - u_Time * u_Speed * 0.0007399
    )).r;

    float shafts = pow(max(n1 * n2, 0.0), u_Exponent);
    shafts = shaftRamp((1.0 - u_Smoothness) * 0.29999, 0.3 + u_Smoothness * 0.7, shafts);
    shafts *= mask;

    vec4 albedo = texture2D(u_Source, v_TexCoord);
    vec3 shaftColor = clamp(mix(u_ColorStart, u_ColorEnd, fx.y), 0.0, 1.0) * u_Intensity;
    vec3 rgb = applyWeBlend(u_BlendMode, albedo.rgb, shaftColor, shafts);
    gl_FragColor = vec4(rgb, max(albedo.a, shafts));
}
`,mi=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Noise;
uniform sampler2D u_Mask;
uniform bool u_HasMask;
uniform float u_Time;
uniform float u_Speed;
uniform float u_Density;
uniform float u_Scale;
uniform float u_Alpha;
uniform vec3 u_Color;
uniform int u_BlendMode;
uniform float u_Aspect;
${Po}
float glitterRamp(float edge0, float edge1, float x) {
    float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

void main() {
    // Inlines Wallpaper Engine's glitter_prepare pass (a pure function of a noise
    // sample and time), collapsing the authored two-pass descriptor into one
    // surface pass. The pattern tiles in the authored UV space.
    vec2 patternUv = fract(vec2(v_TexCoord.x * u_Aspect * u_Scale, v_TexCoord.y * u_Scale));
    vec2 noise = texture2D(u_Noise, patternUv * 5.0).rg;

    float density = u_Density * u_Density;
    float timer = fract(noise.r * (1.0 - noise.g) * 100.0 + u_Time * u_Speed * density);
    float halfWidth = density * 0.5;
    float sparkle = glitterRamp(0.5 - halfWidth, 0.5, timer)
        * glitterRamp(0.5 + halfWidth, 0.5, timer);
    sparkle = glitterRamp(0.5, 1.0, sparkle);
    sparkle *= sparkle;

    vec4 albedo = texture2D(u_Source, v_TexCoord);
    float mask = 1.0;
    if (u_HasMask) mask = texture2D(u_Mask, v_TexCoord).r;

    vec3 rgb = applyWeBlend(u_BlendMode, albedo.rgb, u_Color * sparkle, u_Alpha * mask);
    gl_FragColor = vec4(rgb, albedo.a);
}
`,pi=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Mask;
uniform sampler2D u_Caustic;
uniform sampler2D u_Uniform;
uniform sampler2D u_Perlin;
uniform sampler2D u_GlowPattern;
uniform bool u_HasMask;
uniform float u_Time;
uniform float u_Brightness;
uniform float u_Glow;
uniform float u_Granularity;
uniform float u_Distortion;
uniform float u_Chromatic;
uniform float u_Blur;
uniform vec3 u_ColorStart;
uniform vec3 u_ColorEnd;
uniform int u_Mode;
uniform int u_BlendMode;
uniform float u_Aspect;
${Po}
// MODE 1 thresholds run with edge0 > edge1, which the GLSL built-in leaves
// undefined; this explicit form handles a reversed range.
float causticsRamp(float edge0, float edge1, float x) {
    float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

void main() {
    // Mirrors Wallpaper Engine's effects/watercaustics/caustics.frag: four
    // scrolling coordinate sets drive a noise distortion of a Voronoi pattern,
    // sampled once per colour channel.
    vec4 albedo = texture2D(u_Source, v_TexCoord);
    float mask = 1.0;
    if (u_HasMask) mask = texture2D(u_Mask, v_TexCoord).r;

    vec2 causticsCoords = vec2(v_TexCoord.x * u_Aspect, v_TexCoord.y) * u_Granularity;
    vec2 noiseCoords = vec2(causticsCoords.x * 0.02 + u_Time * 0.005, causticsCoords.y * 0.02);
    vec2 noiseCoords2 = vec2(causticsCoords.x * 0.0333, causticsCoords.y * 0.0333 + u_Time * 0.004111);
    vec2 blendCoords = vec2(causticsCoords.x * 0.01333, causticsCoords.y * 0.01333) + u_Time * 0.003777;
    vec2 shiftCoords = vec2(causticsCoords.x * 0.05, causticsCoords.y * 0.05) + u_Time * 0.01;

    vec2 shift = texture2D(u_Perlin, shiftCoords).rg * 2.0 - 1.0;
    vec2 n1 = texture2D(u_Uniform, noiseCoords).rg;
    vec2 n2 = texture2D(u_Uniform, noiseCoords2).rg;

    causticsCoords.x += (n1.x * 2.0 - 1.0) * 0.025 * u_Distortion
        + (n2.x * 2.0 - 1.0) * 0.025 * u_Distortion + shift.x * u_Distortion;
    causticsCoords.y += (n1.y * 2.0 - 1.0) * 0.025 * u_Distortion
        + (n2.y * 2.0 - 1.0) * 0.025 * u_Distortion + shift.y * u_Distortion;

    vec3 caustics = vec3(
        texture2D(u_Caustic, vec2(causticsCoords.x - 0.01 * u_Chromatic, causticsCoords.y)).r,
        texture2D(u_Caustic, causticsCoords).r,
        texture2D(u_Caustic, vec2(causticsCoords.x + 0.01 * u_Chromatic, causticsCoords.y)).r
    );
    float glowSample = texture2D(u_GlowPattern, causticsCoords).r;
    vec3 blendColor = texture2D(u_Uniform, blendCoords).rgb;
    vec3 cb = mix(caustics, vec3(glowSample), u_Blur);

    float causticsSample;
    vec3 causticsColor;
    if (u_Mode == 1) {
        float threshold = max(0.3, blendColor.r - shift.x);
        float cs = cb.g;
        float particleNoise = texture2D(u_Uniform, shiftCoords).r;
        float particle = causticsRamp(threshold, threshold - 0.001, cs)
            * (particleNoise * cs >= 0.3 ? 1.0 : 0.0);
        causticsSample = causticsRamp(threshold, threshold + 0.001, cs) + particle;
        causticsSample = clamp(causticsSample + glowSample * u_Glow, 0.0, 1.0);
        causticsColor = u_Brightness * mix(u_ColorStart, u_ColorEnd, causticsRamp(0.0, 0.5, blendColor.r));
    } else {
        causticsSample = (cb.r + cb.g + cb.b) / 3.0;
        causticsSample = causticsRamp(
            blendColor.r * 0.8,
            1.0 - blendColor.g * 0.2,
            causticsSample + glowSample * u_Glow
        );
        causticsColor = u_Brightness * mix(u_ColorStart, u_ColorEnd, blendColor) * cb;
    }

    vec3 rgb = applyWeBlend(u_BlendMode, albedo.rgb, causticsColor, mask * causticsSample);
    gl_FragColor = vec4(min(max(rgb, vec3(0.0)), vec3(1.0)), albedo.a);
}
`,hi=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Depth;
uniform sampler2D u_Mask;
uniform bool u_HasDepth;
uniform bool u_HasMask;
uniform vec2 u_Scale;
uniform float u_Sens;
uniform float u_Center;
uniform vec2 u_ParallaxPosition;
uniform int u_Quality;

float depthAt(vec2 uv) {
    return u_HasDepth ? texture2D(u_Depth, uv).r : 0.0;
}

void main() {
    // Mirrors Wallpaper Engine's effects/depthparallax: QUALITY 0 is a single
    // offset tap, QUALITY 1/2 march 24/64 layers through the height map. The
    // pointer position is engine-supplied (g_ParallaxPosition); with no pointer
    // feed this renders the neutral centred pose.
    vec4 albedo = texture2D(u_Source, v_TexCoord);
    float depth = depthAt(v_TexCoord);
    float mask = u_HasMask ? texture2D(u_Mask, v_TexCoord).r : 1.0;

    vec2 prlxPos = u_ParallaxPosition;
    float ctrlSign = u_Sens >= 0.0 ? 1.0 : 0.0;
    float negPerspective = -u_Sens;
    float ctrlPerspOrtho = clamp(u_Sens, 0.0, 1.0) + (negPerspective > 0.0001 ? 1.0 : 0.0);
    vec2 prlx = ctrlSign > 0.5 ? vec2(1.0 - prlxPos.x, 1.0 - prlxPos.y) : prlxPos;
    float perspMix = -1.0 + (negPerspective + 1.0) * ctrlPerspOrtho;
    int numLayers = u_Quality == 2 ? 64 : 24;
    float layerDepth = 1.0 / float(numLayers);

    vec2 sampleUv;
    if (u_Quality == 0) {
        vec2 pointer = vec2(v_TexCoord.x - prlxPos.x, (1.0 - v_TexCoord.y) - prlxPos.y);
        pointer *= vec2(2.0 * u_Scale.x * -0.04, -2.0 * u_Scale.y * -0.04);
        sampleUv = v_TexCoord + pointer * ((depth * 2.0 - 1.0) * mask);
    } else {
        vec2 coords = v_TexCoord;
        if (ctrlSign > 0.5) {
            // A positive sensitivity squeezes the sampling coordinates toward the
            // centre, which reads as a perspective compression.
            coords = (coords - 0.5) / (1.0 + u_Sens * 0.2) + 0.5;
        }
        coords.x -= (prlx.x * 2.0 - 1.0) * u_Center * -0.05 * u_Scale.x * perspMix;
        coords.y -= (prlx.y * 2.0 - 1.0) * u_Center * 0.05 * u_Scale.y * perspMix;

        vec2 pointer = vec2(1.0 - v_TexCoord.x, v_TexCoord.y);
        vec2 ctrlDir = pointer - prlx;
        float altX = 1.0 - prlx.x - 0.5;
        float altY = prlx.y - 0.5;
        vec2 viewdir = vec2(
            altX + (ctrlDir.x * negPerspective - altX) * ctrlPerspOrtho,
            altY + (ctrlDir.y * negPerspective - altY) * ctrlPerspOrtho
        ) * mask;

        vec2 delta = vec2(viewdir.x * u_Scale.x * 0.1, viewdir.y * u_Scale.y * 0.1) / float(numLayers);
        vec2 cur = coords;
        float curDepth = depthAt(cur);
        float currentLayerDepth = 1.0;
        // Constant loop bound keeps this legal in GLSL ES 1.0; the breaks are the
        // variable-length part.
        for (int i = 0; i < 64; i += 1) {
            if (i >= numLayers) break;
            if (currentLayerDepth <= curDepth) break;
            cur -= delta;
            curDepth = depthAt(cur);
            currentLayerDepth -= layerDepth;
        }

        vec2 prev = cur + delta;
        float afterDepth = curDepth - currentLayerDepth;
        float beforeDepth = depthAt(prev) - currentLayerDepth - layerDepth;
        float denominator = afterDepth - beforeDepth;
        float weight = abs(denominator) < 1e-6 ? 0.0 : afterDepth / denominator;
        sampleUv = prev * weight + cur * (1.0 - weight);
    }

    gl_FragColor = clamp(texture2D(u_Source, sampleUv), 0.0, 1.0);
}
`,_i=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform vec2 u_TexelSize;

void main() {
    // Mirrors Wallpaper Engine's blur_downsample4.frag: four source texels around
    // the destination centre are alpha-weighted into one colour, while the stored
    // alpha is the mean of the squared alphas (which keeps edges from blooming).
    //
    // TabLab uploads the source PREMULTIPLIED, so the weight multiply WE applies
    // to straight-alpha RGB is already baked in; the result is converted back to
    // premultiplied because the rest of the chain expects that convention.
    vec2 o = u_TexelSize;
    vec4 s0 = texture2D(u_Source, v_TexCoord + vec2(-o.x, -o.y));
    vec4 s1 = texture2D(u_Source, v_TexCoord + vec2(o.x, -o.y));
    vec4 s2 = texture2D(u_Source, v_TexCoord + vec2(-o.x, o.y));
    vec4 s3 = texture2D(u_Source, v_TexCoord + vec2(o.x, o.y));

    vec3 premultipliedSum = s0.rgb + s1.rgb + s2.rgb + s3.rgb;
    float alphaSum = s0.a + s1.a + s2.a + s3.a;
    float outAlpha = (s0.a * s0.a + s1.a * s1.a + s2.a * s2.a + s3.a * s3.a) * 0.25;
    vec3 straight = premultipliedSum / max(0.001, alphaSum);

    gl_FragColor = vec4(straight * outAlpha, outAlpha);
}
`,gi=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform vec2 u_Direction;
uniform int u_Kernel;

void main() {
    // Mirrors Wallpaper Engine's blur_gaussian.frag. The tap weights come from
    // common_blur.h and sum to exactly 1.0 for each kernel, so the unrolled
    // branches below need no normalisation.
    vec4 sum;
    if (u_Kernel == 2) {
        sum = texture2D(u_Source, v_TexCoord) * 0.5;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction)
            + texture2D(u_Source, v_TexCoord - u_Direction)) * 0.25;
    } else if (u_Kernel == 1) {
        sum = texture2D(u_Source, v_TexCoord) * 0.214607;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction)
            + texture2D(u_Source, v_TexCoord - u_Direction)) * 0.189879;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction * 2.0)
            + texture2D(u_Source, v_TexCoord - u_Direction * 2.0)) * 0.131514;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction * 3.0)
            + texture2D(u_Source, v_TexCoord - u_Direction * 3.0)) * 0.071303;
    } else {
        sum = texture2D(u_Source, v_TexCoord) * 0.171834;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction)
            + texture2D(u_Source, v_TexCoord - u_Direction)) * 0.156756;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction * 2.0)
            + texture2D(u_Source, v_TexCoord - u_Direction * 2.0)) * 0.119007;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction * 3.0)
            + texture2D(u_Source, v_TexCoord - u_Direction * 3.0)) * 0.075189;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction * 4.0)
            + texture2D(u_Source, v_TexCoord - u_Direction * 4.0)) * 0.039533;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction * 5.0)
            + texture2D(u_Source, v_TexCoord - u_Direction * 5.0)) * 0.017298;
        sum += (texture2D(u_Source, v_TexCoord + u_Direction * 6.0)
            + texture2D(u_Source, v_TexCoord - u_Direction * 6.0)) * 0.006299;
    }
    gl_FragColor = min(sum, vec4(1.0));
}
`,fi=`
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Source;
uniform sampler2D u_Blurred;
uniform sampler2D u_Mask;
uniform bool u_HasMask;
uniform vec2 u_CompositeOffset;
uniform int u_Composite;
uniform int u_BlendMode;
uniform bool u_CompositeMono;
uniform vec3 u_CompositeColor;
uniform float u_CompositeAlpha;
uniform bool u_KeepAlpha;
${Po}
float combineLuma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
    // Mirrors Wallpaper Engine's blur_combine.frag. WE's composite maths is
    // written against straight alpha, so the premultiplied inputs are
    // un-premultiplied here and the result is premultiplied again on output to
    // match the rest of the renderer.
    vec4 original = texture2D(u_Source, v_TexCoord);
    vec4 blurred = texture2D(u_Blurred, v_TexCoord + u_CompositeOffset);

    vec3 originalStraight = original.a > 0.0 ? original.rgb / original.a : original.rgb;
    vec4 effect = vec4(blurred.a > 0.0 ? blurred.rgb / blurred.a : blurred.rgb, blurred.a);
    if (u_CompositeMono) effect.rgb = vec3(combineLuma(effect.rgb));
    effect.rgb *= u_CompositeColor;

    float compositeAlpha = min(1.0, u_CompositeAlpha);
    vec3 resultRgb;
    float resultAlpha;
    if (u_Composite == 0) {
        resultRgb = effect.rgb;
        resultAlpha = effect.a;
    } else if (u_Composite == 1) {
        resultRgb = applyWeBlend(u_BlendMode, originalStraight, effect.rgb, effect.a * compositeAlpha);
        resultAlpha = max(effect.a * compositeAlpha, original.a);
    } else if (u_Composite == 2) {
        float overAlpha = effect.a * compositeAlpha;
        resultRgb = mix(effect.rgb, originalStraight, original.a);
        resultAlpha = overAlpha + original.a * (1.0 - overAlpha);
    } else {
        float underAlpha = effect.a * compositeAlpha * (1.0 - original.a);
        resultRgb = effect.rgb;
        resultAlpha = underAlpha;
    }

    float mask = u_HasMask ? texture2D(u_Mask, v_TexCoord).r : 1.0;
    vec3 finalRgb = mix(originalStraight, resultRgb, mask);
    float finalAlpha = u_KeepAlpha ? original.a : mix(original.a, resultAlpha, mask);
    gl_FragColor = vec4(finalRgb * finalAlpha, finalAlpha);
}
`,xi=2048,Ur=e=>new Promise((r,t)=>{const i=new Image;i.onload=()=>r(i),i.onerror=()=>t(new Error(`Failed to load Wallpaper Engine effect texture: ${e}`)),i.src=e}),Rr=(e,r,t)=>{const i=e.createShader(r);if(!i)throw new Error("Unable to allocate WebGL shader.");if(e.shaderSource(i,t),e.compileShader(i),!e.getShaderParameter(i,e.COMPILE_STATUS)){const a=e.getShaderInfoLog(i)||"Unknown shader compile error.";throw e.deleteShader(i),new Error(a)}return i},z=(e,r)=>{const t=Rr(e,e.VERTEX_SHADER,In),i=Rr(e,e.FRAGMENT_SHADER,r),a=e.createProgram();if(!a)throw new Error("Unable to allocate WebGL program.");if(e.attachShader(a,t),e.attachShader(a,i),e.linkProgram(a),e.deleteShader(t),e.deleteShader(i),!e.getProgramParameter(a,e.LINK_STATUS)){const m=e.getProgramInfoLog(a)||"Unknown program link error.";throw e.deleteProgram(a),new Error(m)}return a},ge=(e,r,t)=>{const i=document.createElement("canvas");i.width=r,i.height=t;const a=i.getContext("2d");if(!a)throw new Error("2D canvas is unavailable for Wallpaper Engine texture scaling.");return a.drawImage(e,0,0,r,t),i},Ar=e=>{const r=e.naturalWidth||e.width,t=e.naturalHeight||e.height;if(r<=0||t<=0)return!1;const i=Math.min(128,r),a=Math.min(128,t),m=document.createElement("canvas");m.width=i,m.height=a;const g=m.getContext("2d");if(!g)return!1;try{g.imageSmoothingEnabled=!1,g.drawImage(e,0,0,i,a);const _=g.getImageData(0,0,i,a).data,l=i*a;let f=0,T=0;for(let d=0;d<_.length;d+=4){const k=_[d],U=_[d+1],S=_[d+2],R=_[d+3];Math.abs(k-U)<=1&&Math.abs(k-S)<=1&&Math.abs(U-S)<=1&&(f+=1),Math.abs(R-k)>1&&(T+=1)}return f/l>=.999&&T>=Math.max(1,Math.ceil(l*1e-4))}catch{return!1}},bi=()=>{const e=document.createElement("canvas");e.width=1,e.height=1;const r=e.getContext("2d");if(!r)throw new Error("2D canvas is unavailable for Wallpaper Engine neutral flow map.");const t=r.createImageData(1,1);return t.data.set([127,127,0,255]),r.putImageData(t,0,0),e},Ti=()=>{const r=document.createElement("canvas");r.width=256,r.height=256;const t=r.getContext("2d");if(!t)throw new Error("2D canvas is unavailable for Wallpaper Engine built-in noise.");const i=t.createImageData(256,256);let a=1831565813;for(let m=0;m<i.data.length;m+=4){a=Math.imul(a,1664525)+1013904223>>>0;const g=a>>>24;a=Math.imul(a,1664525)+1013904223>>>0;const _=a>>>24;a=Math.imul(a,1664525)+1013904223>>>0;const l=a>>>24;i.data[m]=g,i.data[m+1]=_,i.data[m+2]=l,i.data[m+3]=255}return t.putImageData(i,0,0),r},Mr=e=>{const i=document.createElement("canvas");i.width=256,i.height=256;const a=i.getContext("2d");if(!a)throw new Error("2D canvas is unavailable for Wallpaper Engine built-in Voronoi pattern.");const m=a.createImageData(256,256),g=(l,f)=>{let T=Math.imul(l,374761393)+Math.imul(f,668265263)>>>0;return T=Math.imul(T^T>>>13,1274126177)>>>0,((T^T>>>16)>>>0)/4294967295},_=l=>(l%8+8)%8;for(let l=0;l<256;l+=1)for(let f=0;f<256;f+=1){const T=f/256*8,d=l/256*8,k=Math.floor(T),U=Math.floor(d);let S=8,R=8;for(let h=-1;h<=1;h+=1)for(let u=-1;u<=1;u+=1){const v=k+u,y=U+h,o=v+g(_(v),_(y)),j=y+g(_(v)+71,_(y)+131),X=o-T,F=j-d,ee=Math.sqrt(X*X+F*F);ee<S?(R=S,S=ee):ee<R&&(R=ee)}const C=e?1-Math.max(0,Math.min(1,(R-S)*1.6)):1-Math.max(0,Math.min(1,S*.9)),x=Math.round(C*255),B=(l*256+f)*4;m.data[B]=x,m.data[B+1]=x,m.data[B+2]=x,m.data[B+3]=255}return a.putImageData(m,0,0),i},Ei=()=>{const r=document.createElement("canvas");r.width=256,r.height=256;const t=r.getContext("2d");if(!t)throw new Error("2D canvas is unavailable for Wallpaper Engine built-in cloud noise.");const i=t.createImageData(256,256),a=(_,l,f)=>{let T=Math.imul(_+f*17,374761393)+Math.imul(l+f*31,668265263)>>>0;return T=Math.imul(T^T>>>13,1274126177)>>>0,((T^T>>>16)>>>0)/4294967295},m=_=>_*_*(3-2*_),g=(_,l,f,T)=>{const d=_/256*f,k=l/256*f,U=Math.floor(d),S=Math.floor(k),R=m(d-U),C=m(k-S),x=j=>(j%f+f)%f,B=a(x(U),x(S),T),h=a(x(U+1),x(S),T),u=a(x(U),x(S+1),T),v=a(x(U+1),x(S+1),T),y=B+(h-B)*R,o=u+(v-u)*R;return y+(o-y)*C};for(let _=0;_<256;_+=1)for(let l=0;l<256;l+=1){let f=0,T=1,d=0;for(let S=0;S<4;S+=1)f+=g(l,_,4<<S,91+S*37)*T,d+=T,T*=.5;const k=Math.round(Math.max(0,Math.min(1,f/d))*255),U=(_*256+l)*4;i.data[U]=k,i.data[U+1]=k,i.data[U+2]=k,i.data[U+3]=255}return t.putImageData(i,0,0),r},Dr=e=>e>0&&(e&e-1)===0,W=(e,r,t=!1,i=!1)=>{const a=e.createTexture();if(!a)throw new Error("Unable to allocate WebGL texture.");e.bindTexture(e.TEXTURE_2D,a),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t?1:0),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR);const m="width"in r?Number(r.width):0,g="height"in r?Number(r.height):0,_=i&&Dr(m)&&Dr(g);return e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,_?e.REPEAT:e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,_?e.REPEAT:e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,r),a},ki=(e,r,t,i=!1)=>{e.bindTexture(e.TEXTURE_2D,r),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,i?1:0),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)},Mo=(e,r,t)=>{const i=e.createTexture(),a=e.createFramebuffer();if(!i||!a)throw new Error("Unable to allocate Wallpaper Engine render target.");if(e.bindTexture(e.TEXTURE_2D,i),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,r,t,0,e.RGBA,e.UNSIGNED_BYTE,null),e.bindFramebuffer(e.FRAMEBUFFER,a),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,i,0),e.checkFramebufferStatus(e.FRAMEBUFFER)!==e.FRAMEBUFFER_COMPLETE)throw new Error("Wallpaper Engine image-effect framebuffer is incomplete.");return{texture:i,framebuffer:a}},Si=e=>e.map(r=>r.kind==="opacity"?["opacity",r.maskPath??"",r.alpha].join(":"):r.kind==="scroll"?["scroll",r.speedX,r.speedY,r.repeat.x,r.repeat.y].join(":"):r.kind==="transform"?["transform",r.offset.x,r.offset.y,r.scale.x,r.scale.y,r.angle,r.repeat?1:0].join(":"):r.kind==="spin"?["spin",r.center.x,r.center.y,r.speed,r.ratio,r.axis,r.phase,r.size,r.feather,r.repeat?1:0,r.elliptical?1:0,r.aspectCorrect?1:0,r.softMask?1:0].join(":"):r.kind==="perspective"?["perspective",...r.points.flatMap(t=>[t.x,t.y]),r.repeat?1:0].join(":"):r.kind==="foliageSway"?["foliageSway",r.maskPath??"",r.noisePath??"",r.speed,r.strength,r.phase,r.power,r.noiseScale,r.ratio,r.direction].join(":"):r.kind==="waterFlow"?["waterFlow",r.flowMapPath??"",r.phasePath,r.speed,r.strength,r.phaseScale,r.phaseMode,r.feather??""].join(":"):r.kind==="shake"?["shake",r.directionMapPath??"",r.speed,r.strength,r.friction.x,r.friction.y,r.bounds.x,r.bounds.y,r.directionMode].join(":"):r.kind==="blurPrecise"?["blurPrecise",r.maskPath??"",r.scale.x,r.scale.y,r.horizontalKernel,r.verticalKernel,r.blurAlpha?1:0].join(":"):r.kind==="shimmer"?["shimmer",r.brightness,r.color.r,r.color.g,r.color.b,r.delay,r.direction,r.granularity,r.offset,r.speed].join(":"):r.kind==="shine"?["shine",r.maskPath??"",r.noisePath??"",r.threshold,r.noiseAmount,r.noiseScale,r.noiseSpeed,r.rayColor.r,r.rayColor.g,r.rayColor.b,r.rayDirection,r.raySpeed,r.rayIntensity,r.rayLength,r.edges,r.sampleMode,r.blurScale.x,r.blurScale.y,r.kernel,r.blendMode,r.copyBackground?1:0,r.noiseEnabled?1:0].join(":"):r.kind==="godRays"?["godRays",r.maskPath??"",r.threshold,r.caster.mode,...r.caster.mode==="radial"?[r.caster.center.x,r.caster.center.y]:[r.caster.direction],r.rayLength,r.rayIntensity,r.colorStart.r,r.colorStart.g,r.colorStart.b,r.colorEnd.r,r.colorEnd.g,r.colorEnd.b,r.sampleMode,r.blurScale.x,r.blurScale.y,r.kernel,r.blendMode].join(":"):r.kind==="waterRipple"?["waterRipple",r.maskPath??"",r.normalPath,r.animationSpeed,r.scale,r.scrollSpeed,r.direction,r.ratio,r.strength].join(":"):r.kind==="iris"?["iris",r.maskPath??"",r.scale.x,r.scale.y,r.speed,r.rough,r.noiseAmount,r.phase,r.background?1:0].join(":"):r.kind==="cloudMotion"?["cloudMotion",r.maskPath??"",r.noisePath??"",r.amount,r.direction,r.speed,r.scale,r.scaleX].join(":"):r.kind==="skew"?["skew",r.top,r.bottom,r.left,r.right,r.repeat?1:0].join(":"):r.kind==="swing"?["swing",r.maskPath??"",r.noisePath??"",r.point0.x,r.point0.y,r.point1.x,r.point1.y,r.size,r.center,r.feather,r.amount,r.speed,r.phase,r.noiseSpeed,r.noiseAmount,r.doubleSided?1:0,r.noiseEnabled?1:0].join(":"):r.kind==="filmGrain"?["filmGrain",r.maskPath??"",r.noisePath??"",r.strength,r.power,r.scale,r.greyscale?1:0,r.blendMode].join(":"):r.kind==="pulse"?["pulse",r.maskPath??"",r.speed,r.phase,r.amount,r.bounds.x,r.bounds.y,r.noiseSpeed,r.noiseAmount,r.power,r.tintLow.r,r.tintLow.g,r.tintLow.b,r.tintHigh.r,r.tintHigh.g,r.tintHigh.b,r.blendMode,r.pulseAlpha?1:0,r.pulseColor?1:0].join(":"):r.kind==="clouds"?["clouds",r.cloudPath??"",r.maskPath??"",r.alpha,r.threshold,r.feather,r.colorStart.r,r.colorStart.g,r.colorStart.b,r.colorEnd.r,r.colorEnd.g,r.colorEnd.b,...r.speed,...r.scale,r.shading?1:0,r.blendMode,r.writeAlpha?1:0].join(":"):r.kind==="blurRadial"?["blurRadial",r.maskPath??"",r.scale,r.center.x,r.center.y,r.kernel,r.keepAlpha?1:0].join(":"):r.kind==="lightShafts"?["lightShafts",r.noisePath??"",...r.transform,r.speed,r.scale.x,r.scale.y,r.smoothness,r.feather.x,r.feather.y,r.exponent,r.intensity,r.colorStart.r,r.colorStart.g,r.colorStart.b,r.colorEnd.r,r.colorEnd.g,r.colorEnd.b,r.blendMode].join(":"):r.kind==="glitter"?["glitter",r.maskPath??"",r.speed,r.density,r.scale,r.alpha,r.color.r,r.color.g,r.color.b,r.blendMode].join(":"):r.kind==="waterCaustics"?["waterCaustics",r.maskPath??"",r.causticPath??"",r.uniformPath??"",r.perlinPath??"",r.glowPath??"",r.brightness,r.glow,r.granularity,r.speed,r.timeOffset,r.distortion,r.chromatic,r.blur,r.colorStart.r,r.colorStart.g,r.colorStart.b,r.colorEnd.r,r.colorEnd.g,r.colorEnd.b,r.mode,r.blendMode].join(":"):r.kind==="depthParallax"?["depthParallax",r.depthPath??"",r.maskPath??"",r.scale.x,r.scale.y,r.sens,r.center,r.quality].join(":"):r.kind==="blur"?["blur",r.maskPath??"",r.kernel,r.scale.x,r.scale.y,r.composite,r.blendMode,r.compositeMono?1:0,r.compositeAlpha,r.compositeOffset.x,r.compositeOffset.y,r.compositeColor.r,r.compositeColor.g,r.compositeColor.b,r.keepAlpha?1:0].join(":"):["waterWaves",r.maskPath??"",r.timeOffsetPath??"",r.direction,r.speed,r.scale,r.exponent,r.strength].join(":")).join("|"),dr=({src:e,effects:r,className:t,style:i,dataSource:a,dataTiming:m,timeOriginMs:g,onFrame:_})=>{const l=N.useRef(null),f=N.useRef(e),T=N.useRef(null),d=N.useRef(_),[k,U]=N.useState(!1),[S,R]=N.useState(0),C=Si(r);return N.useEffect(()=>{d.current=_},[_]),N.useEffect(()=>{f.current=e,T.current?.(e)},[e]),N.useEffect(()=>{const x=l.current;if(!x||r.length===0)return;let B=!1,h=0;const u=[],v=[],y=[];let o=null,j=null,X=null,F=!1,ee=0,A=!1;const to=r.some(q=>q.kind==="shine"),re=r.some(q=>q.kind==="godRays");U(!1);const Ve=q=>{B||A||(A=!0,h&&(window.cancelAnimationFrame(h),h=0),T.current=null,U(!1))},$=l.current,Uo=q=>{q.preventDefault(),!B&&(h&&(window.cancelAnimationFrame(h),h=0),T.current=null,F=!1,U(!1))},ko=()=>{B||R(q=>q+1)};return $?.addEventListener("webglcontextlost",Uo),$?.addEventListener("webglcontextrestored",ko),(async()=>{const q=f.current,me=new Set([q]);r.forEach(s=>{s.kind==="opacity"?s.maskUrl&&me.add(s.maskUrl):s.kind==="waterWaves"?(s.maskUrl&&me.add(s.maskUrl),s.timeOffsetUrl&&me.add(s.timeOffsetUrl)):s.kind==="foliageSway"?(s.maskUrl&&me.add(s.maskUrl),s.noiseUrl&&me.add(s.noiseUrl)):s.kind==="waterFlow"?(s.flowMapUrl&&me.add(s.flowMapUrl),s.phaseUrl&&me.add(s.phaseUrl)):s.kind==="shake"?s.directionMapUrl&&me.add(s.directionMapUrl):s.kind==="blurPrecise"?s.maskUrl&&me.add(s.maskUrl):s.kind==="shine"?(s.maskUrl&&me.add(s.maskUrl),s.noiseUrl&&me.add(s.noiseUrl)):s.kind==="godRays"?s.maskUrl&&me.add(s.maskUrl):s.kind==="waterRipple"&&(s.maskUrl&&me.add(s.maskUrl),s.normalUrl&&me.add(s.normalUrl))});const I=new Map;if(await Promise.all([...me].map(async s=>{I.set(s,await Ur(s))})),B)return;const Be=I.get(q);if(!Be)throw new Error("Wallpaper Engine image-effect source image is unavailable.");const ho=Math.min(1,xi/Math.max(Be.naturalWidth,Be.naturalHeight)),P=Math.max(1,Math.round(Be.naturalWidth*ho)),w=Math.max(1,Math.round(Be.naturalHeight*ho));if(x.width=P,x.height=w,j=Nn(),!j)throw new Error("WebGL context budget for this scene is exhausted.");if(o=x.getContext("webgl",{alpha:!0,premultipliedAlpha:!0}),!o)throw new Error("WebGL is unavailable for Wallpaper Engine image-effect rendering.");if(o.viewport(0,0,P,w),X=o.createBuffer(),!X)throw new Error("Unable to allocate Wallpaper Engine image-effect vertex buffer.");o.bindBuffer(o.ARRAY_BUFFER,X),o.bufferData(o.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),o.STATIC_DRAW);const Pe=r.some(s=>s.kind==="opacity")?z(o,Wn):null,Ue=r.some(s=>s.kind==="scroll")?z(o,Xn):null,fe=r.some(s=>s.kind==="transform")?z(o,On):null,Z=r.some(s=>s.kind==="spin")?z(o,Hn):null,Ee=r.some(s=>s.kind==="perspective")?z(o,Gn):null,Y=r.some(s=>s.kind==="foliageSway")?z(o,zn):null,ae=r.some(s=>s.kind==="waterFlow")?z(o,jn):null,te=r.some(s=>s.kind==="shake")?z(o,$n):null,se=r.some(s=>s.kind==="blurPrecise"||s.kind==="shine")?z(o,Yn):null,Re=r.some(s=>s.kind==="shimmer")?z(o,Vn):null,de=r.some(s=>s.kind==="shine")?z(o,Kn):null,V=r.some(s=>s.kind==="shine")?z(o,qn):null,ue=re?z(o,Zn):null,Ae=re?z(o,Jn):null,no=re?z(o,ei):null,Ge=to||re?z(o,Qn):null,xe=r.some(s=>s.kind==="waterRipple")?z(o,oi):null,ke=r.some(s=>s.kind==="waterWaves")?z(o,ri):null,Se=r.some(s=>s.kind==="iris")?z(o,ti):null,ne=r.some(s=>s.kind==="cloudMotion")?z(o,ni):null,io=r.some(s=>s.kind==="skew")?z(o,ii):null,ie=r.some(s=>s.kind==="swing")?z(o,ai):null,ve=r.some(s=>s.kind==="filmGrain")?z(o,si):null,le=r.some(s=>s.kind==="pulse")?z(o,ui):null,ce=r.some(s=>s.kind==="clouds")?z(o,li):null,Ke=r.some(s=>s.kind==="blurRadial")?z(o,di):null,pe=r.some(s=>s.kind==="lightShafts")?z(o,ci):null,Me=r.some(s=>s.kind==="glitter")?z(o,mi):null,oe=r.some(s=>s.kind==="waterCaustics")?z(o,pi):null,Ne=r.some(s=>s.kind==="depthParallax")?z(o,hi):null,Oo=r.some(s=>s.kind==="blur"),So=Oo?z(o,_i):null,_o=Oo?z(o,gi):null,Ce=Oo?z(o,fi):null;Pe&&y.push(Pe),Ue&&y.push(Ue),fe&&y.push(fe),Z&&y.push(Z),Ee&&y.push(Ee),Y&&y.push(Y),ae&&y.push(ae),te&&y.push(te),se&&y.push(se),Re&&y.push(Re),de&&y.push(de),V&&y.push(V),ue&&y.push(ue),Ae&&y.push(Ae),no&&y.push(no),Ge&&y.push(Ge),xe&&y.push(xe),ke&&y.push(ke),Se&&y.push(Se),ne&&y.push(ne),io&&y.push(io),ie&&y.push(ie),ve&&y.push(ve),le&&y.push(le),ce&&y.push(ce),Ke&&y.push(Ke),pe&&y.push(pe),Me&&y.push(Me),oe&&y.push(oe),Ne&&y.push(Ne),So&&y.push(So),_o&&y.push(_o),Ce&&y.push(Ce);const Jo=ge(Be,P,w),er=Jo.getContext("2d");if(!er)throw new Error("2D canvas is unavailable for Wallpaper Engine source-frame updates.");const or=W(o,Jo,!0);u.push(or);const cr=r.some(s=>s.kind==="pulse"||s.kind==="glitter"||s.kind==="waterCaustics"?!0:(s.kind==="swing"||s.kind==="filmGrain"||s.kind==="lightShafts"||s.kind==="foliageSway"||s.kind==="cloudMotion")&&!s.noiseUrl)?Ti():null,Ie=cr?W(o,cr,!1,!0):null;Ie&&u.push(Ie);const mr=r.some(s=>s.kind==="shine"&&s.noiseEnabled&&!s.noiseUrl||s.kind==="clouds"&&!s.cloudUrl||s.kind==="waterCaustics"&&!s.perlinUrl)?Ei():null,yo=mr?W(o,mr,!1,!0):null;yo&&u.push(yo);const pr=r.some(s=>s.kind==="waterCaustics"&&!s.causticUrl)?Mr(!0):null,Ho=pr?W(o,pr,!1,!0):null;Ho&&u.push(Ho);const hr=r.some(s=>s.kind==="waterCaustics"&&!s.glowUrl)?Mr(!1):null,Go=hr?W(o,hr,!1,!0):null;Go&&u.push(Go);const Do=r.some(s=>s.kind==="waterFlow"&&!s.flowMapUrl||s.kind==="shake"&&!s.directionMapUrl)?W(o,bi()):null;Do&&u.push(Do);const he=r.map(s=>{if(s.kind==="opacity"){const b=s.maskUrl?I.get(s.maskUrl):null,E=b?W(o,ge(b,P,w)):null;return E&&u.push(E),{kind:"opacity",maskTexture:E}}if(s.kind==="waterWaves"){const b=s.maskUrl?I.get(s.maskUrl):null,E=s.timeOffsetUrl?I.get(s.timeOffsetUrl):null,L=b?W(o,ge(b,P,w)):null,n=E?W(o,ge(E,P,w)):null;return L&&u.push(L),n&&u.push(n),{kind:"waterWaves",maskTexture:L,timeOffsetTexture:n}}if(s.kind==="foliageSway"){const b=s.maskUrl?I.get(s.maskUrl):null,E=s.noiseUrl?I.get(s.noiseUrl):null,L=b?W(o,ge(b,P,w)):null,n=E?W(o,E,!1,!0):Ie;return L&&u.push(L),n&&n!==Ie&&u.push(n),{kind:"foliageSway",maskTexture:L,noiseTexture:n}}if(s.kind==="iris"){const b=s.maskUrl?I.get(s.maskUrl):null,E=b?W(o,ge(b,P,w)):null;return E&&u.push(E),{kind:"iris",maskTexture:E}}if(s.kind==="cloudMotion"){const b=s.maskUrl?I.get(s.maskUrl):null,E=s.noiseUrl?I.get(s.noiseUrl):null,L=b?W(o,ge(b,P,w)):null,n=E?W(o,E,!1,!0):Ie;return L&&u.push(L),n&&n!==Ie&&u.push(n),{kind:"cloudMotion",maskTexture:L,noiseTexture:n}}if(s.kind==="swing"){const b=s.maskUrl?I.get(s.maskUrl):null,E=s.noiseUrl?I.get(s.noiseUrl):null,L=b?W(o,ge(b,P,w)):null,n=E?W(o,E,!1,!0):Ie;return L&&u.push(L),n&&n!==Ie&&u.push(n),{kind:"swing",maskTexture:L,noiseTexture:n}}if(s.kind==="filmGrain"){const b=s.maskUrl?I.get(s.maskUrl):null,E=s.noiseUrl?I.get(s.noiseUrl):null,L=b?W(o,ge(b,P,w)):null,n=E?W(o,E,!1,!0):Ie;return L&&u.push(L),n&&n!==Ie&&u.push(n),{kind:"filmGrain",maskTexture:L,noiseTexture:n}}if(s.kind==="pulse"){const b=s.maskUrl?I.get(s.maskUrl):null,E=b?W(o,ge(b,P,w)):null;return E&&u.push(E),{kind:"pulse",maskTexture:E,noiseTexture:Ie}}if(s.kind==="clouds"){const b=s.cloudUrl?I.get(s.cloudUrl):null,E=s.maskUrl?I.get(s.maskUrl):null,L=b?W(o,b,!1,!0):yo,n=E?W(o,ge(E,P,w)):null;return L&&L!==yo&&u.push(L),n&&u.push(n),{kind:"clouds",cloudTexture:L,maskTexture:n}}if(s.kind==="blurRadial"){const b=s.maskUrl?I.get(s.maskUrl):null,E=b?W(o,ge(b,P,w)):null;return E&&u.push(E),{kind:"blurRadial",maskTexture:E}}if(s.kind==="lightShafts"){const b=s.noiseUrl?I.get(s.noiseUrl):null,E=b?W(o,b,!1,!0):Ie;return E&&E!==Ie&&u.push(E),{kind:"lightShafts",noiseTexture:E}}if(s.kind==="glitter"){const b=s.maskUrl?I.get(s.maskUrl):null,E=b?W(o,ge(b,P,w)):null;return E&&u.push(E),{kind:"glitter",maskTexture:E,noiseTexture:Ie}}if(s.kind==="waterCaustics"){const b=s.maskUrl?I.get(s.maskUrl):null,E=s.causticUrl?I.get(s.causticUrl):null,L=s.uniformUrl?I.get(s.uniformUrl):null,n=s.perlinUrl?I.get(s.perlinUrl):null,K=s.glowUrl?I.get(s.glowUrl):null,jo=b?W(o,ge(b,P,w)):null,Te=E?W(o,E,!1,!0):Ho,p=L?W(o,L,!1,!0):Ie,J=n?W(o,n,!1,!0):yo,we=K?W(o,K,!1,!0):Go;return jo&&u.push(jo),Te&&Te!==Ho&&u.push(Te),p&&p!==Ie&&u.push(p),J&&J!==yo&&u.push(J),we&&we!==Go&&u.push(we),{kind:"waterCaustics",maskTexture:jo,causticTexture:Te,uniformTexture:p,perlinTexture:J,glowTexture:we}}if(s.kind==="depthParallax"){const b=s.depthUrl?I.get(s.depthUrl):null,E=s.maskUrl?I.get(s.maskUrl):null,L=b?W(o,ge(b,P,w),!1,!0):null,n=E?W(o,ge(E,P,w)):null;return L&&u.push(L),n&&u.push(n),{kind:"depthParallax",depthTexture:L,maskTexture:n}}if(s.kind==="blur"){const b=s.maskUrl?I.get(s.maskUrl):null,E=b?W(o,ge(b,P,w)):null;return E&&u.push(E),{kind:"blur",maskTexture:E}}if(s.kind==="waterFlow"){const b=s.flowMapUrl?I.get(s.flowMapUrl):null;if(!s.phaseUrl)throw new Error("Wallpaper Engine water-flow phase URL is unavailable.");const E=I.get(s.phaseUrl);if(!E)throw new Error("Wallpaper Engine water-flow phase texture is unavailable.");const L=b?Ar(b):!1,n=b?W(o,b):Do,K=W(o,E,!1,!0);return n&&n!==Do&&u.push(n),u.push(K),{kind:"waterFlow",flowMapTexture:n,phaseTexture:K,flowMapPackedRg88:L}}if(s.kind==="shake"){const b=s.directionMapUrl?I.get(s.directionMapUrl):null,E=b?Ar(b):!1,L=b?W(o,b):Do;if(!L)throw new Error("Wallpaper Engine shake direction map is unavailable.");return L!==Do&&u.push(L),{kind:"shake",directionMapTexture:L,directionMapPackedRg88:E}}if(s.kind==="blurPrecise"){const b=s.maskUrl?I.get(s.maskUrl):null,E=b?W(o,ge(b,P,w)):null;return E&&u.push(E),{kind:"blurPrecise",maskTexture:E}}if(s.kind==="shine"){const b=s.maskUrl?I.get(s.maskUrl):null,E=s.noiseUrl?I.get(s.noiseUrl):null,L=b?W(o,ge(b,P,w)):null,n=E?W(o,E,!1,!0):yo;return L&&u.push(L),n&&n!==yo&&u.push(n),{kind:"shine",maskTexture:L,noiseTexture:n}}if(s.kind==="godRays"){const b=s.maskUrl?I.get(s.maskUrl):null,E=b?W(o,ge(b,P,w)):null;return E&&u.push(E),{kind:"godRays",maskTexture:E}}if(s.kind==="waterRipple"){const b=s.maskUrl?I.get(s.maskUrl):null;if(!s.normalUrl)throw new Error("Wallpaper Engine water-ripple normal URL is unavailable.");const E=I.get(s.normalUrl);if(!E)throw new Error("Wallpaper Engine water-ripple normal texture is unavailable.");const L=b?W(o,ge(b,P,w)):null,n=W(o,E,!1,!0);return L&&u.push(L),u.push(n),{kind:"waterRipple",maskTexture:L,normalTexture:n}}return null}),zr=r.map(s=>{if(s.kind!=="perspective")return null;const b=Kt(s.points);if(!b)throw new Error("Wallpaper Engine perspective quad is degenerate.");return b}),_r=r.length>1?[Mo(o,P,w),Mo(o,P,w)]:[];_r.forEach(s=>{u.push(s.texture),v.push(s.framebuffer)});const Lo=r.some(s=>s.kind==="blurPrecise")?Mo(o,P,w):null;Lo&&(u.push(Lo.texture),v.push(Lo.framebuffer));const gr=Math.max(2,Math.floor(P/4)),fr=Math.max(2,Math.floor(w/4)),rr=Oo?[Mo(o,gr,fr),Mo(o,gr,fr)]:[];rr.forEach(s=>{u.push(s.texture),v.push(s.framebuffer)});const qe=Math.max(1,Math.round(P/2)),Qe=Math.max(1,Math.round(w/2)),vo=r.some(s=>s.kind==="shine"||s.kind==="godRays")?[Mo(o,qe,Qe),Mo(o,qe,Qe)]:null;vo&&vo.forEach(s=>{u.push(s.texture),v.push(s.framebuffer)});const Co=Pe?{position:o.getAttribLocation(Pe,"a_Position"),source:o.getUniformLocation(Pe,"u_Source"),mask:o.getUniformLocation(Pe,"u_Mask"),hasMask:o.getUniformLocation(Pe,"u_HasMask"),alpha:o.getUniformLocation(Pe,"u_Alpha")}:null,co=Se?{position:o.getAttribLocation(Se,"a_Position"),source:o.getUniformLocation(Se,"u_Source"),mask:o.getUniformLocation(Se,"u_Mask"),hasMask:o.getUniformLocation(Se,"u_HasMask"),time:o.getUniformLocation(Se,"u_Time"),scale:o.getUniformLocation(Se,"u_Scale"),speed:o.getUniformLocation(Se,"u_Speed"),rough:o.getUniformLocation(Se,"u_Rough"),noiseAmount:o.getUniformLocation(Se,"u_NoiseAmount"),phase:o.getUniformLocation(Se,"u_Phase")}:null,Ze=ne?{position:o.getAttribLocation(ne,"a_Position"),source:o.getUniformLocation(ne,"u_Source"),mask:o.getUniformLocation(ne,"u_Mask"),noise:o.getUniformLocation(ne,"u_Noise"),hasMask:o.getUniformLocation(ne,"u_HasMask"),time:o.getUniformLocation(ne,"u_Time"),amount:o.getUniformLocation(ne,"u_Amount"),direction:o.getUniformLocation(ne,"u_Direction"),speed:o.getUniformLocation(ne,"u_Speed"),scale:o.getUniformLocation(ne,"u_Scale"),scaleX:o.getUniformLocation(ne,"u_ScaleX"),aspect:o.getUniformLocation(ne,"u_Aspect")}:null,wo=io?{position:o.getAttribLocation(io,"a_Position"),source:o.getUniformLocation(io,"u_Source"),top:o.getUniformLocation(io,"u_Top"),bottom:o.getUniformLocation(io,"u_Bottom"),left:o.getUniformLocation(io,"u_Left"),right:o.getUniformLocation(io,"u_Right"),repeat:o.getUniformLocation(io,"u_Repeat")}:null,be=ie?{position:o.getAttribLocation(ie,"a_Position"),source:o.getUniformLocation(ie,"u_Source"),mask:o.getUniformLocation(ie,"u_Mask"),noise:o.getUniformLocation(ie,"u_Noise"),hasMask:o.getUniformLocation(ie,"u_HasMask"),noiseEnabled:o.getUniformLocation(ie,"u_NoiseEnabled"),doubleSided:o.getUniformLocation(ie,"u_DoubleSided"),time:o.getUniformLocation(ie,"u_Time"),point0:o.getUniformLocation(ie,"u_Point0"),point1:o.getUniformLocation(ie,"u_Point1"),size:o.getUniformLocation(ie,"u_Size"),center:o.getUniformLocation(ie,"u_Center"),feather:o.getUniformLocation(ie,"u_Feather"),amount:o.getUniformLocation(ie,"u_Amount"),speed:o.getUniformLocation(ie,"u_Speed"),phase:o.getUniformLocation(ie,"u_Phase"),noiseSpeed:o.getUniformLocation(ie,"u_NoiseSpeed"),noiseAmount:o.getUniformLocation(ie,"u_NoiseAmount"),aspect:o.getUniformLocation(ie,"u_Aspect")}:null,Je=ve?{position:o.getAttribLocation(ve,"a_Position"),source:o.getUniformLocation(ve,"u_Source"),noise:o.getUniformLocation(ve,"u_Noise"),mask:o.getUniformLocation(ve,"u_Mask"),hasMask:o.getUniformLocation(ve,"u_HasMask"),time:o.getUniformLocation(ve,"u_Time"),strength:o.getUniformLocation(ve,"u_Strength"),power:o.getUniformLocation(ve,"u_Power"),scale:o.getUniformLocation(ve,"u_Scale"),aspect:o.getUniformLocation(ve,"u_Aspect"),greyscale:o.getUniformLocation(ve,"u_Greyscale"),blendMode:o.getUniformLocation(ve,"u_BlendMode")}:null,ye=le?{position:o.getAttribLocation(le,"a_Position"),source:o.getUniformLocation(le,"u_Source"),noise:o.getUniformLocation(le,"u_Noise"),mask:o.getUniformLocation(le,"u_Mask"),hasMask:o.getUniformLocation(le,"u_HasMask"),time:o.getUniformLocation(le,"u_Time"),speed:o.getUniformLocation(le,"u_Speed"),phase:o.getUniformLocation(le,"u_Phase"),amount:o.getUniformLocation(le,"u_Amount"),bounds:o.getUniformLocation(le,"u_Bounds"),noiseSpeed:o.getUniformLocation(le,"u_NoiseSpeed"),noiseAmount:o.getUniformLocation(le,"u_NoiseAmount"),power:o.getUniformLocation(le,"u_Power"),tintLow:o.getUniformLocation(le,"u_TintLow"),tintHigh:o.getUniformLocation(le,"u_TintHigh"),blendMode:o.getUniformLocation(le,"u_BlendMode"),pulseAlpha:o.getUniformLocation(le,"u_PulseAlpha"),pulseColor:o.getUniformLocation(le,"u_PulseColor")}:null,De=ce?{position:o.getAttribLocation(ce,"a_Position"),source:o.getUniformLocation(ce,"u_Source"),clouds:o.getUniformLocation(ce,"u_Clouds"),mask:o.getUniformLocation(ce,"u_Mask"),hasMask:o.getUniformLocation(ce,"u_HasMask"),time:o.getUniformLocation(ce,"u_Time"),alpha:o.getUniformLocation(ce,"u_Alpha"),threshold:o.getUniformLocation(ce,"u_Threshold"),feather:o.getUniformLocation(ce,"u_Feather"),colorStart:o.getUniformLocation(ce,"u_ColorStart"),colorEnd:o.getUniformLocation(ce,"u_ColorEnd"),speed:o.getUniformLocation(ce,"u_Speed"),scale:o.getUniformLocation(ce,"u_Scale"),aspect:o.getUniformLocation(ce,"u_Aspect"),shading:o.getUniformLocation(ce,"u_Shading"),blendMode:o.getUniformLocation(ce,"u_BlendMode"),writeAlpha:o.getUniformLocation(ce,"u_WriteAlpha")}:null,xo=Ke?{position:o.getAttribLocation(Ke,"a_Position"),source:o.getUniformLocation(Ke,"u_Source"),mask:o.getUniformLocation(Ke,"u_Mask"),hasMask:o.getUniformLocation(Ke,"u_HasMask"),scale:o.getUniformLocation(Ke,"u_Scale"),center:o.getUniformLocation(Ke,"u_Center"),kernel:o.getUniformLocation(Ke,"u_Kernel"),keepAlpha:o.getUniformLocation(Ke,"u_KeepAlpha")}:null,Fe=pe?{position:o.getAttribLocation(pe,"a_Position"),source:o.getUniformLocation(pe,"u_Source"),noise:o.getUniformLocation(pe,"u_Noise"),xform0:o.getUniformLocation(pe,"u_Xform0"),xform1:o.getUniformLocation(pe,"u_Xform1"),xform2:o.getUniformLocation(pe,"u_Xform2"),time:o.getUniformLocation(pe,"u_Time"),speed:o.getUniformLocation(pe,"u_Speed"),scale:o.getUniformLocation(pe,"u_Scale"),smoothness:o.getUniformLocation(pe,"u_Smoothness"),feather:o.getUniformLocation(pe,"u_Feather"),exponent:o.getUniformLocation(pe,"u_Exponent"),intensity:o.getUniformLocation(pe,"u_Intensity"),colorStart:o.getUniformLocation(pe,"u_ColorStart"),colorEnd:o.getUniformLocation(pe,"u_ColorEnd"),blendMode:o.getUniformLocation(pe,"u_BlendMode")}:null,ze=Me?{position:o.getAttribLocation(Me,"a_Position"),source:o.getUniformLocation(Me,"u_Source"),noise:o.getUniformLocation(Me,"u_Noise"),mask:o.getUniformLocation(Me,"u_Mask"),hasMask:o.getUniformLocation(Me,"u_HasMask"),time:o.getUniformLocation(Me,"u_Time"),speed:o.getUniformLocation(Me,"u_Speed"),density:o.getUniformLocation(Me,"u_Density"),scale:o.getUniformLocation(Me,"u_Scale"),alpha:o.getUniformLocation(Me,"u_Alpha"),color:o.getUniformLocation(Me,"u_Color"),blendMode:o.getUniformLocation(Me,"u_BlendMode"),aspect:o.getUniformLocation(Me,"u_Aspect")}:null,_e=oe?{position:o.getAttribLocation(oe,"a_Position"),source:o.getUniformLocation(oe,"u_Source"),mask:o.getUniformLocation(oe,"u_Mask"),caustic:o.getUniformLocation(oe,"u_Caustic"),uniform:o.getUniformLocation(oe,"u_Uniform"),perlin:o.getUniformLocation(oe,"u_Perlin"),glow:o.getUniformLocation(oe,"u_Glow"),glowPattern:o.getUniformLocation(oe,"u_GlowPattern"),hasMask:o.getUniformLocation(oe,"u_HasMask"),time:o.getUniformLocation(oe,"u_Time"),brightness:o.getUniformLocation(oe,"u_Brightness"),granularity:o.getUniformLocation(oe,"u_Granularity"),distortion:o.getUniformLocation(oe,"u_Distortion"),chromatic:o.getUniformLocation(oe,"u_Chromatic"),blur:o.getUniformLocation(oe,"u_Blur"),colorStart:o.getUniformLocation(oe,"u_ColorStart"),colorEnd:o.getUniformLocation(oe,"u_ColorEnd"),mode:o.getUniformLocation(oe,"u_Mode"),blendMode:o.getUniformLocation(oe,"u_BlendMode"),aspect:o.getUniformLocation(oe,"u_Aspect")}:null,ao=Ne?{position:o.getAttribLocation(Ne,"a_Position"),source:o.getUniformLocation(Ne,"u_Source"),depth:o.getUniformLocation(Ne,"u_Depth"),mask:o.getUniformLocation(Ne,"u_Mask"),hasDepth:o.getUniformLocation(Ne,"u_HasDepth"),hasMask:o.getUniformLocation(Ne,"u_HasMask"),scale:o.getUniformLocation(Ne,"u_Scale"),sens:o.getUniformLocation(Ne,"u_Sens"),center:o.getUniformLocation(Ne,"u_Center"),parallaxPosition:o.getUniformLocation(Ne,"u_ParallaxPosition"),quality:o.getUniformLocation(Ne,"u_Quality")}:null,zo=So?{position:o.getAttribLocation(So,"a_Position"),source:o.getUniformLocation(So,"u_Source"),texelSize:o.getUniformLocation(So,"u_TexelSize")}:null,bo=_o?{position:o.getAttribLocation(_o,"a_Position"),source:o.getUniformLocation(_o,"u_Source"),direction:o.getUniformLocation(_o,"u_Direction"),kernel:o.getUniformLocation(_o,"u_Kernel")}:null,eo=Ce?{position:o.getAttribLocation(Ce,"a_Position"),source:o.getUniformLocation(Ce,"u_Source"),blurred:o.getUniformLocation(Ce,"u_Blurred"),mask:o.getUniformLocation(Ce,"u_Mask"),hasMask:o.getUniformLocation(Ce,"u_HasMask"),compositeOffset:o.getUniformLocation(Ce,"u_CompositeOffset"),composite:o.getUniformLocation(Ce,"u_Composite"),blendMode:o.getUniformLocation(Ce,"u_BlendMode"),compositeMono:o.getUniformLocation(Ce,"u_CompositeMono"),compositeColor:o.getUniformLocation(Ce,"u_CompositeColor"),compositeAlpha:o.getUniformLocation(Ce,"u_CompositeAlpha"),keepAlpha:o.getUniformLocation(Ce,"u_KeepAlpha")}:null,Ro=Ue?{position:o.getAttribLocation(Ue,"a_Position"),source:o.getUniformLocation(Ue,"u_Source"),time:o.getUniformLocation(Ue,"u_Time"),speedX:o.getUniformLocation(Ue,"u_SpeedX"),speedY:o.getUniformLocation(Ue,"u_SpeedY"),repeat:o.getUniformLocation(Ue,"u_Repeat")}:null,Ao=fe?{position:o.getAttribLocation(fe,"a_Position"),source:o.getUniformLocation(fe,"u_Source"),offset:o.getUniformLocation(fe,"u_Offset"),scale:o.getUniformLocation(fe,"u_Scale"),angle:o.getUniformLocation(fe,"u_Angle"),repeat:o.getUniformLocation(fe,"u_Repeat")}:null,Oe=Z?{position:o.getAttribLocation(Z,"a_Position"),source:o.getUniformLocation(Z,"u_Source"),time:o.getUniformLocation(Z,"u_Time"),center:o.getUniformLocation(Z,"u_Center"),speed:o.getUniformLocation(Z,"u_Speed"),ratio:o.getUniformLocation(Z,"u_Ratio"),axis:o.getUniformLocation(Z,"u_Axis"),phase:o.getUniformLocation(Z,"u_Phase"),size:o.getUniformLocation(Z,"u_Size"),feather:o.getUniformLocation(Z,"u_Feather"),aspect:o.getUniformLocation(Z,"u_Aspect"),repeat:o.getUniformLocation(Z,"u_Repeat"),elliptical:o.getUniformLocation(Z,"u_Elliptical"),softMask:o.getUniformLocation(Z,"u_SoftMask")}:null,No=Ee?{position:o.getAttribLocation(Ee,"a_Position"),source:o.getUniformLocation(Ee,"u_Source"),matrix:o.getUniformLocation(Ee,"u_QuadToSquare"),repeat:o.getUniformLocation(Ee,"u_Repeat")}:null,He=Y?{position:o.getAttribLocation(Y,"a_Position"),source:o.getUniformLocation(Y,"u_Source"),mask:o.getUniformLocation(Y,"u_Mask"),noise:o.getUniformLocation(Y,"u_Noise"),hasMask:o.getUniformLocation(Y,"u_HasMask"),time:o.getUniformLocation(Y,"u_Time"),speed:o.getUniformLocation(Y,"u_Speed"),strength:o.getUniformLocation(Y,"u_Strength"),phase:o.getUniformLocation(Y,"u_Phase"),power:o.getUniformLocation(Y,"u_Power"),noiseScale:o.getUniformLocation(Y,"u_NoiseScale"),ratio:o.getUniformLocation(Y,"u_Ratio"),direction:o.getUniformLocation(Y,"u_Direction"),aspect:o.getUniformLocation(Y,"u_Aspect")}:null,oo=ae?{position:o.getAttribLocation(ae,"a_Position"),source:o.getUniformLocation(ae,"u_Source"),flowMap:o.getUniformLocation(ae,"u_FlowMap"),phase:o.getUniformLocation(ae,"u_Phase"),flowMapPackedRg88:o.getUniformLocation(ae,"u_FlowMapPackedRg88"),time:o.getUniformLocation(ae,"u_Time"),speed:o.getUniformLocation(ae,"u_Speed"),strength:o.getUniformLocation(ae,"u_Strength"),phaseScale:o.getUniformLocation(ae,"u_PhaseScale"),legacy:o.getUniformLocation(ae,"u_Legacy"),hasFeather:o.getUniformLocation(ae,"u_HasFeather"),feather:o.getUniformLocation(ae,"u_Feather")}:null,mo=te?{position:o.getAttribLocation(te,"a_Position"),source:o.getUniformLocation(te,"u_Source"),directionMap:o.getUniformLocation(te,"u_DirectionMap"),directionMapPackedRg88:o.getUniformLocation(te,"u_DirectionMapPackedRg88"),time:o.getUniformLocation(te,"u_Time"),speed:o.getUniformLocation(te,"u_Speed"),strength:o.getUniformLocation(te,"u_Strength"),friction:o.getUniformLocation(te,"u_Friction"),bounds:o.getUniformLocation(te,"u_Bounds"),directionMode:o.getUniformLocation(te,"u_DirectionMode")}:null,Q=se?{position:o.getAttribLocation(se,"a_Position"),source:o.getUniformLocation(se,"u_Source"),original:o.getUniformLocation(se,"u_Original"),mask:o.getUniformLocation(se,"u_Mask"),direction:o.getUniformLocation(se,"u_Direction"),finalPass:o.getUniformLocation(se,"u_FinalPass"),hasMask:o.getUniformLocation(se,"u_HasMask"),blurAlpha:o.getUniformLocation(se,"u_BlurAlpha")}:null,po=Re?{position:o.getAttribLocation(Re,"a_Position"),source:o.getUniformLocation(Re,"u_Source"),time:o.getUniformLocation(Re,"u_Time"),color:o.getUniformLocation(Re,"u_Color"),brightness:o.getUniformLocation(Re,"u_Brightness"),direction:o.getUniformLocation(Re,"u_Direction"),granularity:o.getUniformLocation(Re,"u_Granularity"),offset:o.getUniformLocation(Re,"u_Offset"),speed:o.getUniformLocation(Re,"u_Speed"),delay:o.getUniformLocation(Re,"u_Delay")}:null,so=de?{position:o.getAttribLocation(de,"a_Position"),source:o.getUniformLocation(de,"u_Source"),mask:o.getUniformLocation(de,"u_Mask"),noise:o.getUniformLocation(de,"u_Noise"),hasMask:o.getUniformLocation(de,"u_HasMask"),noiseEnabled:o.getUniformLocation(de,"u_NoiseEnabled"),time:o.getUniformLocation(de,"u_Time"),threshold:o.getUniformLocation(de,"u_Threshold"),noiseAmount:o.getUniformLocation(de,"u_NoiseAmount"),noiseScale:o.getUniformLocation(de,"u_NoiseScale"),noiseSpeed:o.getUniformLocation(de,"u_NoiseSpeed")}:null,uo=V?{position:o.getAttribLocation(V,"a_Position"),source:o.getUniformLocation(V,"u_Source"),time:o.getUniformLocation(V,"u_Time"),direction:o.getUniformLocation(V,"u_Direction"),speed:o.getUniformLocation(V,"u_Speed"),rayLength:o.getUniformLocation(V,"u_RayLength"),intensity:o.getUniformLocation(V,"u_Intensity"),color:o.getUniformLocation(V,"u_Color"),aspect:o.getUniformLocation(V,"u_Aspect"),edges:o.getUniformLocation(V,"u_Edges"),sampleMode:o.getUniformLocation(V,"u_SampleMode")}:null,Fo=ue?{position:o.getAttribLocation(ue,"a_Position"),source:o.getUniformLocation(ue,"u_Source"),mask:o.getUniformLocation(ue,"u_Mask"),hasMask:o.getUniformLocation(ue,"u_HasMask"),threshold:o.getUniformLocation(ue,"u_Threshold")}:null,je=Ae?{position:o.getAttribLocation(Ae,"a_Position"),source:o.getUniformLocation(Ae,"u_Source"),casterMode:o.getUniformLocation(Ae,"u_CasterMode"),center:o.getUniformLocation(Ae,"u_Center"),direction:o.getUniformLocation(Ae,"u_Direction"),rayLength:o.getUniformLocation(Ae,"u_RayLength"),intensity:o.getUniformLocation(Ae,"u_Intensity"),colorStart:o.getUniformLocation(Ae,"u_ColorStart"),colorEnd:o.getUniformLocation(Ae,"u_ColorEnd"),sampleMode:o.getUniformLocation(Ae,"u_SampleMode")}:null,To=no?{position:o.getAttribLocation(no,"a_Position"),source:o.getUniformLocation(no,"u_Source"),direction:o.getUniformLocation(no,"u_Direction"),kernel:o.getUniformLocation(no,"u_Kernel")}:null,go=Ge?{position:o.getAttribLocation(Ge,"a_Position"),rays:o.getUniformLocation(Ge,"u_Rays"),original:o.getUniformLocation(Ge,"u_Original"),blendMode:o.getUniformLocation(Ge,"u_BlendMode")}:null,$e=xe?{position:o.getAttribLocation(xe,"a_Position"),source:o.getUniformLocation(xe,"u_Source"),mask:o.getUniformLocation(xe,"u_Mask"),normal:o.getUniformLocation(xe,"u_Normal"),hasMask:o.getUniformLocation(xe,"u_HasMask"),time:o.getUniformLocation(xe,"u_Time"),animationSpeed:o.getUniformLocation(xe,"u_AnimationSpeed"),scale:o.getUniformLocation(xe,"u_Scale"),scrollSpeed:o.getUniformLocation(xe,"u_ScrollSpeed"),direction:o.getUniformLocation(xe,"u_Direction"),ratio:o.getUniformLocation(xe,"u_Ratio"),strength:o.getUniformLocation(xe,"u_Strength"),aspect:o.getUniformLocation(xe,"u_Aspect")}:null,ro=ke?{position:o.getAttribLocation(ke,"a_Position"),source:o.getUniformLocation(ke,"u_Source"),mask:o.getUniformLocation(ke,"u_Mask"),timeOffset:o.getUniformLocation(ke,"u_TimeOffset"),hasMask:o.getUniformLocation(ke,"u_HasMask"),hasTimeOffset:o.getUniformLocation(ke,"u_HasTimeOffset"),time:o.getUniformLocation(ke,"u_Time"),direction:o.getUniformLocation(ke,"u_Direction"),speed:o.getUniformLocation(ke,"u_Speed"),scale:o.getUniformLocation(ke,"u_Scale"),exponent:o.getUniformLocation(ke,"u_Exponent"),strength:o.getUniformLocation(ke,"u_Strength")}:null,O=(s,b,E)=>{o.useProgram(s),o.bindBuffer(o.ARRAY_BUFFER,X),o.enableVertexAttribArray(b),o.vertexAttribPointer(b,2,o.FLOAT,!1,0,0),o.uniform1i(E,0)},xr=s=>{if(s===q&&ee===0)return;const b=++ee;Ur(s).then(E=>{B||b!==ee||f.current!==s||!o||(er.clearRect(0,0,P,w),er.drawImage(E,0,0,P,w),ki(o,or,Jo,!0))}).catch(E=>{})};T.current=xr,f.current!==q&&xr(f.current);const tr=s=>{try{jr(s)}catch{Ve()}},jr=s=>{if(B||A||!o)return;if(document.hidden){h=window.requestAnimationFrame(tr);return}const b=Math.max(0,(s-g)/1e3);let E=or;r.forEach((n,K)=>{const Te=K===r.length-1?null:_r[K%2];if(o.bindFramebuffer(o.FRAMEBUFFER,Te?.framebuffer??null),o.viewport(0,0,P,w),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,E),n.kind==="shine"){const p=he[K];if(!de||!so||!V||!uo||!Ge||!go||!se||!Q||!vo||!p||p.kind!=="shine"||n.kernel!==0||n.blendMode<0||n.blendMode>32||n.copyBackground||n.noiseEnabled&&!p.noiseTexture)throw new Error("Wallpaper Engine shine multipass program is unavailable.");const J=E,[we,lo]=vo;o.bindFramebuffer(o.FRAMEBUFFER,we.framebuffer),o.viewport(0,0,qe,Qe),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,J),O(de,so.position,so.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,p.noiseTexture),o.uniform1i(so.mask,1),o.uniform1i(so.noise,2),o.uniform1i(so.hasMask,p.maskTexture?1:0),o.uniform1i(so.noiseEnabled,n.noiseEnabled?1:0),o.uniform1f(so.time,b),o.uniform1f(so.threshold,n.threshold),o.uniform1f(so.noiseAmount,n.noiseAmount),o.uniform1f(so.noiseScale,n.noiseScale),o.uniform1f(so.noiseSpeed,n.noiseSpeed),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,lo.framebuffer),o.viewport(0,0,qe,Qe),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,we.texture),O(V,uo.position,uo.source),o.uniform1f(uo.time,b),o.uniform1f(uo.direction,n.rayDirection),o.uniform1f(uo.speed,n.raySpeed),o.uniform1f(uo.rayLength,n.rayLength),o.uniform1f(uo.intensity,n.rayIntensity),o.uniform3f(uo.color,n.rayColor.r,n.rayColor.g,n.rayColor.b),o.uniform1f(uo.aspect,qe/Qe),o.uniform1i(uo.edges,n.edges),o.uniform1i(uo.sampleMode,n.sampleMode),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,we.framebuffer),o.viewport(0,0,qe,Qe),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,lo.texture),O(se,Q.position,Q.source),o.uniform2f(Q.direction,n.blurScale.x/qe,0),o.uniform1i(Q.finalPass,0),o.uniform1i(Q.hasMask,0),o.uniform1i(Q.blurAlpha,1),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,lo.framebuffer),o.viewport(0,0,qe,Qe),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,we.texture),O(se,Q.position,Q.source),o.uniform2f(Q.direction,0,n.blurScale.y/Qe),o.uniform1i(Q.finalPass,0),o.uniform1i(Q.hasMask,0),o.uniform1i(Q.blurAlpha,1),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,Te?.framebuffer??null),o.viewport(0,0,P,w),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,lo.texture),O(Ge,go.position,go.rays),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,J),o.uniform1i(go.original,1),o.uniform1i(go.blendMode,n.blendMode),o.drawArrays(o.TRIANGLES,0,6),Te&&(E=Te.texture);return}if(n.kind==="godRays"){const p=he[K];if(!ue||!Fo||!Ae||!je||!no||!To||!Ge||!go||!vo||!p||p.kind!=="godRays"||n.blendMode<0||n.blendMode>32)throw new Error("Wallpaper Engine God Rays multipass program is unavailable.");const J=E,[we,lo]=vo;o.bindFramebuffer(o.FRAMEBUFFER,we.framebuffer),o.viewport(0,0,qe,Qe),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,J),O(ue,Fo.position,Fo.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.uniform1i(Fo.mask,1),o.uniform1i(Fo.hasMask,p.maskTexture?1:0),o.uniform1f(Fo.threshold,n.threshold),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,lo.framebuffer),o.viewport(0,0,qe,Qe),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,we.texture),O(Ae,je.position,je.source),n.caster.mode==="radial"?(o.uniform1i(je.casterMode,0),o.uniform2f(je.center,n.caster.center.x,n.caster.center.y),o.uniform1f(je.direction,0)):(o.uniform1i(je.casterMode,1),o.uniform2f(je.center,.5,.5),o.uniform1f(je.direction,n.caster.direction)),o.uniform1f(je.rayLength,n.rayLength),o.uniform1f(je.intensity,n.rayIntensity),o.uniform3f(je.colorStart,n.colorStart.r,n.colorStart.g,n.colorStart.b),o.uniform3f(je.colorEnd,n.colorEnd.r,n.colorEnd.g,n.colorEnd.b),o.uniform1i(je.sampleMode,n.sampleMode),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,we.framebuffer),o.viewport(0,0,qe,Qe),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,lo.texture),O(no,To.position,To.source),o.uniform2f(To.direction,n.blurScale.x/qe,0),o.uniform1i(To.kernel,n.kernel),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,lo.framebuffer),o.viewport(0,0,qe,Qe),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,we.texture),O(no,To.position,To.source),o.uniform2f(To.direction,0,n.blurScale.y/Qe),o.uniform1i(To.kernel,n.kernel),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,Te?.framebuffer??null),o.viewport(0,0,P,w),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,lo.texture),O(Ge,go.position,go.rays),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,J),o.uniform1i(go.original,1),o.uniform1i(go.blendMode,n.blendMode),o.drawArrays(o.TRIANGLES,0,6),Te&&(E=Te.texture);return}if(n.kind==="blurPrecise"){const p=he[K];if(!se||!Q||!Lo||!p||p.kind!=="blurPrecise"||n.horizontalKernel!==0||n.verticalKernel!==0)throw new Error("Wallpaper Engine precise-blur program is unavailable.");const J=E;o.bindFramebuffer(o.FRAMEBUFFER,Lo.framebuffer),o.viewport(0,0,P,w),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,J),O(se,Q.position,Q.source),o.uniform2f(Q.direction,n.scale.x/P,0),o.uniform1i(Q.finalPass,0),o.uniform1i(Q.hasMask,0),o.uniform1i(Q.blurAlpha,1),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,Te?.framebuffer??null),o.viewport(0,0,P,w),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,Lo.texture),O(se,Q.position,Q.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,J),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.uniform1i(Q.original,1),o.uniform1i(Q.mask,2),o.uniform2f(Q.direction,0,n.scale.y/w),o.uniform1i(Q.finalPass,1),o.uniform1i(Q.hasMask,p.maskTexture?1:0),o.uniform1i(Q.blurAlpha,n.blurAlpha?1:0),o.drawArrays(o.TRIANGLES,0,6),Te&&(E=Te.texture);return}if(n.kind==="opacity"){const p=he[K];if(!Pe||!Co||!p||p.kind!=="opacity")throw new Error("Wallpaper Engine opacity program is unavailable.");O(Pe,Co.position,Co.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.uniform1i(Co.mask,1),o.uniform1i(Co.hasMask,p.maskTexture?1:0),o.uniform1f(Co.alpha,n.alpha)}else if(n.kind==="scroll"){if(!Ue||!Ro)throw new Error("Wallpaper Engine scroll program is unavailable.");O(Ue,Ro.position,Ro.source),o.uniform1f(Ro.time,b),o.uniform1f(Ro.speedX,n.speedX),o.uniform1f(Ro.speedY,n.speedY),o.uniform2f(Ro.repeat,n.repeat.x,n.repeat.y)}else if(n.kind==="transform"){if(!fe||!Ao)throw new Error("Wallpaper Engine transform program is unavailable.");O(fe,Ao.position,Ao.source),o.uniform2f(Ao.offset,n.offset.x,n.offset.y),o.uniform2f(Ao.scale,n.scale.x,n.scale.y),o.uniform1f(Ao.angle,n.angle),o.uniform1i(Ao.repeat,n.repeat?1:0)}else if(n.kind==="spin"){if(!Z||!Oe)throw new Error("Wallpaper Engine spin program is unavailable.");O(Z,Oe.position,Oe.source),o.uniform1f(Oe.time,b),o.uniform2f(Oe.center,n.center.x,n.center.y),o.uniform1f(Oe.speed,n.speed),o.uniform1f(Oe.ratio,n.ratio),o.uniform1f(Oe.axis,n.axis),o.uniform1f(Oe.phase,n.phase),o.uniform1f(Oe.size,n.size),o.uniform1f(Oe.feather,n.feather),o.uniform1f(Oe.aspect,n.aspectCorrect?P/w:1),o.uniform1i(Oe.repeat,n.repeat?1:0),o.uniform1i(Oe.elliptical,n.elliptical?1:0),o.uniform1i(Oe.softMask,n.softMask?1:0)}else if(n.kind==="perspective"){const p=zr[K];if(!Ee||!No||!p)throw new Error("Wallpaper Engine perspective program is unavailable.");O(Ee,No.position,No.source),o.uniformMatrix3fv(No.matrix,!1,p),o.uniform1i(No.repeat,n.repeat?1:0)}else if(n.kind==="foliageSway"){const p=he[K];if(!Y||!He||!p||p.kind!=="foliageSway"||!p.noiseTexture)throw new Error("Wallpaper Engine foliage-sway program is unavailable.");O(Y,He.position,He.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,p.noiseTexture),o.uniform1i(He.mask,1),o.uniform1i(He.noise,2),o.uniform1i(He.hasMask,p.maskTexture?1:0),o.uniform1f(He.time,b),o.uniform1f(He.speed,n.speed),o.uniform1f(He.strength,n.strength),o.uniform1f(He.phase,n.phase),o.uniform1f(He.power,n.power),o.uniform1f(He.noiseScale,n.noiseScale),o.uniform1f(He.ratio,n.ratio),o.uniform1f(He.direction,n.direction),o.uniform1f(He.aspect,P/w)}else if(n.kind==="waterFlow"){const p=he[K];if(!ae||!oo||!p||p.kind!=="waterFlow"||!p.flowMapTexture)throw new Error("Wallpaper Engine water-flow program is unavailable.");O(ae,oo.position,oo.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.flowMapTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,p.phaseTexture),o.uniform1i(oo.flowMap,1),o.uniform1i(oo.phase,2),o.uniform1i(oo.flowMapPackedRg88,p.flowMapPackedRg88?1:0),o.uniform1f(oo.time,b),o.uniform1f(oo.speed,n.speed),o.uniform1f(oo.strength,n.strength),o.uniform1f(oo.phaseScale,n.phaseScale),o.uniform1i(oo.legacy,n.phaseMode==="legacy"?1:0),o.uniform1i(oo.hasFeather,n.feather===null?0:1),o.uniform1f(oo.feather,n.feather??0)}else if(n.kind==="shake"){const p=he[K];if(!te||!mo||!p||p.kind!=="shake"||!p.directionMapTexture)throw new Error("Wallpaper Engine shake program is unavailable.");O(te,mo.position,mo.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.directionMapTexture),o.uniform1i(mo.directionMap,1),o.uniform1i(mo.directionMapPackedRg88,p.directionMapPackedRg88?1:0),o.uniform1f(mo.time,b),o.uniform1f(mo.speed,n.speed),o.uniform1f(mo.strength,n.strength),o.uniform2f(mo.friction,n.friction.x,n.friction.y),o.uniform2f(mo.bounds,n.bounds.x,n.bounds.y),o.uniform1f(mo.directionMode,n.directionMode)}else if(n.kind==="shimmer"){if(!Re||!po)throw new Error("Wallpaper Engine shimmer program is unavailable.");O(Re,po.position,po.source),o.uniform1f(po.time,b),o.uniform3f(po.color,n.color.r,n.color.g,n.color.b),o.uniform1f(po.brightness,n.brightness),o.uniform1f(po.direction,n.direction),o.uniform1f(po.granularity,n.granularity),o.uniform1f(po.offset,n.offset),o.uniform1f(po.speed,n.speed),o.uniform1f(po.delay,n.delay)}else if(n.kind==="waterRipple"){const p=he[K];if(!xe||!$e||!p||p.kind!=="waterRipple"||!p.normalTexture)throw new Error("Wallpaper Engine water-ripple program is unavailable.");O(xe,$e.position,$e.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,p.normalTexture),o.uniform1i($e.mask,1),o.uniform1i($e.normal,2),o.uniform1i($e.hasMask,p.maskTexture?1:0),o.uniform1f($e.time,b),o.uniform1f($e.animationSpeed,n.animationSpeed),o.uniform1f($e.scale,n.scale),o.uniform1f($e.scrollSpeed,n.scrollSpeed),o.uniform1f($e.direction,n.direction),o.uniform1f($e.ratio,n.ratio),o.uniform1f($e.strength,n.strength),o.uniform1f($e.aspect,P/w)}else if(n.kind==="iris"){const p=he[K];if(!Se||!co||!p||p.kind!=="iris")throw new Error("Wallpaper Engine iris program is unavailable.");O(Se,co.position,co.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.uniform1i(co.mask,1),o.uniform1i(co.hasMask,p.maskTexture?1:0),o.uniform1f(co.time,b),o.uniform2f(co.scale,n.scale.x,n.scale.y),o.uniform1f(co.speed,n.speed),o.uniform1f(co.rough,n.rough),o.uniform1f(co.noiseAmount,n.noiseAmount),o.uniform1f(co.phase,n.phase)}else if(n.kind==="cloudMotion"){const p=he[K];if(!ne||!Ze||!p||p.kind!=="cloudMotion"||!p.noiseTexture)throw new Error("Wallpaper Engine cloud-motion program is unavailable.");O(ne,Ze.position,Ze.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,p.noiseTexture),o.uniform1i(Ze.mask,1),o.uniform1i(Ze.noise,2),o.uniform1i(Ze.hasMask,p.maskTexture?1:0),o.uniform1f(Ze.time,b),o.uniform1f(Ze.amount,n.amount),o.uniform1f(Ze.direction,n.direction),o.uniform1f(Ze.speed,n.speed),o.uniform1f(Ze.scale,n.scale),o.uniform1f(Ze.scaleX,n.scaleX),o.uniform1f(Ze.aspect,P/w)}else if(n.kind==="skew"){if(!io||!wo)throw new Error("Wallpaper Engine skew program is unavailable.");O(io,wo.position,wo.source),o.uniform1f(wo.top,n.top),o.uniform1f(wo.bottom,n.bottom),o.uniform1f(wo.left,n.left),o.uniform1f(wo.right,n.right),o.uniform1i(wo.repeat,n.repeat?1:0)}else if(n.kind==="swing"){const p=he[K];if(!ie||!be||!p||p.kind!=="swing"||!p.noiseTexture)throw new Error("Wallpaper Engine swing program is unavailable.");O(ie,be.position,be.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,p.noiseTexture),o.uniform1i(be.mask,1),o.uniform1i(be.noise,2),o.uniform1i(be.hasMask,p.maskTexture?1:0),o.uniform1i(be.noiseEnabled,n.noiseEnabled?1:0),o.uniform1i(be.doubleSided,n.doubleSided?1:0),o.uniform1f(be.time,b),o.uniform2f(be.point0,n.point0.x,n.point0.y),o.uniform2f(be.point1,n.point1.x,n.point1.y),o.uniform1f(be.size,n.size),o.uniform1f(be.center,n.center),o.uniform1f(be.feather,n.feather),o.uniform1f(be.amount,n.amount),o.uniform1f(be.speed,n.speed),o.uniform1f(be.phase,n.phase),o.uniform1f(be.noiseSpeed,n.noiseSpeed),o.uniform1f(be.noiseAmount,n.noiseAmount),o.uniform1f(be.aspect,P/w)}else if(n.kind==="filmGrain"){const p=he[K];if(!ve||!Je||!p||p.kind!=="filmGrain"||!p.noiseTexture)throw new Error("Wallpaper Engine film-grain program is unavailable.");O(ve,Je.position,Je.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,p.noiseTexture),o.uniform1i(Je.mask,1),o.uniform1i(Je.noise,2),o.uniform1i(Je.hasMask,p.maskTexture?1:0),o.uniform1f(Je.time,b),o.uniform1f(Je.strength,n.strength),o.uniform1f(Je.power,n.power),o.uniform1f(Je.scale,n.scale),o.uniform1f(Je.aspect,P/w),o.uniform1i(Je.greyscale,n.greyscale?1:0),o.uniform1i(Je.blendMode,n.blendMode)}else if(n.kind==="pulse"){const p=he[K];if(!le||!ye||!p||p.kind!=="pulse"||!p.noiseTexture)throw new Error("Wallpaper Engine pulse program is unavailable.");O(le,ye.position,ye.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,p.noiseTexture),o.uniform1i(ye.mask,1),o.uniform1i(ye.noise,2),o.uniform1i(ye.hasMask,p.maskTexture?1:0),o.uniform1f(ye.time,b),o.uniform1f(ye.speed,n.speed),o.uniform1f(ye.phase,n.phase),o.uniform1f(ye.amount,n.amount),o.uniform2f(ye.bounds,n.bounds.x,n.bounds.y),o.uniform1f(ye.noiseSpeed,n.noiseSpeed),o.uniform1f(ye.noiseAmount,n.noiseAmount),o.uniform1f(ye.power,n.power),o.uniform3f(ye.tintLow,n.tintLow.r,n.tintLow.g,n.tintLow.b),o.uniform3f(ye.tintHigh,n.tintHigh.r,n.tintHigh.g,n.tintHigh.b),o.uniform1i(ye.blendMode,n.blendMode),o.uniform1i(ye.pulseAlpha,n.pulseAlpha?1:0),o.uniform1i(ye.pulseColor,n.pulseColor?1:0)}else if(n.kind==="clouds"){const p=he[K];if(!ce||!De||!p||p.kind!=="clouds"||!p.cloudTexture)throw new Error("Wallpaper Engine clouds program is unavailable.");O(ce,De.position,De.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.cloudTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.uniform1i(De.clouds,1),o.uniform1i(De.mask,2),o.uniform1i(De.hasMask,p.maskTexture?1:0),o.uniform1f(De.time,b),o.uniform1f(De.alpha,n.alpha),o.uniform1f(De.threshold,n.threshold),o.uniform1f(De.feather,n.feather),o.uniform3f(De.colorStart,n.colorStart.r,n.colorStart.g,n.colorStart.b),o.uniform3f(De.colorEnd,n.colorEnd.r,n.colorEnd.g,n.colorEnd.b),o.uniform4f(De.speed,n.speed[0],n.speed[1],n.speed[2],n.speed[3]),o.uniform4f(De.scale,n.scale[0],n.scale[1],n.scale[2],n.scale[3]),o.uniform1f(De.aspect,P/w),o.uniform1i(De.shading,n.shading?1:0),o.uniform1i(De.blendMode,n.blendMode),o.uniform1i(De.writeAlpha,n.writeAlpha?1:0)}else if(n.kind==="blurRadial"){const p=he[K];if(!Ke||!xo||!p||p.kind!=="blurRadial")throw new Error("Wallpaper Engine radial-blur program is unavailable.");O(Ke,xo.position,xo.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.uniform1i(xo.mask,1),o.uniform1i(xo.hasMask,p.maskTexture?1:0),o.uniform1f(xo.scale,n.scale),o.uniform2f(xo.center,n.center.x,n.center.y),o.uniform1i(xo.kernel,n.kernel),o.uniform1i(xo.keepAlpha,n.keepAlpha?1:0)}else if(n.kind==="lightShafts"){const p=he[K];if(!pe||!Fe||!p||p.kind!=="lightShafts"||!p.noiseTexture)throw new Error("Wallpaper Engine light-shafts program is unavailable.");const J=n.transform;O(pe,Fe.position,Fe.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.noiseTexture),o.uniform1i(Fe.noise,1),o.uniform3f(Fe.xform0,J[0],J[1],J[2]),o.uniform3f(Fe.xform1,J[3],J[4],J[5]),o.uniform3f(Fe.xform2,J[6],J[7],J[8]),o.uniform1f(Fe.time,b),o.uniform1f(Fe.speed,n.speed),o.uniform2f(Fe.scale,n.scale.x,n.scale.y),o.uniform1f(Fe.smoothness,n.smoothness),o.uniform2f(Fe.feather,n.feather.x,n.feather.y),o.uniform1f(Fe.exponent,n.exponent),o.uniform1f(Fe.intensity,n.intensity),o.uniform3f(Fe.colorStart,n.colorStart.r,n.colorStart.g,n.colorStart.b),o.uniform3f(Fe.colorEnd,n.colorEnd.r,n.colorEnd.g,n.colorEnd.b),o.uniform1i(Fe.blendMode,n.blendMode)}else if(n.kind==="glitter"){const p=he[K];if(!Me||!ze||!p||p.kind!=="glitter"||!p.noiseTexture)throw new Error("Wallpaper Engine glitter program is unavailable.");O(Me,ze.position,ze.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.noiseTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.uniform1i(ze.noise,1),o.uniform1i(ze.mask,2),o.uniform1i(ze.hasMask,p.maskTexture?1:0),o.uniform1f(ze.time,b),o.uniform1f(ze.speed,n.speed),o.uniform1f(ze.density,n.density),o.uniform1f(ze.scale,n.scale),o.uniform1f(ze.alpha,n.alpha),o.uniform3f(ze.color,n.color.r,n.color.g,n.color.b),o.uniform1i(ze.blendMode,n.blendMode),o.uniform1f(ze.aspect,P/w)}else if(n.kind==="waterCaustics"){const p=he[K];if(!oe||!_e||!p||p.kind!=="waterCaustics"||!p.causticTexture||!p.uniformTexture||!p.perlinTexture||!p.glowTexture)throw new Error("Wallpaper Engine water-caustics program is unavailable.");O(oe,_e.position,_e.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,p.causticTexture),o.activeTexture(o.TEXTURE3),o.bindTexture(o.TEXTURE_2D,p.uniformTexture),o.activeTexture(o.TEXTURE4),o.bindTexture(o.TEXTURE_2D,p.perlinTexture),o.activeTexture(o.TEXTURE5),o.bindTexture(o.TEXTURE_2D,p.glowTexture),o.uniform1i(_e.mask,1),o.uniform1i(_e.caustic,2),o.uniform1i(_e.uniform,3),o.uniform1i(_e.perlin,4),o.uniform1i(_e.glowPattern,5),o.uniform1i(_e.hasMask,p.maskTexture?1:0),o.uniform1f(_e.time,b*n.speed+n.timeOffset),o.uniform1f(_e.brightness,n.brightness),o.uniform1f(_e.granularity,n.granularity),o.uniform1f(_e.distortion,n.distortion),o.uniform1f(_e.chromatic,n.chromatic),o.uniform1f(_e.blur,n.blur),o.uniform1f(_e.glow,n.glow),o.uniform3f(_e.colorStart,n.colorStart.r,n.colorStart.g,n.colorStart.b),o.uniform3f(_e.colorEnd,n.colorEnd.r,n.colorEnd.g,n.colorEnd.b),o.uniform1i(_e.mode,n.mode),o.uniform1i(_e.blendMode,n.blendMode),o.uniform1f(_e.aspect,P/w)}else if(n.kind==="depthParallax"){const p=he[K];if(!Ne||!ao||!p||p.kind!=="depthParallax")throw new Error("Wallpaper Engine depth-parallax program is unavailable.");O(Ne,ao.position,ao.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.depthTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.uniform1i(ao.depth,1),o.uniform1i(ao.mask,2),o.uniform1i(ao.hasDepth,p.depthTexture?1:0),o.uniform1i(ao.hasMask,p.maskTexture?1:0),o.uniform2f(ao.scale,n.scale.x,n.scale.y),o.uniform1f(ao.sens,n.sens),o.uniform1f(ao.center,n.center),o.uniform2f(ao.parallaxPosition,.5,.5),o.uniform1i(ao.quality,n.quality)}else if(n.kind==="blur"){const p=he[K];if(!So||!zo||!_o||!bo||!Ce||!eo||!p||p.kind!=="blur"||rr.length<2)throw new Error("Wallpaper Engine blur program is unavailable.");const J=E,[we,lo]=rr,Io=Math.max(2,Math.floor(P/4)),Wo=Math.max(2,Math.floor(w/4));o.bindFramebuffer(o.FRAMEBUFFER,we.framebuffer),o.viewport(0,0,Io,Wo),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,J),O(So,zo.position,zo.source),o.uniform2f(zo.texelSize,1/P,1/w),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,lo.framebuffer),o.viewport(0,0,Io,Wo),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,we.texture),O(_o,bo.position,bo.source),o.uniform2f(bo.direction,n.scale.x/Io,0),o.uniform1i(bo.kernel,n.kernel),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,we.framebuffer),o.viewport(0,0,Io,Wo),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,lo.texture),O(_o,bo.position,bo.source),o.uniform2f(bo.direction,0,n.scale.y/Wo),o.uniform1i(bo.kernel,n.kernel),o.drawArrays(o.TRIANGLES,0,6),o.bindFramebuffer(o.FRAMEBUFFER,Te?.framebuffer??null),o.viewport(0,0,P,w),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,J),O(Ce,eo.position,eo.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,we.texture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.uniform1i(eo.blurred,1),o.uniform1i(eo.mask,2),o.uniform1i(eo.hasMask,p.maskTexture?1:0),o.uniform2f(eo.compositeOffset,n.compositeOffset.x/Io,n.compositeOffset.y/Wo),o.uniform1i(eo.composite,n.composite),o.uniform1i(eo.blendMode,n.blendMode),o.uniform1i(eo.compositeMono,n.compositeMono?1:0),o.uniform3f(eo.compositeColor,n.compositeColor.r,n.compositeColor.g,n.compositeColor.b),o.uniform1f(eo.compositeAlpha,n.compositeAlpha),o.uniform1i(eo.keepAlpha,n.keepAlpha?1:0),o.drawArrays(o.TRIANGLES,0,6),Te&&(E=Te.texture);return}else{const p=he[K];if(!ke||!ro||!p||p.kind!=="waterWaves")throw new Error("Wallpaper Engine water-waves program is unavailable.");O(ke,ro.position,ro.source),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,p.maskTexture),o.activeTexture(o.TEXTURE2),o.bindTexture(o.TEXTURE_2D,p.timeOffsetTexture),o.uniform1i(ro.mask,1),o.uniform1i(ro.timeOffset,2),o.uniform1i(ro.hasMask,p.maskTexture?1:0),o.uniform1i(ro.hasTimeOffset,p.timeOffsetTexture?1:0),o.uniform1f(ro.time,b),o.uniform1f(ro.direction,n.direction),o.uniform1f(ro.speed,n.speed),o.uniform1f(ro.scale,n.scale),o.uniform1f(ro.exponent,n.exponent),o.uniform1f(ro.strength,n.strength)}o.drawArrays(o.TRIANGLES,0,6),Te&&(E=Te.texture)});const L=d.current;L&&(o.flush(),L(x)),F||(F=!0,U(!0)),h=window.requestAnimationFrame(tr)};h=window.requestAnimationFrame(tr)})().catch(Ve),()=>{B=!0,ee+=1,T.current=null,$?.removeEventListener("webglcontextlost",Uo),$?.removeEventListener("webglcontextrestored",ko),h&&window.cancelAnimationFrame(h),o&&(u.forEach(q=>o.deleteTexture(q)),v.forEach(q=>o.deleteFramebuffer(q)),y.forEach(q=>o.deleteProgram(q)),X&&o.deleteBuffer(X),o.getExtension("WEBGL_lose_context")?.loseContext()),j?.(),j=null}},[C,g,S]),H.jsxs(H.Fragment,{children:[!k&&H.jsx("img",{src:e,alt:"",draggable:!1,className:t,"data-we-source":a,"data-we-timing":m,style:i}),H.jsx("canvas",{ref:l,className:t,"data-we-source":a,"data-we-effect":r.map(x=>x.kind).join(","),"data-we-timing":m,style:{...i,visibility:k?"visible":"hidden"}})]})},yi=({src:e,mesh:r,modelSrc:t=null,animationLayers:i=[],animationMode:a,effects:m,className:g,style:_,dataSource:l,timeOriginMs:f})=>{const T=N.useRef(null),d=N.useCallback(k=>{T.current?.updateTexture(k)},[]);return H.jsxs(H.Fragment,{children:[H.jsx(lr,{ref:T,src:e,mesh:r,modelSrc:t,animationLayers:i,animationMode:a,timeOriginMs:f,className:g,dataSource:l,style:_}),H.jsx(dr,{src:e,effects:m,className:"",dataSource:"puppetAtlas",timeOriginMs:f,onFrame:d,style:{display:"none"}})]})},wi=`
attribute vec2 a_Position;
varying vec2 v_TexCoord;
void main() {
    gl_Position = vec4(a_Position, 0.0, 1.0);
    v_TexCoord = a_Position * 0.5 + 0.5;
}
`,Pi=`
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
`,Ui=2048,Ri=e=>new Promise((r,t)=>{const i=new Image;i.onload=()=>r(i),i.onerror=()=>t(new Error(`Failed to load Wallpaper Engine composition texture: ${e}`)),i.src=e}),Lr=(e,r,t)=>{const i=e.createShader(r);if(!i)throw new Error("Unable to allocate Wallpaper Engine composition shader.");if(e.shaderSource(i,t),e.compileShader(i),!e.getShaderParameter(i,e.COMPILE_STATUS)){const a=e.getShaderInfoLog(i)||"Unknown composition shader compile error.";throw e.deleteShader(i),new Error(a)}return i},Ai=e=>{const r=Lr(e,e.VERTEX_SHADER,wi),t=Lr(e,e.FRAGMENT_SHADER,Pi),i=e.createProgram();if(!i)throw new Error("Unable to allocate Wallpaper Engine composition program.");if(e.attachShader(i,r),e.attachShader(i,t),e.linkProgram(i),e.deleteShader(r),e.deleteShader(t),!e.getProgramParameter(i,e.LINK_STATUS)){const a=e.getProgramInfoLog(i)||"Unknown composition program link error.";throw e.deleteProgram(i),new Error(a)}return i},Mi=(e,r,t)=>{const i=document.createElement("canvas");i.width=r,i.height=t;const a=i.getContext("2d");if(!a)throw new Error("2D canvas is unavailable for Wallpaper Engine composition scaling.");return a.drawImage(e,0,0,r,t),i},Di=(e,r)=>{const t=e.createTexture();if(!t)throw new Error("Unable to allocate Wallpaper Engine composition texture.");return e.bindTexture(e.TEXTURE_2D,t),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,0),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,r),t},vr=(e,r,t)=>{const i=e.createTexture(),a=e.createFramebuffer();if(!i||!a)throw new Error("Unable to allocate Wallpaper Engine composition render target.");if(e.bindTexture(e.TEXTURE_2D,i),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,r,t,0,e.RGBA,e.UNSIGNED_BYTE,null),e.bindFramebuffer(e.FRAMEBUFFER,a),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,i,0),e.checkFramebufferStatus(e.FRAMEBUFFER)!==e.FRAMEBUFFER_COMPLETE)throw new Error("Wallpaper Engine composition framebuffer is incomplete.");return{texture:i,framebuffer:a}},Li=e=>e.kind==="tint"?0:e.kind==="blend"?1:e.kind==="transform"?2:e.kind==="fisheye"?3:4,vi=e=>e.map(r=>r.kind==="tint"?["tint",r.color.r,r.color.g,r.color.b,r.alpha].join(":"):r.kind==="blend"?["blend",r.texturePath,r.maskPath??"",r.multiply].join(":"):r.kind==="transform"?["transform",r.offset.x,r.offset.y,r.scale.x,r.scale.y,r.angle].join(":"):r.kind==="fisheye"?["fisheye",r.center.x,r.center.y,r.distortion,r.size,r.transparentOutside?1:0].join(":"):["opacity",r.maskPath??"",r.alpha].join(":")).join("|"),Ci=({effects:e,logicalSize:r,className:t,style:i,dataSource:a})=>{const m=N.useRef(null),[g,_]=N.useState(!1),l=vi(e);return N.useEffect(()=>{const f=m.current;if(!f||e.length===0)return;let T=!1,d=null,k=null,U=null;const S=[],R=[];return _(!1),(async()=>{const x=new Set;e.forEach(A=>{A.kind==="blend"?(x.add(A.textureUrl),A.maskUrl&&x.add(A.maskUrl)):A.kind==="opacity"&&A.maskUrl&&x.add(A.maskUrl)});const B=new Map;if(await Promise.all([...x].map(async A=>B.set(A,await Ri(A)))),T)return;const h=Math.min(1,Ui/Math.max(r.width,r.height)),u=Math.max(1,Math.round(r.width*h)),v=Math.max(1,Math.round(r.height*h));if(f.width=u,f.height=v,d=f.getContext("webgl",{alpha:!0,premultipliedAlpha:!0}),!d)throw new Error("WebGL is unavailable for Wallpaper Engine composition rendering.");if(k=Ai(d),d.useProgram(k),d.viewport(0,0,u,v),U=d.createBuffer(),!U)throw new Error("Unable to allocate Wallpaper Engine composition vertex buffer.");d.bindBuffer(d.ARRAY_BUFFER,U),d.bufferData(d.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),d.STATIC_DRAW);const y=d.getAttribLocation(k,"a_Position");d.enableVertexAttribArray(y),d.vertexAttribPointer(y,2,d.FLOAT,!1,0,0);const o=[vr(d,u,v),vr(d,u,v)];o.forEach(A=>{S.push(A.texture),R.push(A.framebuffer),d.bindFramebuffer(d.FRAMEBUFFER,A.framebuffer),d.clearColor(0,0,0,0),d.clear(d.COLOR_BUFFER_BIT)});const j=new Map;for(const[A,to]of B){const re=Di(d,Mi(to,u,v));j.set(A,re),S.push(re)}const X=A=>d.getUniformLocation(k,A),F={input:X("u_Input"),aux:X("u_Aux"),mask:X("u_Mask"),mode:X("u_Mode"),hasMask:X("u_HasMask"),transparentOutside:X("u_TransparentOutside"),finalPass:X("u_FinalPass"),color:X("u_Color"),alpha:X("u_Alpha"),multiply:X("u_Multiply"),offset:X("u_Offset"),scale:X("u_Scale"),angle:X("u_Angle"),center:X("u_Center"),distortion:X("u_Distortion"),size:X("u_Size")};d.uniform1i(F.input,0),d.uniform1i(F.aux,1),d.uniform1i(F.mask,2);let ee=0;e.forEach((A,to)=>{const re=to===e.length-1,Ve=ee===0?1:0;d.bindFramebuffer(d.FRAMEBUFFER,re?null:o[Ve].framebuffer),d.viewport(0,0,u,v),d.activeTexture(d.TEXTURE0),d.bindTexture(d.TEXTURE_2D,o[ee].texture),d.activeTexture(d.TEXTURE1),d.bindTexture(d.TEXTURE_2D,null),d.activeTexture(d.TEXTURE2),d.bindTexture(d.TEXTURE_2D,null),d.uniform1i(F.mode,Li(A)),d.uniform1i(F.hasMask,0),d.uniform1i(F.transparentOutside,0),d.uniform1i(F.finalPass,re?1:0),d.uniform3f(F.color,0,0,0),d.uniform1f(F.alpha,1),d.uniform1f(F.multiply,1),d.uniform2f(F.offset,0,0),d.uniform2f(F.scale,1,1),d.uniform1f(F.angle,0),d.uniform2f(F.center,.5,.5),d.uniform1f(F.distortion,1),d.uniform1f(F.size,1),A.kind==="tint"?(d.uniform3f(F.color,A.color.r,A.color.g,A.color.b),d.uniform1f(F.alpha,A.alpha)):A.kind==="blend"?(d.activeTexture(d.TEXTURE1),d.bindTexture(d.TEXTURE_2D,j.get(A.textureUrl)??null),A.maskUrl&&(d.activeTexture(d.TEXTURE2),d.bindTexture(d.TEXTURE_2D,j.get(A.maskUrl)??null),d.uniform1i(F.hasMask,1)),d.uniform1f(F.multiply,A.multiply)):A.kind==="transform"?(d.uniform2f(F.offset,A.offset.x,A.offset.y),d.uniform2f(F.scale,A.scale.x,A.scale.y),d.uniform1f(F.angle,A.angle)):A.kind==="fisheye"?(d.uniform2f(F.center,A.center.x,A.center.y),d.uniform1f(F.distortion,A.distortion),d.uniform1f(F.size,A.size),d.uniform1i(F.transparentOutside,A.transparentOutside?1:0)):(A.maskUrl&&(d.activeTexture(d.TEXTURE2),d.bindTexture(d.TEXTURE_2D,j.get(A.maskUrl)??null),d.uniform1i(F.hasMask,1)),d.uniform1f(F.alpha,A.alpha)),d.drawArrays(d.TRIANGLES,0,6),re||(ee=Ve)}),T||_(!0)})().catch(x=>{}),()=>{T=!0,d&&(S.forEach(x=>d.deleteTexture(x)),R.forEach(x=>d.deleteFramebuffer(x)),U&&d.deleteBuffer(U),k&&d.deleteProgram(k),d.getExtension("WEBGL_lose_context")?.loseContext())}},[l,r.height,r.width]),H.jsx("canvas",{ref:m,className:t,"data-we-source":a,"data-we-effect":"composition",style:{...i,visibility:g?"visible":"hidden"}})},Fi=e=>e.replace(/\r\n?/g,`
`).split(`
`),Bi=(e,r,t,i,a,m,g)=>{const _=Math.max(1,Math.round(r.width)),l=Math.max(1,Math.round(r.height)),f=document.createElement("canvas");f.width=_,f.height=l;const T=f.getContext("2d");if(!T)throw new Error("2D canvas is unavailable for Wallpaper Engine text rasterization.");T.clearRect(0,0,_,l),T.font=`${i}px ${t}`,T.fillStyle=a,T.textAlign=m,T.textBaseline="middle";const d=Fi(e),k=i*1.2,U=Math.max(k,d.length*k),S=g==="center"?(l-U)/2:g==="bottom"?l-U:0,R=m==="center"?_/2:m==="right"?_:0;return d.forEach((C,x)=>{T.fillText(C,R,S+k*(x+.5))}),f.toDataURL("image/png")},Ni=({text:e,logicalSize:r,fontFamily:t,fontSize:i,color:a,horizontalAlign:m,verticalAlign:g,effects:_,className:l,fallbackClassName:f,style:T,fallbackStyle:d,dataSource:k,timeOriginMs:U})=>{const[S,R]=N.useState(null);return N.useEffect(()=>{let C=!1;return(async()=>{if(typeof document<"u"&&"fonts"in document)try{await document.fonts.load(`${i}px ${t}`,e||"0")}catch{}if(C)return;const B=Bi(e,r,t,i,a,m,g);C||R(B)})().catch(B=>{C||R(null)}),()=>{C=!0}},[a,t,i,m,r.height,r.width,e,g]),S?H.jsx(dr,{src:S,effects:_,className:l,style:T,dataSource:k,timeOriginMs:U}):H.jsx("div",{className:f,"data-we-source":k,"data-we-effect-pending":"true",style:d,children:e})},Ii="_root_153c4_1",Wi="_stage_153c4_8",Xi="_postProcessDefinitions_153c4_15",Oi="_layer_153c4_23",Hi="_preload_153c4_33",Gi="_textLayer_153c4_43",zi="_textContent_153c4_55",We={root:Ii,stage:Wi,postProcessDefinitions:Xi,layer:Oi,preload:Hi,textLayer:Gi,textContent:zi},ur=()=>({width:typeof window>"u"?1:Math.max(1,window.innerWidth),height:typeof window>"u"?1:Math.max(1,window.innerHeight)}),Cr=e=>{let r=2166136261;for(let t=0;t<e.length;t+=1)r^=e.charCodeAt(t),r=Math.imul(r,16777619);return`tablab-we-font-${(r>>>0).toString(36)}`},ji=()=>{const[e,r]=N.useState(ur);return N.useEffect(()=>{const t=()=>r(ur());return window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]),e},Fr=(e,r)=>{const t=[];for(const i of e.layers)i.source.kind==="frameAnimation"&&t.push(`${i.id}:f${Zo(r,i.source.fps,i.source.frames.length)}`),i.centerAnimations.forEach((a,m)=>{t.push(`${i.id}:p${m}:${Math.floor(Gr(a,r))}`)});return t.join("|")},$i=(e,r)=>{const[t,i]=N.useState(0);return N.useEffect(()=>{if(i(0),!e||e.animationLayerCount===0&&e.propertyAnimationLayerCount===0||typeof document>"u")return;let a=0,m=0,g=null,_=Fr(e,0),l=!1;const f=()=>{a&&window.cancelAnimationFrame(a),a=0},T=U=>{if(a=0,l||document.hidden)return;g===null&&(g=U);const S=m+(U-g),R=Fr(e,S);R!==_&&(_=R,i(S)),a=window.requestAnimationFrame(T)},d=()=>{!l&&!document.hidden&&!a&&(a=window.requestAnimationFrame(T))},k=()=>{const U=window.performance.now();if(document.hidden){g!==null&&(m+=U-g),g=null,f();return}g=null,d()};return document.addEventListener("visibilitychange",k),d(),()=>{l=!0,f(),document.removeEventListener("visibilitychange",k)}},[e,r]),t},Yi=e=>{if(!e)return null;let r=null;const t={day:0,minute:1,second:2};for(const i of e.layers){if(i.source.kind!=="text"||!i.source.dynamicText)continue;const a=i.source.dynamicText.refresh;(!r||t[a]>t[r])&&(r=a)}return r},Vi=(e,r)=>{const t=new Date(r);if(e==="second")return Math.max(25,1e3-t.getMilliseconds()+25);if(e==="minute")return Math.max(25,(60-t.getSeconds())*1e3-t.getMilliseconds()+25);const i=new Date(t.getFullYear(),t.getMonth(),t.getDate()+1,0,0,0,25);return Math.max(25,i.getTime()-r)},Ki=(e,r)=>{const[t,i]=N.useState(()=>Date.now()),a=Yi(e);return N.useEffect(()=>{if(i(Date.now()),!a||typeof document>"u"||typeof window>"u")return;let m=0,g=!1;const _=()=>{m&&window.clearTimeout(m),m=0},l=()=>{if(_(),g||document.hidden)return;const T=Date.now();m=window.setTimeout(()=>{m=0,!(g||document.hidden)&&(i(Date.now()),l())},Vi(a,T))},f=()=>{_(),!document.hidden&&(i(Date.now()),l())};return document.addEventListener("visibilitychange",f),l(),()=>{g=!0,_(),document.removeEventListener("visibilitychange",f)}},[a,r]),t},qi=(e,r)=>{const[t,i]=N.useState({x:0,y:0});return N.useEffect(()=>{if(i({x:0,y:0}),!e||!wn(e.cameraParallax)||typeof window>"u")return;let a={x:0,y:0},m={x:0,y:0},g=0,_=window.performance.now(),l=!1;const f=()=>{g&&window.cancelAnimationFrame(g),g=0},T=C=>{if(g=0,l)return;const x=yn(a,m,e.cameraParallax.delay,C-_);_=C;const B=Math.abs(x.x-a.x)>1e-4||Math.abs(x.y-a.y)>1e-4,h=Math.abs(m.x-x.x)>5e-4||Math.abs(m.y-x.y)>5e-4;a=x,B&&i(x),h&&(g=window.requestAnimationFrame(T))},d=()=>Math.abs(m.x-a.x)>5e-4||Math.abs(m.y-a.y)>5e-4,k=()=>{!g&&!l&&!document.hidden&&d()&&(_=window.performance.now(),g=window.requestAnimationFrame(T))},U=C=>{m=Tn(C.clientX,C.clientY,ur()),k()},S=()=>{m={x:0,y:0},k()},R=()=>{if(document.hidden){f();return}_=window.performance.now(),k()};return window.addEventListener("pointermove",U,{passive:!0}),window.addEventListener("blur",S),document.addEventListener("mouseleave",S),document.addEventListener("visibilitychange",R),()=>{l=!0,f(),window.removeEventListener("pointermove",U),window.removeEventListener("blur",S),document.removeEventListener("mouseleave",S),document.removeEventListener("visibilitychange",R)}},[e,r]),t},Qi=(e,r)=>{const t=N.useRef(new Map),i=N.useRef(new Set),[a,m]=N.useState(()=>new Map),g=r.join("\0");return N.useEffect(()=>{i.current=new Set(r);let _=!1;const l=()=>{for(const k of t.current.values())URL.revokeObjectURL(k);t.current.clear()},f=async()=>{if(typeof document<"u"&&document.visibilityState==="hidden")return;const k=r.filter(S=>!t.current.has(S)),U=await Vr(e,k);if(!(_||typeof document<"u"&&document.visibilityState==="hidden")){for(const S of k){if(_||!i.current.has(S)||t.current.has(S))continue;const R=U.get(S);R&&t.current.set(S,URL.createObjectURL(R.data))}if(!_){for(const[S,R]of t.current)i.current.has(S)||(URL.revokeObjectURL(R),t.current.delete(S));m(new Map(t.current))}}},T=()=>{f().catch(k=>{})},d=()=>{document.visibilityState==="hidden"?l():T()};return document.addEventListener("visibilitychange",d),T(),()=>{_=!0,document.removeEventListener("visibilitychange",d)}},[g,e]),N.useEffect(()=>()=>{for(const _ of t.current.values())URL.revokeObjectURL(_);t.current.clear(),i.current.clear()},[e]),a},Zi=(e,r,t)=>{if(!r.length)return e;const i=r.map(f=>t.get(f)).filter(f=>!!f);if(i.length!==r.length)return e;const a=i.map(f=>`url("${f}")`).join(", "),m=i.map(()=>"luminance").join(", "),g=i.map(()=>"100% 100%").join(", "),_=i.map(()=>"no-repeat").join(", "),l=i.map(()=>"intersect").join(", ");return{...e,maskImage:a,maskMode:m,maskSize:g,maskRepeat:_,maskComposite:l}},Br=(e,r)=>e.map(t=>t.kind==="opacity"?{...t,maskUrl:t.maskPath?r.get(t.maskPath)??null:null}:t.kind==="waterWaves"?{...t,maskUrl:t.maskPath?r.get(t.maskPath)??null:null,timeOffsetUrl:t.timeOffsetPath?r.get(t.timeOffsetPath)??null:null}:t.kind==="foliageSway"?{...t,maskUrl:t.maskPath?r.get(t.maskPath)??null:null,noiseUrl:t.noisePath?r.get(t.noisePath)??null:null}:t.kind==="waterFlow"?{...t,flowMapUrl:t.flowMapPath?r.get(t.flowMapPath)??null:null,phaseUrl:r.get(t.phasePath)??null}:t.kind==="shake"?{...t,directionMapUrl:t.directionMapPath?r.get(t.directionMapPath)??null:null}:t.kind==="blurPrecise"?{...t,maskUrl:t.maskPath?r.get(t.maskPath)??null:null}:t.kind==="shine"?{...t,maskUrl:t.maskPath?r.get(t.maskPath)??null:null,noiseUrl:t.noisePath?r.get(t.noisePath)??null:null}:t.kind==="godRays"?{...t,maskUrl:t.maskPath?r.get(t.maskPath)??null:null}:t.kind==="waterRipple"?{...t,maskUrl:t.maskPath?r.get(t.maskPath)??null:null,normalUrl:r.get(t.normalPath)??null}:t.kind==="iris"?{...t,maskUrl:t.maskPath?r.get(t.maskPath)??null:null}:t.kind==="cloudMotion"?{...t,maskUrl:t.maskPath?r.get(t.maskPath)??null:null,noiseUrl:t.noisePath?r.get(t.noisePath)??null:null}:t.kind==="swing"?{...t,maskUrl:t.maskPath?r.get(t.maskPath)??null:null,noiseUrl:t.noisePath?r.get(t.noisePath)??null:null}:t.kind==="filmGrain"?{...t,maskUrl:t.maskPath?r.get(t.maskPath)??null:null,noiseUrl:t.noisePath?r.get(t.noisePath)??null:null}:t.kind==="pulse"?{...t,maskUrl:t.maskPath?r.get(t.maskPath)??null:null}:t.kind==="clouds"?{...t,cloudUrl:t.cloudPath?r.get(t.cloudPath)??null:null,maskUrl:t.maskPath?r.get(t.maskPath)??null:null}:t.kind==="blurRadial"?{...t,maskUrl:t.maskPath?r.get(t.maskPath)??null:null}:t.kind==="lightShafts"?{...t,noiseUrl:t.noisePath?r.get(t.noisePath)??null:null}:t.kind==="glitter"?{...t,maskUrl:t.maskPath?r.get(t.maskPath)??null:null}:t.kind==="waterCaustics"?{...t,maskUrl:t.maskPath?r.get(t.maskPath)??null:null,causticUrl:t.causticPath?r.get(t.causticPath)??null:null,uniformUrl:t.uniformPath?r.get(t.uniformPath)??null:null,perlinUrl:t.perlinPath?r.get(t.perlinPath)??null:null,glowUrl:t.glowPath?r.get(t.glowPath)??null:null}:t.kind==="depthParallax"?{...t,depthUrl:t.depthPath?r.get(t.depthPath)??null:null,maskUrl:t.maskPath?r.get(t.maskPath)??null:null}:t.kind==="blur"?{...t,maskUrl:t.maskPath?r.get(t.maskPath)??null:null}:t),Nr=e=>e.every(r=>r.kind==="opacity"?!r.maskPath||!!r.maskUrl:r.kind==="waterWaves"?(!r.maskPath||!!r.maskUrl)&&(!r.timeOffsetPath||!!r.timeOffsetUrl):r.kind==="foliageSway"?(!r.maskPath||!!r.maskUrl)&&(!r.noisePath||!!r.noiseUrl):r.kind==="waterFlow"?(!r.flowMapPath||!!r.flowMapUrl)&&!!r.phaseUrl:r.kind==="shake"?!r.directionMapPath||!!r.directionMapUrl:r.kind==="blurPrecise"?!r.maskPath||!!r.maskUrl:r.kind==="shine"?(!r.maskPath||!!r.maskUrl)&&(!r.noisePath||!!r.noiseUrl):r.kind==="godRays"?!r.maskPath||!!r.maskUrl:r.kind==="waterRipple"?(!r.maskPath||!!r.maskUrl)&&!!r.normalUrl:r.kind==="iris"||r.kind==="cloudMotion"?!r.maskPath||!!r.maskUrl:r.kind==="skew"?!0:r.kind==="swing"||r.kind==="filmGrain"?(!r.maskPath||!!r.maskUrl)&&(!r.noisePath||!!r.noiseUrl):r.kind==="pulse"?!r.maskPath||!!r.maskUrl:r.kind==="clouds"?!r.cloudPath||!!r.cloudUrl:r.kind==="blurRadial"?!r.maskPath||!!r.maskUrl:r.kind==="lightShafts"?!r.noisePath||!!r.noiseUrl:r.kind==="glitter"?!r.maskPath||!!r.maskUrl:r.kind==="waterCaustics"?(!r.maskPath||!!r.maskUrl)&&(!r.causticPath||!!r.causticUrl):r.kind==="depthParallax"?(!r.depthPath||!!r.depthUrl)&&(!r.maskPath||!!r.maskUrl):r.kind==="blur"?!r.maskPath||!!r.maskUrl:!0),Ji=(e,r,t,i)=>{if(e.source.kind==="solidColor"||e.source.kind==="text"||e.source.kind==="composition")return null;const a=e.source.kind==="frameAnimation"?i.get(e.id)??null:null,m=cn(e,r,a);for(const g of m){const _=t.get(g);if(_)return e.source.kind==="frameAnimation"&&i.set(e.id,g),_}return null},ia=({wallpaperId:e})=>{const[r,t]=N.useState(null),i=N.useRef(new Map),a=N.useId().replace(/[^a-zA-Z0-9_-]/g,""),m=ji(),g=N.useMemo(()=>typeof performance>"u"?0:performance.now(),[e]);N.useEffect(()=>{let u=!1;const v=async()=>{const y=await $r.get(e);if(u||!y||!Yr(y))return;const o=nn(y.scene);o&&(u||t(o))};return i.current.clear(),t(null),v().catch(y=>{}),()=>{u=!0}},[e]);const _=$i(r,e),l=Ki(r,e),f=qi(r,e),T=N.useMemo(()=>r?ln(r,_):[],[_,r]),d=Qi(e,T);if(!r)return null;const k=mn(r.canvas,m),U=kn(r.canvas,r.cameraParallax,r.cameraParallaxSceneMotion,f),S=Sn(r.canvas,r.cameraParallax,r.cameraParallaxSceneMotion),R=r.postProcessEffects.filter(u=>u.kind==="chromaticAberration"&&u.strength>0).map((u,v)=>({id:`we-chromatic-${a}-${v}`,offsets:fn(r.canvas,u)})),C=R.length>0?R.map(u=>`url(#${u.id})`).join(" "):void 0,x=new Set;for(const u of r.layers){if(u.source.kind!=="frameAnimation")continue;const v=dn(u,_);v&&x.add(v)}const B=new Set;for(const u of T){if(x.has(u)||r.staticResourcePaths.includes(u))continue;const v=d.get(u);v&&B.add(v)}const h=new Map;for(const u of r.layers){if(u.source.kind!=="text")continue;if(u.source.fontPath){const y=d.get(u.source.fontPath);y&&h.set(u.source.fontPath,y);continue}const v=ot(u.source.fontReference);!v||typeof document>"u"||h.set(u.source.fontReference,new URL(v,document.baseURI).href)}return H.jsxs("div",{className:We.root,"data-we-renderer":"frame-animation",children:[R.length>0&&H.jsx("svg",{"aria-hidden":"true",width:"0",height:"0",className:We.postProcessDefinitions,children:H.jsx("defs",{children:R.map(({id:u,offsets:v})=>H.jsxs("filter",{id:u,x:-r.canvas.width*.05,y:-r.canvas.height*.05,width:r.canvas.width*1.1,height:r.canvas.height*1.1,filterUnits:"userSpaceOnUse",primitiveUnits:"userSpaceOnUse",colorInterpolationFilters:"sRGB",children:[H.jsx("feColorMatrix",{in:"SourceGraphic",type:"matrix",values:"1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",result:"red"}),H.jsx("feColorMatrix",{in:"SourceGraphic",type:"matrix",values:"0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",result:"green"}),H.jsx("feColorMatrix",{in:"SourceGraphic",type:"matrix",values:"0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",result:"blue"}),H.jsx("feOffset",{in:"red",dx:v.red.x,dy:v.red.y,result:"redShift"}),H.jsx("feOffset",{in:"green",dx:v.green.x,dy:v.green.y,result:"greenShift"}),H.jsx("feOffset",{in:"blue",dx:v.blue.x,dy:v.blue.y,result:"blueShift"}),H.jsx("feComposite",{in:"redShift",in2:"greenShift",operator:"arithmetic",k1:"0",k2:"1",k3:"1",k4:"0",result:"redGreen"}),H.jsx("feComposite",{in:"redGreen",in2:"blueShift",operator:"arithmetic",k1:"0",k2:"1",k3:"1",k4:"0"})]},u))})}),H.jsxs("div",{className:We.stage,style:{width:`${r.canvas.width}px`,height:`${r.canvas.height}px`,transform:`translate(-50%, -50%) scale(${k*S}) translate(${U.x}px, ${U.y}px)`,filter:C},children:[[...h].map(([u,v])=>H.jsx("style",{children:`@font-face{font-family:"${Cr(u)}";src:url("${v}");font-display:swap;}`},`font:${u}`)),r.layers.map(u=>{const v=sn(u,_),y=En(r.canvas,r.cameraParallax,u.parallax,f,r.cameraParallaxSceneMotion),o=u.source.kind==="text"?bn({width:u.size.width,height:u.size.height,scaleX:u.scale.x,scaleY:u.scale.y,rotationDeg:u.rotationDeg,horizontalAlign:u.source.horizontalAlign,verticalAlign:u.source.verticalAlign}):{x:0,y:0},j=u.puppetAttachment,X=Zi({left:j?`${j.localCenter.x}px`:`${v.x+y.x+o.x}px`,top:j?`${j.localCenter.y}px`:`${v.y+y.y+o.y}px`,width:`${u.size.width}px`,height:`${u.size.height}px`,opacity:u.opacity,zIndex:j?void 0:u.zIndex,mixBlendMode:u.blendMode==="screen"?"screen":void 0,transform:j?`translate(-50%, -50%) rotate(${j.localRotationDeg}deg) scale(${j.localScale.x}, ${j.localScale.y})`:`translate(-50%, -50%) rotate(${u.rotationDeg}deg) scale(${u.scale.x}, ${u.scale.y})`},u.opacityMaskPaths,d);if(u.source.kind==="solidColor"){const{r:re,g:Ve,b:$}=u.source.color;return H.jsx("div",{className:We.layer,"data-we-source":u.source.kind,style:{...X,backgroundColor:`rgb(${Math.round(re*255)} ${Math.round(Ve*255)} ${Math.round($*255)})`}},u.id)}if(u.source.kind==="text"){const{r:re,g:Ve,b:$}=u.source.color,Uo=u.source.dynamicText?gn(u.source.dynamicText,new Date(l)):u.source.text,ko=u.source.fontPath??(u.source.fontReference&&h.has(u.source.fontReference)?u.source.fontReference:null),fo=ko?Cr(ko):"sans-serif",q=ko?`"${fo}"`:fo,me=xn(u.source.pointSize),I=`rgb(${Math.round(re*255)} ${Math.round(Ve*255)} ${Math.round($*255)})`,Be=u.source.textShadow,ho=Be?(()=>{const{r:Ee,g:Y,b:ae}=Be.color,te=`rgba(${Math.round(Ee*255)}, ${Math.round(Y*255)}, ${Math.round(ae*255)}, ${Be.alpha})`,se=`${Be.offset.x}px ${Be.offset.y}px 0 ${te}`;return Be.drawBorder?[se,`1px 0 0 ${te}`,`-1px 0 0 ${te}`,`0 1px 0 ${te}`,`0 -1px 0 ${te}`].join(", "):se})():void 0,P=u.source.horizontalAlign==="center"?"center":u.source.horizontalAlign==="right"?"flex-end":"flex-start",w=u.source.verticalAlign==="center"?"center":u.source.verticalAlign==="bottom"?"flex-end":"flex-start",Pe={...X,color:I,fontFamily:q,fontSize:`${me}px`,letterSpacing:u.source.spacing.x!==0?`${u.source.spacing.x}px`:void 0,justifyContent:P,alignItems:w,textAlign:u.source.horizontalAlign,textShadow:ho},Ue={width:u.source.limitWidth?"100%":"max-content",height:u.source.limitRows?"100%":"max-content",whiteSpace:u.source.limitWidth?"pre-wrap":"pre",overflowWrap:u.source.limitWidth?"break-word":"normal",overflow:u.source.limitWidth||u.source.limitRows?"hidden":"visible",textOverflow:u.source.limitWidth&&u.source.useEllipsis?"ellipsis":void 0},fe=Br(u.textureEffects,d),Z=Nr(fe);return fe.length>0&&Z?H.jsx(Ni,{text:Uo,logicalSize:u.size,fontFamily:q,fontSize:me,color:I,horizontalAlign:u.source.horizontalAlign,verticalAlign:u.source.verticalAlign,effects:fe,className:We.layer,fallbackClassName:`${We.layer} ${We.textLayer}`,style:X,fallbackStyle:Pe,dataSource:u.source.kind,timeOriginMs:g},u.id):H.jsx("div",{className:`${We.layer} ${We.textLayer}`,"data-we-source":u.source.kind,style:Pe,children:H.jsx("span",{className:We.textContent,style:Ue,children:Uo})},u.id)}if(u.source.kind==="composition"){const re=u.source.effects.map($=>$.kind==="blend"?{...$,textureUrl:d.get($.texturePath)??"",maskUrl:$.maskPath?d.get($.maskPath)??null:null}:$.kind==="opacity"?{...$,maskUrl:$.maskPath?d.get($.maskPath)??null:null}:$);return re.every($=>$.kind==="blend"?!!$.textureUrl&&(!$.maskPath||!!$.maskUrl):$.kind==="opacity"?!$.maskPath||!!$.maskUrl:!0)?H.jsx(Ci,{effects:re,logicalSize:u.size,className:We.layer,dataSource:u.source.kind,style:X},u.id):null}const F=Ji(u,_,d,i.current);if(!F)return null;const ee=Br(u.textureEffects,d),A=Nr(ee),to=re=>j?H.jsx(Fn,{binding:j,modelSrc:d.get(j.parentModelPath)??null,timeOriginMs:g,parallaxOffset:y,zIndex:u.zIndex,children:re},`attachment:${u.id}`):re;return u.source.kind==="puppetMesh"?ee.length>0&&A?to(H.jsx(yi,{src:F,mesh:u.source.mesh,modelSrc:u.source.modelPath?d.get(u.source.modelPath)??null:null,animationLayers:u.source.animationLayers,animationMode:u.source.animationMode,effects:ee,className:We.layer,dataSource:u.source.kind,timeOriginMs:g,style:X},u.id)):to(H.jsx(lr,{src:F,mesh:u.source.mesh,modelSrc:u.source.modelPath?d.get(u.source.modelPath)??null:null,animationLayers:u.source.animationLayers,animationMode:u.source.animationMode,timeOriginMs:g,className:We.layer,dataSource:u.source.kind,style:X},u.id)):ee.length>0&&A?to(H.jsx(dr,{src:F,effects:ee,className:We.layer,dataSource:u.source.kind,dataTiming:u.source.kind==="frameAnimation"?u.source.timingSource:void 0,timeOriginMs:g,style:X},u.id)):to(H.jsx("img",{src:F,alt:"",draggable:!1,className:We.layer,"data-we-source":u.source.kind,"data-we-timing":u.source.kind==="frameAnimation"?u.source.timingSource:void 0,style:X},u.id))}),[...B].map(u=>H.jsx("img",{src:u,alt:"","aria-hidden":"true",draggable:!1,className:We.preload},u))]})]})};export{ia as WeSceneRenderer};
