<?php
require_once __DIR__ . '/../models/Contact.php';

class ContactController
{
    private $contactModel;

    public function __construct($dbConnection)
    {
        $this->contactModel = new Contact($dbConnection);
    }

    public function create($data)
    {
        return $this->contactModel->create($data);
    }

    public function read($id)
    {
        return $this->contactModel->read($id);
    }

    public function update($id, $data)
    {
        return $this->contactModel->update($id, $data);
    }

    public function delete($id)
    {
        return $this->contactModel->delete($id);
    }

    public function readAll()
    {
        return $this->contactModel->readAll();
    }
}
