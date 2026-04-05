<?php
require_once __DIR__ . '/../models/Unit.php';

class UnitController
{
    private $unitModel;

    public function __construct($db)
    {
        $this->unitModel = new Unit($db);
    }

    public function index()
    {
        return $this->unitModel->getAll();
    }

    public function show($id)
    {
        return $this->unitModel->getById($id);
    }

    public function byProject($projectId)
    {
        return $this->unitModel->getByProject($projectId);
    }

    public function store($data)
    {
        return $this->unitModel->create($data);
    }

    public function update($id, $data)
    {
        return $this->unitModel->update($id, $data);
    }

    public function destroy($id)
    {
        return $this->unitModel->delete($id);
    }

    public function recomputeCub($towerId = null)
    {
        return $this->unitModel->recomputeCub($towerId);
    }

    public function cubHistory($unitId = null)
    {
        // acesso direto à conexão interno do model (rápido e simples)
        try {
            $refObject = new ReflectionObject($this->unitModel);
            $pdoProp = $refObject->getProperty('pdo');
            $pdoProp->setAccessible(true);
            $pdo = $pdoProp->getValue($this->unitModel);
        } catch (Throwable $e) {
            return ['error' => 'PDO indisponível'];
        }
        try {
            $chk = $pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'unit_cub_history'");
            $chk->execute();
            if (((int)$chk->fetchColumn()) === 0) {
                return ['data' => []];
            }
            if ($unitId) {
                $stmt = $pdo->prepare("SELECT * FROM unit_cub_history WHERE unit_id = ? ORDER BY id DESC LIMIT 200");
                $stmt->execute([$unitId]);
            } else {
                $stmt = $pdo->query("SELECT * FROM unit_cub_history ORDER BY id DESC LIMIT 200");
            }
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return ['data' => $rows];
        } catch (Throwable $e) {
            return ['error' => $e->getMessage()];
        }
    }
}
