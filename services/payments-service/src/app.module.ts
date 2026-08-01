import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConsumedEvent, DeadLetterEvent, OutboxEvent } from '@insurance/shared';
import { PaymentIntent } from './entities/PaymentIntent';
import { Payment } from './entities/Payment';
import { PaymentDispute } from './entities/PaymentDispute';
import { PaymentsController } from './payments.controller';
import { GatewayCallbackController } from './gateway-callback.controller';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { TenantGuard } from './tenant.guard';
import { PiiMaskingInterceptor } from './pii-masking.interceptor';
import { HealthController } from './health.controller';
import { AppDataSource } from './data-source';
import { BankPaymentProvider } from './psp/bank-payment.provider';
import { IranPspProvider } from './psp/iran-psp.provider';
import { MockPspProvider } from './psp/mock-psp.provider';
import { PSP_PROVIDER } from './psp/psp.provider.token';

function createPspProvider() {
  const name = process.env.PSP_PROVIDER || 'mock';
  if (name === 'bank') return new BankPaymentProvider();
  if (name === 'iran-psp') return new IranPspProvider();
  if (name === 'mock') return new MockPspProvider();
  return new MockPspProvider();
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      synchronize: process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([PaymentIntent, Payment, PaymentDispute, OutboxEvent, ConsumedEvent, DeadLetterEvent]),
  ],
  controllers: [PaymentsController, GatewayCallbackController, HealthController],
  providers: [
    PaymentsService,
    JwtAuthGuard,
    PermissionsGuard,
    TenantGuard,
    BankPaymentProvider,
    IranPspProvider,
    MockPspProvider,
    { provide: PSP_PROVIDER, useFactory: createPspProvider },
    { provide: APP_INTERCEPTOR, useClass: PiiMaskingInterceptor },
  ],
  exports: [PaymentsService],
})
export class AppModule {}
