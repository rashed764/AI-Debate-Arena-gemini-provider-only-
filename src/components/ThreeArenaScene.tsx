import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PersonaType } from '../types';
import {
  Video,
  Eye,
  Maximize2,
  Volume2,
  Sparkles,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Play,
  Pause
} from 'lucide-react';

interface ThreeArenaSceneProps {
  activeSpeaker: PersonaType | null;
  isSpeaking: boolean;
  subtitleText: string;
  leftDebaterLabel: string;
  rightDebaterLabel: string;
  audioElement?: HTMLAudioElement | null;
  onPlayFullDebate?: () => void;
  topic?: string;
  roundName?: string;
}

// Module-level reusable math objects to ensure ZERO garbage collection in render loop
const _vec3 = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _camLook = new THREE.Vector3();

export const ThreeArenaScene: React.FC<ThreeArenaSceneProps> = ({
  activeSpeaker,
  isSpeaking,
  subtitleText,
  leftDebaterLabel,
  rightDebaterLabel,
  audioElement,
  onPlayFullDebate,
  topic = 'The Living Stone Arena',
  roundName = 'Opening Statements',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cameraMode, setCameraMode] = useState<'cinematic' | 'manual'>('cinematic');
  const [activeCamPreset, setActiveCamPreset] = useState<'wide' | 'left' | 'right'>('wide');
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);
  const [timerDisplay, setTimerDisplay] = useState('01:34');
  const [durationDisplay, setDurationDisplay] = useState('02:00');

  // Mutable state ref for 60fps render loop access without re-mounting Three.js canvas
  const stateRef = useRef({
    activeSpeaker,
    isSpeaking,
    cameraMode,
    activeCamPreset,
    currentTime: 26,
    duration: 120,
    audioLevel: 0.5,
  });

  stateRef.current.activeSpeaker = activeSpeaker;
  stateRef.current.isSpeaking = isSpeaking;
  stateRef.current.cameraMode = cameraMode;
  stateRef.current.activeCamPreset = activeCamPreset;

  // Track live audio countdown
  useEffect(() => {
    if (!audioElement) return;

    const updateTimer = () => {
      const cur = audioElement.currentTime || 0;
      const dur =
        audioElement.duration && isFinite(audioElement.duration) && audioElement.duration > 0
          ? audioElement.duration
          : 120;
      const rem = Math.max(0, Math.ceil(dur - cur));

      stateRef.current.currentTime = cur;
      stateRef.current.duration = dur;

      const format = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      };

      setTimerDisplay(format(rem));
      setDurationDisplay(format(dur));
    };

    audioElement.addEventListener('timeupdate', updateTimer);
    return () => audioElement.removeEventListener('timeupdate', updateTimer);
  }, [audioElement]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ----------------------------------------------------
    // 1. SCENE & CAMERA SETUP
    // ----------------------------------------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070d);
    scene.fog = new THREE.FogExp2(0x05070d, 0.022);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 3.6, 11.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // ----------------------------------------------------
    // 2. STUDIO PBR ENVIRONMENT (RoomEnvironment)
    // ----------------------------------------------------
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // ----------------------------------------------------
    // 3. STUDIO LIGHTING RIG
    // ----------------------------------------------------
    // Balanced Hemisphere Light (cool sky, warm floor fill)
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.7);
    scene.add(hemiLight);

    // Main Key Studio Directional Light (Warm Broadcast Key)
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.6);
    keyLight.position.set(6, 13, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -7;
    keyLight.shadow.camera.right = 7;
    keyLight.shadow.camera.top = 7;
    keyLight.shadow.camera.bottom = -7;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    // Rim / Backlight for separation from dark auditorium
    const rimLight = new THREE.DirectionalLight(0x0ea5e9, 0.9);
    rimLight.position.set(-6, 8, -6);
    scene.add(rimLight);

    // Left Volumetric Spotlight (Cyan / Emerald)
    const leftSpot = new THREE.SpotLight(0x10b981, 4.5, 20, Math.PI / 4.2, 0.45, 1.2);
    leftSpot.position.set(-4.6, 9.5, 1.2);
    leftSpot.target.position.set(-2.5, 0.9, 0);
    scene.add(leftSpot);
    scene.add(leftSpot.target);

    // Right Volumetric Spotlight (Warm Gold / Amber)
    const rightSpot = new THREE.SpotLight(0xf59e0b, 4.5, 20, Math.PI / 4.2, 0.45, 1.2);
    rightSpot.position.set(4.6, 9.5, 1.2);
    rightSpot.target.position.set(2.5, 0.9, 0);
    scene.add(rightSpot);
    scene.add(rightSpot.target);

    // Translucent Volumetric Cone Beams (Additive Blending)
    const coneGeo = new THREE.CylinderGeometry(0.2, 2.4, 10.5, 32, 1, true);
    coneGeo.translate(0, -5.25, 0);

    const leftConeMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const leftCone = new THREE.Mesh(coneGeo, leftConeMat);
    leftCone.position.copy(leftSpot.position);
    leftCone.lookAt(leftSpot.target.position);
    leftCone.rotateX(-Math.PI / 2);
    scene.add(leftCone);

    const rightConeMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const rightCone = new THREE.Mesh(coneGeo, rightConeMat);
    rightCone.position.copy(rightSpot.position);
    rightCone.lookAt(rightSpot.target.position);
    rightCone.rotateX(-Math.PI / 2);
    scene.add(rightCone);

    // ----------------------------------------------------
    // 4. HEXAGONAL ELEVATED STAGE & GROUNDING
    // ----------------------------------------------------
    const stageGroup = new THREE.Group();

    // Soft Radial Contact Shadow on Studio Floor
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(128, 128, 20, 128, 128, 128);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
      grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.45)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 256, 256);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(16, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const floorShadow = new THREE.Mesh(shadowGeo, shadowMat);
    floorShadow.rotation.x = -Math.PI / 2;
    floorShadow.position.y = -0.35;
    scene.add(floorShadow);

    // Elevated Hexagonal Podium Deck
    const hexShape = new THREE.Shape();
    const hexRadius = 5.8;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = hexRadius * Math.cos(angle);
      const y = hexRadius * Math.sin(angle);
      if (i === 0) hexShape.moveTo(x, y);
      else hexShape.lineTo(x, y);
    }
    hexShape.closePath();

    const hexGeo = new THREE.ExtrudeGeometry(hexShape, {
      depth: 0.55,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.14,
      bevelThickness: 0.14,
    });
    hexGeo.rotateX(-Math.PI / 2);

    const stageDeckMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.25,
      metalness: 0.75,
    });
    const stageMesh = new THREE.Mesh(hexGeo, stageDeckMat);
    stageMesh.position.y = -0.3;
    stageMesh.receiveShadow = true;
    stageGroup.add(stageMesh);

    // Hexagonal Beveled Rim Edge Glow (Neon Ring)
    const neonRingGeo = new THREE.RingGeometry(5.6, 5.95, 36);
    neonRingGeo.rotateX(-Math.PI / 2);
    const neonRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const neonRing = new THREE.Mesh(neonRingGeo, neonRingMat);
    neonRing.position.y = -0.28;
    stageGroup.add(neonRing);

    scene.add(stageGroup);

    // ----------------------------------------------------
    // 5. COMPOSITE PROCEDURAL ARMCHAIRS (6-PART ASSEMBLIES)
    // ----------------------------------------------------
    function buildArmchair(isLeft: boolean): THREE.Group {
      const chair = new THREE.Group();

      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x0a0f1d,
        roughness: 0.35,
        metalness: 0.85,
      });
      const cushionMat = new THREE.MeshStandardMaterial({
        color: 0x1f293d,
        roughness: 0.65,
        metalness: 0.2,
      });
      const accentMat = new THREE.MeshStandardMaterial({
        color: isLeft ? 0x10b981 : 0xf59e0b,
        roughness: 0.2,
        metalness: 0.9,
        emissive: isLeft ? 0x10b981 : 0xf59e0b,
        emissiveIntensity: 0.25,
      });

      // 1. Swivel Base
      const baseGeo = new THREE.CylinderGeometry(0.55, 0.7, 0.1, 20);
      const base = new THREE.Mesh(baseGeo, frameMat);
      base.position.y = 0.05;
      base.castShadow = true;
      chair.add(base);

      // 2. Center Column
      const colGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.45, 16);
      const col = new THREE.Mesh(colGeo, frameMat);
      col.position.y = 0.3;
      col.castShadow = true;
      chair.add(col);

      // 3. Contoured Seat Cushion
      const seatGeo = new THREE.BoxGeometry(1.3, 0.26, 1.3);
      const seat = new THREE.Mesh(seatGeo, cushionMat);
      seat.position.y = 0.62;
      seat.castShadow = true;
      chair.add(seat);

      // 4. Ergonomic Angled Backrest
      const backGeo = new THREE.BoxGeometry(1.3, 1.4, 0.22);
      const back = new THREE.Mesh(backGeo, cushionMat);
      back.position.set(0, 1.35, -0.58);
      back.rotation.x = -0.16;
      back.castShadow = true;
      chair.add(back);

      // 5. Left Armrest with Metallic Bevel
      const armGeo = new THREE.BoxGeometry(0.24, 0.62, 1.15);
      const leftArm = new THREE.Mesh(armGeo, frameMat);
      leftArm.position.set(-0.7, 0.95, -0.05);
      leftArm.castShadow = true;
      chair.add(leftArm);

      // 6. Right Armrest
      const rightArm = new THREE.Mesh(armGeo, frameMat);
      rightArm.position.set(0.7, 0.95, -0.05);
      rightArm.castShadow = true;
      chair.add(rightArm);

      // 7. Metallic Accent Trim on Headrest
      const trimGeo = new THREE.BoxGeometry(1.32, 0.05, 0.05);
      const trim = new THREE.Mesh(trimGeo, accentMat);
      trim.position.set(0, 2.02, -0.66);
      chair.add(trim);

      // 8. Gooseneck Studio Microphone attached to chair arm
      const micPoleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8);
      const micPole = new THREE.Mesh(micPoleGeo, frameMat);
      micPole.position.set(isLeft ? 0.65 : -0.65, 1.25, 0.35);
      micPole.rotation.z = isLeft ? -0.4 : 0.4;
      micPole.rotation.x = 0.2;
      chair.add(micPole);

      const micHeadGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.1, 12);
      const micHead = new THREE.Mesh(micHeadGeo, accentMat);
      micHead.position.set(isLeft ? 0.76 : -0.76, 1.46, 0.45);
      micHead.rotation.x = Math.PI / 3;
      chair.add(micHead);

      return chair;
    }

    // ----------------------------------------------------
    // 6. COMPOSITE PROCEDURAL SEATED DEBATERS
    // ----------------------------------------------------
    interface DebaterModel {
      group: THREE.Group;
      head: THREE.Group;
      torso: THREE.Mesh;
      leftArm: THREE.Mesh;
      rightArm: THREE.Mesh;
    }

    function buildDebater(isLeft: boolean): DebaterModel {
      const charGroup = new THREE.Group();

      const skinMat = new THREE.MeshStandardMaterial({
        color: 0xf5cb98,
        roughness: 0.55,
        metalness: 0.1,
      });

      // Left: Casual Debater (Green Hoodie) vs Right: Formal Debater (Navy Blazer)
      const clothesMat = new THREE.MeshStandardMaterial({
        color: isLeft ? 0x15803d : 0x1e3a8a,
        roughness: 0.6,
        metalness: 0.15,
      });

      const pantsMat = new THREE.MeshStandardMaterial({
        color: isLeft ? 0x1e40af : 0x0f172a,
        roughness: 0.8,
        metalness: 0.1,
      });

      const hairMat = new THREE.MeshStandardMaterial({
        color: 0x1c1917,
        roughness: 0.9,
      });

      const shoeMat = new THREE.MeshStandardMaterial({
        color: isLeft ? 0xf8fafc : 0x1e293b,
        roughness: 0.4,
      });

      // Torso
      const torsoGeo = new THREE.CylinderGeometry(0.4, 0.34, 0.9, 14);
      const torso = new THREE.Mesh(torsoGeo, clothesMat);
      torso.position.y = 1.25;
      torso.castShadow = true;
      charGroup.add(torso);

      // Head & Neck Group (for expressive yaw/pitch nod gestures)
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 1.84, 0);

      const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
      const headMesh = new THREE.Mesh(headGeo, skinMat);
      headMesh.castShadow = true;
      headGroup.add(headMesh);

      // Hair Profile
      if (isLeft) {
        // Debater styled hair
        const hairGeo = new THREE.SphereGeometry(0.255, 14, 14, 0, Math.PI * 2, 0, Math.PI / 2.2);
        const hairMesh = new THREE.Mesh(hairGeo, hairMat);
        hairMesh.position.y = 0.04;
        headGroup.add(hairMesh);
      } else {
        // Kippah / Yarmulke & formal profile
        const kippahGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.04, 14);
        const kippahMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
        const kippah = new THREE.Mesh(kippahGeo, kippahMat);
        kippah.position.set(0, 0.22, -0.06);
        headGroup.add(kippah);
      }

      // Trimmed Beard
      const beardGeo = new THREE.CylinderGeometry(0.17, 0.22, 0.15, 14);
      const beard = new THREE.Mesh(beardGeo, hairMat);
      beard.position.set(0, -0.12, 0.08);
      headGroup.add(beard);

      charGroup.add(headGroup);

      // Arms & Hands resting on armrests
      const armGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.65, 8);

      const leftArm = new THREE.Mesh(armGeo, clothesMat);
      leftArm.position.set(-0.48, 1.05, 0.18);
      leftArm.rotation.x = 0.9;
      leftArm.rotation.z = -0.18;
      charGroup.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, clothesMat);
      rightArm.position.set(0.48, 1.05, 0.18);
      rightArm.rotation.x = 0.9;
      rightArm.rotation.z = 0.18;
      charGroup.add(rightArm);

      // Hands
      const handGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const leftHand = new THREE.Mesh(handGeo, skinMat);
      leftHand.position.set(-0.54, 0.92, 0.56);
      charGroup.add(leftHand);

      const rightHand = new THREE.Mesh(handGeo, skinMat);
      rightHand.position.set(0.54, 0.92, 0.56);
      charGroup.add(rightHand);

      // Thighs (Seated Horizontal Position)
      const thighGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.68, 8);
      const leftThigh = new THREE.Mesh(thighGeo, pantsMat);
      leftThigh.position.set(-0.25, 0.72, 0.3);
      leftThigh.rotation.x = Math.PI / 2;
      charGroup.add(leftThigh);

      const rightThigh = new THREE.Mesh(thighGeo, pantsMat);
      rightThigh.position.set(0.25, 0.72, 0.3);
      rightThigh.rotation.x = Math.PI / 2;
      charGroup.add(rightThigh);

      // Shins (Seated Vertical Position)
      const shinGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.68, 8);
      const leftShin = new THREE.Mesh(shinGeo, pantsMat);
      leftShin.position.set(-0.25, 0.38, 0.62);
      charGroup.add(leftShin);

      const rightShin = new THREE.Mesh(shinGeo, pantsMat);
      rightShin.position.set(0.25, 0.38, 0.62);
      charGroup.add(rightShin);

      // Shoes
      const shoeGeo = new THREE.BoxGeometry(0.18, 0.12, 0.34);
      const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
      leftShoe.position.set(-0.25, 0.06, 0.72);
      charGroup.add(leftShoe);

      const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
      rightShoe.position.set(0.25, 0.06, 0.72);
      charGroup.add(rightShoe);

      return { group: charGroup, head: headGroup, torso, leftArm, rightArm };
    }

    // Place Left Armchair & Debater
    const leftArmchair = buildArmchair(true);
    leftArmchair.position.set(-2.55, 0, 0);
    leftArmchair.rotation.y = Math.PI / 3.6; // Angled toward central console
    scene.add(leftArmchair);

    const leftDebater = buildDebater(true);
    leftDebater.group.position.copy(leftArmchair.position);
    leftDebater.group.rotation.copy(leftArmchair.rotation);
    scene.add(leftDebater.group);

    // Place Right Armchair & Debater
    const rightArmchair = buildArmchair(false);
    rightArmchair.position.set(2.55, 0, 0);
    rightArmchair.rotation.y = -Math.PI / 3.6; // Angled toward central console
    scene.add(rightArmchair);

    const rightDebater = buildDebater(false);
    rightDebater.group.position.copy(rightArmchair.position);
    rightDebater.group.rotation.copy(rightArmchair.rotation);
    scene.add(rightDebater.group);

    // ----------------------------------------------------
    // 7. CENTRAL CONSOLE WITH PROCEDURAL 3D DISPLAY SCREEN
    // ----------------------------------------------------
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(0, 0, 0.4);

    // Console Pedestal
    const deskGeo = new THREE.CylinderGeometry(0.72, 0.9, 1.15, 20);
    const deskMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f1d,
      roughness: 0.3,
      metalness: 0.85,
    });
    const deskMesh = new THREE.Mesh(deskGeo, deskMat);
    deskMesh.position.y = 0.58;
    deskMesh.castShadow = true;
    consoleGroup.add(deskMesh);

    // Metallic Rim Cap
    const topCapGeo = new THREE.CylinderGeometry(0.76, 0.76, 0.08, 20);
    const topCapMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.15,
      metalness: 0.95,
    });
    const topCap = new THREE.Mesh(topCapGeo, topCapMat);
    topCap.position.y = 1.18;
    consoleGroup.add(topCap);

    // Procedural Digital Screen Canvas
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 512;
    screenCanvas.height = 256;
    const sContext = screenCanvas.getContext('2d');
    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.colorSpace = THREE.SRGBColorSpace;
    screenTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const screenMat = new THREE.MeshBasicMaterial({
      map: screenTexture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const screenGeo = new THREE.PlaneGeometry(1.0, 0.5);
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 1.25, 0.35);
    screenMesh.rotation.x = -Math.PI / 4; // Angled toward broadcast camera
    consoleGroup.add(screenMesh);

    // Concentric Floating Holographic Energy Rings
    const holoRingGeo = new THREE.TorusGeometry(0.68, 0.02, 16, 48);
    const holoRingMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const holoRing = new THREE.Mesh(holoRingGeo, holoRingMat);
    holoRing.position.y = 1.4;
    holoRing.rotation.x = Math.PI / 3;
    consoleGroup.add(holoRing);

    const holoInnerGeo = new THREE.TorusGeometry(0.5, 0.015, 16, 36);
    const holoInnerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const holoInner = new THREE.Mesh(holoInnerGeo, holoInnerMat);
    holoInner.position.y = 1.4;
    holoInner.rotation.x = -Math.PI / 3.2;
    consoleGroup.add(holoInner);

    scene.add(consoleGroup);

    // ----------------------------------------------------
    // 8. BACKGROUND: CURVED WARM AMBER DOTTED LED BARS
    // ----------------------------------------------------
    const bgLedGroup = new THREE.Group();
    const ledCount = 20;
    const ledRadius = 15;
    const barGeo = new THREE.BoxGeometry(0.45, 0.09, 0.09);
    const barMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
    });

    for (let i = 0; i < ledCount; i++) {
      const angle = -Math.PI / 2.8 + (i * (Math.PI * 0.71)) / (ledCount - 1);
      const ledBar = new THREE.Mesh(barGeo, barMat);
      ledBar.position.set(
        ledRadius * Math.sin(angle),
        4.3 + Math.sin(i * 0.35) * 0.25,
        -ledRadius * Math.cos(angle) + 2.5
      );
      ledBar.lookAt(0, 4.3, 0);
      bgLedGroup.add(ledBar);
    }
    scene.add(bgLedGroup);

    // Subtle Drifting Beam Particles (Atmospheric Motes)
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 12;
      particlePositions[i + 1] = Math.random() * 8;
      particlePositions[i + 2] = (Math.random() - 0.5) * 8;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.05,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ----------------------------------------------------
    // 9. INTERACTIVE MOUSE / TOUCH DRAG CAMERA CONTROLS
    // ----------------------------------------------------
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let manualRotY = 0;
    let manualRotX = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      manualRotY += deltaX * 0.005;
      manualRotX = Math.max(-0.25, Math.min(0.4, manualRotX + deltaY * 0.003));
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // ----------------------------------------------------
    // 10. RESIZE HANDLER
    // ----------------------------------------------------
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 800;
      const newH = container.clientHeight || 500;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    // ----------------------------------------------------
    // 11. ANIMATION & EXPONENTIAL DAMPING RENDER LOOP
    // ----------------------------------------------------
    let animationFrameId: number;
    const clock = new THREE.Clock();

    // Camera preset coordinates
    const targetWide = new THREE.Vector3(0, 3.6, 11.2);
    const targetLeft = new THREE.Vector3(-2.8, 2.5, 6.5);
    const targetRight = new THREE.Vector3(2.8, 2.5, 6.5);

    const lookWide = new THREE.Vector3(0, 1.35, 0);
    const lookLeft = new THREE.Vector3(-1.8, 1.45, 0);
    const lookRight = new THREE.Vector3(1.8, 1.45, 0);

    const currentLook = new THREE.Vector3(0, 1.35, 0);

    // Helper to redraw 3D digital console canvas
    const drawScreenCanvas = (timeStr: string, progress: number, isLeftActive: boolean) => {
      if (!sContext) return;
      sContext.clearRect(0, 0, 512, 256);

      // Background rounded panel
      sContext.fillStyle = '#060a14';
      sContext.fillRect(0, 0, 512, 256);

      // Outer bezel border
      sContext.strokeStyle = '#1e293b';
      sContext.lineWidth = 6;
      sContext.strokeRect(4, 4, 504, 248);

      // Glowing circular timer ring
      const centerX = 256;
      const centerY = 120;
      const radius = 72;

      sContext.beginPath();
      sContext.arc(centerX, centerY, radius, 0, Math.PI * 2);
      sContext.strokeStyle = 'rgba(51, 65, 85, 0.5)';
      sContext.lineWidth = 10;
      sContext.stroke();

      sContext.beginPath();
      sContext.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - progress));
      sContext.strokeStyle = isLeftActive ? '#10b981' : '#f59e0b';
      sContext.lineWidth = 10;
      sContext.stroke();

      // Digital Timer Readout
      sContext.font = 'bold 44px monospace';
      sContext.fillStyle = '#ffffff';
      sContext.textAlign = 'center';
      sContext.textBaseline = 'middle';
      sContext.fillText(timeStr, centerX, centerY);

      // Label below
      sContext.font = 'bold 18px sans-serif';
      sContext.fillStyle = isLeftActive ? '#34d399' : '#fbbf24';
      sContext.fillText(isLeftActive ? leftDebaterLabel.toUpperCase() : rightDebaterLabel.toUpperCase(), centerX, 218);
    };

    let lastScreenUpdate = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      const { activeSpeaker, isSpeaking, cameraMode, activeCamPreset, currentTime, duration } = stateRef.current;

      const isLeft = activeSpeaker === 'atheist' && isSpeaking;
      const isRight = activeSpeaker === 'believer' && isSpeaking;

      // 1. Debater Kinematics: Idle breathing & speaking gestures
      const leftBreath = Math.sin(elapsed * 2.2) * 0.015;
      leftDebater.torso.scale.set(1 + leftBreath, 1 + leftBreath, 1 + leftBreath);
      leftDebater.head.rotation.y = Math.sin(elapsed * 0.7) * 0.06;

      const rightBreath = Math.sin(elapsed * 2.1 + 1.2) * 0.015;
      rightDebater.torso.scale.set(1 + rightBreath, 1 + rightBreath, 1 + rightBreath);
      rightDebater.head.rotation.y = Math.cos(elapsed * 0.65) * 0.06;

      // Active speaker head nod and arm gesture
      if (isLeft) {
        leftDebater.head.rotation.x = Math.sin(elapsed * 5.5) * 0.05;
        leftDebater.leftArm.rotation.x = 0.9 + Math.sin(elapsed * 3) * 0.08;
      } else {
        leftDebater.head.rotation.x = 0;
        leftDebater.leftArm.rotation.x = 0.9;
      }

      if (isRight) {
        rightDebater.head.rotation.x = Math.sin(elapsed * 5.5) * 0.05;
        rightDebater.rightArm.rotation.x = 0.9 + Math.sin(elapsed * 3) * 0.08;
      } else {
        rightDebater.head.rotation.x = 0;
        rightDebater.rightArm.rotation.x = 0.9;
      }

      // 2. Holographic Ring Counter-Rotation
      holoRing.rotation.z += dt * 0.8;
      holoInner.rotation.z -= dt * 1.1;

      // 3. Dynamic Spotlights & Volumetric Beam Intensity
      leftSpot.intensity = THREE.MathUtils.lerp(leftSpot.intensity, isLeft ? 5.8 : 1.2, dt * 4);
      leftConeMat.opacity = THREE.MathUtils.lerp(leftConeMat.opacity, isLeft ? 0.3 : 0.06, dt * 4);

      rightSpot.intensity = THREE.MathUtils.lerp(rightSpot.intensity, isRight ? 5.8 : 1.2, dt * 4);
      rightConeMat.opacity = THREE.MathUtils.lerp(rightConeMat.opacity, isRight ? 0.3 : 0.06, dt * 4);

      // 4. Update Central 3D Screen Canvas (~10fps throttle)
      if (elapsed - lastScreenUpdate > 0.1) {
        lastScreenUpdate = elapsed;
        const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0.45;
        const remaining = Math.max(0, Math.ceil(duration - currentTime));
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        drawScreenCanvas(timeStr, progress, activeSpeaker === 'atheist');
        screenTexture.needsUpdate = true;
      }

      // 5. Cinematic Broadcast Camera Gliding with Exponential Damping
      if (cameraMode === 'cinematic') {
        let desiredCamPos = targetWide;
        let desiredLookAt = lookWide;

        if (isSpeaking) {
          if (activeSpeaker === 'atheist') {
            desiredCamPos = targetLeft;
            desiredLookAt = lookLeft;
          } else if (activeSpeaker === 'believer') {
            desiredCamPos = targetRight;
            desiredLookAt = lookRight;
          }
        } else {
          if (activeCamPreset === 'left') {
            desiredCamPos = targetLeft;
            desiredLookAt = lookLeft;
          } else if (activeCamPreset === 'right') {
            desiredCamPos = targetRight;
            desiredLookAt = lookRight;
          }
        }

        // Frame-rate independent exponential damping factor
        const factor = 1 - Math.exp(-2.4 * dt);
        camera.position.lerp(desiredCamPos, factor);
        currentLook.lerp(desiredLookAt, factor);
        camera.lookAt(currentLook);
      } else {
        // Interactive Manual Orbit
        camera.position.x = 10.5 * Math.sin(manualRotY);
        camera.position.z = 10.5 * Math.cos(manualRotY);
        camera.position.y = 3.6 + manualRotX * 5;
        camera.lookAt(0, 1.35, 0);
      }

      // 6. Slow drift for beam dust particles
      const posAttr = particleGeo.attributes.position;
      const arr = posAttr.array as Float32Array;
      for (let i = 1; i < particleCount * 3; i += 3) {
        arr[i] -= dt * 0.15;
        if (arr[i] < 0) arr[i] = 8;
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // ----------------------------------------------------
    // CLEANUP ON UNMOUNT
    // ----------------------------------------------------
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });

      envTexture.dispose();
      screenTexture.dispose();
      shadowTex.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [leftDebaterLabel, rightDebaterLabel]);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-slate-800/90 bg-[#05070d] shadow-2xl select-none">
      {/* 16:9 WebGL 3D Viewport */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[16/9] min-h-[440px] max-h-[640px] overflow-hidden cursor-grab active:cursor-grabbing"
      />

      {/* Top Floating Glass Subtitle HUD (Collapsible) */}
      {!isHudCollapsed && (
        <div className="pointer-events-none absolute top-4 sm:top-6 inset-x-0 z-20 flex justify-center px-4">
          <div className="w-full max-w-lg sm:max-w-xl rounded-2xl border border-white/20 bg-slate-900/60 backdrop-blur-md px-5 py-3 shadow-2xl text-center max-h-[88px] overflow-hidden">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">
                {roundName}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-[10px] font-mono text-slate-300 truncate max-w-[200px]">
                {topic}
              </span>
            </div>
            <p className="text-white text-sm sm:text-base font-bold tracking-tight leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] line-clamp-2">
              "{subtitleText || 'or would he then be the God of just one people?'}"
            </p>
          </div>
        </div>
      )}

      {/* Top-Right Camera Choreography Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setCameraMode(cameraMode === 'cinematic' ? 'manual' : 'cinematic')}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition shadow-lg backdrop-blur-md"
          title={cameraMode === 'cinematic' ? 'Switch to Manual 3D Orbit' : 'Switch to Cinematic Auto-Camera'}
        >
          {cameraMode === 'cinematic' ? (
            <>
              <Video className="h-3.5 w-3.5 text-cyan-400" />
              <span>Cinematic Camera</span>
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5 text-amber-400" />
              <span>Free Orbit Mode</span>
            </>
          )}
        </button>

        {cameraMode === 'cinematic' && (
          <div className="hidden sm:flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-0.5 text-[11px] font-semibold text-slate-300">
            <button
              onClick={() => setActiveCamPreset('wide')}
              className={`px-2 py-1 rounded-lg transition ${
                activeCamPreset === 'wide' ? 'bg-cyan-600 text-white' : 'hover:text-white'
              }`}
            >
              Wide
            </button>
            <button
              onClick={() => setActiveCamPreset('left')}
              className={`px-2 py-1 rounded-lg transition ${
                activeCamPreset === 'left' ? 'bg-emerald-600 text-white' : 'hover:text-white'
              }`}
            >
              {leftDebaterLabel}
            </button>
            <button
              onClick={() => setActiveCamPreset('right')}
              className={`px-2 py-1 rounded-lg transition ${
                activeCamPreset === 'right' ? 'bg-amber-600 text-white' : 'hover:text-white'
              }`}
            >
              {rightDebaterLabel}
            </button>
          </div>
        )}

        <button
          onClick={() => setIsHudCollapsed(!isHudCollapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 transition shadow-lg"
          title={isHudCollapsed ? 'Expand HUD' : 'Collapse HUD for Cinematic View'}
        >
          {isHudCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {/* Bottom Floating Telecast Bar (Unobstructed Center Viewport) */}
      <div className="pointer-events-none absolute bottom-4 sm:bottom-6 inset-x-0 z-20 px-4 sm:px-8 flex items-center justify-between">
        {/* Left Debater Badge */}
        <div className="pointer-events-auto relative group">
          <div
            className={`absolute -inset-1 rounded-xl bg-emerald-500 blur-md opacity-60 transition ${
              activeSpeaker === 'atheist' && isSpeaking ? 'opacity-100 scale-105' : ''
            }`}
          />
          <div className="relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 sm:px-6 py-2 shadow-xl border border-emerald-400">
            <span className="text-white text-xs sm:text-sm font-extrabold tracking-wide uppercase">
              {leftDebaterLabel}
            </span>
            {activeSpeaker === 'atheist' && isSpeaking && (
              <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
            )}
          </div>
        </div>

        {/* Center Live Speech Countdown Timer Badge */}
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-2 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col items-center">
            <span className="text-sm sm:text-base font-black font-mono text-white tracking-tight leading-none">
              {timerDisplay}
            </span>
            <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">
              Duration {durationDisplay}
            </span>
          </div>

          {onPlayFullDebate && (
            <button
              onClick={onPlayFullDebate}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white shadow-lg transition active:scale-95 ${
                isSpeaking
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950'
                  : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-cyan-950 animate-pulse'
              }`}
            >
              {isSpeaking ? (
                <>
                  <Pause className="h-3.5 w-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Play Full</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Right Debater Badge & Living Stone Seal */}
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="relative group">
            <div
              className={`absolute -inset-1 rounded-xl bg-amber-500 blur-md opacity-60 transition ${
                activeSpeaker === 'believer' && isSpeaking ? 'opacity-100 scale-105' : ''
              }`}
            />
            <div className="relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 sm:px-6 py-2 shadow-xl border border-amber-300">
              <span className="text-slate-950 text-xs sm:text-sm font-black tracking-wide uppercase">
                {rightDebaterLabel}
              </span>
              {activeSpeaker === 'believer' && isSpeaking && (
                <span className="flex h-2 w-2 rounded-full bg-slate-950 animate-pulse" />
              )}
            </div>
          </div>

          {/* Living Stone Gold Seal */}
          <div
            title="Living Stone 3D Arena"
            className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-400/80 bg-gradient-to-br from-amber-600 to-orange-700 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
          >
            <Sparkles className="h-5 w-5 text-amber-200" />
          </div>
        </div>
      </div>
    </div>
  );
};
