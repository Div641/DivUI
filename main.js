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
  border: "#333",
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
  addRotationHandle(el);
  highlightLayer(el);
  updatePropertiesPanel(el);
}

function removeRotationHandle(el) {
  const handle = el.querySelector(".rotate-handle");
  if (handle) handle.remove();
}

// deselect when clicking empty canvas
canvas.addEventListener("click", (e) => {
  if (e.target === canvas) clearSelection();
});

// ===== Resizing =====
function addResizeHandles(el) {
  ["nw", "ne", "sw", "se"].forEach((pos) => {
    const handle = document.createElement("div");
    handle.className = `resize-handle ${pos}`;
    handle.dataset.position = pos;

    // stop canvas deselect
    handle.addEventListener("click", (e) => e.stopPropagation());
    el.appendChild(handle);
  });
}

function removeResizeHandles(el) {
  el.querySelectorAll(".resize-handle").forEach((h) => h.remove());
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
    cursor: "pointer",
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
  }

  if (type === "text") {
    el.textContent = "Edit text";
    el.contentEditable = "plaintext-only"; //  better editor behavior
    el.tabIndex = 0; //  allows focus
    el.spellcheck = false;

    Object.assign(el.style, {
      border: "1px dashed #666",
      backgroundColor: "transparent",
      color: "#111",
      fontSize: "18px",
      padding: "4px",
      cursor: "text",
    });

    // double click to edit aur single click se drag hoga
    el.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      el.contentEditable = "true";
      el.focus();
    });

    // click outside → stop editing
    el.addEventListener("blur", () => {
      el.contentEditable = "false";
    });

    // Sync Canvas typing -> Properties Panel input
    el.addEventListener("input", () => {
      if (selectedElement === el) {
        // Manually select the input since variable might be out of scope depending on order
        const propInput = document.querySelector("#content input");
        if (propInput) propInput.value = el.textContent;
      }
    });
     
  }

  // click to select
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    selectElement(el);

    if (el.classList.contains("text")) {
      el.focus(); //  cursor + keyboard activation
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
  const layout = layers.map((el) => ({
    id: el.id,
    type: [...el.classList].find((c) => c !== "canvas-element"),
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
      padding: el.style.padding,
    },
  }));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

let updateZIndices;
// ===== .box k <i> tag ko click karne par vo specific shape bann jaayega =====
document.querySelectorAll(".elem").forEach((tool) => {
  tool.addEventListener("click", () => {
    const type = tool.getAttribute("alt"); // rectangle, text, circle, line
    createShape(type);
  });
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

canvas.addEventListener("mousedown", (e) => {
  if (!selectedElement) return;

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

  if (e.target === selectedElement) {

    if (selectedElement.isContentEditable) {
      return;
    }
    isDragging = true;

    const rect = selectedElement.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    e.preventDefault();
    updatePropertiesPanel(selectedElement);
  }
});

function addRotationHandle(el) {
  const rotateHandle = document.createElement("div");
  rotateHandle.classList.add("rotate-handle");
  el.appendChild(rotateHandle);

  rotateHandle.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    isRotating = true;

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    startAngle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
  });
}

document.addEventListener("mousemove", (e) => {
  if (isDragging && selectedElement) {
    const canvasRect = canvas.getBoundingClientRect();
    let left = e.clientX - canvasRect.left - dragOffsetX;
    let top = e.clientY - canvasRect.top - dragOffsetY;

    left = Math.max(
      0,
      Math.min(left, canvas.clientWidth - selectedElement.offsetWidth),
    );
    top = Math.max(
      0,
      Math.min(top, canvas.clientHeight - selectedElement.offsetHeight),
    );

    selectedElement.style.left = left + "px";
    selectedElement.style.top = top + "px";
    updatePropertiesPanel(selectedElement);
    saveLayout();
  }

  if (isResizing && selectedElement) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (resizeHandle.includes("e"))
      selectedElement.style.width = Math.max(MIN_SIZE, startWidth + dx) + "px";
    if (resizeHandle.includes("s"))
      selectedElement.style.height =
        Math.max(MIN_SIZE, startHeight + dy) + "px";
    if (resizeHandle.includes("w")) {
      selectedElement.style.width = Math.max(MIN_SIZE, startWidth - dx) + "px";
      selectedElement.style.left = startLeft + dx + "px";
    }
    if (resizeHandle.includes("n")) {
      selectedElement.style.height =
        Math.max(MIN_SIZE, startHeight - dy) + "px";
      selectedElement.style.top = startTop + dy + "px";
    }

    updatePropertiesPanel(selectedElement);
  }

  if (isRotating && selectedElement) {
    const rect = selectedElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const angle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    const rotation = angle - startAngle;

    selectedElement.dataset.rotation =
      (parseFloat(selectedElement.dataset.rotation) || 0) + rotation;

    selectedElement.style.transform = `rotate(${selectedElement.dataset.rotation}deg)`;

    startAngle = angle;

    updatePropertiesPanel(selectedElement);
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  isResizing = false;
  isRotating = false;
  resizeHandle = null;
  saveLayout();
});

// ================= TEXT EDITING SUPPORT =================

//canvas ka mousedown listener property panel se ho jayega
// text color ka kaam property panel kar raha hai already

// OPTIONAL: font size via keyboard (Ctrl + / Ctrl -)
document.addEventListener("keydown", (e) => {
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

  [...layers].reverse().forEach((el) => {
    const item = document.createElement("div");
    item.classList.add("layer-item");
    item.textContent = el.id;

    item.onclick = () => selectElement(el);

    const upBtn = document.createElement("button");
    upBtn.textContent = "▲";
    upBtn.onclick = (e) => {
      e.stopPropagation();
      moveLayerUp(el);
    };

    const downBtn = document.createElement("button");
    downBtn.textContent = "▼";
    downBtn.onclick = (e) => {
      e.stopPropagation();
      moveLayerDown(el);
    };

    item.append(upBtn, downBtn);
    layersContainer.appendChild(item);
  });
}

function highlightLayer(el) {
  document.querySelectorAll(".layer-item").forEach((item) => {
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
const propHeading = document.getElementById("prop-heading");

// We use specific selectors to differentiate between the two color inputs
const [heightInput, widthInput] = document.querySelectorAll(".properties input[type='number']");
const [bgInput, textColorInput] = document.querySelectorAll(".properties input[type='color']");
const textInput = document.querySelector("#content input");

// Select the "Wrappers" (parents) so we can hide the whole row (Label + Input)
const bgWrapper = bgInput.closest(".pNames");         // Wrapper for Background Color
const textColorWrapper = textColorInput.closest(".pNames"); // Wrapper for Text Color
const textContentWrapper = document.getElementById("content"); // Wrapper for Text Content


//Main Update Function
function updatePropertiesPanel(el) {
  
  if (!el) {
    propHeading.textContent = "No element selected";
    
    // Clear values
    heightInput.value = "";
    widthInput.value = "";
    bgInput.value = "#ffffff";
    textColorInput.value = "#000000";
    textInput.value = "";
    
    // Hide property rows
    bgWrapper.style.display = "none";
    textColorWrapper.style.display = "none";
    textContentWrapper.style.display = "none";
    return;
  }

  
  
  // Get computed styles (handles CSS classes vs inline styles)
  const computed = window.getComputedStyle(el);

  // Common Values (Width/Height exist for everyone)
  widthInput.value = parseInt(el.style.width) || parseInt(computed.width);
  heightInput.value = parseInt(el.style.height) || parseInt(computed.height);

  // --- Toggle Inputs based on Type ---
  
  if (el.classList.contains("text")) {
      // === TEXT SELECTED ===
      propHeading.textContent = "Text Layer";
      
      bgWrapper.style.display = "none"; 
      textColorWrapper.style.display = "flex";
      textContentWrapper.style.display = "block"; // or flex depending on your CSS

      // Sync Values
      textColorInput.value = rgbToHex(el.style.color || computed.color);
      textInput.value = el.textContent;

  } else {
      // === SHAPE SELECTED (Rect, Circle) ===
      propHeading.textContent = el.classList.contains("circle") ? "Circle Layer" : "Rectangle Layer";
      
      
      bgWrapper.style.display = "flex";
      textColorWrapper.style.display = "none";
      textContentWrapper.style.display = "none";

      // Sync Values
      const bg = el.style.backgroundColor || computed.backgroundColor;
      bgInput.value = rgbToHex(bg);
  }
  
  // Special Case for LINE 
  if (el.dataset.type === "line") {
      propHeading.textContent = "Line Element";
      bgWrapper.style.display = "flex"; // We use BG color input to control line stroke color
      textColorWrapper.style.display = "none";
      textContentWrapper.style.display = "none";
      
      // Sync Line Color
      const bg = el.style.backgroundColor || computed.backgroundColor;
      bgInput.value = rgbToHex(bg);
  }
}


// 4. Event Listeners (Two-way Binding)

heightInput.addEventListener("input", () => {
  if (selectedElement) {
      selectedElement.style.height = heightInput.value + "px";
      saveLayout();
  }
});

widthInput.addEventListener("input", () => {
  if (selectedElement) {
      selectedElement.style.width = widthInput.value + "px";
      saveLayout();
  }
});

bgInput.addEventListener("input", () => {
  if (!selectedElement) return;
  // Apply background color
  selectedElement.style.backgroundColor = bgInput.value;
  saveLayout();
});

textColorInput.addEventListener("input", () => {
  if (!selectedElement) return;
  // Apply text color
  selectedElement.style.color = textColorInput.value;
  saveLayout();
});

textInput.addEventListener("input", () => {
  if (selectedElement && selectedElement.classList.contains("text")) {
    selectedElement.textContent = textInput.value;
    saveLayout();
  }
});

// Helper Function
function rgbToHex(rgb) {
  if (!rgb || rgb === "transparent") return "#ffffff";
  if (rgb.startsWith("#")) return rgb;
  
  const nums = rgb.match(/\d+/g);
  if (!nums) return "#000000";
  
  const r = parseInt(nums[0]).toString(16).padStart(2, "0");
  const g = parseInt(nums[1]).toString(16).padStart(2, "0");
  const b = parseInt(nums[2]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}
//=============6)Keyboard Interactions =============================

document.addEventListener("keydown", (e) => {
  if (!selectedElement) return;
  if (selectedElement.isContentEditable) {
      return;
    }
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
    Math.min(left, canvas.clientWidth - selectedElement.offsetWidth),
  );

  top = Math.max(
    0,
    Math.min(top, canvas.clientHeight - selectedElement.offsetHeight),
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
  layers = layers.filter((layer) => layer !== el);

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

  layout.forEach((data) => {
    elementCount++;

    const el = document.createElement("div");
    el.classList.add("canvas-element", data.type);
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
      transform: `rotate(${data.rotation}deg)`,
    });

    el.dataset.rotation = data.rotation;

    if (data.type === "text") {
      el.textContent = data.text || "";
      el.contentEditable = "plaintext-only";
      el.tabIndex = 0;

      // 1. Restore editing capability for loaded items
      el.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        el.contentEditable = "true";
        el.focus();
      });
      el.addEventListener("blur", () => {
        el.contentEditable = "false";
      });

      // 2. Add the sync listener
      el.addEventListener("input", () => {
        if (selectedElement === el) {
           const propInput = document.querySelector("#content input");
           if (propInput) propInput.value = el.textContent;
        }
      });
    
    }

    el.addEventListener("click", (e) => {
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
  const layout = layers.map((el) => ({
    id: el.id,
    type: [...el.classList].find((c) => c !== "canvas-element"),
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
      padding: el.style.padding,
    },
  }));

  const blob = new Blob([JSON.stringify(layout, null, 2)], {
    type: "application/json",
  });

  downloadFile(blob, "design.json");
}

function exportAsHTML() {
  const elementsHTML = layers
    .map((el) => {
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
    })
    .join("\n");

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
