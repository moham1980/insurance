import { Injectable } from '@nestjs/common';

export interface ServiceEndpoint {
  baseUrl: string;
  timeoutMs: number;
}

@Injectable()
export class ClientRegistry {
  product(): ServiceEndpoint {
    return { baseUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:18018', timeoutMs: 15000 };
  }
  policy(): ServiceEndpoint {
    return { baseUrl: process.env.POLICY_SERVICE_URL || 'http://localhost:3019', timeoutMs: 30000 };
  }
  billing(): ServiceEndpoint {
    return { baseUrl: process.env.BILLING_SERVICE_URL || 'http://localhost:3022', timeoutMs: 15000 };
  }
  underwriting(): ServiceEndpoint {
    return { baseUrl: process.env.UNDERWRITING_SERVICE_URL || 'http://localhost:3024', timeoutMs: 15000 };
  }
  fraud(): ServiceEndpoint {
    return { baseUrl: process.env.FRAUD_SERVICE_URL || 'http://localhost:3021', timeoutMs: 15000 };
  }
  salesNetwork(): ServiceEndpoint {
    return { baseUrl: process.env.SALES_NETWORK_SERVICE_URL || 'http://localhost:3020', timeoutMs: 15000 };
  }
  workflowEngine(): ServiceEndpoint {
    return { baseUrl: process.env.WORKFLOW_ENGINE_SERVICE_URL || 'http://localhost:3023', timeoutMs: 15000 };
  }
}
