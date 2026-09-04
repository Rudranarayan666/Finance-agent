import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function FinanceBackground3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    // Disable entirely on screens < 768px for perf & visual cleanliness
    if (window.innerWidth < 768) return;

    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || 800;
    const height = currentMount.clientHeight || 400;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 70;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    currentMount.appendChild(renderer.domElement);

    // 1. Subtle, Muted Particle Constellation Field (drastically reduced & low opacity)
    const particleCount = 60;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 140;
      positions[i + 1] = (Math.random() - 0.5) * 80;
      positions[i + 2] = (Math.random() - 0.5) * 60;

      velocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.01,
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x10b981,
      size: 1.2,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 2. Faint Wireframe Icosahedron (Muted ambient core node)
    const icoGeo = new THREE.IcosahedronGeometry(18, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: 0x059669,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const icoMesh = new THREE.Mesh(icoGeo, icoMat);
    icoMesh.position.set(35, -10, -15);
    scene.add(icoMesh);

    // Secondary subtle ring
    const torusGeo = new THREE.TorusGeometry(26, 0.3, 12, 60);
    const torusMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
    });
    const torusMesh = new THREE.Mesh(torusGeo, torusMat);
    torusMesh.position.set(-40, 15, -25);
    scene.add(torusMesh);

    // Gentle Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event) => {
      mouseX = (event.clientX - window.innerWidth / 2) * 0.01;
      mouseY = (event.clientY - window.innerHeight / 2) * 0.01;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Handle Resize within container
    const handleResize = () => {
      if (!currentMount) return;
      const w = currentMount.clientWidth;
      const h = currentMount.clientHeight;
      if (w && h) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      targetX += (mouseX - targetX) * 0.03;
      targetY += (mouseY - targetY) * 0.03;
      camera.position.x = targetX;
      camera.position.y = -targetY;
      camera.lookAt(scene.position);

      icoMesh.rotation.x += 0.001;
      icoMesh.rotation.y += 0.0015;
      torusMesh.rotation.x -= 0.0008;
      torusMesh.rotation.z += 0.001;

      const posArray = geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        posArray[i3] += velocities[i].x;
        posArray[i3 + 1] += velocities[i].y;
        posArray[i3 + 2] += velocities[i].z;

        if (Math.abs(posArray[i3]) > 70) velocities[i].x *= -1;
        if (Math.abs(posArray[i3 + 1]) > 40) velocities[i].y *= -1;
        if (Math.abs(posArray[i3 + 2]) > 30) velocities[i].z *= -1;
      }
      geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      icoGeo.dispose();
      icoMat.dispose();
      torusGeo.dispose();
      torusMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-30 hidden md:block rounded-3xl"
      aria-hidden="true"
    />
  );
}
