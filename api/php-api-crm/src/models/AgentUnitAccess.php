<?php
class AgentUnitAccess {
    private $db; private $table='agent_unit_access';
    public function __construct($db){ $this->db=$db; $this->ensure(); }
    private function ensure(){ try{ $r=$this->db->query("SHOW TABLES LIKE 'agent_unit_access'"); if($r->rowCount()==0){ $this->db->exec("CREATE TABLE IF NOT EXISTS agent_unit_access (id INT AUTO_INCREMENT PRIMARY KEY, agent_id INT NOT NULL, unit_id INT NOT NULL, can_edit TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uniq_agent_unit(agent_id,unit_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"); } } catch(Exception $e){} }
    public function listIds($agentId){ try{ $st=$this->db->prepare("SELECT unit_id FROM {$this->table} WHERE agent_id=:a"); $st->execute([':a'=>$agentId]); return array_map('intval',$st->fetchAll(PDO::FETCH_COLUMN)); }catch(Exception $e){ return []; } }
    public function replace($agentId,$ids,$canEdit=0){ $this->db->beginTransaction(); try{ $this->db->prepare("DELETE FROM {$this->table} WHERE agent_id=?")->execute([$agentId]); if($ids){ $ins=$this->db->prepare("INSERT INTO {$this->table} (agent_id,unit_id,can_edit) VALUES (?,?,?)"); foreach($ids as $id){ $ins->execute([$agentId,$id,$canEdit?1:0]); } } $this->db->commit(); return true; }catch(Exception $e){ $this->db->rollBack(); return false; } }
}
