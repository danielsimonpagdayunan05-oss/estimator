/* AU ONE STUDIO · notification-engine.js
   In-app notifications
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   8 · NOTIFICATION ENGINE
   ========================================================================== */
const Notify = {
  async push(userId,text,requestId){
    await Store.upsert('notifications',{id:uid('n'),userId,text,requestId,read:false,at:Date.now()});
  },
  async mine(){return (await Store.list('notifications')).filter(n=>n.userId===APP.user.id).sort((a,b)=>b.at-a.at);},
  async unread(){return (await this.mine()).filter(n=>!n.read).length;},
  async markAll(){const all=await Store.list('notifications');
    all.forEach(n=>{if(n.userId===APP.user.id)n.read=true;});await Store.bulk('notifications',all);}
};
