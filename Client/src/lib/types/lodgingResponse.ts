export interface Bed {
  level: number;
}

export interface LodgingAPI {
  _id: string;
  colonyId: string;
  maxBeds: number;
  beds: Bed[];
}

export interface LodgingResponse {
  lodging: LodgingAPI;
}

export interface SleepPreviewResult {
  settlerId: string;
  settlerName: string;
  bedType: number;
  duration: number;
  canSleep: boolean;
  reason?: string;
}

export interface BatchSleepPreviewResult {
  results: SleepPreviewResult[];
}

export interface StartSleepRequest {
  settlerId: string;
  bedLevel: number;
}

export interface StartSleepResponse {
  success: boolean;
  assignmentId: string;
  settlerId: string;
  duration: number;
  completedAt: string;
}

export interface BedTypePreview {
  settlerId: string;
  bedType: number;
}

export interface SleepPreviewBatchRequest {
  settlers: BedTypePreview[];
}