import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLastCheckToUpstream1768121520682 implements MigrationInterface {
    name = 'AddLastCheckToUpstream1768121520682'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tokens" DROP CONSTRAINT "FK_8769073e38c365f315426554ca5"`);
        await queryRunner.query(`ALTER TABLE "gateway_ports" DROP CONSTRAINT "FK_bed9ad6010d51ebb680e3865968"`);
        await queryRunner.query(`ALTER TABLE "port_mappings" DROP CONSTRAINT "FK_1c6f976af7b679e3b4db3981751"`);
        await queryRunner.query(`ALTER TABLE "port_mappings" DROP CONSTRAINT "FK_9b3713b386418711587b19ac7d8"`);
        await queryRunner.query(`ALTER TABLE "port_mappings" DROP CONSTRAINT "FK_7d1e0e86b4cefbc4a44cbc9137b"`);
        await queryRunner.query(`ALTER TABLE "port_mappings" DROP CONSTRAINT "FK_3996e817503f7f14b8c9a3807b0"`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" DROP CONSTRAINT "FK_8e412e38c7e213f0c3489bcf064"`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" DROP CONSTRAINT "FK_741678eec7b4cd9a6415e6b92d2"`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" DROP CONSTRAINT "FK_dbbd1ecdae862f0519f23b6177e"`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" DROP CONSTRAINT "FK_3a7d7c844b81eb7b9c8b41065c7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_port_mappings_gateway_port"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_port_mappings_user_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_proxy_purchases_user_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_proxy_purchases_expires_at"`);
        await queryRunner.query(`ALTER TABLE "socks5_upstreams" ADD "last_check" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "socks5_upstreams" ADD "consecutive_failures" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "tokens" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "socks5_upstreams" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "socks5_upstreams" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "gateways" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "gateways" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "gateway_ports" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "gateway_ports" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "port_mappings" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "port_mappings" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "socks5_proxies" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "socks5_proxies" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX "IDX_99c53220f57501b44655608d89" ON "port_mappings" ("user_id", "status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5784ef3ee9685fc4d603991489" ON "port_mappings" ("gateway_id", "port") `);
        await queryRunner.query(`CREATE INDEX "IDX_a8d8475208e6c8803415026719" ON "user_proxy_purchases" ("expires_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_f23c407dfdb0893917400351d6" ON "user_proxy_purchases" ("user_id", "status") `);
        await queryRunner.query(`ALTER TABLE "tokens" ADD CONSTRAINT "FK_8769073e38c365f315426554ca5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "gateway_ports" ADD CONSTRAINT "FK_bed9ad6010d51ebb680e3865968" FOREIGN KEY ("gateway_id") REFERENCES "gateways"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "port_mappings" ADD CONSTRAINT "FK_1c6f976af7b679e3b4db3981751" FOREIGN KEY ("gateway_id") REFERENCES "gateways"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "port_mappings" ADD CONSTRAINT "FK_9b3713b386418711587b19ac7d8" FOREIGN KEY ("port_id") REFERENCES "gateway_ports"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "port_mappings" ADD CONSTRAINT "FK_7d1e0e86b4cefbc4a44cbc9137b" FOREIGN KEY ("upstream_id") REFERENCES "socks5_upstreams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "port_mappings" ADD CONSTRAINT "FK_3996e817503f7f14b8c9a3807b0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" ADD CONSTRAINT "FK_8e412e38c7e213f0c3489bcf064" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" ADD CONSTRAINT "FK_741678eec7b4cd9a6415e6b92d2" FOREIGN KEY ("gateway_id") REFERENCES "gateways"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" ADD CONSTRAINT "FK_dbbd1ecdae862f0519f23b6177e" FOREIGN KEY ("port_id") REFERENCES "gateway_ports"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" ADD CONSTRAINT "FK_3a7d7c844b81eb7b9c8b41065c7" FOREIGN KEY ("mapping_id") REFERENCES "port_mappings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" DROP CONSTRAINT "FK_3a7d7c844b81eb7b9c8b41065c7"`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" DROP CONSTRAINT "FK_dbbd1ecdae862f0519f23b6177e"`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" DROP CONSTRAINT "FK_741678eec7b4cd9a6415e6b92d2"`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" DROP CONSTRAINT "FK_8e412e38c7e213f0c3489bcf064"`);
        await queryRunner.query(`ALTER TABLE "port_mappings" DROP CONSTRAINT "FK_3996e817503f7f14b8c9a3807b0"`);
        await queryRunner.query(`ALTER TABLE "port_mappings" DROP CONSTRAINT "FK_7d1e0e86b4cefbc4a44cbc9137b"`);
        await queryRunner.query(`ALTER TABLE "port_mappings" DROP CONSTRAINT "FK_9b3713b386418711587b19ac7d8"`);
        await queryRunner.query(`ALTER TABLE "port_mappings" DROP CONSTRAINT "FK_1c6f976af7b679e3b4db3981751"`);
        await queryRunner.query(`ALTER TABLE "gateway_ports" DROP CONSTRAINT "FK_bed9ad6010d51ebb680e3865968"`);
        await queryRunner.query(`ALTER TABLE "tokens" DROP CONSTRAINT "FK_8769073e38c365f315426554ca5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f23c407dfdb0893917400351d6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a8d8475208e6c8803415026719"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5784ef3ee9685fc4d603991489"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_99c53220f57501b44655608d89"`);
        await queryRunner.query(`ALTER TABLE "socks5_proxies" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "socks5_proxies" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "port_mappings" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "port_mappings" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "gateway_ports" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "gateway_ports" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "gateways" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "gateways" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "socks5_upstreams" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "socks5_upstreams" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "tokens" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "socks5_upstreams" DROP COLUMN "consecutive_failures"`);
        await queryRunner.query(`ALTER TABLE "socks5_upstreams" DROP COLUMN "last_check"`);
        await queryRunner.query(`CREATE INDEX "IDX_user_proxy_purchases_expires_at" ON "user_proxy_purchases" ("expires_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_user_proxy_purchases_user_status" ON "user_proxy_purchases" ("user_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_port_mappings_user_status" ON "port_mappings" ("user_id", "status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_port_mappings_gateway_port" ON "port_mappings" ("gateway_id", "port") `);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" ADD CONSTRAINT "FK_3a7d7c844b81eb7b9c8b41065c7" FOREIGN KEY ("mapping_id") REFERENCES "port_mappings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" ADD CONSTRAINT "FK_dbbd1ecdae862f0519f23b6177e" FOREIGN KEY ("port_id") REFERENCES "gateway_ports"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" ADD CONSTRAINT "FK_741678eec7b4cd9a6415e6b92d2" FOREIGN KEY ("gateway_id") REFERENCES "gateways"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_proxy_purchases" ADD CONSTRAINT "FK_8e412e38c7e213f0c3489bcf064" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "port_mappings" ADD CONSTRAINT "FK_3996e817503f7f14b8c9a3807b0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "port_mappings" ADD CONSTRAINT "FK_7d1e0e86b4cefbc4a44cbc9137b" FOREIGN KEY ("upstream_id") REFERENCES "socks5_upstreams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "port_mappings" ADD CONSTRAINT "FK_9b3713b386418711587b19ac7d8" FOREIGN KEY ("port_id") REFERENCES "gateway_ports"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "port_mappings" ADD CONSTRAINT "FK_1c6f976af7b679e3b4db3981751" FOREIGN KEY ("gateway_id") REFERENCES "gateways"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "gateway_ports" ADD CONSTRAINT "FK_bed9ad6010d51ebb680e3865968" FOREIGN KEY ("gateway_id") REFERENCES "gateways"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tokens" ADD CONSTRAINT "FK_8769073e38c365f315426554ca5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
