import { AppDataSource } from './src/config/data-source';
import { InventoryItem } from './src/entities/inventory-item.entity';

async function check() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(InventoryItem);
    const count = await repo.count();
    const items = await repo.find({ take: 5 });
    console.log('Total items in DB:', count);
    console.log('Sample items (clinicId):', items.map(i => ({ name: i.itemName, clinicId: i.clinicId })));
    await AppDataSource.destroy();
}

check().catch(console.error);
