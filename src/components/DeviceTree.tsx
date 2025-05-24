import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import tinycolor from "tinycolor2";
import { css } from "@emotion/react";

import { getDummyDevices, getDummyGroups } from "../data/dummyData";
import type {
  DeviceStatus,
  NodeType,
  TopologyEdge,
  TopologyNode,
  TreeNode,
} from "../types";

/* const containerStyle = css`
  width: 100%;
  height: 100%;
  position: relative;
  background: #181b1f;
  border-radius: 10px;
  overflow: hidden;
`;

const tooltipStyle = css`
  position: absolute;
  z-index: 1000;
  pointer-events: none;
  display: none;
  padding: 4px 8px;
  background: #333;
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
`;
 */
const DeviceTree = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<"rotate" | "pan">("rotate");
  const prevMouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const deviceData = getDummyDevices();
  const groupData = getDummyGroups();

  const normalizeParent = (uid: string | null | undefined) =>
    !uid || uid === "" || uid === "#" ? "root" : uid;

  const nodesAndEdges = useMemo(() => {
    if (!deviceData || !groupData) return { nodes: [], edges: [] };
    const all: TreeNode[] = [];
    const nodeMap = new Map<string, { ParentUID: string | null }>();
    const virtualRoot: TreeNode = {
      uid: "root",
      name: "root",
      type: "group",
      ParentUID: null,
    };
    all.push(virtualRoot);
    nodeMap.set("root", { ParentUID: null });

    groupData.forEach((g) => {
      const parent = normalizeParent(g.ParentUID);
      all.push({
        uid: g.uid,
        name: g.title,
        type: "group",
        ParentUID: parent,
      });
      nodeMap.set(g.uid, { ParentUID: parent });
    });

    deviceData.forEach((d) => {
      const parent = normalizeParent(d.GroupUID);
      all.push({
        uid: d.UID,
        name: d.Name,
        type: "device",
        ParentUID: parent,
        slug: d.Slug,
        deviceIp: d.DeviceIp,
        status: d.Status,
      });
      nodeMap.set(d.UID, { ParentUID: parent });
    });

    const getDepth = (uid: string, current = 0): number => {
      const parent = nodeMap.get(uid)?.ParentUID;
      if (!parent || !nodeMap.has(parent)) return current;
      return getDepth(parent, current + 1);
    };

    const nodes: TopologyNode[] = all.map((n) => ({
      id: n.uid,
      position: { x: 0, y: 0 },
      data: {
        label: n.name,
        ip: n.deviceIp || "",
        status: (n.status as DeviceStatus) || "green",
        slug: n.slug || "",
        depth: getDepth(n.uid),
        type: n.type,
      },
    }));

    const edges: TopologyEdge[] = all
      .map((n) => ({ source: n.ParentUID ?? "root", target: n.uid }))
      .filter((e) => e.source && e.target);

    return { nodes, edges };
  }, [deviceData, groupData]);

  const updateTooltip = (e: MouseEvent, text: string | null) => {
    if (!tooltipRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    tooltipRef.current.textContent = text ?? "";
    tooltipRef.current.style.left = `${e.clientX - rect.left}px`;
    tooltipRef.current.style.top = `${e.clientY - rect.top - 10}px`;
    tooltipRef.current.style.display = text ? "block" : "none";
  };

  const createGlowMaterial = (color: THREE.Color) => {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  };

  useEffect(() => {
    if (!deviceData || !groupData) return;
    const container = containerRef.current;
    if (!container) return;

    const tooltip = document.createElement("div");
    tooltipRef.current = tooltip;
    tooltip.className = "three-tooltip";
    Object.assign(tooltip.style, {
      position: "absolute",
      zIndex: "1000",
      pointerEvents: "none",
      display: "none",
      padding: "4px 8px",
      background: "#333",
      color: "#fff",
      borderRadius: "4px",
      fontSize: "12px",
    });
    container.appendChild(tooltip);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 100;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    cameraRef.current = camera;
    rendererRef.current = renderer;

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    nodesAndEdges.nodes.forEach((node, i) => {
      const { id, data } = node;
      const angle = goldenAngle * i;
      const r = 20 + data.depth * 25;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);

      const baseColor =
        data.status === "red"
          ? "#ff4444"
          : data.status === "yellow"
          ? "#ffcc00"
          : "#44ff44";

      const color = new THREE.Color(baseColor);

      let mesh: THREE.Mesh;

      if (data.type === "group") {
        const geometry = new THREE.BoxGeometry(6, 6, 6);
        const material = new THREE.MeshPhongMaterial({ color });
        mesh = new THREE.Mesh(geometry, material);
      } else {
        // device
        const geometry = new THREE.SphereGeometry(4, 16, 16);
        const material = new THREE.MeshPhongMaterial({ color });
        mesh = new THREE.Mesh(geometry, material);

        // Add glow for red status devices
        if (data.status === "red") {
          const glowGeometry = new THREE.SphereGeometry(5.5, 16, 16);
          const glowMaterial = createGlowMaterial(color);
          const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
          mesh.add(glowMesh);
        }
      }

      mesh.position.set(x, y, 0);
      mesh.name = id;
      mesh.userData = { ...data, id };
      group.add(mesh);
    });

    nodesAndEdges.edges.forEach((edge) => {
      const src = group.children.find((m) => m.name === edge.source);
      const dst = group.children.find((m) => m.name === edge.target);
      if (!src || !dst) return;

      const points = [src.position, dst.position];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color: "#999" })
      );
      group.add(line);
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      if (!camera || !renderer) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(group.children);
      if (intersects.length > 0) {
        const { id, type, label } = intersects[0].object.userData;
        setSelectedDevice(id);
        console.log("Clicked:", { id, type, label });
      } else {
        setSelectedDevice(null);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      if (!camera || !renderer) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(group.children);
      const label =
        intersects.length > 0 ? intersects[0].object.userData.label : null;
      updateTooltip(e, label);

      if (isDraggingRef.current && groupRef.current) {
        const dx = e.clientX - prevMouse.current.x;
        const dy = e.clientY - prevMouse.current.y;
        prevMouse.current = { x: e.clientX, y: e.clientY };

        if (dragModeRef.current === "rotate") {
          group.rotation.y += dx * 0.005;
          group.rotation.x += dy * 0.005;
        } else if (dragModeRef.current === "pan") {
          group.position.x += dx * 0.1;
          group.position.y -= dy * 0.1;
        }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouse.current = { x: e.clientX, y: e.clientY };
      dragModeRef.current = e.button === 2 ? "pan" : "rotate";
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      const camera = cameraRef.current;
      if (!camera) return;
      camera.position.z += e.deltaY * 0.05;
      camera.position.z = Math.max(20, Math.min(300, camera.position.z));
    };

    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("wheel", onWheel);
    renderer.domElement.addEventListener("contextmenu", (e) =>
      e.preventDefault()
    );

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("contextmenu", (e) =>
        e.preventDefault()
      );
      if (tooltip && tooltip.parentElement) {
        tooltip.parentElement.removeChild(tooltip);
      }
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [nodesAndEdges, deviceData, groupData]);

  const renderInfoModal = useCallback(() => {
    if (!selectedDevice || !deviceData) return null;
    const device = deviceData.find((d) => d.UID === selectedDevice);
    if (!device) return null;
    return (
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          background: "#222",
          color: "#fff",
          padding: "12px 16px",
          borderRadius: 8,
          zIndex: 1001,
          maxWidth: 300,
          boxShadow: "0 0 10px rgba(0,0,0,0.7)",
        }}
      >
        <h3>{device.Name}</h3>
        <p>
          <strong>IP:</strong> {device.DeviceIp}
        </p>
        <p>
          <strong>Status:</strong>{" "}
          <span
            style={{
              color:
                device.Status === "red"
                  ? "red"
                  : device.Status === "yellow"
                  ? "yellow"
                  : "limegreen",
            }}
          >
            {device.Status}
          </span>
        </p>
        <button
          onClick={() => setSelectedDevice(null)}
          style={{
            marginTop: 10,
            padding: "6px 12px",
            background: "#444",
            border: "none",
            borderRadius: 4,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    );
  }, [selectedDevice, deviceData]);

  return (
    <div
      style={{ width: "100%", height: "100%" }}
      ref={containerRef}
      tabIndex={0}
    >
      {renderInfoModal()}
    </div>
  );
};

export default DeviceTree;
