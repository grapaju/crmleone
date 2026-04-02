<?php
require_once __DIR__ . '/../models/Feature.php';

class FeatureController
{
    private $featureModel;

    public function __construct($db)
    {
        $this->featureModel = new Feature($db);
    }

    public function index()
    {
        return $this->featureModel->getAll();
    }

    public function show($id)
    {
        return $this->featureModel->getById($id);
    }

    public function store($data)
    {
        return $this->featureModel->create($data);
    }

    public function update($id, $data)
    {
        return $this->featureModel->update($id, $data);
    }

    public function destroy($id)
    {
        return $this->featureModel->delete($id);
    }
}
