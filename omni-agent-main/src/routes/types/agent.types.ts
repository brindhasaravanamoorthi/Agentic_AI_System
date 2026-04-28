// Agent types and interfaces for OmniAgent system

export interface AgentResponse {
  agentId: string;
  message: string;
  data?: any;
  timestamp: Date;
}

export interface DecisionProposal {
  id: string;
  type: 'restock' | 'discount' | 'alert' | 'support_response';
  proposedBy: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  reasoning: string;
  requiredApprovers: string[];
  expiresAt: Date;
}

export interface InventoryAlert {
  variantId: string;
  sku: string;
  productName: string;
  size?: string;
  color?: string;
  currentStock: number;
  threshold: number;
  avgDailySales: number;
  daysUntilStockout: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TrendAlert {
  variantId: string;
  sku: string;
  productName: string;
  baselineSales: number;
  recentSales: number;
  velocityMultiplier: number;
  currentStock: number;
  estimatedStockoutHours: string;
}

export interface AgentVote {
  approve: boolean;
  reasoning: string;
  analysis?: any;
}

export interface ConsensusResult {
  reached: boolean;
  approved: boolean;
  reason: string;
  votes: any[];
}
