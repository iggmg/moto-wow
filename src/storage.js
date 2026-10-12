// Browsers may deny storage or exhaust its quota. Gameplay keeps working;
// device-only preferences/records fall back to this tab, never auth secrets.
const memory=new Map();let available=true;
export const safeStorage={
 get available(){return available;},
 getItem(key){if(!available&&memory.has(key))return memory.get(key);try{return globalThis.localStorage.getItem(key)??memory.get(key)??null;}catch{available=false;return memory.get(key)??null;}},
 setItem(key,value){const text=String(value);memory.set(key,text);try{globalThis.localStorage.setItem(key,text);}catch{available=false;}},
 removeItem(key){memory.delete(key);try{globalThis.localStorage.removeItem(key);}catch{available=false;}}
};
