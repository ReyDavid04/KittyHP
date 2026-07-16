export interface RepairReport {
  id: string;
  recordDate: string;
  topIssue: string;
  failureQty: number;
  buildQty: number;
  frPercentage: number;
  category: string;
  returnStatus?: string | null;
  failPicture?: string | null;
  majorPart?: string | null;
  repairResult?: string | null;
  failureFactor?: string | null;
  actions?: string | null;
  evidencePicture?: string | null;
  sourcePayload?: Record<string, unknown> | null;
}

export interface RepairUpsertPayload {
  recordDate: string;
  topIssue: string;
  failureQty: number;
  buildQty: number;
  frPercentage: number;
  category: string;
  returnStatus?: string | null;
  majorPart?: string | null;
  repairResult?: string | null;
  failureFactor?: string | null;
  actions?: string | null;
  failPicture?: string | null;
  evidencePicture?: string | null;
  failPictureFile?: File | null;
  evidencePictureFile?: File | null;
}


