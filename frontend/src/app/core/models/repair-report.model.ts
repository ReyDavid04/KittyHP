export interface RepairReport {
  id: string;
  review: boolean;
  recordDate: string;
  family?: string | null;
  topIssue: string;
  failureQty: number;
  buildQty: number;
  frPercentage: number;
  category: string;
  returnYesQty: number;
  returnNoQty: number;
  returnStatus?: string | null;
  failPicture?: string | null;
  failPictures?: string[];
  majorPart?: string | null;
  repairResult?: string | null;
  failureFactor?: string | null;
  actions?: string | null;
  evidencePicture?: string | null;
  evidencePictures?: string[];
  sourcePayload?: Record<string, unknown> | null;
}

export interface RepairUpsertPayload {
  recordDate: string;
  family: string;
  topIssue: string;
  failureQty?: number;
  buildQty?: number;
  frPercentage?: number;
  category: string;
  returnYesQty: number;
  majorPart?: string | null;
  repairResult?: string | null;
  failureFactor?: string | null;
  actions?: string | null;
  failPicture?: string | null;
  evidencePicture?: string | null;
  failPictureFiles?: File[];
  evidencePictureFiles?: File[];
}
