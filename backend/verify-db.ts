import { AppDataSource } from './src/config/data-source';

async function verify() {
    await AppDataSource.initialize();
    const queryRunner = AppDataSource.createQueryRunner();
    const table = await queryRunner.getTable('inventory_items');
    console.log('Columns in inventory_items:', table?.columns.map(c => c.name));
    await AppDataSource.destroy();
}

verify().catch(console.error);
