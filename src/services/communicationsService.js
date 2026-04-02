// Stub de serviço para comunicação (WhatsApp, e futuramente Email/SMS)
// Endpoints propostos (definir depois no backend PHP):
// POST /api/communications/send
//   Body: {
//     channel: 'whatsapp',
//     mode: 'immediate',
//     leadId, propertyIds: [id], templateId, message, includeImages, imageIds?, trackingLink?, metadata?
//   }
//   Retorno esperado: { id, status: 'queued'|'sent', channel, createdAt, trackingLink }
// POST /api/communications/schedule
//   Body: {
//     channel: 'whatsapp',
//     mode: 'scheduled',
//     runAt: '2025-09-21T14:30:00Z',
//     leadId, propertyIds, templateId, message, includeImages, imageIds?, trackingLink?, metadata?
//   }
//   Retorno esperado: { id, status: 'scheduled', runAt, channel }
// GET /api/communications/templates?channel=whatsapp -> lista templates disponíveis
// POST /api/tracking-links { propertyId, leadId?, channel, origin: 'recommendation'|'manual' }
//   Retorno: { id, shortUrl, fullUrl }

// (Sem import de notify direto: NotificationContext não exporta função nomeada.)
// Futuro: permitir injeção de callback externa via setter CommunicationsService.setNotifier(fn)
let _notifier = null;
export const setCommunicationsNotifier = (fn) => { _notifier = typeof fn === 'function' ? fn : null; };

const delay = (ms) => new Promise(res => setTimeout(res, ms));

export const CommunicationsService = {
  async sendWhatsApp({ leadId, propertyIds, templateId, message, includeImages = true, imageIds = [], trackingLink, metadata = {} }) {
    // Simulação temporária
    await delay(600);
    const fakeId = 'comm_'+Date.now();
  _notifier ? _notifier({ type:'success', message:'Mensagem WhatsApp enviada (stub)' }) : console.log('[COMMUNICATIONS] WhatsApp enviado (stub)');
    return {
      id: fakeId,
      status: 'queued',
      channel: 'whatsapp',
      sentAt: new Date().toISOString(),
      trackingLink: trackingLink || 'https://exemplo.link/xyz'
    };
  },
  async scheduleWhatsApp({ leadId, propertyIds, templateId, message, runAt, includeImages = true, imageIds = [], trackingLink, metadata = {} }) {
    await delay(600);
    const fakeId = 'sched_'+Date.now();
  _notifier ? _notifier({ type:'info', message:'Envio WhatsApp agendado (stub)' }) : console.log('[COMMUNICATIONS] WhatsApp agendado (stub)');
    return {
      id: fakeId,
      status: 'scheduled',
      channel: 'whatsapp',
      runAt,
      trackingLink: trackingLink || 'https://exemplo.link/xyz'
    };
  },
  async getWhatsAppTemplates() {
    await delay(300);
    return [
      { id: 'default', name: 'Padrão', body: 'Olá {leadPrimeiroNome}! Separei este imóvel: {propertyTitulo} - {propertyPrecoFmt}. Veja: {trackingLink}' },
      { id: 'curto', name: 'Curto', body: '{leadPrimeiroNome}, olha esse: {propertyTitulo} ({propertyPrecoFmt}) {trackingLink}' },
    ];
  },
  // Placeholder para tracking link
  async createTrackingLink({ propertyId, leadId, channel = 'whatsapp', origin = 'manual' }) {
    await delay(200);
    return {
      id: 'trk_'+Date.now(),
      shortUrl: 'https://p.ex/trk'+Math.floor(Math.random()*999),
      fullUrl: 'https://app.exemplo.com/p/'+propertyId+'?c='+channel+'&o='+origin+(leadId?('&l='+leadId):'')
    };
  }
};

export default CommunicationsService;
