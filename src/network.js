const origin=(import.meta.env.VITE_API_URL||'').replace(/\/$/,'');
let token=null;
export const api={
  async request(path,{method='GET',body}={}){
    let response;try{response=await fetch(`${origin}/api${path}`,{method,credentials:'include',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});}catch{throw new Error('Онлайн-сервер недоступен. Тренировка работает без него.');}
    const data=await response.json().catch(()=>({error:'Сервер вернул некорректный ответ.'}));if(!response.ok)throw new Error(data.error||'Ошибка запроса.');return data;
  },
  async auth(action,nickname,password){const result=await this.request(`/auth/${action}`,{method:'POST',body:{nickname,password}});token=result.token;return result.user;},
  async logout(){await this.request('/auth/logout',{method:'POST',body:{}});token=null;},
  async connect(room,bike,onMessage,onClose,weather='clear',options={}){
    const {ticket}=await this.request('/ws-ticket',{method:'POST',body:{}});
    const base=new URL(origin||location.origin);base.protocol=base.protocol==='https:'?'wss:':'ws:';base.pathname='/ws';base.search=`ticket=${encodeURIComponent(ticket)}`;
    return new Promise((resolve,reject)=>{
      const ws=new WebSocket(base),timer=setTimeout(()=>{ws.close();reject(new Error('Не удалось подключиться к комнате.'));},8000);let joined=false;
      ws.onopen=()=>ws.send(JSON.stringify({type:'join',room,bike,weather,...options}));
      ws.onmessage=e=>{let msg;try{msg=JSON.parse(e.data);}catch{return;}if(msg.type==='error'){clearTimeout(timer);reject(new Error(msg.error));ws.close();return;}if(msg.type==='joined'){joined=true;clearTimeout(timer);resolve({ws,message:msg});}else onMessage(msg);};
      ws.onerror=()=>{clearTimeout(timer);if(!joined)reject(new Error('Игровой сервер недоступен.'));};
      ws.onclose=e=>{clearTimeout(timer);if(joined)onClose(e);else reject(new Error('Подключение к комнате закрыто.'));};
    });
  }
};
