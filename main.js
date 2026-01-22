
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
  selectedElement = null;
}

function selectElement(el) {
  if (selectedElement === el) return;

  clearSelection();
  selectedElement = el;
  el.classList.add("selected");
  addResizeHandles(el);
}

// deselect when clicking empty canvas
canvas.addEventListener("click", e => {
  if (e.target === canvas) {
    clearSelection();
  }
});

// ===== RESIZE HANDLES =====
function addResizeHandles(el) {
  const positions = ["nw", "ne", "sw", "se"];

  positions.forEach(pos => {
    const handle = document.createElement("div");
    handle.classList.add("resize-handle", pos);

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
    el.textContent = "Text";
    el.style.border = "1px dashed #666";
    el.style.backgroundColor = "transparent";
    el.style.color = "#111";
    el.style.fontSize = "18px";
    el.style.padding = "4px";
  }

  // click to select
  el.addEventListener("click", e => {
    e.stopPropagation();
    selectElement(el);
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
