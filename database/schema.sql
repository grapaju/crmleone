-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 08/10/2025 às 23:11
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `crm_imoveis`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `activities`
--

CREATE TABLE `activities` (
  `id` int(11) NOT NULL,
  `property_id` int(11) DEFAULT NULL,
  `project_id` int(11) DEFAULT NULL,
  `type` varchar(100) DEFAULT NULL,
  `description` int(11) DEFAULT NULL,
  `agent_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `agents`
--

CREATE TABLE `agents` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `document` varchar(30) DEFAULT NULL,
  `role` varchar(50) DEFAULT 'agent',
  `password` varchar(255) NOT NULL,
  `status` enum('Ativo','Desativado','','') DEFAULT 'Ativo',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `agents`
--

INSERT INTO `agents` (`id`, `name`, `email`, `phone`, `document`, `role`, `password`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Administrador', 'admin@imovelcrm.com', '4755555555', 'doc', 'admin', '$2y$10$R/p9eGsDWXUCau5VmcUFW.34O3g1q7sCfvQ04oWN6MWaSueg4pqjS', 'Ativo', '2025-08-12 15:50:00', '2025-08-13 19:32:44'),
(2, 'Carlos Silva', 'carlos@imoveiscrm.com.br', '47555555555', 'CRECI 0055', 'agente', '$2y$10$QbM/vurtJowkcnXdZ3C98e1EZQyiy9ZUlM7N4wWmQVDVBzXOhd.C2', 'Ativo', '2025-08-13 19:33:44', '2025-08-13 19:33:44'),
(4, 'Maria', 'maria@imoveiscrm.com.br', '47996703040', '12345', 'agente', '$2y$10$DerlASURezomIhEKUlwnU.VxC7DLWFaNUjkNNjSM2d4C8QsRE/JgK', 'Ativo', '2025-08-13 19:53:36', '2025-08-13 19:55:45');

-- --------------------------------------------------------

--
-- Estrutura para tabela `agent_project_access`
--

CREATE TABLE `agent_project_access` (
  `id` int(11) NOT NULL,
  `agent_id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `can_edit` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `agent_property_access`
--

CREATE TABLE `agent_property_access` (
  `id` int(11) NOT NULL,
  `agent_id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `can_edit` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `agent_property_access`
--

INSERT INTO `agent_property_access` (`id`, `agent_id`, `property_id`, `can_edit`, `created_at`) VALUES
(1, 2, 3, 0, '2025-09-18 23:27:08');

-- --------------------------------------------------------

--
-- Estrutura para tabela `agent_unit_access`
--

CREATE TABLE `agent_unit_access` (
  `id` int(11) NOT NULL,
  `agent_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `can_edit` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `appointments`
--

CREATE TABLE `appointments` (
  `id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `type` enum('Ligar','Email','Reunião','Tarefa','Mensagem','Visita') NOT NULL,
  `start` timestamp NULL DEFAULT NULL,
  `end` timestamp NULL DEFAULT NULL,
  `agent_id` int(11) DEFAULT NULL,
  `lead_id` int(11) DEFAULT NULL,
  `property_id` int(11) DEFAULT NULL,
  `project_id` int(11) DEFAULT NULL,
  `status` enum('Pendente','Confirmado','Cancelado','Concluído','Não Realizado') NOT NULL DEFAULT 'Pendente',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `appointments`
--

INSERT INTO `appointments` (`id`, `title`, `description`, `type`, `start`, `end`, `agent_id`, `lead_id`, `property_id`, `project_id`, `status`, `created_at`, `updated_at`) VALUES
(9, 'visita', '', 'Visita', '2025-09-17 17:00:00', '2025-09-17 18:00:00', 1, 1, 1, 0, 'Concluído', '2025-09-17 16:08:01', '2025-09-23 21:51:26'),
(17, 'Enviar mensagem', 'Enviar mensagem com tabela de imóveis conforme os dados do Lead.\nMotivo não realizado: o cliente pediu para não enviar.', 'Mensagem', '2025-09-18 19:00:00', '2025-09-18 20:00:00', 2, 3, NULL, 0, 'Concluído', '2025-09-18 18:06:15', '2025-09-23 23:05:47'),
(18, 'Enviar mensagem', 'Enviar mensagem com tabela de imóveis conforme os dados do Lead.', 'Mensagem', '2025-09-18 22:00:00', '2025-09-18 23:00:00', 2, 4, 3, 0, 'Concluído', '2025-09-18 19:02:15', '2025-09-18 19:27:17'),
(19, 'mensagem', 'aaa\nMotivo não realizado: o lead nao aceitou', 'Ligar', '2025-09-25 21:45:53', '2025-09-25 22:15:53', 2, 3, 1, 0, 'Confirmado', '2025-09-18 19:32:56', '2025-09-21 21:45:53'),
(20, 'Contato com lead', 'Envie uma lista personalizada de imóveis que correspondam à localização, orçamento ou interesse informado.', 'Ligar', '2025-09-20 23:00:00', '2025-09-20 23:30:00', 2, 4, NULL, NULL, 'Confirmado', '2025-09-18 22:32:01', '2025-09-20 21:06:11'),
(21, 'Enviar mensagem', 'Envie uma lista personalizada de imóveis que correspondam à localização, orçamento ou interesse informado.', 'Mensagem', '2025-09-23 19:43:58', '2025-09-23 20:13:58', 2, 3, NULL, NULL, 'Pendente', '2025-09-20 21:09:28', '2025-09-21 19:43:58'),
(22, 'Contato com lead', 'Envie uma mensagem perguntando sobre as preferências de localização.', 'Ligar', '2025-09-20 22:30:00', '2025-09-20 23:00:00', 2, 5, NULL, NULL, 'Concluído', '2025-09-20 22:22:04', '2025-09-23 23:05:49'),
(23, 'Nutrição: Envie uma mensagem perguntando sobre as preferências de localização.', 'Envie uma mensagem perguntando sobre as preferências de localização.\n[Origem: Gerado por Dica]', 'Tarefa', '2025-09-21 17:00:00', '2025-09-21 17:30:00', 2, 5, NULL, NULL, 'Concluído', '2025-09-21 16:32:31', '2025-09-21 21:45:12'),
(24, 'Relacionamento: Envie uma lista personalizada de imóveis que correspondam à localização, orçamento ou interesse informad', 'Envie uma lista personalizada de imóveis que correspondam à localização, orçamento ou interesse informado.\n[Origem: Gerado por Dica]', 'Tarefa', '2025-10-02 14:00:00', '2025-10-02 14:30:00', 2, 4, NULL, NULL, 'Pendente', '2025-10-02 13:52:30', '2025-10-02 13:52:30');

--
-- Acionadores `appointments`
--
DELIMITER $$
CREATE TRIGGER `trg_appointments_insert_to_lead_activities` AFTER INSERT ON `appointments` FOR EACH ROW BEGIN
    INSERT INTO lead_activities (
        lead_id,
        type,
        title,
        description,
        channel,
        table_id,
        appointment_id,
        status,
        date,
        agent_id,
        property_id,
        project_id
    ) VALUES (
        NEW.lead_id,
        NEW.type,
        NEW.title,
        NEW.description,
        NULL,          -- appointments não tem channel
        NEW.id, 
        NEW.id, -- table_id aponta para appointment
        NEW.status,
        NEW.start,     -- usa o início como data de referência
        NEW.agent_id,
        NEW.property_id,
        NEW.project_id
    );
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_appointments_update_status_to_lead_activities` AFTER UPDATE ON `appointments` FOR EACH ROW BEGIN
    -- só insere no histórico se o status realmente mudou
    IF NEW.status <> OLD.status THEN
        INSERT INTO lead_activities (
            lead_id,
            type,
            title,
            description,
            channel,
            table_id,
            appointment_id,
            status,
            date,
            agent_id,
            property_id,
            project_id
        ) VALUES (
            NEW.lead_id,
            NEW.type,
            CONCAT(NEW.title, ' - Status alterado'),
            NEW.description,
            NULL,
            NEW.id,
            NEW.id,
            NEW.status,
            NOW(),  -- data da alteração
            NEW.agent_id,
            NEW.property_id,
            NEW.project_id
        );
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estrutura para tabela `automations`
--

CREATE TABLE `automations` (
  `id` int(11) NOT NULL,
  `title` varchar(200) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `table_id` int(11) NOT NULL,
  `dia_mes` varchar(5) NOT NULL,
  `hora_envio` time NOT NULL,
  `recipients` varchar(200) NOT NULL,
  `status` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `automations`
--

INSERT INTO `automations` (`id`, `title`, `message`, `table_id`, `dia_mes`, `hora_envio`, `recipients`, `status`) VALUES
(1, NULL, NULL, 1, '9', '17:50:00', '[{\"name\":\"Maria\",\"email\":\"grapaju@gmail.com\"}]', 'Ativa'),
(2, 'ccc', 'cccc', 1, '9', '09:00:00', '[{\"name\":\"Maria\",\"email\":\"grapaju@gmail.com\"}]', 'Ativa');

-- --------------------------------------------------------

--
-- Estrutura para tabela `contacts`
--

CREATE TABLE `contacts` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `type` enum('corretor','imobiliaria','outro','') DEFAULT 'corretor',
  `imobiliaria_id` int(11) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `contacts`
--

INSERT INTO `contacts` (`id`, `name`, `email`, `phone`, `type`, `imobiliaria_id`, `notes`, `created_at`, `updated_at`) VALUES
(1, 'Carlos Ferreira', 'carlos.f@alfa.com', '(47) 3366-8848', 'corretor', 2, NULL, '2025-08-13 19:57:25', '2025-08-14 22:24:16');

-- --------------------------------------------------------

--
-- Estrutura para tabela `cub`
--

CREATE TABLE `cub` (
  `id` int(11) NOT NULL,
  `valorAtual` decimal(10,2) NOT NULL,
  `vigencia` date NOT NULL,
  `variacao` varchar(10) DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT current_timestamp(),
  `atualizado_em` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `cub`
--

INSERT INTO `cub` (`id`, `valorAtual`, `vigencia`, `variacao`, `criado_em`, `atualizado_em`) VALUES
(1, 2999.38, '2025-10-01', '0.21', '2025-10-08 15:00:53', '2025-10-08 15:00:53');

-- --------------------------------------------------------

--
-- Estrutura para tabela `documents`
--

CREATE TABLE `documents` (
  `id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `property_id` int(11) DEFAULT NULL,
  `expiryDate` date DEFAULT NULL,
  `status` varchar(50) NOT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `documents`
--

INSERT INTO `documents` (`id`, `title`, `description`, `category`, `type`, `file_path`, `property_id`, `expiryDate`, `status`, `uploaded_by`, `created_at`, `updated_at`) VALUES
(1, 'Matricula Imovel 1', 'xxxx', 'Matrícula', 'PDF', 'uploads/1757458354_816f109ec0b7.pdf', 1, '2025-11-09', '', 1, '2025-09-10 02:59:32', '2025-09-10 03:52:34'),
(6, 'vvvvv', '', 'Escritura', 'PDF', 'uploads/1757784389_44817b508258.pdf', 3, '2025-10-13', '', 1, '2025-09-13 03:20:18', '2025-09-13 22:26:29');

-- --------------------------------------------------------

--
-- Estrutura para tabela `features`
--

CREATE TABLE `features` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `features`
--

INSERT INTO `features` (`id`, `name`, `category`) VALUES
(7, 'Bancada em granito', 'acabamentos'),
(8, 'Bancada em mármore', 'acabamentos'),
(11, 'Esquadrias de alumínio', 'acabamentos'),
(5, 'Iluminação embutida', 'acabamentos'),
(6, 'Móveis planejados', 'acabamentos'),
(12, 'Pintura nova', 'acabamentos'),
(2, 'Piso laminado', 'acabamentos'),
(1, 'Piso porcelanato', 'acabamentos'),
(3, 'Piso vinílico', 'acabamentos'),
(10, 'Portas de correr', 'acabamentos'),
(9, 'Revestimento 3D', 'acabamentos'),
(4, 'Teto rebaixado em gesso', 'acabamentos'),
(15, 'Ar-condicionado', 'comodidades'),
(21, 'Área gourmet', 'comodidades'),
(14, 'Churrasqueira', 'comodidades'),
(22, 'Elevador privativo', 'comodidades'),
(17, 'Jardim', 'comodidades'),
(20, 'Lavanderia', 'comodidades'),
(13, 'Piscina privativa', 'comodidades'),
(19, 'Portão eletrônico', 'comodidades'),
(18, 'Sauna privativa', 'comodidades'),
(16, 'Varanda', 'comodidades'),
(27, 'Área de lazer', 'condominio_infraestruturas'),
(35, 'Bicicletário', 'condominio_infraestruturas'),
(24, 'Câmeras de segurança', 'condominio_infraestruturas'),
(33, 'Elevador de serviço', 'condominio_infraestruturas'),
(32, 'Elevador social', 'condominio_infraestruturas'),
(29, 'Espaço coworking', 'condominio_infraestruturas'),
(30, 'Estacionamento para visitantes', 'condominio_infraestruturas'),
(31, 'Gerador de energia', 'condominio_infraestruturas'),
(25, 'Piscina coletiva', 'condominio_infraestruturas'),
(23, 'Portaria 24h', 'condominio_infraestruturas'),
(28, 'Quadra poliesportiva', 'condominio_infraestruturas'),
(26, 'Salão de festas', 'condominio_infraestruturas'),
(34, 'Zeladoria', 'condominio_infraestruturas'),
(51, 'Academia', 'empreendimento_infraestruturas'),
(49, 'Área Gourmet', 'empreendimento_infraestruturas'),
(58, 'Bicicletário', 'empreendimento_infraestruturas'),
(50, 'Cinema', 'empreendimento_infraestruturas'),
(55, 'Coworking', 'empreendimento_infraestruturas'),
(56, 'Mercado Autônomo', 'empreendimento_infraestruturas'),
(57, 'Pet Place', 'empreendimento_infraestruturas'),
(48, 'Piscina', 'empreendimento_infraestruturas'),
(53, 'Playground', 'empreendimento_infraestruturas'),
(59, 'Portaria 24h', 'empreendimento_infraestruturas'),
(54, 'Quadra Poliesportiva', 'empreendimento_infraestruturas'),
(52, 'Salão de Festas', 'empreendimento_infraestruturas');

-- --------------------------------------------------------

--
-- Estrutura para tabela `history`
--

CREATE TABLE `history` (
  `id` int(11) NOT NULL,
  `table_id` int(11) NOT NULL,
  `date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `channel` varchar(100) NOT NULL,
  `recipients` varchar(100) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `status` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `history`
--

INSERT INTO `history` (`id`, `table_id`, `date`, `channel`, `recipients`, `type`, `status`) VALUES
(32, 1, '2025-09-09 20:24:42', 'email', 'Maria', 'manual', 'Enviado'),
(33, 1, '2025-09-09 20:24:42', 'email', 'Maria', 'manual', 'Enviado'),
(34, 1, '2025-09-09 20:50:51', 'email', 'Maria', 'automation', 'Enviado'),
(35, 1, '2025-09-09 21:21:15', 'email', 'Maria', 'automation', 'Enviado');

--
-- Acionadores `history`
--
DELIMITER $$
CREATE TRIGGER `trg_history_to_activities` AFTER INSERT ON `history` FOR EACH ROW BEGIN
  INSERT INTO lead_activities (lead_id, type, title, description, channel, status, date)
  VALUES (
    NEW.table_id, -- assumindo que table_id = lead_id
    NEW.type,
    NEW.channel,
    NEW.status,
    NEW.date
  );
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estrutura para tabela `imobiliarias`
--

CREATE TABLE `imobiliarias` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `imobiliarias`
--

INSERT INTO `imobiliarias` (`id`, `name`) VALUES
(1, 'imob teste'),
(2, 'imob 2');

-- --------------------------------------------------------

--
-- Estrutura para tabela `leads`
--

CREATE TABLE `leads` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `source` varchar(100) DEFAULT NULL,
  `interest` varchar(200) NOT NULL,
  `budget` decimal(10,2) NOT NULL,
  `location` varchar(200) NOT NULL,
  `notes` varchar(200) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `score` int(11) DEFAULT 0,
  `agent_id` int(11) DEFAULT NULL,
  `propertie_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `leads`
--

INSERT INTO `leads` (`id`, `name`, `email`, `phone`, `source`, `interest`, `budget`, `location`, `notes`, `status`, `score`, `agent_id`, `propertie_id`, `created_at`, `updated_at`) VALUES
(1, 'Maria', 'grapaju@gmail.com', '(47) 99670-3040', 'WhatsApp', 'Apartamento', 850000.00, 'cccc', '', 'Visita Agendada', 60, 1, 1, '2025-08-15 01:31:01', '2025-09-17 16:59:49'),
(2, 'Graziela', 'grapj@msn.com', '(47) 9967-0304', 'Google', 'Cobertura', 10000000.00, '', 'teste', 'Contato Inicial', 20, 1, 3, '2025-09-11 19:08:09', '2025-09-15 21:11:04'),
(3, 'Delia T Pavan Julian', 'grapj1905@gamail.com', '(47) 99670-3040', 'WhatsApp', 'Casa', 2000000.00, 'CENTRO', '', 'Novo', 60, 2, 1, '2025-09-17 19:54:40', '2025-09-23 23:05:47'),
(4, 'joao', 'joao@hotmail.com', '(47) 99670-3040', 'E-mail', 'Terreno', 500000.00, 'airiba', '', 'Novo', 60, 2, 3, '2025-09-17 21:25:55', '2025-09-20 21:06:12'),
(5, 'Jivago', 'grapaju@hotmail.com', '(47) 99670-3040', 'Google', 'Comercial', 500000.00, '', 'teste de lead', 'Contato Inicial', 60, 2, NULL, '2025-09-11 21:51:28', '2025-09-23 23:05:49');

-- --------------------------------------------------------

--
-- Estrutura para tabela `lead_activities`
--

CREATE TABLE `lead_activities` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(150) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `channel` varchar(50) DEFAULT NULL,
  `table_id` int(11) DEFAULT NULL,
  `appointment_id` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `date` timestamp NOT NULL DEFAULT current_timestamp(),
  `agent_id` int(11) DEFAULT NULL,
  `property_id` int(11) DEFAULT NULL,
  `project_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `lead_activities`
--

INSERT INTO `lead_activities` (`id`, `lead_id`, `type`, `title`, `description`, `channel`, `table_id`, `appointment_id`, `status`, `date`, `agent_id`, `property_id`, `project_id`) VALUES
(1, 1, 'Ligar', 'Teste Save 2', NULL, NULL, NULL, NULL, 'Confirmado', '2025-09-11 18:30:00', NULL, NULL, NULL),
(2, 2, 'Ligar', 'ligar para o cliente', 'teste', NULL, NULL, NULL, 'Pendente', '2025-09-14 14:00:00', 1, NULL, NULL),
(3, 1, 'Email', 'nnnn', '', NULL, NULL, NULL, 'Confirmado', '2025-09-14 00:00:00', 1, NULL, NULL),
(4, 2, 'Mensagem', 'mensagem', 'aasdsadad', NULL, NULL, NULL, 'Pendente', '2025-09-14 12:00:00', 1, NULL, NULL),
(5, 1, 'Mensagem', 'mensagem', '', NULL, NULL, NULL, 'Pendente', '2025-09-14 16:45:00', 1, NULL, NULL),
(6, 1, 'Visita', 'Lead quente. Sugerir agendamento de visita.', 'Lead quente. Sugerir agendamento de visita.', NULL, NULL, NULL, 'Pendente', '2025-09-14 18:30:00', 1, NULL, NULL),
(10, 1, 'Visita', 'Lead quente. Sugerir agendamento de visita. - Status alterado', 'Lead quente. Sugerir agendamento de visita.', NULL, 8, NULL, 'Concluído', '2025-09-15 18:13:49', 1, 3, 0),
(11, 1, 'Ligar', 'mensagem - Status alterado', '', NULL, 7, 7, 'Concluído', '2025-09-15 18:20:47', 1, 3, 0),
(12, 1, 'Visita', 'visita', '', NULL, 9, 9, 'Pendente', '2025-09-17 17:00:00', 1, 1, 0),
(13, 1, 'Visita', 'visita - Status alterado', '', NULL, 9, 9, 'Confirmado', '2025-09-17 16:42:10', 1, 1, 0),
(14, 1, 'Visita', 'visita - Status alterado', '', NULL, 9, 9, 'Concluído', '2025-09-17 16:59:22', 1, 1, 0),
(15, 1, 'Visita', 'visita - Status alterado', '', NULL, 9, 9, 'Confirmado', '2025-09-17 16:59:49', 1, 1, 0),
(16, 3, 'Mensagem', 'Enviar mensagem', 'Enviar mensagem com tabela de imóveis conforme os dados do Lead.', NULL, 17, 17, 'Pendente', '2025-09-18 19:00:00', 2, NULL, 0),
(17, 3, 'Mensagem', 'Enviar mensagem - Status alterado', 'Enviar mensagem com tabela de imóveis conforme os dados do Lead.\nMotivo não realizado: o cliente pediu para não enviar.', NULL, 17, 17, 'Não Realizado', '2025-09-18 18:54:16', 2, NULL, 0),
(18, 4, 'Mensagem', 'Enviar mensagem', 'Enviar mensagem com tabela de imóveis conforme os dados do Lead.', NULL, 18, 18, 'Pendente', '2025-09-18 22:00:00', 2, 3, 0),
(19, 4, 'Mensagem', 'Enviar mensagem - Status alterado', 'Enviar mensagem com tabela de imóveis conforme os dados do Lead.', NULL, 18, 18, 'Concluído', '2025-09-18 19:04:41', 2, 3, 0),
(20, 4, 'Mensagem', 'Enviar mensagem - Status alterado', 'Enviar mensagem com tabela de imóveis conforme os dados do Lead.', NULL, 18, 18, 'Pendente', '2025-09-18 19:27:07', 2, 3, 0),
(21, 4, 'Mensagem', 'Enviar mensagem - Status alterado', 'Enviar mensagem com tabela de imóveis conforme os dados do Lead.', NULL, 18, 18, 'Concluído', '2025-09-18 19:27:17', 2, 3, 0),
(22, 3, 'Ligar', 'mensagem', 'aaa', NULL, 19, 19, 'Pendente', '2025-09-19 00:00:00', 2, 1, 0),
(23, 4, 'Ligar', 'Contato com lead', 'Envie uma lista personalizada de imóveis que correspondam à localização, orçamento ou interesse informado.', NULL, 20, 20, 'Pendente', '2025-09-18 23:00:00', 2, NULL, NULL),
(24, 3, 'Ligar', 'mensagem - Status alterado', 'aaa', NULL, 19, 19, 'Confirmado', '2025-09-18 22:44:52', 2, 1, 0),
(25, 3, 'Ligar', 'mensagem - Status alterado', 'aaa', NULL, 19, 19, 'Concluído', '2025-09-18 22:45:42', 2, 1, 0),
(26, 3, 'Ligar', 'mensagem - Status alterado', 'aaa', NULL, 19, 19, 'Confirmado', '2025-09-18 22:45:58', 2, 1, 0),
(27, 3, 'Ligar', 'mensagem - Status alterado', 'aaa\nMotivo não realizado: o lead nao aceitou', NULL, 19, 19, 'Não Realizado', '2025-09-18 22:46:19', 2, 1, 0),
(28, 3, 'Ligar', 'mensagem - Status alterado', 'aaa\nMotivo não realizado: o lead nao aceitou', NULL, 19, 19, 'Confirmado', '2025-09-18 22:47:42', 2, 1, 0),
(29, 3, 'Ligar', 'mensagem - Status alterado', 'aaa\nMotivo não realizado: o lead nao aceitou', NULL, 19, 19, 'Pendente', '2025-09-18 22:49:12', 2, 1, 0),
(30, 3, 'Ligar', 'mensagem - Status alterado', 'aaa\nMotivo não realizado: o lead nao aceitou', NULL, 19, 19, 'Confirmado', '2025-09-18 22:49:34', 2, 1, 0),
(31, 4, 'Ligar', 'Contato com lead - Status alterado', 'Envie uma lista personalizada de imóveis que correspondam à localização, orçamento ou interesse informado.', NULL, 20, 20, 'Confirmado', '2025-09-20 21:06:11', 2, NULL, NULL),
(32, 3, 'Mensagem', 'Enviar mensagem', 'Envie uma lista personalizada de imóveis que correspondam à localização, orçamento ou interesse informado.', NULL, 21, 21, 'Pendente', '2025-09-20 21:30:00', 2, NULL, NULL),
(33, 5, 'ligacao', 'ligar', 'teste de ligacao', NULL, NULL, NULL, 'Pendente', '2025-09-20 23:00:00', NULL, NULL, NULL),
(34, 3, 'Mensagem', 'Enviar mensagem - Status alterado', 'Envie uma lista personalizada de imóveis que correspondam à localização, orçamento ou interesse informado.', NULL, 21, 21, 'Confirmado', '2025-09-20 22:15:13', 2, NULL, NULL),
(35, 3, 'Mensagem', 'Enviar mensagem - Status alterado', 'Envie uma lista personalizada de imóveis que correspondam à localização, orçamento ou interesse informado.', NULL, 21, 21, 'Pendente', '2025-09-20 22:15:15', 2, NULL, NULL),
(36, 5, 'Ligar', 'Contato com lead', 'Envie uma mensagem perguntando sobre as preferências de localização.', NULL, 22, 22, 'Pendente', '2025-09-20 22:30:00', 2, NULL, NULL),
(37, 5, 'Tarefa', 'Nutrição: Envie uma mensagem perguntando sobre as preferências de localização.', 'Envie uma mensagem perguntando sobre as preferências de localização.\n[Origem: Gerado por Dica]', NULL, 23, 23, 'Pendente', '2025-09-21 17:00:00', 2, NULL, NULL),
(38, 5, 'Tarefa', 'Nutrição: Envie uma mensagem perguntando sobre as preferências de localização. - Status alterado', 'Envie uma mensagem perguntando sobre as preferências de localização.\n[Origem: Gerado por Dica]', NULL, 23, 23, 'Concluído', '2025-09-21 21:45:12', 2, NULL, NULL),
(39, 1, 'Visita', 'visita - Status alterado', '', NULL, 9, 9, 'Concluído', '2025-09-23 21:51:26', 1, 1, 0),
(40, 3, 'Mensagem', 'Enviar mensagem - Status alterado', 'Enviar mensagem com tabela de imóveis conforme os dados do Lead.\nMotivo não realizado: o cliente pediu para não enviar.', NULL, 17, 17, 'Concluído', '2025-09-23 23:05:47', 2, NULL, 0),
(41, 5, 'Ligar', 'Contato com lead - Status alterado', 'Envie uma mensagem perguntando sobre as preferências de localização.', NULL, 22, 22, 'Concluído', '2025-09-23 23:05:49', 2, NULL, NULL),
(42, 4, 'Tarefa', 'Relacionamento: Envie uma lista personalizada de imóveis que correspondam à localização, orçamento ou interesse informad', 'Envie uma lista personalizada de imóveis que correspondam à localização, orçamento ou interesse informado.\n[Origem: Gerado por Dica]', NULL, 24, 24, 'Pendente', '2025-10-02 14:00:00', 2, NULL, NULL);

-- --------------------------------------------------------

--
-- Estrutura para tabela `lead_tips`
--

CREATE TABLE `lead_tips` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `tip_id` int(11) NOT NULL,
  `ativa` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `lead_tips`
--

INSERT INTO `lead_tips` (`id`, `lead_id`, `tip_id`, `ativa`, `created_at`, `updated_at`) VALUES
(1, 4, 7, 0, '2025-09-18 18:32:24', '2025-09-18 18:32:24');

-- --------------------------------------------------------

--
-- Estrutura para tabela `projects`
--

CREATE TABLE `projects` (
  `id` int(11) NOT NULL,
  `property_type` varchar(50) NOT NULL,
  `project_name` varchar(255) NOT NULL,
  `developer_name` varchar(255) NOT NULL,
  `project_type` varchar(100) DEFAULT NULL,
  `project_status` varchar(50) DEFAULT NULL,
  `endereco` varchar(200) NOT NULL,
  `bairro` varchar(100) NOT NULL,
  `cidade` varchar(100) NOT NULL,
  `delivery_date` date DEFAULT NULL,
  `image` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `projects`
--

INSERT INTO `projects` (`id`, `property_type`, `project_name`, `developer_name`, `project_type`, `project_status`, `endereco`, `bairro`, `cidade`, `delivery_date`, `image`, `created_at`, `updated_at`) VALUES
(4, 'project', 'Saint John Residence', 'LVP Construtora', 'torres_blocos', 'em construção', '', '', '', '2028-01-01', NULL, '2025-10-01 22:53:18', '2025-10-01 22:53:18');

-- --------------------------------------------------------

--
-- Estrutura para tabela `project_features`
--

CREATE TABLE `project_features` (
  `project_id` int(11) NOT NULL,
  `feature_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `properties`
--

CREATE TABLE `properties` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `tags` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip_code` varchar(20) DEFAULT NULL,
  `bedrooms` int(11) DEFAULT NULL,
  `bathrooms` int(11) DEFAULT NULL,
  `parking` int(11) DEFAULT NULL,
  `area` decimal(10,2) DEFAULT NULL,
  `type` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `property_type` varchar(50) DEFAULT NULL,
  `agent_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `properties`
--

INSERT INTO `properties` (`id`, `title`, `description`, `tags`, `price`, `address`, `city`, `state`, `zip_code`, `bedrooms`, `bathrooms`, `parking`, `area`, `type`, `status`, `property_type`, `agent_id`, `created_at`, `updated_at`) VALUES
(1, 'Apartamento Moderno no Coração da Cidade', NULL, NULL, 850000.00, 'Avenida Paulista, 1578', 'São Paulo', 'SP', '01310-200', 3, 2, 2, 120.00, 'Apartamento', 'Disponível', 'property', 1, '2025-08-17 17:11:29', '2025-08-17 17:11:29'),
(3, 'COBERTURA DUPLEX FRENTE MAR', 'Vista total da orla', '[\"Mobiliado\",\"su\\u00edte master\",\"depend\\u00eancia empregada\",\"jacuzzi\",\"churrasqueira \\u00e0 carv\\u00e3o\"]', 18000000.00, 'Rua Guararapes', 'Porto Alegre', 'RS', '90690-340', 5, 4, 2, 552.20, 'cobertura', 'Disponível', 'property', NULL, '2025-09-09 23:49:02', '2025-09-13 18:53:35');

-- --------------------------------------------------------

--
-- Estrutura para tabela `property_features`
--

CREATE TABLE `property_features` (
  `property_id` int(11) NOT NULL,
  `feature_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `property_features`
--

INSERT INTO `property_features` (`property_id`, `feature_id`) VALUES
(1, 1),
(1, 2),
(1, 3),
(3, 14),
(3, 16);

-- --------------------------------------------------------

--
-- Estrutura para tabela `property_images`
--

CREATE TABLE `property_images` (
  `id` int(11) NOT NULL,
  `property_id` int(11) DEFAULT NULL,
  `project_id` int(11) DEFAULT NULL,
  `unit_id` int(11) DEFAULT NULL,
  `image_url` varchar(500) NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `property_images`
--

INSERT INTO `property_images` (`id`, `property_id`, `project_id`, `unit_id`, `image_url`, `is_primary`, `created_at`) VALUES
(1, 1, NULL, NULL, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', 1, '2025-08-17 17:12:01'),
(2, 1, NULL, NULL, 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae', 0, '2025-08-17 17:12:01'),
(3, 1, NULL, NULL, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267', 0, '2025-08-17 17:12:01'),
(6, 3, NULL, NULL, 'uploads/Captura_de_tela_2025-09-10_115328_1757520676.png', 0, '2025-09-10 16:11:16'),
(7, 3, NULL, NULL, 'uploads/Captura_de_tela_2025-09-09_202047_1757521860.png', 0, '2025-09-10 16:31:00'),
(8, 3, NULL, NULL, 'uploads/Captura_de_tela_2025-09-10_115344_1757523186.png', 0, '2025-09-10 16:53:06'),
(9, 3, NULL, NULL, 'uploads/Captura_de_tela_2025-09-10_115313_1757523203.png', 1, '2025-09-10 16:53:23');

-- --------------------------------------------------------

--
-- Estrutura para tabela `property_images_backup_20250910_170754`
--

CREATE TABLE `property_images_backup_20250910_170754` (
  `id` int(11) NOT NULL,
  `property_id` int(11) DEFAULT NULL,
  `project_id` int(11) DEFAULT NULL,
  `unit_id` int(11) DEFAULT NULL,
  `image_url` varchar(500) NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `property_images_backup_20250910_170754`
--

INSERT INTO `property_images_backup_20250910_170754` (`id`, `property_id`, `project_id`, `unit_id`, `image_url`, `is_primary`, `created_at`) VALUES
(1, 1, NULL, NULL, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', 1, '2025-08-17 17:12:01'),
(2, 1, NULL, NULL, 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae', 0, '2025-08-17 17:12:01'),
(3, 1, NULL, NULL, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267', 0, '2025-08-17 17:12:01'),
(6, 3, NULL, NULL, 'uploads/Captura_de_tela_2025-09-10_115328_1757520676.png', 0, '2025-09-10 16:11:16'),
(7, 3, NULL, NULL, 'uploads/Captura_de_tela_2025-09-09_202047_1757521860.png', 0, '2025-09-10 16:31:00'),
(8, 3, NULL, NULL, 'uploads/Captura_de_tela_2025-09-10_115344_1757523186.png', 0, '2025-09-10 16:53:06'),
(9, 3, NULL, NULL, 'uploads/Captura_de_tela_2025-09-10_115313_1757523203.png', 1, '2025-09-10 16:53:23');

-- --------------------------------------------------------

--
-- Estrutura para tabela `reports`
--

CREATE TABLE `reports` (
  `id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `content` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `sales_tables`
--

CREATE TABLE `sales_tables` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `observations` text DEFAULT NULL,
  `project_id` int(11) DEFAULT NULL,
  `attachments` varchar(250) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `sales_tables`
--

INSERT INTO `sales_tables` (`id`, `name`, `description`, `observations`, `project_id`, `attachments`, `created_at`, `updated_at`) VALUES
(1, 'Tabela Investidores Saint John Residence Julho de 2025', '', 'tab', NULL, '[{\"name\":\"Tabela Investidores Saint John Residence Julho de 2025.pdf\",\"size\":\"0.52 MB\",\"path\":null}]', '2025-09-07 20:00:40', '2025-09-07 20:00:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `key_name` varchar(100) NOT NULL,
  `value` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `settings`
--

INSERT INTO `settings` (`id`, `key_name`, `value`, `updated_at`) VALUES
(1, 'smtp_host', 'smtp.hostinger.com', '2025-09-07 20:09:17'),
(2, 'smtp_port', '465', '2025-09-07 20:09:17'),
(3, 'smtp_user', 'imoveis@simplifique.click', '2025-09-07 20:09:17'),
(4, 'smtp_pass', 'Grazi@141239', '2025-09-07 20:09:17'),
(5, 'smtp_secure', 'ssl', '2025-09-07 20:10:22'),
(6, 'smtp_from', 'imoveis@simplifique.click', '2025-09-07 20:09:17');

-- --------------------------------------------------------

--
-- Estrutura para tabela `tips`
--

CREATE TABLE `tips` (
  `id` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `category` varchar(50) NOT NULL,
  `priority` int(11) NOT NULL DEFAULT 1,
  `description` varchar(255) NOT NULL,
  `canal` enum('ligacao','whatsapp','email','outro') DEFAULT 'outro',
  `ativa` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `tips`
--

INSERT INTO `tips` (`id`, `type`, `category`, `priority`, `description`, `canal`, `ativa`, `created_at`, `updated_at`) VALUES
(1, 'nutricao', 'Nutrição', 1, 'Envie uma mensagem perguntando sobre as preferências de localização.', 'whatsapp', 1, '2025-09-18 16:53:34', '2025-09-18 16:53:34'),
(2, 'confirmar_dados', 'Relacionamento', 2, 'Entre em contato para confirmar a localização desejada, orçamento disponível e tipo de imóvel de interesse.', 'ligacao', 1, '2025-09-18 16:53:34', '2025-09-18 16:53:34'),
(3, 'objetivo', 'Relacionamento', 3, 'Pergunte de forma aberta sobre os objetivos do lead: por que está buscando um imóvel neste momento?', 'ligacao', 1, '2025-09-18 16:53:34', '2025-09-18 16:53:34'),
(4, 'sondagem_orcamento', 'Nutrição', 4, 'Sugira imóveis genéricos com ampla faixa de preço para sondar o orçamento.', 'email', 1, '2025-09-18 16:53:34', '2025-09-18 16:53:34'),
(5, 'conversa_rapida', 'Relacionamento', 5, 'Convide o lead para uma conversa rápida por telefone ou WhatsApp para entender suas necessidades.', 'whatsapp', 1, '2025-09-18 16:53:34', '2025-09-18 16:53:34'),
(6, 'personalizar_material', 'Nutrição', 6, 'Verifique se já foi enviado algum material e personalize a abordagem para evitar repetição.', 'email', 1, '2025-09-18 16:53:34', '2025-09-18 16:53:34'),
(7, 'personalizada', 'Relacionamento', 1, 'Envie uma lista personalizada de imóveis que correspondam à localização, orçamento ou interesse informado.', 'email', 1, '2025-09-18 16:53:34', '2025-09-18 16:53:34'),
(8, 'whatsapp_dados', 'Relacionamento', 2, 'Entre em contato via WhatsApp com uma mensagem curta, referenciando os dados fornecidos, e pergunte sobre preferências adicionais.', 'whatsapp', 1, '2025-09-18 16:53:34', '2025-09-18 16:53:34'),
(9, 'email_similares', 'Nutrição', 3, 'Envie um e-mail com imóveis semelhantes aos critérios do lead, destacando diferenciais como preço ou características.', 'email', 1, '2025-09-18 16:53:34', '2025-09-18 16:53:34'),
(10, 'proximos_passos', 'Relacionamento', 4, 'Pergunte diretamente sobre os próximos passos do lead, como “Você prefere agendar uma visita ou receber mais opções?”.', 'ligacao', 1, '2025-09-18 16:53:34', '2025-09-18 16:53:34'),
(11, 'comparativo', 'Nutrição', 5, 'Ofereça um comparativo de imóveis dentro do orçamento informado para ajudar na decisão.', 'email', 1, '2025-09-18 16:53:34', '2025-09-18 16:53:34');

-- --------------------------------------------------------

--
-- Estrutura para tabela `towers`
--

CREATE TABLE `towers` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `floors` int(11) DEFAULT NULL,
  `units_per_floor` int(11) DEFAULT NULL,
  `initial_floor` int(11) DEFAULT NULL,
  `initial_unit_start` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `towers`
--

INSERT INTO `towers` (`id`, `project_id`, `name`, `floors`, `units_per_floor`, `initial_floor`, `initial_unit_start`) VALUES
(1, 4, 'Torre A', 11, 6, 6, 601);

-- --------------------------------------------------------

--
-- Estrutura para tabela `units`
--

CREATE TABLE `units` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `tower_id` int(11) DEFAULT NULL,
  `unit_type_id` int(11) DEFAULT NULL,
  `unit_number` varchar(50) DEFAULT NULL,
  `floor` int(11) DEFAULT NULL,
  `atualizado_em` date DEFAULT current_timestamp(),
  `sale_status` enum('disponível','reservado','vendido','em negociação') DEFAULT 'disponível',
  `specific_features` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `units`
--

INSERT INTO `units` (`id`, `project_id`, `tower_id`, `unit_type_id`, `unit_number`, `floor`, `atualizado_em`, `sale_status`, `specific_features`) VALUES
(1, 4, 1, NULL, '601', 6, '2025-10-08', 'disponível', ''),
(2, 4, 1, NULL, '602', 6, '2025-10-08', 'disponível', ''),
(3, 4, 1, NULL, '603', 6, '2025-10-08', 'disponível', ''),
(4, 4, 1, NULL, '604', 6, '2025-10-08', 'disponível', ''),
(5, 4, 1, NULL, '605', 6, '2025-10-08', 'disponível', ''),
(6, 4, 1, NULL, '606', 6, '2025-10-08', 'disponível', ''),
(7, 4, 1, NULL, '701', 7, '2025-10-08', 'disponível', ''),
(8, 4, 1, NULL, '702', 7, '2025-10-08', 'disponível', ''),
(9, 4, 1, NULL, '703', 7, '2025-10-08', 'disponível', ''),
(10, 4, 1, NULL, '704', 7, '2025-10-08', 'disponível', ''),
(11, 4, 1, NULL, '705', 7, '2025-10-08', 'disponível', ''),
(12, 4, 1, NULL, '706', 7, '2025-10-08', 'disponível', ''),
(13, 4, 1, NULL, '801', 8, '2025-10-08', 'disponível', ''),
(14, 4, 1, NULL, '802', 8, '2025-10-08', 'disponível', ''),
(15, 4, 1, NULL, '803', 8, '2025-10-08', 'disponível', ''),
(16, 4, 1, NULL, '804', 8, '2025-10-08', 'disponível', ''),
(17, 4, 1, NULL, '805', 8, '2025-10-08', 'disponível', ''),
(18, 4, 1, NULL, '806', 8, '2025-10-08', 'disponível', ''),
(19, 4, 1, NULL, '901', 9, '2025-10-08', 'disponível', ''),
(20, 4, 1, NULL, '902', 9, '2025-10-08', 'disponível', ''),
(21, 4, 1, NULL, '903', 9, '2025-10-08', 'disponível', ''),
(22, 4, 1, NULL, '904', 9, '2025-10-08', 'disponível', ''),
(23, 4, 1, NULL, '905', 9, '2025-10-08', 'disponível', ''),
(24, 4, 1, NULL, '906', 9, '2025-10-08', 'disponível', ''),
(25, 4, 1, NULL, '1001', 10, '2025-10-08', 'disponível', ''),
(26, 4, 1, NULL, '1002', 10, '2025-10-08', 'disponível', ''),
(27, 4, 1, NULL, '1003', 10, '2025-10-08', 'disponível', ''),
(28, 4, 1, NULL, '1004', 10, '2025-10-08', 'disponível', ''),
(29, 4, 1, NULL, '1005', 10, '2025-10-08', 'disponível', ''),
(30, 4, 1, NULL, '1006', 10, '2025-10-08', 'disponível', ''),
(31, 4, 1, NULL, '1101', 11, '2025-10-08', 'disponível', ''),
(32, 4, 1, NULL, '1102', 11, '2025-10-08', 'disponível', ''),
(33, 4, 1, NULL, '1103', 11, '2025-10-08', 'disponível', ''),
(34, 4, 1, NULL, '1104', 11, '2025-10-08', 'disponível', ''),
(35, 4, 1, NULL, '1105', 11, '2025-10-08', 'disponível', ''),
(36, 4, 1, NULL, '1106', 11, '2025-10-08', 'disponível', ''),
(37, 4, 1, NULL, '1201', 12, '2025-10-08', 'disponível', ''),
(38, 4, 1, NULL, '1202', 12, '2025-10-08', 'disponível', ''),
(39, 4, 1, NULL, '1203', 12, '2025-10-08', 'disponível', ''),
(40, 4, 1, NULL, '1204', 12, '2025-10-08', 'disponível', ''),
(41, 4, 1, NULL, '1205', 12, '2025-10-08', 'disponível', ''),
(42, 4, 1, NULL, '1206', 12, '2025-10-08', 'disponível', ''),
(43, 4, 1, NULL, '1301', 13, '2025-10-08', 'disponível', ''),
(44, 4, 1, NULL, '1302', 13, '2025-10-08', 'disponível', ''),
(45, 4, 1, NULL, '1303', 13, '2025-10-08', 'disponível', ''),
(46, 4, 1, NULL, '1304', 13, '2025-10-08', 'disponível', ''),
(47, 4, 1, NULL, '1305', 13, '2025-10-08', 'disponível', ''),
(48, 4, 1, NULL, '1306', 13, '2025-10-08', 'disponível', ''),
(49, 4, 1, NULL, '1401', 14, '2025-10-08', 'disponível', ''),
(50, 4, 1, NULL, '1402', 14, '2025-10-08', 'disponível', ''),
(51, 4, 1, NULL, '1403', 14, '2025-10-08', 'disponível', ''),
(52, 4, 1, NULL, '1404', 14, '2025-10-08', 'disponível', ''),
(53, 4, 1, NULL, '1405', 14, '2025-10-08', 'disponível', ''),
(54, 4, 1, NULL, '1406', 14, '2025-10-08', 'disponível', ''),
(55, 4, 1, NULL, '1501', 15, '2025-10-08', 'disponível', ''),
(56, 4, 1, NULL, '1502', 15, '2025-10-08', 'disponível', ''),
(57, 4, 1, NULL, '1503', 15, '2025-10-08', 'disponível', ''),
(58, 4, 1, NULL, '1504', 15, '2025-10-08', 'disponível', ''),
(59, 4, 1, NULL, '1505', 15, '2025-10-08', 'disponível', ''),
(60, 4, 1, NULL, '1506', 15, '2025-10-08', 'disponível', ''),
(61, 4, 1, NULL, '1601', 16, '2025-10-08', 'disponível', ''),
(62, 4, 1, NULL, '1602', 16, '2025-10-08', 'disponível', ''),
(63, 4, 1, NULL, '1603', 16, '2025-10-08', 'disponível', ''),
(64, 4, 1, NULL, '1604', 16, '2025-10-08', 'disponível', ''),
(65, 4, 1, NULL, '1605', 16, '2025-10-08', 'disponível', ''),
(66, 4, 1, NULL, '1606', 16, '2025-10-08', 'disponível', '');

-- --------------------------------------------------------

--
-- Estrutura para tabela `unit_types`
--

CREATE TABLE `unit_types` (
  `id` int(11) NOT NULL,
  `position` varchar(2) NOT NULL,
  `parking_spots` int(11) NOT NULL,
  `bedrooms` varchar(50) NOT NULL,
  `area` decimal(5,2) NOT NULL,
  `base_price` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `activities`
--
ALTER TABLE `activities`
  ADD KEY `activities_ibfk_1` (`project_id`),
  ADD KEY `activities_ibfk_2` (`property_id`),
  ADD KEY `activities_ibfk_3` (`agent_id`);

--
-- Índices de tabela `agents`
--
ALTER TABLE `agents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Índices de tabela `agent_project_access`
--
ALTER TABLE `agent_project_access`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_agent_project` (`agent_id`,`project_id`);

--
-- Índices de tabela `agent_property_access`
--
ALTER TABLE `agent_property_access`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_agent_property` (`agent_id`,`property_id`),
  ADD KEY `agent_idx` (`agent_id`),
  ADD KEY `property_idx` (`property_id`);

--
-- Índices de tabela `agent_unit_access`
--
ALTER TABLE `agent_unit_access`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_agent_unit` (`agent_id`,`unit_id`);

--
-- Índices de tabela `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `agent_id` (`agent_id`),
  ADD KEY `lead_id` (`lead_id`),
  ADD KEY `appointments_ibfk_3` (`property_id`);

--
-- Índices de tabela `automations`
--
ALTER TABLE `automations`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `contacts`
--
ALTER TABLE `contacts`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `cub`
--
ALTER TABLE `cub`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `uploaded_by` (`uploaded_by`);

--
-- Índices de tabela `features`
--
ALTER TABLE `features`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `category` (`category`,`name`);

--
-- Índices de tabela `history`
--
ALTER TABLE `history`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `imobiliarias`
--
ALTER TABLE `imobiliarias`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `leads`
--
ALTER TABLE `leads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `agent_id` (`agent_id`);

--
-- Índices de tabela `lead_activities`
--
ALTER TABLE `lead_activities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `agent_activities_ibfk_1` (`agent_id`),
  ADD KEY `lead_activities_ibfk_1` (`lead_id`),
  ADD KEY `project_activities_ibfk_1` (`project_id`),
  ADD KEY `property_activities_ibfk_1` (`property_id`);

--
-- Índices de tabela `lead_tips`
--
ALTER TABLE `lead_tips`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lead_id` (`lead_id`),
  ADD KEY `tip_id` (`tip_id`);

--
-- Índices de tabela `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_type_idx` (`property_type`);

--
-- Índices de tabela `project_features`
--
ALTER TABLE `project_features`
  ADD PRIMARY KEY (`project_id`,`feature_id`),
  ADD KEY `feature_id` (`feature_id`);

--
-- Índices de tabela `properties`
--
ALTER TABLE `properties`
  ADD PRIMARY KEY (`id`),
  ADD KEY `agent_id` (`agent_id`),
  ADD KEY `id` (`id`);

--
-- Índices de tabela `property_features`
--
ALTER TABLE `property_features`
  ADD PRIMARY KEY (`property_id`,`feature_id`),
  ADD KEY `feature_id` (`feature_id`);

--
-- Índices de tabela `property_images`
--
ALTER TABLE `property_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `property_images_ibfk_2` (`project_id`),
  ADD KEY `property_images_ibfk_3` (`unit_id`);

--
-- Índices de tabela `property_images_backup_20250910_170754`
--
ALTER TABLE `property_images_backup_20250910_170754`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `property_images_ibfk_2` (`project_id`),
  ADD KEY `property_images_ibfk_3` (`unit_id`);

--
-- Índices de tabela `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Índices de tabela `sales_tables`
--
ALTER TABLE `sales_tables`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`);

--
-- Índices de tabela `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `key_name` (`key_name`);

--
-- Índices de tabela `tips`
--
ALTER TABLE `tips`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `towers`
--
ALTER TABLE `towers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`);

--
-- Índices de tabela `units`
--
ALTER TABLE `units`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `tower_id` (`tower_id`),
  ADD KEY `fk_unit_type_id` (`unit_type_id`);

--
-- Índices de tabela `unit_types`
--
ALTER TABLE `unit_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `position` (`position`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `agents`
--
ALTER TABLE `agents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de tabela `agent_project_access`
--
ALTER TABLE `agent_project_access`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `agent_property_access`
--
ALTER TABLE `agent_property_access`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `agent_unit_access`
--
ALTER TABLE `agent_unit_access`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `appointments`
--
ALTER TABLE `appointments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT de tabela `automations`
--
ALTER TABLE `automations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `contacts`
--
ALTER TABLE `contacts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `cub`
--
ALTER TABLE `cub`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de tabela `features`
--
ALTER TABLE `features`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;

--
-- AUTO_INCREMENT de tabela `history`
--
ALTER TABLE `history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT de tabela `imobiliarias`
--
ALTER TABLE `imobiliarias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `leads`
--
ALTER TABLE `leads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `lead_activities`
--
ALTER TABLE `lead_activities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT de tabela `lead_tips`
--
ALTER TABLE `lead_tips`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de tabela `properties`
--
ALTER TABLE `properties`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `property_images`
--
ALTER TABLE `property_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de tabela `property_images_backup_20250910_170754`
--
ALTER TABLE `property_images_backup_20250910_170754`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de tabela `reports`
--
ALTER TABLE `reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `sales_tables`
--
ALTER TABLE `sales_tables`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de tabela `tips`
--
ALTER TABLE `tips`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de tabela `towers`
--
ALTER TABLE `towers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `units`
--
ALTER TABLE `units`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=67;

--
-- AUTO_INCREMENT de tabela `unit_types`
--
ALTER TABLE `unit_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `activities`
--
ALTER TABLE `activities`
  ADD CONSTRAINT `activities_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  ADD CONSTRAINT `activities_ibfk_2` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`),
  ADD CONSTRAINT `activities_ibfk_3` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`);

--
-- Restrições para tabelas `agent_property_access`
--
ALTER TABLE `agent_property_access`
  ADD CONSTRAINT `fk_access_agent` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_access_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `appointments_ibfk_3` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Restrições para tabelas `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`),
  ADD CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `agents` (`id`);

--
-- Restrições para tabelas `leads`
--
ALTER TABLE `leads`
  ADD CONSTRAINT `leads_ibfk_1` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`);

--
-- Restrições para tabelas `lead_tips`
--
ALTER TABLE `lead_tips`
  ADD CONSTRAINT `lead_tips_ibfk_1` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `lead_tips_ibfk_2` FOREIGN KEY (`tip_id`) REFERENCES `tips` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `project_features`
--
ALTER TABLE `project_features`
  ADD CONSTRAINT `project_features_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `project_features_ibfk_2` FOREIGN KEY (`feature_id`) REFERENCES `features` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `properties`
--
ALTER TABLE `properties`
  ADD CONSTRAINT `properties_ibfk_1` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE SET NULL;

--
-- Restrições para tabelas `property_features`
--
ALTER TABLE `property_features`
  ADD CONSTRAINT `property_features_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `property_features_ibfk_2` FOREIGN KEY (`feature_id`) REFERENCES `features` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `property_images`
--
ALTER TABLE `property_images`
  ADD CONSTRAINT `property_images_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `property_images_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `property_images_ibfk_3` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `agents` (`id`);

--
-- Restrições para tabelas `sales_tables`
--
ALTER TABLE `sales_tables`
  ADD CONSTRAINT `sales_tables_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`);

--
-- Restrições para tabelas `towers`
--
ALTER TABLE `towers`
  ADD CONSTRAINT `towers_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `units`
--
ALTER TABLE `units`
  ADD CONSTRAINT `fk_unit_type_id` FOREIGN KEY (`unit_type_id`) REFERENCES `unit_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
