import { Injectable } from '@nestjs/common';
import { ICarrierConnector } from './carrier-connector.interface';

@Injectable()
export class CarrierConnectorRegistry {
  private readonly connectors = new Map<string, ICarrierConnector>();

  register(name: string, connector: ICarrierConnector): void {
    this.connectors.set(name, connector);
  }

  get(name: string): ICarrierConnector | undefined {
    return this.connectors.get(name);
  }

  list(): string[] {
    return Array.from(this.connectors.keys());
  }
}
