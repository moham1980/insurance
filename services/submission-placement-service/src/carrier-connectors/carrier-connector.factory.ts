import { Injectable } from '@nestjs/common';
import { ICarrierConnector } from './carrier-connector.interface';
import { InternalConnectorAdapter } from './internal-connector.adapter';
import { RestConnectorAdapter } from './rest-connector.adapter';
import { SoapConnectorAdapter } from './soap-connector.adapter';
import { KafkaConnectorAdapter } from './kafka-connector.adapter';
import { ManualConnectorAdapter } from './manual-connector.adapter';
import { FederationConnectorAdapter } from './federation-connector.adapter';
import { CarrierConnectorRegistry } from './carrier-connector.registry';
import { ProductServiceClient } from '../clients/product-service.client';
import { WorkflowEngineClient } from '../clients/workflow-engine.client';

@Injectable()
export class CarrierConnectorFactory {
  constructor(
    private readonly registry: CarrierConnectorRegistry,
    private readonly productClient: ProductServiceClient,
    private readonly workflowClient: WorkflowEngineClient,
  ) {
    this.registerDefaultAdapters();
  }

  private registerDefaultAdapters(): void {
    this.registry.register('internal', new InternalConnectorAdapter(this.productClient));
    this.registry.register('rest', new RestConnectorAdapter());
    this.registry.register('soap', new SoapConnectorAdapter());
    this.registry.register('kafka', new KafkaConnectorAdapter());
    this.registry.register('manual', new ManualConnectorAdapter(this.workflowClient));
    this.registry.register('federation', new FederationConnectorAdapter());
  }

  getConnector(type: string): ICarrierConnector {
    const connector = this.registry.get(type);
    if (!connector) {
      throw new Error(`Unsupported connector type: ${type}`);
    }
    return connector;
  }
}
