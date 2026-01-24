let elementCount = 0;
let selectedElement = null;
let layers = [];
const KEY_MOVE_STEP = 5;
const STORAGE_KEY = "canvas-layout";


// default values
const DEFAULTS = {
  x: 60,
  y: 60,
  width: 120,
  height: 80,
  border: "#333"
};

const canvas = document.querySelector(".canvas");


// ===== SELECTION =====
function clearSelection() {
  if (!selectedElement) return;

  selectedElement.classList.remove("selected");
  removeResizeHandles(selectedElement);
  removeRotationHandle(selectedElement);
  selectedElement = null;
  highlightLayer(null);
  // updatePropertiesPanel(null);

}

function selectElement(el) {
  if (!layers.includes(el)) {
    layers.push(el);
    renderLayers();
    updatePropertiesPanel(el);

  }

  if (selectedElement === el) return;

  clearSelection();
  selectedElement = el;
  el.classList.add("selected");
  addResizeHandles(el);
  if (el.dataset.type !== "line") {
    addRotationHandle(el);
  }
  highlightLayer(el);
  updatePropertiesPanel(el);

}

function removeRotationHandle(el) {
  const handle = el.querySelector(".rotate-handle");
  if (handle) handle.remove();
}


// deselect when clicking empty canvas
canvas.addEventListener("click", e => {
  if (e.target === canvas) clearSelection();
});


// ===== Resizing =====
function addResizeHandles(el) {
  // ["nw", "ne", "sw", "se"].forEach(pos => {
  //   const handle = document.createElement("div");
  //   handle.className = `resize-handle ${pos}`;
  //   handle.dataset.position = pos;

  //   // stop canvas deselect
  //   handle.addEventListener("click", e => e.stopPropagation());
  //   el.appendChild(handle);
  // });
  // ===== LINE: only left-right resize =====
  if (el.dataset.type === "line") {
    ["w", "e"].forEach(pos => {
      const handle = document.createElement("div");
      handle.className = `resize-handle ${pos}`;
      handle.dataset.position = pos;
      handle.addEventListener("click", e => e.stopPropagation());
      el.appendChild(handle);
    });
    return;
  }

  // ===== NORMAL ELEMENTS =====
  ["nw", "ne", "sw", "se"].forEach(pos => {
    const handle = document.createElement("div");
    handle.className = `resize-handle ${pos}`;
    handle.dataset.position = pos;
    handle.addEventListener("click", e => e.stopPropagation());
    el.appendChild(handle);
  });
}

function removeResizeHandles(el) {
  el.querySelectorAll(".resize-handle").forEach(h => h.remove());
}


// ===== CREATE SHAPE =====
function createShape(type) {
  elementCount++;

  const el = document.createElement("div");
  el.classList.add("canvas-element", type);
  el.id = `${type}-${elementCount}`;

  // base styles
  //ye same getBoundingClientRect() se bhi ho skta hai,vo direct object deta hai in values ka
  Object.assign(el.style, {
    position: "absolute",
    left: DEFAULTS.x + elementCount * 10 + "px",
    top: DEFAULTS.y + elementCount * 10 + "px",
    width: DEFAULTS.width + "px",
    height: DEFAULTS.height + "px",
    backgroundColor: "transparent",
    border: `2px solid ${DEFAULTS.border}`,
    boxSizing: "border-box",
    cursor: "pointer"
  });

  // save state
  el.dataset.fill = "transparent";
  el.dataset.border = DEFAULTS.border;

  // type-specific styles
  if (type === "circle") el.style.borderRadius = "50%";

  if (type === "line") {
    el.style.height = "4px";
    el.style.backgroundColor = DEFAULTS.border;
    el.style.border = "none";
    el.dataset.type = "line"; 
    el.dataset.direction = "horizontal";
  }

  if (type === "text") {
    el.textContent = "Edit text";
    el.contentEditable = "plaintext-only"; //  better editor behavior
    el.tabIndex = 0;                       //  allows focus
    el.spellcheck = false;

    Object.assign(el.style, {
      border: "1px dashed #666",
      backgroundColor: "transparent",
      color: "#111",
      fontSize: "18px",
      padding: "4px",
      cursor: "text"
    });

    // double click to edit aur single click se drag hoga
    el.addEventListener("dblclick", e => {
      e.stopPropagation();
      el.contentEditable = "true";
      el.focus();
    });

    // click outside → stop editing
    el.addEventListener("blur", () => {
      el.contentEditable = "false";
    });
  }

  // click to select
  el.addEventListener("click", e => {
    e.stopPropagation();
    selectElement(el);

    if (el.classList.contains("text")) {
      el.focus();       //  cursor + keyboard activation
    }
  });

  canvas.appendChild(el);
  layers.push(el);
  updateZIndices?.();
  renderLayers();
  selectElement(el);
  saveLayout();

}

//local storage mai jo jo create ho ,save karte jaayenge
function saveLayout() {
  const layout = layers.map(el => ({
    id: el.id,
    type: [...el.classList].find(c => c !== "canvas-element"),
    left: el.offsetLeft,
    top: el.offsetTop,
    width: el.offsetWidth,
    height: el.offsetHeight,
    backgroundColor: el.style.backgroundColor,
    color: el.style.color,
    rotation: el.dataset.rotation || 0,
    text: el.classList.contains("text") ? el.textContent : null,
    styles: {
      border: el.style.border,
      borderRadius: el.style.borderRadius,
      fontSize: el.style.fontSize,
      padding: el.style.padding
    }
  }));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}


let updateZIndices;
// ===== .box k <i> tag ko click karne par vo specific shape bann jaayega =====
document.querySelectorAll(".elem").forEach(tool => {
  tool.addEventListener("click", () => {
    const type = tool.getAttribute("alt"); // rectangle, text, circle, line
    createShape(type);
  });
});


// ===== PROPERTY PANEL ===== ,yaha property mai input daalne pr size change hoga
const [heightInput, widthInput, bgInput, textColorInput] =
  document.querySelectorAll(".properties input");

heightInput.addEventListener("input", () => {
  if (!selectedElement) return;
  if (selectedElement.dataset.type === "line") return;
  selectedElement.style.height = heightInput.value + "px";
  saveLayout();
});

widthInput.addEventListener("input", () => {
  if (selectedElement)
    selectedElement.style.width = widthInput.value + "px";
    saveLayout();
});

bgInput.addEventListener("input", () => {
  if (!selectedElement || selectedElement.classList.contains("line")) return;
  selectedElement.style.backgroundColor = bgInput.value;
  selectedElement.dataset.fill = bgInput.value;
  saveLayout();
});

textColorInput.addEventListener("input", () => {
  if (selectedElement)
    selectedElement.style.color = textColorInput.value;
    saveLayout();
});


//=====3) Dragging ,Resizing and Rotating=====

// ================= DRAGGING =================
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// ================= Resizing =================
let isResizing = false;
let resizeHandle = null;
let startX, startY, startWidth, startHeight, startLeft, startTop;
const MIN_SIZE = 20;

// ================= ROTATION =================
let isRotating = false; 
let startAngle = 0;


canvas.addEventListener("mousedown", e => {
  if (!selectedElement) return;

  // ===== LINE RESIZE (endpoint drag) =====
  if (
    e.target.classList.contains("resize-handle") &&
    selectedElement.dataset.type === "line"
  ) {
    isResizing = true;
    resizeHandle = e.target.dataset.position;

    const rect = selectedElement.getBoundingClientRect();

    if (resizeHandle === "e") {
      selectedElement._anchorX = rect.left;
      selectedElement._anchorY = rect.top + rect.height / 2;
    }

    if (resizeHandle === "w") {
      selectedElement._anchorX = rect.right;
      selectedElement._anchorY = rect.top + rect.height / 2;
    }

    e.stopPropagation();
    return;
  }

  // ===== NORMAL RESIZE =====
  if (e.target.classList.contains("resize-handle")) {
    isResizing = true;
    resizeHandle = e.target.dataset.position;

    startX = e.clientX;
    startY = e.clientY;
    startWidth = selectedElement.offsetWidth;
    startHeight = selectedElement.offsetHeight;
    startLeft = selectedElement.offsetLeft;
    startTop = selectedElement.offsetTop;

    e.stopPropagation();
    return;
  }

  // ===== DRAG =====
  if (e.target === selectedElement) {
    isDragging = true;

    const rect = selectedElement.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    e.preventDefault();
  }
});



document.addEventListener("mousemove", e => {

  // ===== LINE MOVE =====
if (isResizing && selectedElement?.dataset.type === "line") {

  const ax = selectedElement._anchorX;
  const ay = selectedElement._anchorY;
  if (ax == null || ay == null) return;

  const mx = e.clientX;
  const my = e.clientY;

  const dx = mx - ax;
  const dy = my - ay;

  const length = Math.max(20, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  selectedElement.style.left = ax + "px";
  selectedElement.style.top = (ay - 2) + "px";
  selectedElement.style.width = length + "px";
  selectedElement.style.height = "4px";

  selectedElement.style.transformOrigin = "0 50%";
  selectedElement.style.transform = `rotate(${angle}deg)`;
  selectedElement.dataset.rotation = angle;

  return;
}

  if (isDragging && selectedElement) {
    const canvasRect = canvas.getBoundingClientRect();
    let left = e.clientX - canvasRect.left - dragOffsetX;
    let top = e.clientY - canvasRect.top - dragOffsetY;

    left = Math.max(0, Math.min(left, canvas.clientWidth - selectedElement.offsetWidth));
    top = Math.max(0, Math.min(top, canvas.clientHeight - selectedElement.offsetHeight));

    selectedElement.style.left = left + "px";
    selectedElement.style.top = top + "px";
    updatePropertiesPanel(selectedElement);
    saveLayout();

  }

  if (isResizing && selectedElement) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    //for line 1-d resizing
    if (isResizing && selectedElement?.dataset.type === "line") {

  const ax = selectedElement._anchorX;
  const ay = selectedElement._anchorY;

  const mx = e.clientX;
  const my = e.clientY;

  // vector calculation
  const dx = mx - ax;
  const dy = my - ay;

  const length = Math.max(MIN_SIZE, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  // line ko anchor point par rakho
  selectedElement.style.left = ax + "px";
  selectedElement.style.top = (ay - 2) + "px"; // half of 4px thickness

  selectedElement.style.width = length + "px";
  selectedElement.style.height = "4px";

  selectedElement.style.transformOrigin = "0 50%";
  selectedElement.style.transform = `rotate(${angle}deg)`;

  selectedElement.dataset.rotation = angle;

  updatePropertiesPanel(selectedElement);
  return;
}


    //for 2-d resizing
    if (resizeHandle.includes("e"))
      selectedElement.style.width = Math.max(MIN_SIZE, startWidth + dx) + "px";
    if (resizeHandle.includes("s"))
      selectedElement.style.height = Math.max(MIN_SIZE, startHeight + dy) + "px";
    if (resizeHandle.includes("w")) {
      selectedElement.style.width = Math.max(MIN_SIZE, startWidth - dx) + "px";
      selectedElement.style.left = startLeft + dx + "px";
    }
    if (resizeHandle.includes("n")) {
      selectedElement.style.height = Math.max(MIN_SIZE, startHeight - dy) + "px";
      selectedElement.style.top = startTop + dy + "px";
    }

     updatePropertiesPanel(selectedElement);

  }

  if (isRotating && selectedElement) {
    const rect = selectedElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    const rotation = angle - startAngle;

    selectedElement.dataset.rotation =
      (parseFloat(selectedElement.dataset.rotation) || 0) + rotation;

    selectedElement.style.transform =
      `rotate(${selectedElement.dataset.rotation}deg)`;

    startAngle = angle;

    updatePropertiesPanel(selectedElement);
  }
});


document.addEventListener("mouseup", () => {
  isDragging = false;
  isResizing = false;
  isRotating = false;
  resizeHandle = null;

  if (selectedElement) {
      delete selectedElement._anchorX;
      delete selectedElement._anchorY;
    }

  saveLayout();
});


// ================= TEXT EDITING SUPPORT =================

//canvas ka mousedown listener property panel se ho jayega
// text color ka kaam property panel kar raha hai already


// OPTIONAL: font size via keyboard (Ctrl + / Ctrl -)
document.addEventListener("keydown", e => {
  if (!selectedElement || !selectedElement.classList.contains("text")) return;

  const currentSize = parseInt(getComputedStyle(selectedElement).fontSize);

  if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
    e.preventDefault();
    selectedElement.style.fontSize = currentSize + 2 + "px";
  }

  if (e.ctrlKey && e.key === "-") {
    e.preventDefault();
    selectedElement.style.fontSize = Math.max(8, currentSize - 2) + "px";
  }
});


//============4)Simple Layers Panel=================
const layersContainer = document.querySelector(".layers");

function renderLayers() {
  layersContainer.innerHTML = "<h3>Layers</h3>";

  [...layers].reverse().forEach(el => {
    const item = document.createElement("div");
    item.classList.add("layer-item");
    item.textContent = el.id;

    item.onclick = () => selectElement(el);

    const upBtn = document.createElement("button");
    upBtn.textContent = "▲";
    upBtn.onclick = e => {
      e.stopPropagation();
      moveLayerUp(el);
    };

    const downBtn = document.createElement("button");
    downBtn.textContent = "▼";
    downBtn.onclick = e => {
      e.stopPropagation();
      moveLayerDown(el);
    };

    item.append(upBtn, downBtn);
    layersContainer.appendChild(item);
  });
}

function highlightLayer(el) {
  document.querySelectorAll(".layer-item").forEach(item => {
    item.classList.toggle("active", el && item.textContent === el.id);
  });
}

function moveLayerUp(el) {
  const i = layers.indexOf(el);
  if (i < layers.length - 1) {
    [layers[i], layers[i + 1]] = [layers[i + 1], layers[i]];
    canvas.appendChild(el);
    renderLayers();
    highlightLayer(el);
  }
}

function moveLayerDown(el) {
  const i = layers.indexOf(el);
  if (i > 0) {
    [layers[i], layers[i - 1]] = [layers[i - 1], layers[i]];
    canvas.insertBefore(el, layers[i]);
    renderLayers();
    highlightLayer(el);
  }
}

//====================5)Properties Panel===================


const propertiesPanel = document.querySelector(".properties");
const textContentWrapper = document.querySelector("#content");
const textLabel = textContentWrapper.querySelector("h6");
const textInput = textContentWrapper.querySelector(" input");



/* ====== CALL THIS WHEN ELEMENT IS SELECTED ====== */
function updateTextPanel(selectedElement) {
  if (
    selectedElement &&
    selectedElement.classList.contains("text")
  ) {
   
   // put selected element text into input
    textInput.value = selectedElement.textContent;
  } 
}

/* ====== LIVE INPUT → ELEMENT ====== */
textInput.addEventListener("input", () => {
  if (
    selectedElement &&
    selectedElement.classList.contains("text")
  ) {
    selectedElement.textContent = textInput.value;
  }
});


// helper: rgb() → hex
function rgbToHex(rgb) {
  if (!rgb.startsWith("rgb")) return rgb;

  const nums = rgb.match(/\d+/g).map(Number);
  return (
    "#" +
    nums
      .map(n => n.toString(16).padStart(2, "0"))
      .join("")
  );
}


const propHeading = document.getElementById("prop-heading");

function updatePropertiesPanel(el) {
  if (!el) {
    
    propHeading.textContent = "No element selected";
    heightInput.value = "";
    widthInput.value = "";
    bgInput.value = "";
    textInput.value = "";
    textContentWrapper.style.display = "none";
    return;
  }
  console.log("Properties updated for", el?.id);


  // inputs sync
  widthInput.value = parseInt(el.style.width) || "";
  heightInput.value = parseInt(el.style.height) || "";

  const bg = el.style.backgroundColor;
  bgInput.value =
    bg && bg !== "transparent" ? rgbToHex(bg) : "#ffffff";

  // heading text
  if (el.classList.contains("text")) {
    propHeading.textContent =
      `${el.id} | W:${widthInput.value}px H:${heightInput.value}px | Color:${el.style.color}`;
    textContentWrapper.style.display = "block";
    textInput.value = el.textContent;
  } else {
    propHeading.textContent =
      `${el.id} | W:${widthInput.value}px H:${heightInput.value}px | BG:${bgInput.value}`;
    textContentWrapper.style.display = "none";
  }
}

//=============6)Keyboard Interactions =============================


document.addEventListener("keydown", e => {
  if (!selectedElement) return;

  const canvasRect = canvas.getBoundingClientRect();
  const elRect = selectedElement.getBoundingClientRect();

  let left = selectedElement.offsetLeft;
  let top = selectedElement.offsetTop;
  let moved = false;

  switch (e.key) {
    case "Delete":
      e.preventDefault();
      deleteSelectedElement();
      return;

    case "ArrowUp":
      top -= KEY_MOVE_STEP;
      moved = true;
      break;

    case "ArrowDown":
      top += KEY_MOVE_STEP;
      moved = true;
      break;

    case "ArrowLeft":
      left -= KEY_MOVE_STEP;
      moved = true;
      break;

    case "ArrowRight":
      left += KEY_MOVE_STEP;
      moved = true;
      break;
  }

  if (!moved) return;

  e.preventDefault();

  // boundary clamp
  left = Math.max(
    0,
    Math.min(left, canvas.clientWidth - selectedElement.offsetWidth)
  );

  top = Math.max(
    0,
    Math.min(top, canvas.clientHeight - selectedElement.offsetHeight)
  );

  selectedElement.style.left = left + "px";
  selectedElement.style.top = top + "px";


  updatePropertiesPanel(selectedElement);
  saveLayout();
});

function deleteSelectedElement() {
  if (!selectedElement) return;

  const el = selectedElement;

  // remove from DOM
  el.remove();

  // remove from layers array
  layers = layers.filter(layer => layer !== el);

  // clear selection
  selectedElement = null;
  renderLayers();
  highlightLayer(null);
  updatePropertiesPanel(null);
  saveLayout();

}

function loadLayout() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  const layout = JSON.parse(saved);

  canvas.innerHTML = "";
  layers = [];
  selectedElement = null;

  layout.forEach(data => {
    elementCount++;

    const el = document.createElement("div");
    el.classList.add("canvas-element", data.type);

    if (data.type === "line") {
      el.dataset.type = "line";
      el.dataset.direction = "horizontal";
    }

    el.id = data.id;

    Object.assign(el.style, {
      position: "absolute",
      left: data.left + "px",
      top: data.top + "px",
      width: data.width + "px",
      height: data.height + "px",
      backgroundColor: data.backgroundColor,
      color: data.color,
      border: data.styles.border,
      borderRadius: data.styles.borderRadius,
      fontSize: data.styles.fontSize,
      padding: data.styles.padding,
      transform: `rotate(${data.rotation}deg)`
    });

    el.dataset.rotation = data.rotation;

    if (data.type === "text") {
      el.textContent = data.text || "";
      el.contentEditable = "plaintext-only";
      el.tabIndex = 0;
    }

    el.addEventListener("click", e => {
      e.stopPropagation();
      selectElement(el);
    });

    canvas.appendChild(el);
    layers.push(el);
  });

  renderLayers();
  elementCount = layers.length;

}
window.addEventListener("DOMContentLoaded", loadLayout);

//==============8)Export Functionss ===============

function exportAsJSON() {
  const layout = layers.map(el => ({
    id: el.id,
    type: [...el.classList].find(c => c !== "canvas-element"),
    left: el.offsetLeft,
    top: el.offsetTop,
    width: el.offsetWidth,
    height: el.offsetHeight,
    backgroundColor: el.style.backgroundColor,
    color: el.style.color,
    rotation: el.dataset.rotation || 0,
    text: el.classList.contains("text") ? el.textContent : null,
    styles: {
      border: el.style.border,
      borderRadius: el.style.borderRadius,
      fontSize: el.style.fontSize,
      padding: el.style.padding
    }
  }));

  const blob = new Blob(
    [JSON.stringify(layout, null, 2)],
    { type: "application/json" }
  );

  downloadFile(blob, "design.json");
}



function exportAsHTML() {
  const elementsHTML = layers.map(el => {
    const styles = `
      position:absolute;
      left:${el.offsetLeft}px;
      top:${el.offsetTop}px;
      width:${el.offsetWidth}px;
      height:${el.offsetHeight}px;
      background:${el.style.backgroundColor};
      color:${el.style.color};
      border:${el.style.border};
      border-radius:${el.style.borderRadius};
      font-size:${el.style.fontSize};
      padding:${el.style.padding};
      transform:rotate(${el.dataset.rotation || 0}deg);
      box-sizing:border-box;
    `;

    if (el.classList.contains("text")) {
      return `<div style="${styles}">${el.textContent}</div>`;
    }

    return `<div style="${styles}"></div>`;
  }).join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Exported Design</title>
</head>
<body style="margin:0; position:relative;">
  <div style="
    position:relative;
    width:${canvas.clientWidth}px;
    height:${canvas.clientHeight}px;
    border:1px solid #ccc;
  ">
    ${elementsHTML}
  </div>
</body>
</html>
  `;

  const blob = new Blob([html], { type: "text/html" });
  downloadFile(blob, "design.html");
}


function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
