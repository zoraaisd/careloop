import { Router } from 'express';
import { WhatsappHealthcareController } from '../controllers/whatsapp-healthcare.controller';
import { authenticateToken } from '../../../common/middleware/authenticate-token';

const whatsappHealthcareRouter = Router();

// Public routes (Webhook)
whatsappHealthcareRouter.get('/whatsapp/webhook', WhatsappHealthcareController.whatsappWebhook);
whatsappHealthcareRouter.post('/whatsapp/webhook', WhatsappHealthcareController.whatsappWebhook);

// Protected routes (Doctor Dashboard)
whatsappHealthcareRouter.use(authenticateToken);

whatsappHealthcareRouter.get('/stats', WhatsappHealthcareController.getStats);
whatsappHealthcareRouter.get('/subscription/plans', WhatsappHealthcareController.getSubscriptionPlans);
whatsappHealthcareRouter.post('/subscription/checkout', WhatsappHealthcareController.createSubscriptionCheckout);
whatsappHealthcareRouter.post('/subscription/verify', WhatsappHealthcareController.verifySubscriptionCheckout);
whatsappHealthcareRouter.get('/patients', WhatsappHealthcareController.getPatients);
whatsappHealthcareRouter.post('/patients', WhatsappHealthcareController.createPatient);
whatsappHealthcareRouter.get('/patients/:id/dashboard', WhatsappHealthcareController.getPatientDashboard);
whatsappHealthcareRouter.put('/patients/:id', WhatsappHealthcareController.updatePatient);
whatsappHealthcareRouter.delete('/patients/:id', WhatsappHealthcareController.deletePatient);
whatsappHealthcareRouter.get('/patients/:id/documents', WhatsappHealthcareController.getPatientDocuments);
whatsappHealthcareRouter.post('/patients/:id/documents', WhatsappHealthcareController.addPatientDocument);
whatsappHealthcareRouter.delete('/patients/:id/documents/:docId', WhatsappHealthcareController.deletePatientDocument);
whatsappHealthcareRouter.post('/patients/:id/documents/:docId/share', WhatsappHealthcareController.sharePatientDocument);
whatsappHealthcareRouter.get('/appointments', WhatsappHealthcareController.getAppointments);
whatsappHealthcareRouter.post('/appointments', WhatsappHealthcareController.createAppointment);
whatsappHealthcareRouter.put('/appointments/:id', WhatsappHealthcareController.updateAppointment);
whatsappHealthcareRouter.get('/inventory', WhatsappHealthcareController.getInventory);
whatsappHealthcareRouter.post('/inventory', WhatsappHealthcareController.createInventoryItem);
whatsappHealthcareRouter.delete('/inventory/:id', WhatsappHealthcareController.deleteInventoryItem);
whatsappHealthcareRouter.get('/expenses', WhatsappHealthcareController.getExpenses);
whatsappHealthcareRouter.post('/expenses', WhatsappHealthcareController.createExpense);
whatsappHealthcareRouter.delete('/expenses/:id', WhatsappHealthcareController.deleteExpense);
whatsappHealthcareRouter.get('/doctors', WhatsappHealthcareController.getDoctors);
whatsappHealthcareRouter.get('/prescriptions', WhatsappHealthcareController.getPrescriptions);
whatsappHealthcareRouter.post('/prescriptions', WhatsappHealthcareController.createPrescription);
whatsappHealthcareRouter.post('/prescriptions/send-whatsapp/:id', WhatsappHealthcareController.resendPrescription);
whatsappHealthcareRouter.get('/chat', WhatsappHealthcareController.getChat);
whatsappHealthcareRouter.get('/chat/:id', WhatsappHealthcareController.getChatMessages);
whatsappHealthcareRouter.post('/chat/:id/read', WhatsappHealthcareController.markChatRead);
whatsappHealthcareRouter.post('/chat/send', WhatsappHealthcareController.sendChatMessage);
whatsappHealthcareRouter.get('/messages', WhatsappHealthcareController.getMessages);
whatsappHealthcareRouter.post('/doctor/send-automation/:id', WhatsappHealthcareController.sendAutomation);
whatsappHealthcareRouter.post('/verify/send-otp', WhatsappHealthcareController.sendOTP);
whatsappHealthcareRouter.post('/verify/confirm-otp', WhatsappHealthcareController.confirmOTP);
whatsappHealthcareRouter.get('/slots', WhatsappHealthcareController.getSlots);
whatsappHealthcareRouter.post('/slots/send-to-patient/:id', WhatsappHealthcareController.sendSlotsToPatient);
whatsappHealthcareRouter.get('/support/tickets', WhatsappHealthcareController.getSupportTickets);
whatsappHealthcareRouter.post('/support/tickets', WhatsappHealthcareController.createSupportTicket);

// Port other routes from server.js as needed...

export { whatsappHealthcareRouter };
