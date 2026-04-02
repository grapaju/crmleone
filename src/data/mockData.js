import { propertyOptions } from './propertyOptions';

export const mockProperties = [
  {
    id: 1,
    title: 'Apartamento Moderno no Coração da Cidade',
    price: 850000,
    address: 'Avenida Paulista, 1578',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-200',
    bedrooms: 3,
    bathrooms: 2,
    parking: 2,
    area: 120,
    type: 'Apartamento',
    status: 'Disponível',
    propertyType: 'property',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2',
    features: ['Piscina', 'Academia', 'Varanda Gourmet'],
    agent: {
      name: 'Carlos Silva',
      phone: '(11) 98765-4321',
      avatar: 'https://images.unsplash.com/photo-1632709878761-d4d0f5bdc2d8'
    }
  },
  {
    id: 2,
    title: 'Casa Espaçosa com Quintal e Piscina',
    price: 1500000,
    address: 'Rua das Acácias, 500',
    city: 'Campinas',
    state: 'SP',
    zipCode: '13023-000',
    bedrooms: 4,
    bathrooms: 4,
    parking: 4,
    area: 300,
    type: 'Casa',
    status: 'Vendido',
    propertyType: 'property',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811',
    features: ['Piscina Privativa', 'Churrasqueira', 'Jardim de Inverno'],
    agent: {
      name: 'Ana Santos',
      phone: '(19) 91234-5678',
      avatar: 'https://images.unsplash.com/photo-1628890923662-2cb23c2a0abb'
    }
  },
    {
    id: 3,
    title: 'Cobertura Duplex com Vista Panorâmica',
    price: 3200000,
    address: 'Avenida Vieira Souto, 200',
    city: 'Rio de Janeiro',
    state: 'RJ',
    zipCode: '22420-000',
    bedrooms: 3,
    bathrooms: 5,
    parking: 3,
    area: 250,
    type: 'Cobertura',
    status: 'Reservado',
    propertyType: 'property',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
    features: ['Piscina na Cobertura', 'Sauna', 'Vista para o Mar'],
     agent: {
      name: 'João Oliveira',
      phone: '(21) 95555-1234',
      avatar: 'https://images.unsplash.com/photo-1559548331-f92350a9118c'
    }
  },
];

const generateUnits = (towerId, floors, unitsPerFloor) => {
    let units = [];
    for (let floor = 1; floor <= floors; floor++) {
        for(let u=1; u<=unitsPerFloor; u++) {
            const unitNumber = `${floor}${String(u).padStart(2,'0')}`;
            units.push({
                id: `${towerId}_${unitNumber}`,
                obra_id: 101,
                torre_id: towerId,
                numero_unidade: unitNumber,
                pavimento: `${floor}º andar`,
                tipo: `${(u % 2) + 2} quartos`,
                area_privativa: 60 + (u*5),
                area_total: 90 + (u*5),
                status_venda: ['disponível', 'reservado', 'vendido', 'em negociação'][Math.floor(Math.random() * 4)],
                valor: 400000 + (floor*10000) + (u*5000),
                caracteristicas_especificas: 'Varanda gourmet',
                agent: { name: 'Carlos Silva' }
            });
        }
    }
    return units;
}

export const mockProjects = [
    {
        id: 101,
        propertyType: 'project',
        projectName: 'Residencial Vista Verde',
        developerName: 'Pavan Construtora',
        projectType: 'torres_blocos',
        projectStatus: 'em construção',
        endereco: 'Rua das Orquídeas, 123',
        bairro: 'Jardim das Flores',
        cidade: 'Joinville',
        cep: '89222-000',
        deliveryDate: '2025-12-31',
        projectFeatures: propertyOptions.empreendimento_infraestruturas.slice(0,5).map(f => f.nome),
        image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914',
        towers: [
            { id: 201, name: 'Torre A', floors: 15, unitsPerFloor: 4 },
            { id: 202, name: 'Torre B', floors: 15, unitsPerFloor: 4 },
        ],
        units: [
            ...generateUnits(201, 15, 4),
            ...generateUnits(202, 15, 4),
        ],
        agent: { name: 'Carlos Silva' }
    },
     {
        id: 102,
        propertyType: 'project',
        projectName: 'Edifício Central Park',
        developerName: 'Pavan Incorporações',
  projectType: 'torres_blocos',
        projectStatus: 'entregue',
        endereco: 'Avenida Central, 789',
        bairro: 'Centro',
        cidade: 'Curitiba',
        cep: '80000-000',
        deliveryDate: '2023-06-30',
        projectFeatures: propertyOptions.empreendimento_infraestruturas.slice(4,9).map(f => f.nome),
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab',
        towers: [
             { id: 203, name: 'Torre Única', floors: 20, unitsPerFloor: 6 },
        ],
        units: generateUnits(203, 20, 6),
        agent: { name: 'Ana Santos' }
    }
];

export const mockAgents = [
    //...
];

export const mockLeads = [
    //...
];

export const mockAppointments = [
  {
    id: 1,
    title: 'Visita ao Apartamento Moderno',
    start: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
    end: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
    type: 'Visita',
    status: 'Confirmado',
    leadId: 1,
    propertyId: 1,
    agent: 'Carlos Silva',
    client: 'Maria Silva',
    notes: 'Cliente interessado na suíte principal.'
  },
  {
  id: 2,
    title: 'Reunião com Pavan Construtora',
    start: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
    end: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
    type: 'Reunião',
    status: 'Pendente',
    leadId: null,
    propertyId: 101,
    agent: 'Ana Santos',
    client: 'Diretoria Pavan',
    notes: 'Discutir andamento da Torre A.'
  }
];

export const mockContacts = [
  {
    id: '1',
    name: 'Construtora Alfa',
    company: 'Alfa Empreendimentos',
    email: 'contato@alfa.com',
    phone: '(11) 2222-3333',
    type: 'agencia'
  },
  {
    id: '2',
    name: 'Roberto Mendes',
    company: 'Imobiliária Beta',
    email: 'roberto.mendes@betaimoveis.com',
    phone: '(21) 98888-7777',
    type: 'agente'
  },
  {
    id: '3',
    name: 'Fornecedor de Materiais XYZ',
    company: 'XYZ Materiais',
    email: 'vendas@xyzmateriais.com',
    phone: '(41) 3333-4444',
    type: 'outro'
  }
];

export const mockActivities = [
    {
        id: 1,
        propertyId: 1,
        type: 'Proposta',
        description: 'Proposta de R$ 820.000,00 enviada pelo cliente João Santos.',
        agentName: 'Carlos Silva',
        timestamp: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    },
    {
        id: 2,
        propertyId: 1,
        type: 'Status',
        description: 'Status alterado para "Em negociação".',
        agentName: 'Carlos Silva',
        timestamp: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    },
    {
        id: 3,
        propertyId: 2,
        type: 'Mensagem',
        description: 'Cliente ligou para perguntar sobre a documentação do imóvel.',
        agentName: 'Ana Santos',
        timestamp: new Date().toISOString(),
    }
];