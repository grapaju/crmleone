<?php
require_once __DIR__ . '/../models/Tower.php';

class TowerController
{
    private $towerModel;

    public function __construct($db)
    {
        $this->towerModel = new Tower($db);
    }

    public function index()
    {
        return $this->towerModel->getAll();
    }

    public function show($id)
    {
        return $this->towerModel->getById($id);
    }

    public function byProject($projectId)
    {
        return $this->towerModel->getByProject($projectId);
    }

    public function store($data)
    {
        return $this->towerModel->create($data);
    }

    public function update($id, $data)
    {
        return $this->towerModel->update($id, $data);
    }

    public function destroy($id)
    {
        return $this->towerModel->delete($id);
    }
}
