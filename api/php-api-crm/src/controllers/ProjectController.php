<?php
require_once __DIR__ . '/../models/Project.php';

class ProjectController
{
    private $projectModel;

    public function __construct($db)
    {
        $this->projectModel = new Project($db);
    }

    public function index()
    {
        return $this->projectModel->getAll();
    }

    public function show($id)
    {
        return $this->projectModel->getById($id);
    }

    public function byProperty($propertyId)
    {
        return $this->projectModel->getByProperty($propertyId);
    }

    public function store($data)
    {
        return $this->projectModel->create($data);
    }

    public function update($id, $data)
    {
        return $this->projectModel->update($id, $data);
    }

    public function destroy($id)
    {
        return $this->projectModel->delete($id);
    }
}
