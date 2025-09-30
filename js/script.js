(function(){
  const img = document.getElementById('mapImg');
  const viewer = document.getElementById('viewer');
  const zoomInBtn = document.getElementById('zoomIn');
  const zoomOutBtn = document.getElementById('zoomOut');
  const resetBtn = document.getElementById('reset');

  let natW = 0, natH = 0;
  let scale = 1;
  let minScale = 1;
  let maxScale = 1;
  let tx = -2000, ty = -4000;

  let dragging = false;
  let lastX = 0, lastY = 0;
  const pointers = new Map();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function computeMinScale(){
    const vw = viewer.clientWidth, vh = viewer.clientHeight;
    if (!natW || !natH) return 1;
    const sx = vw / natW;
    const sy = vh / natH;
    return Math.max(sx, sy);
  }

  function applyTransform(){
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  function clampTranslation(){
    const vw = viewer.clientWidth, vh = viewer.clientHeight;
    const sw = natW * scale, sh = natH * scale;

    if (sw <= vw) tx = (vw - sw) / 2;
    else tx = clamp(tx, vw - sw, 0);

    if (sh <= vh) ty = (vh - sh) / 2;
    else ty = clamp(ty, vh - sh, 0);
  }

  function recalc(){
    natW = img.naturalWidth || img.width;
    natH = img.naturalHeight || img.height;
    minScale = computeMinScale();
    if (scale < minScale) scale = minScale;
    scale = Math.max(minScale, Math.min(scale, maxScale));
    clampTranslation();
    applyTransform();
  }

  function zoomAt(clientX, clientY, newScale){
    const rect = viewer.getBoundingClientRect();
    const x = clientX - rect.left - tx;
    const y = clientY - rect.top - ty;
    const k = newScale / scale;
    tx = tx - (k - 1) * x;
    ty = ty - (k - 1) * y;
    scale = newScale;
    clampTranslation();
    applyTransform();
  }

  viewer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = Math.exp(-e.deltaY * 0.001);
    let newScale = scale * zoomFactor;
    newScale = clamp(newScale, minScale, maxScale);
    zoomAt(e.clientX, e.clientY, newScale);
  }, {passive:false});

  viewer.addEventListener('pointerdown', (e) => {
    viewer.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      viewer.style.cursor = 'grabbing'; // Change cursor to grabbing
    }
  });

  viewer.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1 && dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      tx += dx;
      ty += dy;
      clampTranslation();
      applyTransform();
    }
  });

  viewer.addEventListener('pointerup', (e) => {
    pointers.delete(e.pointerId);
    viewer.releasePointerCapture(e.pointerId);
    dragging = false;
    viewer.style.cursor = 'grab'; // Change cursor back to grab
  });

  // Set the initial cursor style
  viewer.style.cursor = 'grab';

  zoomInBtn.addEventListener('click', ()=>{
    const rect = viewer.getBoundingClientRect();
    const newScale = clamp(scale * 1.25, minScale, maxScale);
    zoomAt(rect.left + rect.width/2, rect.top + rect.height/2, newScale);
  });

  zoomOutBtn.addEventListener('click', ()=>{
    const rect = viewer.getBoundingClientRect();
    const newScale = clamp(scale / 1.25, minScale, maxScale);
    zoomAt(rect.left + rect.width/2, rect.top + rect.height/2, newScale);
  });

  resetBtn.addEventListener('click', ()=>{
    scale = minScale;
    tx = 0; ty = 0;
    clampTranslation();
    applyTransform();
  });

  img.addEventListener('load', () => { recalc();
    scale = minScale;   
    tx = -2000;
    ty = -3000;

   });
  window.addEventListener('resize', () => { recalc(); });
  if (img.complete) setTimeout(recalc, 0);

  const mapImg = document.getElementById('mapImg');
  let isDragging = false;
  let startX, startY;
  let translateX = 0, translateY = 0;

  // Add event listeners for dragging
  mapImg.addEventListener('mousedown', (event) => {
    isDragging = true;
    startX = event.clientX - translateX;
    startY = event.clientY - translateY;
    mapImg.style.cursor = 'grabbing'; // Change cursor to grabbing
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    mapImg.style.cursor = 'grab'; // Change cursor back to grab
  });

  window.addEventListener('mousemove', (event) => {
    if (!isDragging) return;

    translateX = event.clientX - startX;
    translateY = event.clientY - startY;

    // Apply the translation to the image
    mapImg.style.transform = `translate(${translateX}px, ${translateY}px)`;
  });

  // Set initial cursor style
  mapImg.style.cursor = 'grab';
})();
