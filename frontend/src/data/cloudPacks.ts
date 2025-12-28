/**
 * Cloud Pack definitions for quick object selection.
 * Each pack contains a predefined set of Salesforce objects
 * organized by cloud/product.
 */

export interface CloudPack {
  id: string;
  name: string;
  description: string;
  color: 'sales' | 'service';  // Color theme for the pack
  objects: string[]; // Salesforce API names
}

/**
 * Predefined Cloud Packs based on Salesforce data model documentation.
 * @see https://developer.salesforce.com/docs/platform/data-models/guide/sales-cloud-overview.html
 * @see https://developer.salesforce.com/docs/platform/data-models/guide/service-cloud-support-overview.html
 */
export const CLOUD_PACKS: CloudPack[] = [
  // ============================================
  // SALES CLOUD PACKS
  // ============================================
  {
    id: 'sales-cloud-overview',
    name: 'Sales Cloud Overview',
    description: 'Core sales objects for pipeline and revenue management',
    color: 'sales',
    objects: [
      'Account',
      'AccountContactRelation',
      'AccountTeamMember',
      'Asset',
      'Case',
      'Campaign',
      'CampaignMember',
      'Contact',
      'Contract',
      'ContractContactRole',
      'ForecastingItem',
      'Lead',
      'Opportunity',
      'Task',
      'Event',
      'OpportunityContactRole',
      'ForecastingFact',
      'OpportunityLineItem',
      'OpportunityTeamMember',
      'Order',
      'Partner',
      'PartnerRole',
      'PricebookEntry',
      'Product2',
      'Quote',
      'User',
      'Territory',
      'Territory2',
    ],
  },
  {
    id: 'sales-cloud-forecasting',
    name: 'Sales Cloud - Opportunity Forecasting',
    description: 'Forecasting and quota management objects',
    color: 'sales',
    objects: [
      'ForecastingAdjustment',
      'ForecastingFact',
      'ForecastingItem',
      'ForecastingOwnerAdjustment',
      'ForecastingQuota',
      'ForecastingType',
      'Period',
      'Territory',
      'Opportunity',
      'OpportunityLineItem',
      'OpportunityLineItemSchedule',
      'OpportunitySplit',
      'User',
    ],
  },
  {
    id: 'sales-cloud-products',
    name: 'Sales Cloud - Product & Price Book',
    description: 'Product catalog and pricing objects',
    color: 'sales',
    objects: [
      'Account',
      'Contract',
      'CurrencyType',
      'Opportunity',
      'OpportunityLineItem',
      'Order',
      'OrderItem',
      'Pricebook2',
      'PricebookEntry',
      'Product2',
      'QuoteLineItem',
      'Quote',
    ],
  },
  {
    id: 'sales-cloud-territory',
    name: 'Sales Cloud - Territory Management',
    description: 'Territory assignment and hierarchy objects',
    color: 'sales',
    objects: [
      'ObjectTerritory2AssignmentRule',
      'ObjectTerritory2AssignmentRuleItem',
      'ObjectTerritory2Association',
      'RuleTerritory2Association',
      'Territory2',
      'Territory2AlignmentLog',
      'Territory2Model',
      'Territory2ObjectExclusion',
      'Territory2ObjSharingConfig',
      'Territory2Type',
      'User',
      'UserTerritory2Association',
    ],
  },

  // ============================================
  // SERVICE CLOUD PACKS
  // ============================================
  {
    id: 'service-cloud-overview',
    name: 'Service Cloud Support Overview',
    description: 'Customer service and case management objects',
    color: 'service',
    objects: [
      'Account',
      'AccountContactRelation',
      'Case',
      'CaseArticle',
      'CaseComment',
      'CaseHistory',
      'CaseMilestone',
      'CaseRelatedIssue',
      'CaseSolution',
      'CaseTeamMember',
      'CaseTeamRole',
      'CategoryData',
      'CategoryNode',
      'Contact',
      'ContactRequest',
      'ContractLineItem',
      'EmailMessage',
      'Entitlement',
      'EntitlementContact',
      'Incident',
      'KnowledgeArticle',
      'KnowledgeArticleVersion',
      'Milestone',
      'Problem',
      'ServiceContract',
      'Solution',
      'Swarm',
      'SwarmMember',
    ],
  },
  {
    id: 'service-cloud-messaging',
    name: 'Service Cloud - Messaging Objects',
    description: 'Conversation and messaging channel objects',
    color: 'service',
    objects: [
      'Conversation',
      'ConversationEntry',
      'ConversationParticipant',
      'MessagingChannel',
      'MessagingEndUser',
      'MessagingSession',
      'Participant',
    ],
  },
  {
    id: 'service-cloud-employee',
    name: 'Service Cloud - Employee Service',
    description: 'Internal employee support objects',
    color: 'service',
    objects: [
      'Account',
      'AssociatedLocation',
      'Case',
      'Contact',
      'Employee',
      'InternalOrganizationUnit',
      'Location',
      'User',
    ],
  },
];
