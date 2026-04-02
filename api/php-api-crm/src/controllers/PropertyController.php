<?php

require_once __DIR__ . '/../models/Property.php';

class PropertyController
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function create($data)
    {
        $property = new Property($this->db);
        return $property->create($data);
    }

    public function read($id)
    {
        $property = new Property($this->db);
        return $property->read($id);
    }

    public function readAll()
    {
        $property = new Property($this->db);
        return $property->readAll();
    }

    public function update($id, $data)
    {
        $property = new Property($this->db);
        return $property->update($id, $data);
    }

    public function delete($id)
    {
        $property = new Property($this->db);
        return $property->delete($id);
    }
}
