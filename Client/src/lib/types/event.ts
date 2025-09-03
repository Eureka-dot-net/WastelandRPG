export interface ColonyEvent {
  timestamp: string;  // ISO date string
  type: string;       // event type (settler, assignment, exploration, etc.)
  message: string;    // human-readable message
  meta?: {
    settlerId?: string;
    assignmentId?: string;
    [key: string]: unknown;
  };
}

export interface EventWithAction extends ColonyEvent {
  actionRequired?: 'settler-accept' | 'settler-reject';
  actionData?: {
    settlerId: string;
    settlerName?: string;
  };
}