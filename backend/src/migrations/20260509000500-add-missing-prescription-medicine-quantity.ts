import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingPrescriptionMedicineQuantity20260509000500
  implements MigrationInterface
{
  name = 'AddMissingPrescriptionMedicineQuantity20260509000500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasQuantity = await queryRunner.hasColumn(
      'prescription_medicines',
      'quantity',
    );

    if (!hasQuantity) {
      await queryRunner.query(
        `ALTER TABLE "prescription_medicines" ADD "quantity" integer NOT NULL DEFAULT 1`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasQuantity = await queryRunner.hasColumn(
      'prescription_medicines',
      'quantity',
    );

    if (hasQuantity) {
      await queryRunner.query(
        `ALTER TABLE "prescription_medicines" DROP COLUMN "quantity"`,
      );
    }
  }
}
