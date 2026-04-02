/**
 * recommendationEngine
 * Gera recomendações simples lead -> imóvel usando regras heurísticas.
 * Critérios básicos:
 * - Matching por tipo (propertyTypePreference / interest vs property.type)
 * - Matching por faixa de preço (budget, budgetMin/Max)
 * - Bonus se mesma cidade (lead.location === property.city)
 * - Score composto e ordenação desc.
 * Retorna até `max` recomendações: { leadId, propertyId, reason, score }
 */
export function generateRecommendations({ leads = [], properties = [], max = 15 }) {
  if (!Array.isArray(leads) || !Array.isArray(properties)) return [];
  const recs = [];
  for (const lead of leads) {
    if (!lead || !lead.id) continue;
    const preferredType = (lead.propertyTypePreference || lead.interest || '').toString().toLowerCase();
    const budgetMin = Number(lead.budgetMin || lead.budget_min || lead.budgetFrom || 0) || null;
    const budgetMax = Number(lead.budgetMax || lead.budget_max || lead.budgetTo || lead.budget || 0) || null;
    for (const prop of properties) {
      if (!prop || !prop.id) continue;
      let score = 0;
      let reasons = [];
      const type = (prop.type || '').toString().toLowerCase();
      if (preferredType && type && preferredType === type) { score += 30; reasons.push('Tipo compatível'); }
      const price = Number(prop.price || prop.valor || 0) || null;
      if (price) {
        if (budgetMin && price < budgetMin * 0.85) { score -= 5; reasons.push('Abaixo do orçamento'); }
        if (budgetMax && price > budgetMax * 1.15) { score -= 10; reasons.push('Acima do orçamento'); }
        if (budgetMax && price <= budgetMax && (!budgetMin || price >= budgetMin)) { score += 25; reasons.push('Dentro da faixa de preço'); }
      }
      if (lead.location && prop.city && lead.location.toLowerCase() === prop.city.toLowerCase()) { score += 20; reasons.push('Mesma cidade'); }
      if ((lead.score || 0) >= 80) score += 5; // leve peso para leads quentes
      if (prop.highlightScore) score += Number(prop.highlightScore) * 0.5;
      if (score <= 0) continue; // filtra recomendações não relevantes
      recs.push({
        leadId: lead.id,
        propertyId: prop.id,
        reason: reasons.join(' · '),
        score: Math.round(score),
      });
    }
  }
  return recs.sort((a,b)=> b.score - a.score).slice(0, max);
}
