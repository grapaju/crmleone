<?php
require_once '../controllers/PropertyController.php';
require_once '../controllers/ConstructionProjectController.php';
require_once '../controllers/AgentController.php';
require_once '../controllers/LeadController.php';
require_once '../controllers/ContactController.php';
require_once '../controllers/CalendarController.php';
require_once '../controllers/DocumentController.php';
require_once '../controllers/SalesTableController.php';
require_once '../controllers/ReportController.php';
require_once '../controllers/SettingsController.php';

$propertyController = new PropertyController();
$constructionProjectController = new ConstructionProjectController();
$agentController = new AgentController();
$leadController = new LeadController();
$contactController = new ContactController();
$calendarController = new CalendarController();
$documentController = new DocumentController();
$salesTableController = new SalesTableController();
$reportController = new ReportController();
$settingsController = new SettingsController();

$router = new Router();

$router->post('/properties', [$propertyController, 'create']);
$router->get('/properties', [$propertyController, 'index']);
$router->get('/properties/{id}', [$propertyController, 'show']);
$router->put('/properties/{id}', [$propertyController, 'update']);
$router->delete('/properties/{id}', [$propertyController, 'delete']);

$router->post('/construction-projects', [$constructionProjectController, 'create']);
$router->get('/construction-projects', [$constructionProjectController, 'index']);
$router->get('/construction-projects/{id}', [$constructionProjectController, 'show']);
$router->put('/construction-projects/{id}', [$constructionProjectController, 'update']);
$router->delete('/construction-projects/{id}', [$constructionProjectController, 'delete']);

$router->post('/agents', [$agentController, 'create']);
$router->get('/agents', [$agentController, 'index']);
$router->get('/agents/{id}', [$agentController, 'show']);
$router->put('/agents/{id}', [$agentController, 'update']);
$router->delete('/agents/{id}', [$agentController, 'delete']);

$router->post('/leads', [$leadController, 'create']);
$router->get('/leads', [$leadController, 'index']);
$router->get('/leads/{id}', [$leadController, 'show']);
$router->put('/leads/{id}', [$leadController, 'update']);
$router->delete('/leads/{id}', [$leadController, 'delete']);

$router->post('/contacts', [$contactController, 'create']);
$router->get('/contacts', [$contactController, 'index']);
$router->get('/contacts/{id}', [$contactController, 'show']);
$router->put('/contacts/{id}', [$contactController, 'update']);
$router->delete('/contacts/{id}', [$contactController, 'delete']);

$router->post('/calendar', [$calendarController, 'create']);
$router->get('/calendar', [$calendarController, 'index']);
$router->get('/calendar/{id}', [$calendarController, 'show']);
$router->put('/calendar/{id}', [$calendarController, 'update']);
$router->delete('/calendar/{id}', [$calendarController, 'delete']);

$router->post('/documents', [$documentController, 'create']);
$router->get('/documents', [$documentController, 'index']);
$router->get('/documents/{id}', [$documentController, 'show']);
$router->put('/documents/{id}', [$documentController, 'update']);
$router->delete('/documents/{id}', [$documentController, 'delete']);

$router->post('/sales-tables', [$salesTableController, 'create']);
$router->get('/sales-tables', [$salesTableController, 'index']);
$router->get('/sales-tables/{id}', [$salesTableController, 'show']);
$router->put('/sales-tables/{id}', [$salesTableController, 'update']);
$router->delete('/sales-tables/{id}', [$salesTableController, 'delete']);

$router->post('/reports', [$reportController, 'create']);
$router->get('/reports', [$reportController, 'index']);
$router->get('/reports/{id}', [$reportController, 'show']);
$router->put('/reports/{id}', [$reportController, 'update']);
$router->delete('/reports/{id}', [$reportController, 'delete']);

$router->post('/settings', [$settingsController, 'create']);
$router->get('/settings', [$settingsController, 'index']);
$router->get('/settings/{id}', [$settingsController, 'show']);
$router->put('/settings/{id}', [$settingsController, 'update']);
$router->delete('/settings/{id}', [$settingsController, 'delete']);

$router->run();