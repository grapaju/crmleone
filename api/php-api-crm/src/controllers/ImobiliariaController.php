<?php
require_once __DIR__ . '/../models/Imobiliaria.php';

class ImobiliariaController
{
    private $model;

    public function __construct($db)
    {
        $this->model = new Imobiliaria($db);
    }

    public function getAll()
    {
        return $this->model->getAll();
    }

    public function getById($id)
    {
        return $this->model->getById($id);
    }

    public function create($data)
    {
        if (!isset($data['name']) || !$data['name']) return false;
        return $this->model->create($data['name']);
    }

    public function update($id, $data)
    {
        if (!isset($data['name']) || !$data['name']) return false;
        return $this->model->update($id, $data['name']);
    }

    public function delete($id)
    {
        return $this->model->delete($id);
    }
}
