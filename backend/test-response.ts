import { adminSupportService } from './src/modules/admin/services/admin-support.service';
import { AppDataSource } from './src/config/data-source';

async function test() {
  try {
    await AppDataSource.initialize();
    console.log('DB connected');
    
    const tickets = await AppDataSource.query("SELECT id FROM support_tickets ORDER BY created_at DESC LIMIT 1");
    if (tickets.length === 0) {
      console.log('No tickets found');
      process.exit(0);
    }
    
    const ticketId = tickets[0].id;
    console.log('Testing response for ticket:', ticketId);
    
    await adminSupportService.respondToTicket(ticketId, {
      method: 'email',
      message: 'This is a test response from the system.',
    }, 'admin-test@careloop.com');
    
    console.log('Test completed');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

test();
