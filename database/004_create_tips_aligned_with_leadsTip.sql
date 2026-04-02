-- Tabela de dicas padrão, alinhada à estrutura da leadsTip.js
CREATE TABLE tips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- Ex: 'nutricao', 'followup', 'agendar_visita'
    category VARCHAR(50) NOT NULL, -- Ex: 'Relacionamento', 'Nutrição', 'Negociação', 'Alerta', 'Sugestão'
    priority INT NOT NULL DEFAULT 1, -- Prioridade da dica
    description VARCHAR(255) NOT NULL, -- Texto da dica
    canal ENUM('ligacao', 'whatsapp', 'email', 'outro') DEFAULT 'outro', -- Canal sugerido
    ativa BOOLEAN DEFAULT TRUE, -- Se está ativa globalmente
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de ligação entre lead e dica
CREATE TABLE lead_tips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    tip_id INT NOT NULL,
    ativa BOOLEAN DEFAULT TRUE, -- Se está ativa para esse lead
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (tip_id) REFERENCES tips(id) ON DELETE CASCADE
);