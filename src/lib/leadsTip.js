import { differenceInDays } from "date-fns";
import { computeStatusFromScoreDetails } from "@/lib/leadUtils";

/**
 * Gera ações recomendadas para uma lista de leads.
 *
 * Contrato:
 * - input: Array de leads (cada lead pode ter: id, name, score, status, lastContact, budget, preferences, history[])
 * - output: Array de ações { leadId, leadName, type, priority, category, description, score, status, daysSinceContact }
 *
 * Regras:
 * - Categoriza por score: Quente (>=85), Morno (65–84), Frio (<65)
 * - Considera dias sem contato
 * - Evita sugerir ações já presentes no histórico
 * - Usa budget/preferências quando disponível
 * - Ordena por prioridade e score
 * - Limita resultados por `max`
 */
export function generateNextActionsForLeads(leads = [], options = {}) {
  const { max = 6, now = new Date() } = options;
  if (!Array.isArray(leads)) return [];

  const allActions = leads
    .map((lead) => {
      if (!lead || lead.status === "Fechamento" || lead.status === "Perdido")
        return null;

      // Mapeamento de status para lógica de dicas
      let mappedStatus = lead.status;
      if (mappedStatus === "Novo") mappedStatus = "FRIO";
      if (mappedStatus === "Contato Inicial") mappedStatus = "FRIO";
      if (mappedStatus === "Visita Agendada") mappedStatus = "MORNO";

      const score = Number(lead.score ?? 0) || 0;
      const daysSinceContact = lead.lastContact
        ? differenceInDays(now, new Date(lead.lastContact))
        : null;
      const historyTypes = lead.history?.map((h) => h.type) || [];
      const historyDoneTypes =
        lead.history
          ?.filter((h) => h.done || h.completed)
          ?.map((h) => h.type) || [];
      const possibleActions = [];

      // Alerta de score baixando e sem contato
      if (Array.isArray(lead.scoreHistory) && lead.scoreHistory.length > 1) {
        const lastScore = lead.scoreHistory[lead.scoreHistory.length - 1];
        const prevScore = lead.scoreHistory[lead.scoreHistory.length - 2];
        if (
          lastScore < prevScore &&
          daysSinceContact !== null &&
          daysSinceContact > 7
        ) {
          possibleActions.push({
            leadId: lead.id,
            leadName: lead.name,
            type: "alerta_score_baixando",
            category: "Alerta",
            priority: 0,
            description: `Atenção: o score do lead está baixando e não há contato há ${daysSinceContact} dias. Reaja rapidamente para evitar perda de interesse!`,
            score: score,
            status: lead.status,
            daysSinceContact: daysSinceContact,
          });
        }
      }

      // Dicas para FRIO sem dados
      if (
        mappedStatus === "FRIO" &&
        (!lead.location || !lead.budget || !lead.interest) &&
        !historyDoneTypes.includes("nutricao")
      ) {
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "nutricao",
          category: "Nutrição",
          priority: 1,
          description:
            "Envie uma mensagem perguntando sobre as preferências de localização.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "confirmar_dados",
          category: "Relacionamento",
          priority: 2,
          description:
            "Entre em contato para confirmar a localização desejada, orçamento disponível e tipo de imóvel de interesse.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "objetivo",
          category: "Relacionamento",
          priority: 3,
          description:
            "Pergunte de forma aberta sobre os objetivos do lead: por que está buscando um imóvel neste momento?",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "sondagem_orcamento",
          category: "Nutrição",
          priority: 4,
          description:
            "Sugira imóveis genéricos com ampla faixa de preço para sondar o orçamento.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "conversa_rapida",
          category: "Relacionamento",
          priority: 5,
          description:
            "Convide o lead para uma conversa rápida por telefone ou WhatsApp para entender suas necessidades.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "personalizar_material",
          category: "Nutrição",
          priority: 6,
          description:
            "Verifique se já foi enviado algum material e personalize a abordagem para evitar repetição.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
      }

      // Dicas para FRIO com dados
      if (
        mappedStatus === "FRIO" &&
        (lead.location || lead.budget || lead.interest) &&
        !historyDoneTypes.includes("personalizada")
      ) {
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "whatsapp_dados",
          category: "Relacionamento",
          priority: 1,
          description:
            "Envie uma lista personalizada de imóveis que correspondam à localização, orçamento ou interesse informado.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "whatsapp_dados",
          category: "Relacionamento",
          priority: 2,
          description:
            "Entre em contato via WhatsApp com uma mensagem curta, referenciando os dados fornecidos, e pergunte sobre preferências adicionais.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "email_similares",
          category: "Nutrição",
          priority: 3,
          description:
            "Envie um e-mail com imóveis semelhantes aos critérios do lead, destacando diferenciais como preço ou características.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "proximos_passos",
          category: "Relacionamento",
          priority: 4,
          description:
            "Pergunte diretamente sobre os próximos passos do lead, como “Você prefere agendar uma visita ou receber mais opções?”.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "comparativo",
          category: "Nutrição",
          priority: 5,
          description:
            "Ofereça um comparativo de imóveis dentro do orçamento informado para ajudar na decisão.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
      }

      // Dicas para MORNO com imóvel de interesse
      if (
        mappedStatus === "MORNO" &&
        lead.interest &&
        !historyDoneTypes.includes("morno_interesse")
      ) {
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "agendar_visita",
          category: "Relacionamento",
          priority: 1,
          description: "Agende uma visita ao imóvel.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "enviar_fotos_videos",
          category: "Nutrição",
          priority: 2,
          description: "Enviar fotos e vídeos do imóvel.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "reforcar_diferenciais",
          category: "Relacionamento",
          priority: 3,
          description:
            "Reforçar diferenciais do imóvel (infraestrutura, localização, segurança, lazer, etc.).",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "simulacao_financiamento",
          category: "Negociação",
          priority: 4,
          description:
            "Ofereça uma simulação de financiamento: Envie uma proposta personalizada com base no orçamento do lead, detalhando opções de pagamento para o imóvel.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "conversa_direta",
          category: "Relacionamento",
          priority: 5,
          description:
            "Proponha uma conversa direta: Convide o lead para um bate-papo (telefone ou videochamada) para discutir detalhes do imóvel e tirar dúvidas.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "info_entorno",
          category: "Nutrição",
          priority: 6,
          description:
            "Envie informações sobre o entorno: Forneça dados sobre a vizinhança, como escolas, comércios, transporte ou valorização da região.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "urgencia_exclusividade",
          category: "Relacionamento",
          priority: 7,
          description:
            "Crie urgência com exclusividade: Informe sobre a alta procura pelo imóvel ou condições especiais temporárias.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
      }

      // Dicas para MORNO sem imóvel de interesse
      if (
        mappedStatus === "MORNO" &&
        !lead.interest &&
        !historyDoneTypes.includes("morno_sem_interesse")
      ) {
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "selecao_personalizada",
          category: "Relacionamento",
          priority: 1,
          description:
            "Envie uma seleção personalizada de imóveis: Monte uma lista com 3 a 5 imóveis que correspondam à localização, orçamento e tipo de imóvel informados, destacando os mais relevantes.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "visita_exploratoria",
          category: "Relacionamento",
          priority: 2,
          description:
            "Ofereça uma visita exploratória: Convide o lead para visitar um ou dois imóveis que se encaixem nos critérios, mesmo que sejam apenas para referência inicial.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "fotos_videos_similares",
          category: "Nutrição",
          priority: 3,
          description:
            "Envie fotos ou vídeos de imóveis similares: Compartilhe imagens ou tours virtuais de imóveis que atendam ao tipo de imóvel e orçamento, despertando interesse visual.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "beneficios_localizacao",
          category: "Nutrição",
          priority: 4,
          description:
            "Destaque benefícios da localização: Envie informações sobre a infraestrutura da região (escolas, comércios, transporte, lazer) para reforçar a escolha do local.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "simulacao_financeira",
          category: "Negociação",
          priority: 5,
          description:
            "Proponha uma simulação financeira: Envie uma estimativa de financiamento ou parcelamento com base no orçamento informado, mostrando opções viáveis.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "senso_oportunidade",
          category: "Relacionamento",
          priority: 6,
          description:
            "Crie um senso de oportunidade: Informe sobre imóveis recém-lançados ou com condições especiais na localização desejada, incentivando ação rápida.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
      }

      // Dicas para QUENTE
      if (mappedStatus === "QUENTE" && !historyDoneTypes.includes("quente")) {
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "visita_imediata",
          category: "Relacionamento",
          priority: 1,
          description:
            "Agende uma visita imediata: Convide o lead para uma visita presencial ou virtual ao imóvel de interesse (se houver) ou a imóveis que correspondam aos critérios fornecidos, priorizando agendamento rápido.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "proposta_personalizada",
          category: "Negociação",
          priority: 2,
          description:
            "Envie uma proposta personalizada: Prepare uma oferta detalhada com preço, condições de pagamento e diferenciais do imóvel (ou de imóveis selecionados com base em localização, orçamento e tipo).",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "urgencia",
          category: "Relacionamento",
          priority: 3,
          description:
            "Reforce a urgência: Destaque a alta procura pelo imóvel ou condições exclusivas (ex.: desconto por tempo limitado, bônus na compra) para incentivar a decisão.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "diferenciais_exclusivos",
          category: "Nutrição",
          priority: 4,
          description:
            "Destaque diferenciais exclusivos: Se houver imóvel relacionado, envie fotos, vídeos ou informações específicas (ex.: vista, acabamentos, lazer); se não, apresente imóveis que atendam aos critérios com ênfase em benefícios.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "followup_direto",
          category: "Relacionamento",
          priority: 5,
          description:
            "Faça um follow-up direto: Entre em contato por telefone ou WhatsApp para esclarecer dúvidas, entender objeções e reforçar o interesse do lead.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "suporte_proximo_passo",
          category: "Relacionamento",
          priority: 6,
          description:
            "Facilite o próximo passo: Ofereça suporte para documentação, análise de crédito ou conexão com bancos, simplificando o processo de compra.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "exclusividade",
          category: "Relacionamento",
          priority: 7,
          description:
            "Crie um senso de exclusividade: Informe sobre imóveis recém-disponibilizados ou com condições especiais que se alinhem com as preferências do lead, incentivando ação imediata.",
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
      }

      // Follow-up se sem contato há mais de 7 dias
      if (daysSinceContact !== null && daysSinceContact > 7) {
        possibleActions.push({
          leadId: lead.id,
          leadName: lead.name,
          type: "followup",
          category: "Relacionamento",
          priority: 2,
          description: `Sem contato há ${daysSinceContact} dias. Fazer acompanhamento.`,
          score: score,
          status: lead.status,
          daysSinceContact: daysSinceContact,
        });
      }

      if (possibleActions.length === 0) return null;
      // Retorna a ação de maior prioridade para o lead
      const bestAction = possibleActions.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (b.score !== a.score) return b.score - a.score;
        return (b.daysSinceContact ?? 0) - (a.daysSinceContact ?? 0);
      })[0];
      return bestAction;
    })
    .filter(Boolean);

  // Sugestão de alteração de status
  const statusSuggestions = (leads || [])
    .map((lead) => {
      try {
        if (!lead || !lead.scoreDetails) return null;
        const suggested = computeStatusFromScoreDetails(
          lead.scoreDetails,
          lead
        );
        if (suggested && suggested !== lead.status) {
          return {
            leadId: lead.id,
            leadName: lead.name,
            type: "suggest_status",
            category: "Sugestão",
            priority: 1,
            description: `Sugerir alteração de status para ${suggested}`,
            suggestedStatus: suggested,
            score: Number(
              lead.score || (lead.scoreDetails && lead.scoreDetails.score) || 0
            ),
            status: lead.status,
          };
        }
        return null;
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);

  // Ordenação final: Alerta > prioridade > score > dias sem contato
  const merged = [...statusSuggestions, ...allActions];
  return merged
    .sort((a, b) => {
      if ((a.category === "Alerta") !== (b.category === "Alerta")) {
        return a.category === "Alerta" ? -1 : 1;
      }
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (b.score !== a.score) return b.score - a.score;
      return (b.daysSinceContact ?? 0) - (a.daysSinceContact ?? 0);
    })
    .slice(0, max);
}
