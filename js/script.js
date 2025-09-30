(function(){
  const img = document.getElementById('mapImg');
  const mapLayer = document.getElementById('mapLayer');
  const viewer = document.getElementById('viewer');
  const zoomInBtn = document.getElementById('zoomIn');
  const zoomOutBtn = document.getElementById('zoomOut');
  const resetBtn = document.getElementById('reset');
  const sidebar = document.getElementById('sidebar');
  const openMenuBtn = document.getElementById('openMenu');
  const closeMenuBtn = document.getElementById('closeMenu');
  const markerAirport = document.getElementById('markerA');
  const markerBeach = document.getElementById('markerB');
  const gotoAirportBtn = document.getElementById('gotoAirport');
  const gotoBeachBtn = document.getElementById('gotoBeach');
  const markerChiliat = document.getElementById('markerC');
  const gotoMountChiliatBtn = document.getElementById('gotoMountChiliat');

  let natW = 0, natH = 0;
  let scale = 1;
  let minScale = 1;
  let maxScale = 3; // allow closer zoom when navigating to a location
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
    mapLayer.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  function easeInOutQuad(t){
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function clampTranslationFor(scaleValue, txValue, tyValue){
    const vw = viewer.clientWidth, vh = viewer.clientHeight;
    const sw = natW * scaleValue, sh = natH * scaleValue;
    let ntx = txValue, nty = tyValue;
    if (sw <= vw) ntx = (vw - sw) / 2; else ntx = clamp(txValue, vw - sw, 0);
    if (sh <= vh) nty = (vh - sh) / 2; else nty = clamp(tyValue, vh - sh, 0);
    return { tx: ntx, ty: nty };
  }

  function animateTo(targetScale, targetTx, targetTy, duration){
    const d = typeof duration === 'number' ? duration : 600;
    const startScale = scale;
    const startTx = tx;
    const startTy = ty;
    const t0 = performance.now();
    function step(tNow){
      const p = clamp((tNow - t0) / d, 0, 1);
      const e = easeInOutQuad(p);
      const s = startScale + (targetScale - startScale) * e;
      let nx = startTx + (targetTx - startTx) * e;
      let ny = startTy + (targetTy - startTy) * e;
      const cl = clampTranslationFor(s, nx, ny);
      scale = s; tx = cl.tx; ty = cl.ty;
      applyTransform();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
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

  function centerOnElement(el){
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const layerRect = mapLayer.getBoundingClientRect();
    const viewerRect = viewer.getBoundingClientRect();
    const offsetX = (rect.left + rect.width/2) - layerRect.left;
    const offsetY = (rect.top + rect.height/2) - layerRect.top;
    const targetX = viewerRect.left + viewerRect.width/2;
    const targetY = viewerRect.top + viewerRect.height/2;
    tx += (targetX - (layerRect.left + offsetX));
    ty += (targetY - (layerRect.top + offsetY));
    clampTranslation();
    applyTransform();
  }

  function goToElement(el, desiredScale){
    if (!el) return;
    const viewerRect = viewer.getBoundingClientRect();
    // Element center in unscaled map coordinates (absolute positioned in mapLayer)
    const cx = el.offsetLeft + el.offsetWidth / 2;
    const cy = el.offsetTop + el.offsetHeight / 2;
    const targetScale = clamp(
      desiredScale != null ? desiredScale : Math.min(maxScale, Math.max(minScale, 1.8)),
      minScale,
      maxScale
    );
    const viewerCenterX = viewerRect.width / 2;
    const viewerCenterY = viewerRect.height / 2;
    let targetTx = viewerCenterX - cx * targetScale;
    let targetTy = viewerCenterY - cy * targetScale;
    const cl = clampTranslationFor(targetScale, targetTx, targetTy);
    targetTx = cl.tx; targetTy = cl.ty;
    animateTo(targetScale, targetTx, targetTy, 600);
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
    // Ignore interactions that start over the sidebar area
    if (!sidebar.classList.contains('closed')) {
      const sbRect = sidebar.getBoundingClientRect();
      if (e.clientX <= sbRect.right) return;
    }
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

  // Sidebar toggle logic
  function openSidebar(){
    sidebar.classList.remove('closed');
    recalc();
  }
  function closeSidebar(){
    sidebar.classList.add('closed');
    recalc();
  }
  openMenuBtn.addEventListener('click', openSidebar);
  closeMenuBtn.addEventListener('click', closeSidebar);

  if (gotoAirportBtn) gotoAirportBtn.addEventListener('click', () => {
    closeSidebar();
    goToElement(markerAirport);
  });
  if (gotoBeachBtn) gotoBeachBtn.addEventListener('click', () => {
    closeSidebar();
    goToElement(markerBeach);
  });
  if (gotoMountChiliatBtn) gotoMountChiliatBtn.addEventListener('click', () => {
    closeSidebar();
    goToElement(markerChiliat);
  });

  img.addEventListener('load', () => { recalc();
    scale = minScale;   
    tx = -2000;
    ty = -3000;
    clampTranslation();
    applyTransform();
   });
  window.addEventListener('resize', () => { recalc(); });
  if (img.complete) setTimeout(recalc, 0);
  
})();
