// Track fingers independently: releasing one pointer must not release another.
export function bindTouchControls(held,isRunning){
  const buttons=[...document.querySelectorAll('[data-control]')],pointers=new Map();
  function update(){held.clear();for(const {button} of pointers.values())held.add(button.dataset.control);for(const button of buttons){const pressed=held.has(button.dataset.control);button.classList.toggle('pressed',pressed);button.setAttribute('aria-pressed',String(pressed));}}
  function release(event){const pointer=pointers.get(event.pointerId);pointers.delete(event.pointerId);if(pointer?.capture.hasPointerCapture(event.pointerId))pointer.capture.releasePointerCapture(event.pointerId);update();}
  const clear=()=>{for(const id of [...pointers.keys()])release({pointerId:id});};
  const clearTouch=()=>{for(const [id,p]of pointers)if(p.type==='touch')release({pointerId:id});};
  for(const button of buttons){
    button.addEventListener('pointerdown',event=>{if(!isRunning()||event.pointerType==='mouse'&&event.button!==0)return;event.preventDefault();if(event.pointerType==='touch'&&event.isPrimary)clearTouch();button.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{button,capture:button,type:event.pointerType});update();});
    button.addEventListener('pointermove',event=>{const pointer=pointers.get(event.pointerId);if(!pointer)return;if(event.buttons===0){release(event);return;}event.preventDefault();const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-control]');if(target&&target.parentElement===button.parentElement){pointer.button=target;update();}else release(event);});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,release);
    for(const name of ['contextmenu','selectstart','dragstart'])button.addEventListener(name,event=>event.preventDefault());
  }
  for(const name of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(name,release,true);
  // Native touch events recover from an interrupted/missing pointer release on phones.
  window.addEventListener('touchend',event=>{if(event.touches.length===0)clearTouch();},{capture:true,passive:true});window.addEventListener('touchcancel',clearTouch,{capture:true,passive:true});
  for(const name of ['blur','focus','pagehide'])window.addEventListener(name,clear);document.addEventListener('visibilitychange',clear);
  return {clear};
}
