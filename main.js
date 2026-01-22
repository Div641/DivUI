
let elementCount = 0;
let selectedElement = null;

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
}

function selectElement(el) {
  if (selectedElement === el) return;

  clearSelection();
  selectedElement = el;
  el.classList.add("selected");
  addResizeHandles(el);
  addRotationHandle(el);
}

function removeRotationHandle(el) {
  const handle = el.querySelector(".rotate-handle");
  if (handle) handle.remove();
}


// deselect when clicking empty canvas
canvas.addEventListener("click", e => {
  if (e.target === canvas) {
    clearSelection();
  }
});

// ===== Resizing =====
function addResizeHandles(el) {
  const positions = ["nw", "ne", "sw", "se"];

  positions.forEach(pos => {
    const handle = document.createElement("div");
    handle.classList.add("resize-handle", pos);
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

  el.style.position = "absolute";
  el.style.left = DEFAULTS.x + elementCount * 10 + "px";
  el.style.top = DEFAULTS.y + elementCount * 10 + "px";
  el.style.width = DEFAULTS.width + "px";
  el.style.height = DEFAULTS.height + "px";

  el.style.backgroundColor = "transparent";
  el.style.border = `2px solid ${DEFAULTS.border}`;
  el.style.boxSizing = "border-box";
  el.style.cursor = "pointer";

  // save state
  el.dataset.fill = "transparent";
  el.dataset.border = DEFAULTS.border;

  // type-specific styles
  if (type === "circle") {
    el.style.borderRadius = "50%";
  }

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

    el.style.border = "1px dashed #666";
    el.style.backgroundColor = "transparent";
    el.style.color = "#111";
    el.style.fontSize = "18px";
    el.style.padding = "4px";
    el.style.cursor = "text";
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
  selectElement(el);
}

// ===== .box k <i> tag ko click karne par vo specific shape bann jaayega =====
document.querySelectorAll(".elem").forEach(tool => {
  tool.addEventListener("click", () => {
    const type = tool.getAttribute("alt"); // rectangle, text, circle, line
    createShape(type);
  });
});

// ===== PROPERTY PANEL =====
const propInputs = document.querySelectorAll(".properties input");

const [heightInput, widthInput, bgInput, textColorInput] = propInputs;

heightInput.addEventListener("input", () => {
  if (!selectedElement) return;
  selectedElement.style.height = heightInput.value + "px";
});

widthInput.addEventListener("input", () => {
  if (!selectedElement) return;
  selectedElement.style.width = widthInput.value + "px";
});

bgInput.addEventListener("input", () => {
  if (!selectedElement) return;
  if (selectedElement.classList.contains("line")) return;

  selectedElement.style.backgroundColor = bgInput.value;
  selectedElement.dataset.fill = bgInput.value;
});

textColorInput.addEventListener("input", () => {
  if (!selectedElement) return;
  selectedElement.style.color = textColorInput.value;
});

//=====3) Dragging ,Resizing and Rotating=====

// ================= DRAGGING =================
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

canvas.addEventListener("mousedown", e => {
  if (!selectedElement) return;

  // allow typing inside text jo ab dragging se override nhi hoga
  if (
    selectedElement.classList.contains("text") &&
    e.target === selectedElement
  ) {
    selectedElement.focus();
    return;
  }

  if (e.target.classList.contains("resize-handle")) return;

  if (e.target === selectedElement) {
    isDragging = true;

    const rect = selectedElement.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    e.preventDefault();
  }
});


document.addEventListener("mousemove", e => {
  if (!isDragging || !selectedElement) return;

  const canvasRect = canvas.getBoundingClientRect();

  let newLeft = e.clientX - canvasRect.left - dragOffsetX;
  let newTop = e.clientY - canvasRect.top - dragOffsetY;

  // boundary constraint
  newLeft = Math.max(0, Math.min(newLeft, canvas.clientWidth - selectedElement.offsetWidth));
  newTop = Math.max(0, Math.min(newTop, canvas.clientHeight - selectedElement.offsetHeight));

  selectedElement.style.left = newLeft + "px";
  selectedElement.style.top = newTop + "px";
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});


// ================= RESIZING =================
let isResizing = false;
let resizeHandle = null;
let startX, startY, startWidth, startHeight, startLeft, startTop;
const MIN_SIZE = 20;

canvas.addEventListener("mousedown", e => {
  if (!e.target.classList.contains("resize-handle")) return;

  isResizing = true;
  resizeHandle = e.target.dataset.position;
  startX = e.clientX;
  startY = e.clientY;

  startWidth = selectedElement.offsetWidth;
  startHeight = selectedElement.offsetHeight;
  startLeft = selectedElement.offsetLeft;
  startTop = selectedElement.offsetTop;

  e.stopPropagation();
});

document.addEventListener("mousemove", e => {
  if (!isResizing || !selectedElement) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  if (resizeHandle === "se") {
    selectedElement.style.width = Math.max(MIN_SIZE, startWidth + dx) + "px";
    selectedElement.style.height = Math.max(MIN_SIZE, startHeight + dy) + "px";
  }

  if (resizeHandle === "sw") {
    selectedElement.style.width = Math.max(MIN_SIZE, startWidth - dx) + "px";
    selectedElement.style.height = Math.max(MIN_SIZE, startHeight + dy) + "px";
    selectedElement.style.left = startLeft + dx + "px";
  }

  if (resizeHandle === "ne") {
    selectedElement.style.width = Math.max(MIN_SIZE, startWidth + dx) + "px";
    selectedElement.style.height = Math.max(MIN_SIZE, startHeight - dy) + "px";
    selectedElement.style.top = startTop + dy + "px";
  }

  if (resizeHandle === "nw") {
    selectedElement.style.width = Math.max(MIN_SIZE, startWidth - dx) + "px";
    selectedElement.style.height = Math.max(MIN_SIZE, startHeight - dy) + "px";
    selectedElement.style.left = startLeft + dx + "px";
    selectedElement.style.top = startTop + dy + "px";
  }
});

document.addEventListener("mouseup", () => {
  isResizing = false;
  resizeHandle = null;
});


// ================= ROTATION =================
let isRotating = false;
let startAngle = 0;

function addRotationHandle(el) {
  const rotateHandle = document.createElement("div");
  rotateHandle.classList.add("rotate-handle");
  el.appendChild(rotateHandle);

  rotateHandle.addEventListener("mousedown", e => {
    e.stopPropagation();
    isRotating = true;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    startAngle = Math.atan2(dy, dx) * (180 / Math.PI);
  });
}

document.addEventListener("mousemove", e => {
  if (!isRotating || !selectedElement) return;

  const rect = selectedElement.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const dx = e.clientX - centerX;
  const dy = e.clientY - centerY;

  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const rotation = angle - startAngle;

  selectedElement.dataset.rotation =
    (parseFloat(selectedElement.dataset.rotation) || 0) + rotation;

  selectedElement.style.transform =
    `rotate(${selectedElement.dataset.rotation}deg)`;

  startAngle = angle;
});

document.addEventListener("mouseup", () => {
  isRotating = false;
});


// ================= TEXT EDITING SUPPORT =================

//canvas ka mousedown listener property panel se ho jayega
// text color ka kaam property panel kar raha hai already


// OPTIONAL: font size via keyboard (Ctrl + / Ctrl -)
document.addEventListener("keydown", e => {
  if (!selectedElement) return;
  if (!selectedElement.classList.contains("text")) return;

  const currentSize = parseInt(
    window.getComputedStyle(selectedElement).fontSize
  );

  if (e.ctrlKey && e.key === "+") {
    selectedElement.style.fontSize = currentSize + 2 + "px";
  }

  if (e.ctrlKey && e.key === "-") {
    selectedElement.style.fontSize = Math.max(8, currentSize - 2) + "px";
  }
});
