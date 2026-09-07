export function createSignaturePad(canvas, onChange = () => {}) {
  const context = canvas.getContext("2d");
  let drawing = false;
  let signed = false;

  function resize() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    const previous = signed ? canvas.toDataURL() : null;
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);
    context.scale(ratio, ratio);
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#123e2d";
    if (previous) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
      image.src = previous;
    }
  }

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event) {
    drawing = true;
    const position = point(event);
    context.beginPath();
    context.moveTo(position.x, position.y);
    canvas.setPointerCapture?.(event.pointerId);
  }

  function move(event) {
    if (!drawing) return;
    event.preventDefault();
    const position = point(event);
    context.lineTo(position.x, position.y);
    context.stroke();
    signed = true;
    onChange(signed);
  }

  function stop() {
    drawing = false;
    context.closePath();
  }

  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
  resize();

  return {
    clear() {
      context.clearRect(0, 0, canvas.width, canvas.height);
      signed = false;
      onChange(false);
    },
    hasSignature: () => signed,
    value: () => signed ? canvas.toDataURL("image/png") : "",
    resize
  };
}
