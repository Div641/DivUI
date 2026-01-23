let elementCount = 0;
let selectedElement = null;
let layers = [];
const KEY_MOVE_STEP = 5;


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
  addRotationHandle(el);
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
  ["nw", "ne", "sw", "se"].forEach(pos => {
    const handle = document.createElement("div");
    handle.className = `resize-handle ${pos}`;
    handle.dataset.position = pos;

    // stop canvas deselect
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
}

let updateZIndices;
// ===== .box k <i> tag ko click karne par vo specific shape bann jaayega =====
document.querySelectorAll(".elem").forEach(tool => {
  tool.addEventListener("click", () => {
    const type = tool.getAttribute("alt"); // rectangle, text, circle, line
    createShape(type);
  });
});


// ===== PROPERTY PANEL =====
const [heightInput, widthInput, bgInput, textColorInput] =
  document.querySelectorAll(".properties input");

heightInput.addEventListener("input", () => {
  if (selectedElement)
    selectedElement.style.height = heightInput.value + "px";
});

widthInput.addEventListener("input", () => {
  if (selectedElement)
    selectedElement.style.width = widthInput.value + "px";
});

bgInput.addEventListener("input", () => {
  if (!selectedElement || selectedElement.classList.contains("line")) return;
  selectedElement.style.backgroundColor = bgInput.value;
  selectedElement.dataset.fill = bgInput.value;
});

textColorInput.addEventListener("input", () => {
  if (selectedElement)
    selectedElement.style.color = textColorInput.value;
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

  rotateHandle.addEventListener("mousedown", e => {
    e.stopPropagation();
    isRotating = true;

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;


      });
}


document.addEventListener("mousemove", e => {
  if (isDragging && selectedElement) {
    const canvasRect = canvas.getBoundingClientRect();
    let left = e.clientX - canvasRect.left - dragOffsetX;
    let top = e.clientY - canvasRect.top - dragOffsetY;

    left = Math.max(0, Math.min(left, canvas.clientWidth - selectedElement.offsetWidth));
    top = Math.max(0, Math.min(top, canvas.clientHeight - selectedElement.offsetHeight));

    selectedElement.style.left = left + "px";
    selectedElement.style.top = top + "px";
    updatePropertiesPanel(selectedElement);
  }

  if (isResizing && selectedElement) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

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
  layersContainer.innerHTML = "<h4>Layers</h4>";

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


// inputs (already present in HTML)
const propertiesPanel = document.querySelector(".properties");

// create text content input dynamically
const textContentWrapper = document.createElement("div");
textContentWrapper.className = "pNames";

const textLabel = document.createElement("h6");
textLabel.textContent = "Text";

const textInput = document.createElement("input");
textInput.type = "text";

textContentWrapper.append(textLabel, textInput);
propertiesPanel.appendChild(textContentWrapper);

// hide initially
textContentWrapper.style.display = "none";

// update panel based on selection
// function updatePropertiesPanel(el) {
//   if (!el) {
//     heightInput.value = "";
//     widthInput.value = "";
//     bgInput.value = "";
//     textInput.value = "";
//     textContentWrapper.style.display = "none";
//     return;
//   }

//   // width / height
//   widthInput.value = parseInt(el.style.width) || "";
//   heightInput.value = parseInt(el.style.height) || "";

//   // background color
//   const bg = el.style.backgroundColor;
//   bgInput.value =
//     bg && bg !== "transparent"
//       ? rgbToHex(bg)
//       : "#ffffff";

//   // text element handling
//   if (el.classList.contains("text")) {
//     textContentWrapper.style.display = "block";
//     textInput.value = el.textContent;
//   } else {
//     textContentWrapper.style.display = "none";
//   }
// }

// live text update
textInput.addEventListener("input", () => {
  if (selectedElement && selectedElement.classList.contains("text")) {
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

//=============Keyboard Interactions =============================


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
}
