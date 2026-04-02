import React, { useEffect, useState } from 'react';
import CommunicationsService from '../../services/communicationsService';

// Props:
// open: bool
// onClose: fn()
// context: { leadId?, propertyIds?, recommendation? }
// resolveLeadName(id) -> string
// resolvePropertyTitle(id) -> string
// onSuccess(result)
// modeDefault: 'immediate' | 'scheduled'

const fieldClass = 'w-full bg-slate-800/70 border border-slate-600/60 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';

export default function WhatsAppSendModal({ open, onClose, context = {}, resolveLeadName, resolvePropertyTitle, onSuccess, modeDefault = 'immediate' }) {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('default');
  const [customMessage, setCustomMessage] = useState('');
  const [includeImages, setIncludeImages] = useState(true);
  const [mode, setMode] = useState(modeDefault); // immediate | scheduled
  const [runAt, setRunAt] = useState('');
  const [preview, setPreview] = useState('');
  const [creatingLink, setCreatingLink] = useState(false);
  const [trackingLink, setTrackingLink] = useState('');

  const leadId = context.leadId || context.recommendation?.leadId;
  const propertyIds = context.propertyIds || (context.recommendation ? [context.recommendation.propertyId] : []);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const t = await CommunicationsService.getWhatsAppTemplates();
        setTemplates(t);
      } catch (e) {
        console.error('Erro carregando templates', e);
      }
    })();
  }, [open]);

  useEffect(() => {
    // Atualiza preview
    const template = templates.find(t => t.id === templateId);
    const base = customMessage.trim() ? customMessage : (template?.body || '');
    let msg = base;
    const propTitle = propertyIds.length === 1 ? (resolvePropertyTitle?.(propertyIds[0]) || 'Imóvel') : `${propertyIds.length} imóveis selecionados`;
    msg = msg.replace(/\{leadPrimeiroNome\}/g, (resolveLeadName?.(leadId) || '')); // simplista
    msg = msg.replace(/\{propertyTitulo\}/g, propTitle);
    // Placeholders adicionais podem ser adicionados aqui
    if (trackingLink) msg = msg.replace(/\{trackingLink\}/g, trackingLink);
    setPreview(msg);
  }, [templates, templateId, customMessage, trackingLink, propertyIds, leadId, resolveLeadName, resolvePropertyTitle]);

  if (!open) return null;

  const disabled = loading || creatingLink;

  const handleCreateTracking = async () => {
    if (!propertyIds?.length) return;
    try {
      setCreatingLink(true);
      const link = await CommunicationsService.createTrackingLink({ propertyId: propertyIds[0], leadId, channel: 'whatsapp', origin: context.recommendation ? 'recommendation' : 'manual' });
      setTrackingLink(link.shortUrl);
    } catch (e) {
      console.error('Erro criando link', e);
    } finally {
      setCreatingLink(false);
    }
  };

  const handleSubmit = async () => {
    if (!leadId || !propertyIds.length) return;
    setLoading(true);
    try {
      const payload = {
        leadId,
        propertyIds,
        templateId,
        message: preview,
        includeImages,
        trackingLink: trackingLink || undefined,
      };
      let result;
      if (mode === 'immediate') {
        result = await CommunicationsService.sendWhatsApp(payload);
      } else {
        result = await CommunicationsService.scheduleWhatsApp({ ...payload, runAt });
      }
      onSuccess?.(result);
      onClose?.();
    } catch (e) {
      console.error('Erro envio WhatsApp', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !disabled && onClose?.()}></div>
      <div className="relative w-full max-w-2xl bg-slate-850 bg-slate-800/90 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5 overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">Enviar via WhatsApp {mode === 'scheduled' && <span className="text-xs font-medium px-2 py-0.5 bg-indigo-600/40 rounded-full text-indigo-200">Agendado</span>}</h2>
            <p className="text-slate-400 text-sm">Lead: <span className="text-slate-200 font-medium">{resolveLeadName?.(leadId) || leadId || '—'}</span></p>
          </div>
          <button disabled={disabled} onClick={onClose} className="text-slate-400 hover:text-slate-200 transition disabled:opacity-40">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4 md:col-span-2">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Template</label>
              <select disabled={disabled} value={templateId} onChange={e=>setTemplateId(e.target.value)} className={fieldClass}>
                {templates.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Mensagem Personalizada (opcional)</label>
              <textarea disabled={disabled} rows={4} value={customMessage} onChange={e=>setCustomMessage(e.target.value)} className={fieldClass} placeholder="Sobrepõe o texto do template se preenchido..." />
              <p className="text-[10px] text-slate-500 mt-1">Placeholders suportados: {'{leadPrimeiroNome} {propertyTitulo} {trackingLink}'}</p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer select-none">
                <input type="checkbox" disabled={disabled} checked={includeImages} onChange={e=>setIncludeImages(e.target.checked)} />
                Incluir imagens
              </label>
              <div className="flex items-center gap-2">
                <button disabled={creatingLink || disabled} onClick={handleCreateTracking} className="px-3 py-1.5 text-xs rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-40">
                  {creatingLink ? 'Gerando...' : (trackingLink ? 'Recriar Link' : 'Gerar Link')}
                </button>
                {trackingLink && <span className="text-[11px] text-indigo-300 font-mono truncate max-w-[140px]" title={trackingLink}>{trackingLink}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">Modo:</span>
                <button onClick={()=>setMode('immediate')} disabled={disabled} className={`px-3 py-1.5 text-xs rounded-md border ${mode==='immediate'?'bg-indigo-600/60 border-indigo-400 text-white':'border-slate-600 text-slate-300 hover:border-slate-500'}`}>Imediato</button>
                <button onClick={()=>setMode('scheduled')} disabled={disabled} className={`px-3 py-1.5 text-xs rounded-md border ${mode==='scheduled'?'bg-indigo-600/60 border-indigo-400 text-white':'border-slate-600 text-slate-300 hover:border-slate-500'}`}>Agendar</button>
              </div>
              {mode==='scheduled' && (
                <input type="datetime-local" value={runAt} onChange={e=>setRunAt(e.target.value)} disabled={disabled} className={fieldClass + ' max-w-xs'} />
              )}
            </div>
          </div>
          <div className="space-y-3 md:col-span-1">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Pré-visualização</label>
              <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-3 h-60 overflow-auto text-sm text-slate-200 whitespace-pre-wrap">
                {preview || 'Pré-visualização...'}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Propriedades</label>
              <ul className="text-xs text-slate-300 space-y-1 max-h-28 overflow-auto pr-1">
                {propertyIds.map(pid => <li key={pid}>• {resolvePropertyTitle?.(pid) || pid}</li>)}
                {propertyIds.length===0 && <li className="italic text-slate-500">Nenhuma</li>}
              </ul>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
          <span className="text-[11px] text-slate-500">Esta é uma versão inicial (stub). O envio real será implementado via endpoints /communications.</span>
          <div className="flex gap-3">
            <button disabled={disabled} onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-40">Cancelar</button>
            <button disabled={disabled || (mode==='scheduled' && !runAt)} onClick={handleSubmit} className="px-5 py-2 text-sm font-medium rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white disabled:opacity-40">
              {loading ? 'Enviando...' : (mode==='immediate' ? 'Enviar Agora' : 'Agendar Envio')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
