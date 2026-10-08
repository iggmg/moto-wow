// Track fingers independently: releasing one pointer must not release another.
export function bindTouchControls(held,isRunning){
  const buttons=[...document.querySelectorAll('[data-control]')],pointers=new Map();
  function update(){held.clear();for(const button of pointers.values())held.add(button.dataset.control);for(const button of buttons){const pressed=held.has(button.dataset.control);button.classList.toggle('pressed',pressed);button.setAttribute('aria-pressed',String(pressed));}}
  function release(event){pointers.delete(event.pointerId);update();}
  const clear=()=>{pointers.clear();update();};
  for(const button of buttons){
    button.addEventListener('pointerdown',event=>{if(!isRunning()||event.pointerType==='mouse'&&event.button!==0)return;event.preventDefault();button.setPointerCapture(event.pointerId);pointers.set(event.pointerId,button);update();});
    button.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;event.preventDefault();const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-control]');if(target&&target.parentElement===button.parentElement){pointers.set(event.pointerId,target);update();}});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,release);
    for(const name of ['contextmenu','selectstart','dragstart'])button.addEventListener(name,event=>event.preventDefault());
  }
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  return {clear};
}
