<?php
require_once __DIR__ . "/../models/SalesTable.php";

class SalesTableController
{
    private $model;

    public function __construct($db)
    {
        $this->model = new SalesTable($db);
    }

    private function parseRequest()
    {
        // Caso venha via FormData (upload)
        if (!empty($_FILES['files']['name'][0])) {
            $payload = json_decode($_POST['payload'] ?? '{}', true);
            $attachments = [];

            foreach ($_FILES['files']['tmp_name'] as $i => $tmpName) {
                $fileName = uniqid() . "_" . basename($_FILES['files']['name'][$i]);
                $targetPath = __DIR__ . "/../uploads/" . $fileName;

                if (!is_dir(__DIR__ . "/../uploads")) {
                    mkdir(__DIR__ . "/../uploads", 0777, true);
                }

                if (move_uploaded_file($tmpName, $targetPath)) {
                    $attachments[] = [
                        "name" => $_FILES['files']['name'][$i],
                        "path" => "/uploads/" . $fileName,
                        "size" => $_FILES['files']['size'][$i]
                    ];
                }
            }

            // Junta com os metadados
            if (!empty($attachments)) {
                $payload["attachments"] = array_merge(
                    $payload["attachments"] ?? [],
                    $attachments
                );
            }

            return $payload;
        }

        // Caso venha JSON puro
        $decoded = json_decode(file_get_contents("php://input"), true);
        return is_array($decoded) ? $decoded : [];
    }

    private function sanitizeAttachments($data)
    {
        if (!empty($data['attachments']) && is_array($data['attachments'])) {
            $clean = [];
            foreach ($data['attachments'] as $att) {
                if (is_array($att)) {
                    unset($att['fileObject']); // remove campo temporário do React
                    $clean[] = $att;
                }
            }
            $data['attachments'] = $clean;
        }
        return $data;
    }

    public function handleRequest($method, $id = null, $payload = null)
    {
        switch ($method) {
            case "GET":
                if ($id) {
                    echo json_encode($this->model->getById($id));
                } else {
                    echo json_encode($this->model->getAll());
                }
                break;

            case "POST":
                // Prefer payload passed by the public endpoint (already processed for multipart)
                $data = $payload ?? $this->parseRequest();
                $data = $this->sanitizeAttachments($data);

                $newId = $this->model->create($data);
                echo json_encode(["id" => $newId]);
                break;

            case "PUT":
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(["error" => "ID é obrigatório para atualizar"]);
                    return;
                }
                // Prefer payload passed in from public endpoint to avoid double file handling
                $data = $payload ?? $this->parseRequest();
                $data = $this->sanitizeAttachments($data);

                $this->model->update($id, $data);
                echo json_encode(["success" => true]);
                break;

            case "DELETE":
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(["error" => "ID é obrigatório para excluir"]);
                    return;
                }

                $this->model->delete($id);
                echo json_encode(["success" => true]);
                break;

            default:
                http_response_code(405);
                echo json_encode(["error" => "Método não permitido"]);
                break;
        }
    }
}
