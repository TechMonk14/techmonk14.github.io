document.addEventListener("DOMContentLoaded", function () {
  /***** Data & Defaults *****/
  const planets = {
    Mercury: { period: 0.24, distance: 50 },
    Venus:   { period: 0.62, distance: 100 },
    Earth:   { period: 1.0,  distance: 150 },
    Mars:    { period: 1.88, distance: 200 },
    Jupiter: { period: 11.86, distance: 300 }
  };
  const planetDisplayColors = {
    Mercury: "#bebebe",
    Venus:   "#e6c49c",
    Earth:   "#2e86de",
    Mars:    "#c0392b",
    Jupiter: "#f39c12"
  };
  const planetSizes = {
    Mercury: 3,
    Venus:   4,
    Earth:   5,
    Mars:    4,
    Jupiter: 8
  };
  const sunRadius = 15;
  const sunColor = "yellow";

  let selectedPlanets = ["Earth", "Jupiter", "Mars"];
  let time = 0;
  let speed = 0.02;
  let zoom = 0.8;
  let running = false;
  let animationFrameId;
  // Array to store persistent trail segments
  const trails = [];

  /***** Element References *****/
  const planet1Select = document.getElementById("planet1");
  const planet2Select = document.getElementById("planet2");
  const planet3Select = document.getElementById("planet3");

  const color1Input = document.getElementById("color1");
  const color2Input = document.getElementById("color2");
  const color3Input = document.getElementById("color3");

  const speedControl = document.getElementById("speedControl");
  const speedValue = document.getElementById("speedValue");

  const zoomControl = document.getElementById("zoomControl");
  const zoomValue = document.getElementById("zoomValue");

  const startPauseBtn = document.getElementById("startPauseBtn");
  const restartBtn = document.getElementById("restartBtn");
  const saveImageBtn = document.getElementById("saveImageBtn");

  const infoContent = document.getElementById("infoContent");

  const trailCanvas = document.getElementById("trailCanvas");
  const trailCtx = trailCanvas.getContext("2d");
  const orbitCanvas = document.getElementById("orbitCanvas");
  const orbitCtx = orbitCanvas.getContext("2d");

  const controlsDiv = document.getElementById("controls");
  const toggleToolsBtn = document.getElementById("toggleToolsBtn");

  /***** Canvas Setup & High DPI Adjustment *****/
  // Set CSS size and adjust internal resolution
  function setCanvasSize(canvas) {
    const rect = canvas.getBoundingClientRect();
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
  }
  function resizeCanvasToDisplaySize(canvas) {
    const pixelRatio = window.devicePixelRatio || 1;
    const width  = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * pixelRatio || canvas.height !== height * pixelRatio) {
      canvas.width  = width * pixelRatio;
      canvas.height = height * pixelRatio;
      return true;
    }
    return false;
  }
  // Initially set size for both canvases.
  setCanvasSize(trailCanvas);
  setCanvasSize(orbitCanvas);
  resizeCanvasToDisplaySize(trailCanvas);
  resizeCanvasToDisplaySize(orbitCanvas);

  /***** Populate Drop-Downs with Styled Options *****/
  Object.keys(planets).forEach(planet => {
    const option1 = document.createElement("option");
    option1.value = planet;
    option1.text = planet;
    option1.style.backgroundColor = planetDisplayColors[planet];
    option1.style.color = "#fff";
    planet1Select.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = planet;
    option2.text = planet;
    option2.style.backgroundColor = planetDisplayColors[planet];
    option2.style.color = "#fff";
    planet2Select.appendChild(option2);

    const option3 = document.createElement("option");
    option3.value = planet;
    option3.text = planet;
    option3.style.backgroundColor = planetDisplayColors[planet];
    option3.style.color = "#fff";
    planet3Select.appendChild(option3);
  });
  // Set default selections.
  planet1Select.value = selectedPlanets[0];
  planet2Select.value = selectedPlanets[1];
  planet3Select.value = selectedPlanets[2];

  /***** UI Update Functions *****/
  function updateSelectBackground(selectElement) {
    const val = selectElement.value;
    if (val !== "none" && planetDisplayColors[val]) {
      selectElement.style.backgroundColor = planetDisplayColors[val];
    } else {
      selectElement.style.backgroundColor = "#444";
    }
  }
  function updateAllSelects() {
    updateSelectBackground(planet1Select);
    updateSelectBackground(planet2Select);
    updateSelectBackground(planet3Select);
  }
  updateAllSelects();

  function updateInfo() {
    let html = "";
    const selPlanets = [planet1Select.value, planet2Select.value, planet3Select.value];
    const traceColors = [color1Input.value, color2Input.value, color3Input.value];
    for (let i = 0; i < 3; i++) {
      if (selPlanets[i] !== "none") {
        html += `<div class="infoRow">
          <div class="planetCircle" style="background:${planetDisplayColors[selPlanets[i]]};"></div>
          <div class="infoName">${selPlanets[i]}</div>
          <div class="traceLine" style="background:${traceColors[i]};"></div>
        </div>`;
      }
    }
    infoContent.innerHTML = html || "<em>No planets selected</em>";
  }
  updateInfo();

  /***** Event Listeners *****/
  [planet1Select, planet2Select, planet3Select].forEach(selectEl => {
    selectEl.addEventListener("change", () => {
      updateSelectBackground(selectEl);
      if (selectEl === planet1Select) {
        selectedPlanets[0] = selectEl.value;
      } else if (selectEl === planet2Select) {
        selectedPlanets[1] = selectEl.value;
      } else if (selectEl === planet3Select) {
        selectedPlanets[2] = selectEl.value;
      }
      clearTrail();
      updateInfo();
    });
  });
  [color1Input, color2Input, color3Input].forEach(input => {
    input.addEventListener("input", () => {
      clearTrail();
      updateInfo();
    });
  });
  speedControl.addEventListener("input", () => {
    speed = parseFloat(speedControl.value);
    speedValue.textContent = speed.toFixed(2);
  });
  zoomControl.addEventListener("input", () => {
    zoom = parseFloat(zoomControl.value);
    zoomValue.textContent = zoom.toFixed(2);
  });

  /***** Toggle Controls (Mobile) *****/
  toggleToolsBtn.addEventListener("click", () => {
    controlsDiv.classList.toggle("hidden");
  });

  /***** Canvas Functions *****/
  // Clear the trail canvas and reset the trails array.
  function clearTrail() {
    trailCtx.setTransform(1, 0, 0, 1, 0, 0);
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    trails.length = 0; // Clear stored segments.
    time = 0;
  }
  // Utility: Convert degrees to radians.
  function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }
  // Main draw function.
  function draw() {
    // Resize canvases if needed.
    resizeCanvasToDisplaySize(trailCanvas);
    resizeCanvasToDisplaySize(orbitCanvas);

    const pixelRatio = window.devicePixelRatio || 1;
    const traceColor1 = color1Input.value;
    const traceColor2 = color2Input.value;
    const traceColor3 = color3Input.value;
    let pos = [null, null, null];
    for (let i = 0; i < 3; i++) {
      if (selectedPlanets[i] !== "none") {
        const p = planets[selectedPlanets[i]];
        const omega = 360 / p.period;
        const angle = omega * time;
        const x = p.distance * Math.cos(toRadians(angle));
        const y = p.distance * Math.sin(toRadians(angle));
        pos[i] = { x, y };
      } else {
        pos[i] = null;
      }
    }
    // Store segments in the trails array.
    if (pos[0] && pos[1]) {
      trails.push({ x1: pos[0].x, y1: pos[0].y, x2: pos[1].x, y2: pos[1].y, color: traceColor1 });
    }
    if (pos[1] && pos[2]) {
      trails.push({ x1: pos[1].x, y1: pos[1].y, x2: pos[2].x, y2: pos[2].y, color: traceColor2 });
    }
    if (pos[2] && pos[0]) {
      trails.push({ x1: pos[2].x, y1: pos[2].y, x2: pos[0].x, y2: pos[0].y, color: traceColor3 });
    }
    // Draw all stored trail segments.
    trailCtx.save();
    trailCtx.translate(trailCanvas.width / 2, trailCanvas.height / 2);
    // Scale with zoom and pixel ratio.
    trailCtx.scale(zoom * pixelRatio, zoom * pixelRatio);
    trails.forEach(seg => {
      trailCtx.strokeStyle = seg.color;
      trailCtx.lineWidth = 0.3;
      trailCtx.beginPath();
      trailCtx.moveTo(seg.x1, seg.y1);
      trailCtx.lineTo(seg.x2, seg.y2);
      trailCtx.stroke();
    });
    trailCtx.restore();

    // Draw current positions on orbit canvas.
    orbitCtx.setTransform(1, 0, 0, 1, 0, 0);
    orbitCtx.clearRect(0, 0, orbitCanvas.width, orbitCanvas.height);
    orbitCtx.save();
    orbitCtx.translate(orbitCanvas.width / 2, orbitCanvas.height / 2);
    orbitCtx.scale(zoom * pixelRatio, zoom * pixelRatio);
    // Draw Sun.
    orbitCtx.fillStyle = sunColor;
    orbitCtx.beginPath();
    orbitCtx.arc(0, 0, sunRadius, 0, Math.PI * 2);
    orbitCtx.fill();
    // Draw Planets.
    if (pos[0]) {
      const name = planet1Select.value;
      orbitCtx.fillStyle = planetDisplayColors[name];
      orbitCtx.beginPath();
      orbitCtx.arc(pos[0].x, pos[0].y, planetSizes[name], 0, Math.PI * 2);
      orbitCtx.fill();
    }
    if (pos[1]) {
      const name = planet2Select.value;
      orbitCtx.fillStyle = planetDisplayColors[name];
      orbitCtx.beginPath();
      orbitCtx.arc(pos[1].x, pos[1].y, planetSizes[name], 0, Math.PI * 2);
      orbitCtx.fill();
    }
    if (pos[2]) {
      const name = planet3Select.value;
      orbitCtx.fillStyle = planetDisplayColors[name];
      orbitCtx.beginPath();
      orbitCtx.arc(pos[2].x, pos[2].y, planetSizes[name], 0, Math.PI * 2);
      orbitCtx.fill();
    }
    orbitCtx.restore();

    time += speed;
    if (running) {
      animationFrameId = requestAnimationFrame(draw);
    }
  }
  // Removed initial animation call so that tracing starts only after clicking "Start"
  // (Animation will start when the user clicks the Start/Pause button)

  /***** Animation Controls *****/
  startPauseBtn.addEventListener("click", () => {
    if (running) {
      running = false;
      startPauseBtn.textContent = "Start";
      cancelAnimationFrame(animationFrameId);
    } else {
      running = true;
      startPauseBtn.textContent = "Pause";
      animationFrameId = requestAnimationFrame(draw);
    }
  });
  restartBtn.addEventListener("click", () => {
    clearTrail();
  });
  // Save Image: create a high resolution offscreen canvas.
  saveImageBtn.addEventListener("click", () => {
    const pixelRatio = window.devicePixelRatio || 1;
    // Use the CSS dimensions multiplied by pixelRatio for high-res output.
    const width = trailCanvas.clientWidth * pixelRatio;
    const height = trailCanvas.clientHeight * pixelRatio;
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext("2d");
    // Draw trail canvas
    offCtx.drawImage(trailCanvas, 0, 0, width, height);
    // Draw orbit canvas
    offCtx.drawImage(orbitCanvas, 0, 0, width, height);
    const dataURL = offscreen.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "planet_design.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}); 