import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { Sun } from 'lucide-react';

interface LuminosityLampProps {
  lux: number;
}

export default function LuminosityLamp({ lux }: LuminosityLampProps) {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLDivElement>(null);
  const lightsRef = useRef<any>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const container = canvasRef.current;
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 2, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false; // Shadows disabled to fix artifacting on the transparent shade
    renderer.setClearColor(0x000000, 0); 
    
    // Clear existing children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.target.set(0, 0, 0);

    const lampGroup = new THREE.Group();
    scene.add(lampGroup);

    // 1. The Wavy Shade
    const generateWavyShade = () => {
        const shape = new THREE.Shape();
        const numPoints = 250;
        const numFolds = 45;
        const outerPoints = [];
        const innerPoints = [];
        
        for (let i = 0; i <= numPoints; i++) {
            let angle = (i / numPoints) * Math.PI * 2;
            let primaryWave = Math.sin(numFolds * angle);
            let secondaryWave = Math.sin(12 * angle);
            let radiusVariation = 0.18 * primaryWave * (1 + 0.15 * secondaryWave);
            let rOuter = 1.0 + radiusVariation;
            let rInner = 0.95 + radiusVariation; 

            outerPoints.push(new THREE.Vector2(Math.cos(angle) * rOuter, Math.sin(angle) * rOuter));
            innerPoints.push(new THREE.Vector2(Math.cos(angle) * rInner, Math.sin(angle) * rInner));
        }

        shape.moveTo(outerPoints[0].x, outerPoints[0].y);
        for(let i=1; i<=numPoints; i++) {
            shape.lineTo(outerPoints[i].x, outerPoints[i].y);
        }

        const hole = new THREE.Path();
        hole.moveTo(innerPoints[numPoints].x, innerPoints[numPoints].y);
        for(let i=numPoints-1; i>=0; i--) {
            hole.lineTo(innerPoints[i].x, innerPoints[i].y);
        }
        shape.holes.push(hole);

        const extrudeSettings = {
            depth: 3.5,
            curveSegments: 1,
            steps: 1,
            bevelEnabled: false
        };
        
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.rotateX(Math.PI / 2);
        geometry.translate(0, 1.75, 0);

        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            emissive: 0xffcc77,  
            emissiveIntensity: 0.05,
            metalness: 0.1,
            roughness: 0.15,
            transmission: 1.0,
            thickness: 0.1,
            ior: 1.5,
            attenuationColor: new THREE.Color(0xffffff), 
            attenuationDistance: 2.0, 
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    };

    const shade = generateWavyShade();
    lampGroup.add(shade);

    // 2. The Base
    const baseGeometry = new THREE.CylinderGeometry(1.03, 1.03, 0.8, 64);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0xc2a688,
        roughness: 0.8,
        metalness: 0.1
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -2.15;
    base.castShadow = true;
    base.receiveShadow = true;
    lampGroup.add(base);

    // 3. The Power Cord
    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -2.3, 0.8),
        new THREE.Vector3(0, -2.4, 1.2),
        new THREE.Vector3(0.5, -2.5, 2.0),
        new THREE.Vector3(1.5, -3.0, 3.0),
        new THREE.Vector3(2.5, -3.5, 4.0)
    ]);
    const cordGeometry = new THREE.TubeGeometry(curve, 30, 0.04, 8, false);
    const cordMaterial = new THREE.MeshStandardMaterial({
        color: 0xf0f0f0, 
        roughness: 0.9
    });
    const cord = new THREE.Mesh(cordGeometry, cordMaterial);
    lampGroup.add(cord);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.3);
    scene.add(ambientLight);

    const bulbGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const bulbMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffaa44,
        emissiveIntensity: 8,
        roughness: 0.2
    });
    const bulbMesh = new THREE.Mesh(bulbGeometry, bulbMaterial);
    bulbMesh.position.set(0, -0.5, 0);
    lampGroup.add(bulbMesh);

    // 4. Volumetric Light Rays (Procedural)
    const raysGroup = new THREE.Group();
    raysGroup.position.set(0, -0.5, 0); // Center on bulb
    lampGroup.add(raysGroup);

    const rayCanvas = document.createElement('canvas');
    rayCanvas.width = 256;
    rayCanvas.height = 256;
    const rayCtx = rayCanvas.getContext('2d');
    if (rayCtx) {
        const gradient = rayCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(255, 220, 120, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 180, 50, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 120, 0, 0)');
        rayCtx.fillStyle = gradient;
        rayCtx.fillRect(0, 0, 256, 256);
    }
    const rayTexture = new THREE.CanvasTexture(rayCanvas);
    
    const rayMaterial = new THREE.MeshBasicMaterial({
        map: rayTexture,
        transparent: true,
        opacity: 0.0, // Updated in animation loop
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const rayGeometry = new THREE.PlaneGeometry(9, 9);
    for (let i = 0; i < 5; i++) {
        const ray = new THREE.Mesh(rayGeometry, rayMaterial);
        ray.rotation.y = (Math.PI / 5) * i;
        ray.rotation.x = (Math.random() - 0.5) * 0.4;
        ray.rotation.z = (Math.random() - 0.5) * 0.4;
        raysGroup.add(ray);
    }

    const internalLight = new THREE.PointLight(0xffbb66, 9, 12, 2);
    internalLight.position.set(0, -0.5, 0);
    lampGroup.add(internalLight);

    const topInternalLight = new THREE.PointLight(0xffbb66, 3, 8, 2);
    topInternalLight.position.set(0, 1.2, 0);
    lampGroup.add(topInternalLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.15);
    dirLight.position.set(5, 5, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0xaaccff, 0.1);
    dirLight2.position.set(-5, 2, -5);
    scene.add(dirLight2);

    lightsRef.current = { internalLight, topInternalLight, shade, bulbMesh, rayMaterial, raysGroup, targetVal: 10, currentVal: 10 };

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        const delta = clock.getDelta();
        lampGroup.rotation.y += 0.2 * delta;

        if (lightsRef.current && lightsRef.current.targetVal !== undefined) {
            const target = lightsRef.current.targetVal;
            // Lerp towards the target
            lightsRef.current.currentVal += (target - lightsRef.current.currentVal) * delta * 4.0;
            const cVal = lightsRef.current.currentVal;

            // Add organic scattering/noise to the light intensity
            const noise = (Math.sin(clock.getElapsedTime() * 15) + Math.cos(clock.getElapsedTime() * 22)) * 0.5;
            let noisyVal = Math.max(0, cVal + (noise * cVal * 0.08)); 

            // 7-second seamless breathing cycle (dips and rises smoothly)
            // Math.cos(...) + 1 / 2 maps the wave from -1...1 to 0...1
            // This creates a multiplier that smoothly transitions between 0.3 (dim) and 1.0 (normal) over 7 seconds.
            const breathMultiplier = 0.3 + 0.7 * ((Math.cos(clock.getElapsedTime() * (Math.PI * 2 / 7)) + 1) / 2);
            noisyVal *= breathMultiplier;

            const { internalLight, topInternalLight, shade, bulbMesh, rayMaterial, raysGroup } = lightsRef.current;

            internalLight.intensity = noisyVal * 1.5; // Massive boost for human eye visibility
            topInternalLight.intensity = noisyVal * 0.6; 
            shade.material.emissiveIntensity = (noisyVal / 30) * 0.4; // More translucent glow
            bulbMesh.material.emissiveIntensity = noisyVal * 2.0;

            if (rayMaterial && raysGroup) {
                // Dynamically spin the rays and scale opacity
                rayMaterial.opacity = (noisyVal / 35) * 0.7;
                raysGroup.rotation.y -= 0.3 * delta; // Counter spin against the lamp
                raysGroup.rotation.z += 0.1 * delta; // Slow wobble
            }
        }

        controls.update();
        renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
        renderer.dispose();
    };
  }, []);

  // Sync intensity with lux
  useEffect(() => {
    if (!lightsRef.current) return;
    
    // Normalize lux (assuming normal range up to ~800 for high sensitivity)
    const normalizedLux = Math.min(lux / 800, 1.0);
    
    // Use an exponent curve to make changes more exaggerated and noticeable
    const val = Math.pow(normalizedLux, 1.2) * 35; // Cap around 35
    
    // Ensure it doesn't go completely dark
    lightsRef.current.targetVal = Math.max(val, 2);
  }, [lux]);
  
  return (
    <div id="luminosity-lamp-card" className="glass-card h-full flex flex-col items-center justify-between relative overflow-hidden group p-6 min-h-[350px]">
      {/* Technical Header */}
      <div className="w-full flex justify-between items-start z-20">
        <div className="space-y-1">
          <p className="label-aesthetic flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Luminous Flux
          </p>
          <h4 className="text-[10px] font-mono opacity-50 uppercase tracking-tighter">Spectral Core Alpha</h4>
        </div>
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Sun className="w-3 h-3 text-amber-500" />
        </div>
      </div>

      {/* 3D Lamp Canvas */}
      <div 
        ref={canvasRef} 
        className="relative w-full flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing min-h-[250px] z-10"
      />

      {/* Data readout */}
      <div className="w-full z-20 space-y-3 mt-4">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest leading-none">Intensity</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-display font-bold tabular-nums tracking-tighter">
                        {lux.toFixed(2)}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-500/80">LX</span>
                </div>
            </div>
            
            <div className="flex flex-col items-end">
                <div className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter mb-2",
                    lux > 600 ? "bg-amber-500/20 text-amber-400" : "bg-slate-500/10 text-slate-400"
                )}>
                    {lux > 600 ? "Peak" : "Dim"}
                </div>
                <div className="w-16 h-1 rounded-full bg-slate-500/10 overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((lux / 1000) * 100, 100)}%` }}
                        className="h-full bg-amber-500"
                    />
                </div>
            </div>
        </div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-amber-500/10" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-amber-500/10" />
    </div>
  );
}
