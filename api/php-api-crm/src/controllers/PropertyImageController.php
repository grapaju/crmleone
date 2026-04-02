<?php
require_once __DIR__ . '/../models/PropertyImage.php';

class PropertyImageController
{
    private $propertyImageModel;

    public function __construct($db)
    {
        $this->propertyImageModel = new PropertyImage($db);
    }

    public function index()
    {
        return $this->propertyImageModel->getAll();
    }

    public function show($id)
    {
        return $this->propertyImageModel->getById($id);
    }

    public function byProperty($propertyId)
    {
        return $this->propertyImageModel->getByProperty($propertyId);
    }

    public function byProject($projectId)
    {
        return $this->propertyImageModel->getByProject($projectId);
    }

    public function byUnit($unitId)
    {
        return $this->propertyImageModel->getByUnit($unitId);
    }

    public function store($data)
    {
        $logFile = __DIR__ . '/../../logs/property_images.log';
        @file_put_contents($logFile, date(DATE_ATOM) . " - controller.store called with data: " . json_encode($data) . PHP_EOL, FILE_APPEND);
        return $this->propertyImageModel->create($data);
    }

    public function update($id, $data)
    {
        $logFile = __DIR__ . '/../../logs/property_images.log';
        @file_put_contents($logFile, date(DATE_ATOM) . " - controller.update id={$id} data: " . json_encode($data) . PHP_EOL, FILE_APPEND);
        return $this->propertyImageModel->update($id, $data);
    }

    public function destroy($id)
    {
        $logFile = __DIR__ . '/../../logs/property_images.log';
        @file_put_contents($logFile, date(DATE_ATOM) . " - controller.destroy id={$id}" . PHP_EOL, FILE_APPEND);
        return $this->propertyImageModel->delete($id);
    }
}
