/**
 * Cloud Pack definitions for quick object selection.
 * Each pack contains a predefined set of Salesforce objects
 * organized by cloud/product.
 */

export interface CloudPack {
  id: string;
  name: string;
  icon: string;
  description: string;
  objects: string[]; // Salesforce API names
}

/**
 * Predefined Cloud Packs based on Salesforce data model documentation.
 * @see https://developer.salesforce.com/docs/platform/data-models/guide/sales-cloud-overview.html
 */
export const CLOUD_PACKS: CloudPack[] = [
  {
    id: 'sales-cloud',
    name: 'Sales Cloud',
    icon: '☁️',
    description: 'Core sales objects for pipeline and revenue management',
    objects: [
      'Account',
      'Contact',
      'Lead',
      'Opportunity',
      'Campaign',
      'CampaignMember',
      'Asset',
      'Case',
      'Contract',
      'Order',
      'OrderItem',
      'Quote',
      'QuoteLineItem',
      'Pricebook2',
      'PricebookEntry',
      'Product2',
      'OpportunityLineItem',
      'OpportunityContactRole',
      'Partner',
      'Task',
      'Event',
    ],
  },
  {
    id: 'service-cloud',
    name: 'Service Cloud',
    icon: '🎧',
    description: 'Customer service and support objects',
    objects: [
      'Case',
      'CaseComment',
      'CaseHistory',
      'CaseTeamMember',
      'CaseTeamRole',
      'Entitlement',
      'EntitlementContact',
      'ServiceContract',
      'ContractLineItem',
      'Asset',
      'AssetRelationship',
      'Incident',
      'Problem',
      'ChangeRequest',
      'Knowledge__kav',
      'WorkOrder',
      'WorkOrderLineItem',
      'ServiceAppointment',
      'ServiceResource',
      'ServiceTerritory',
      'Skill',
    ],
  },
  {
    id: 'health-cloud',
    name: 'Health Cloud',
    icon: '🏥',
    description: 'Healthcare and life sciences objects',
    objects: [
      'Account',
      'Contact',
      'HealthcareProvider',
      'HealthcareFacility',
      'HealthcarePractitionerFacility',
      'CareProgram',
      'CareProgramEnrollee',
      'CareProgramProduct',
      'CarePlan',
      'CarePlanTemplate',
      'CareBarrier',
      'CareMetricTarget',
      'ClinicalEncounter',
      'PatientMedication',
      'MedicationStatement',
      'Coverage',
      'CoverageBenefit',
      'Claim',
      'ClaimItem',
      'CareRequest',
      'CareRequestItem',
      'Identifier',
      'ContactEncounter',
    ],
  },
];
