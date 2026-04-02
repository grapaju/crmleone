<?php
require_once __DIR__ . "/../models/History.php";

class HistoryController
{
    private $model;

    public function __construct($db)
    {
        $this->model = new History($db);
    }

    public function handleRequest($method)
    {
        switch ($method) {
            case "GET":
                echo json_encode($this->model->getAll());
                break;

            case "POST":
                $data = json_decode(file_get_contents("php://input"), true);
                $newId = $this->model->create($data);
                echo json_encode(["id" => $newId]);
                break;
        }
    }
}
