<?php
require_once __DIR__ . "/../models/Calendar.php";

class CalendarController
{
    private $model;

    public function __construct($db)
    {
        $this->model = new Calendar($db);
    }

    public function getAppointments()
    {
        return $this->model->readAll();
    }

    public function getAppointmentById($id)
    {
        return $this->model->read($id);
    }

    public function createAppointment($data)
    {
        return $this->model->create($data);
    }

    public function updateAppointment($id, $data)
    {
        return $this->model->update($id, $data);
    }

    public function deleteAppointment($id)
    {
        return $this->model->delete($id);
    }
}
