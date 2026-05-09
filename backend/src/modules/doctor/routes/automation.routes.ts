import { Router } from 'express';
import { AutomationController } from '../controllers/automation.controller';

const automationRouter = Router();

automationRouter.post('/booking-invite', AutomationController.sendBookingInvite);
automationRouter.post('/prescription-enquiry', AutomationController.sendPrescriptionEnquiry);
automationRouter.post('/follow-up', AutomationController.sendFollowUp);
automationRouter.post('/custom-message', AutomationController.sendCustomMessage);

export { automationRouter };
