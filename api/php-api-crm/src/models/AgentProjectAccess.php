<?php
class AgentProjectAccess {
    private $db; private $table='agent_project_access';
    public function __construct($db){ $this->db=$db; $this->ensure(); }
    private function ensure(){ try{ $r=$this->db->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'agent_project_access'"); $r->execute(); if((int)$r->fetchColumn()===0){ $this->db->exec("CREATE TABLE IF NOT EXISTS agent_project_access (id BIGSERIAL PRIMARY KEY, agent_id BIGINT NOT NULL, project_id BIGINT NOT NULL, can_edit BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, CONSTRAINT uniq_agent_project UNIQUE(agent_id,project_id));"); } } catch(Exception $e){} }
    public function listIds($agentId){ try{ $st=$this->db->prepare("SELECT project_id FROM {$this->table} WHERE agent_id=:a"); $st->execute([':a'=>$agentId]); return array_map('intval',$st->fetchAll(PDO::FETCH_COLUMN)); }catch(Exception $e){ return []; } }
    public function replace($agentId,$ids,$canEdit=0){ $this->db->beginTransaction(); try{ $this->db->prepare("DELETE FROM {$this->table} WHERE agent_id=?")->execute([$agentId]); if($ids){ $ins=$this->db->prepare("INSERT INTO {$this->table} (agent_id,project_id,can_edit) VALUES (?,?,?)"); foreach($ids as $id){ $ins->execute([$agentId,$id,$canEdit?1:0]); } } $this->db->commit(); return true; }catch(Exception $e){ $this->db->rollBack(); return false; } }
}
