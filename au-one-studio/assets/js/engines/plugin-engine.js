/* AU ONE STUDIO · plugin-engine.js
   Plugin registry (Factory + Command pattern). Future ERP modules — Construction,
   Finance, HR, QAQC, Procurement — register themselves here and contribute forms,
   templates, dashboards, workflow presets and automations WITHOUT touching core.

   A plugin is a plain object:
     Plugins.register({
       id:'construction', name:'Construction', icon:'hard-hat',
       async install(ctx){ ctx.addTemplate({...}); ctx.on('request:approved', fn); }
     });
   ctx exposes the engines a plugin is allowed to use — a small dependency-injection
   surface so plugins never reach into internals directly. */

const Plugins = {
  list: [],
  register(plugin) {
    if (!plugin || !plugin.id) return;
    if (this.list.some(p => p.id === plugin.id)) return;
    this.list.push(plugin);
    Bus.emit('plugin:registered', plugin);
  },
  /* installation context — the only API a plugin may use (dependency injection) */
  _ctx() {
    return {
      Store, FieldTypes, Bus,
      on: (e, f) => Bus.on(e, f),
      async addTemplate(form) { form.isTemplate = true; form.status = 'published';
        form.id = form.id || (uid('form')); await Store.upsert('forms', form); },
      registerFieldType(key, def) { if (!FieldTypes[key]) FieldTypes[key] = def; }
    };
  },
  async bootAll() {
    const ctx = this._ctx();
    for (const p of this.list) {
      try { if (p.install) await p.install(ctx); Bus.emit('plugin:installed', p); }
      catch (e) { console.warn('[Plugins] install failed:', p.id, e); }
    }
  }
};
window.Plugins = Plugins;
