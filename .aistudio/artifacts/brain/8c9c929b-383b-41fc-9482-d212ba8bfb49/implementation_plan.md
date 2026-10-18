# Living Stone — Three.js 3D Cinematic Arena Implementation Plan

Transform the Living Stone debate arena into an interactive, high-fidelity Three.js 3D broadcast stage. The scene renders a 3D elevated hexagonal platform, composite procedural armchairs and debater models, dynamic volumetric spotlights that track the active speaker, a holographic central timer console, and a cinematic camera system that smoothly glides and focuses on whichever debater is on air.

---

## 1. User Review Required

> [!IMPORTANT]
> **Confirmed Design & Architecture Decisions**:
> 1. **Visual Style**: 3D broadcast stage with volumetric spotlights, composite procedural armchairs, debaters with breathing kinematics, and a central holographic digital timer console.
> 2. **Camera Choreography**: Cinematic broadcast camera that automatically and smoothly orbits to frame the active speaker (left or right) with exponential damping (`1 - Math.exp(-k * dt)`), plus interactive mouse drag/orbit toggle.
> 3. **Procedural PBR Craft**: 3–12 part composite assemblies for all key stage props (no single primitive shortcuts), varied metallic/roughness PBR materials, soft contact shadows, and zero external asset dependencies (never 404).
> 4. **Speech & Timer Sync**: Central 3D console screen and holographic ring sync in real time with the debate speech playback and remaining seconds countdown.

---

## 2. Proposed Architecture & Component Details

### A. `src/components/ThreeArenaScene.tsx` (New Three.js 3D Stage Component)
- **WebGL Canvas Lifecycle**:
  - Mounted in a stable ref container with resize handling.
  - `ACESFilmicToneMapping`, `outputColorSpace = THREE.SRGBColorSpace`.
  - Clean disposal of all geometries, materials, and textures on unmount.
- **Stage Procedural Models (`THREE.Group`)**:
  - **Hexagonal Platform**: Multi-tier beveled extruded geometry with brushed metal edges, dark glossy deck surface, and neon rim perimeter under-glow.
  - **Armchairs (Left & Right)**: 6-part composite geometric modern armchairs (faceted backrest, angled cushions, beveled armrests, metallic support frame).
  - **Debaters (Left & Right)**: Composite procedural articulated character models (head, torso, arms, legs, shoes) with idle breathing and head-turn kinematics toward the opposing speaker.
  - **Central Timer Console**: Beveled pedestal with emissive digital screen, rotating holographic rings, and audio-reactive glow.
  - **Overhead Volumetric Spotlights**: Dedicated spotlight cones with additive blending and soft falloff, dynamically swinging focus and boosting luminance on the active debater.
- **Cinematic Dynamic Camera System**:
  - Target camera positions:
    - *Wide Broadcast*: framing both opponents and central console.
    - *Left Debater Focus*: dynamic over-the-shoulder / close angle when Atheist/Muslim AI speaks.
    - *Right Debater Focus*: dynamic over-the-shoulder / close angle when Believer/Jewish AI speaks.
  - Camera glides smoothly using frame-independent exponential damping.
  - User can toggle "Cinematic Auto-Track" vs "Interactive Free Orbit".

### B. Integration in `src/components/DebateArena.tsx`
- Add `Three.js 3D Live Arena` as a premier stage view option.
- Passes live `activeSpeaker`, `isSpeaking`, `speechProgress`, and `audioElement`.
- Retains floating glass subtitle card, stage captions, voting, and audience Q&A.

---

## 3. Verification & Acceptance Plan

- Verify Three.js compiles cleanly with TypeScript (`compile_applet`, `lint_applet`).
- Verify smooth 60fps rendering without memory leaks or frame stutter.
- Verify camera smoothly glides when active speaker switches between left and right debaters.
- Verify volumetric lights and timer console react in real time to debate speech playback.
