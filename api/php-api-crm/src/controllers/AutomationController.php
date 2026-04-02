<?php
require_once __DIR__ . "/../models/Automation.php";

class AutomationController
{
    private $model;

    public function __construct($db)
    {
        $this->model = new Automation($db);
    }

    public function handleRequest($method, $id = null, $toggle = false)
    {
        switch ($method) {
            case "GET":
                echo json_encode($this->model->getAll());
                break;

            case "DELETE":
                $this->model->delete($id);
                echo json_encode(["success" => true]);
                break;

            case "PATCH":
                if ($toggle) {
                    $this->model->toggle($id);
                    echo json_encode(["success" => true]);
                }
                break;
        }
    }
}
