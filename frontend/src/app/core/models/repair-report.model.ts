export interface RepairReport {
  id: string;
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
  majorPart?: string | null;
  repairResult?: string | null;
  failureFactor?: string | null;
  actions?: string | null;
  evidencePicture?: string | null;
  sourcePayload?: Record<string, unknown> | null;
}

export interface RepairUpsertPayload {
  recordDate: string;
  family: string;
  topIssue: string;
  failureQty: number;
  buildQty: number;
  frPercentage: number;
  category: string;
  returnYesQty: number;
  majorPart?: string | null;
  repairResult?: string | null;
  failureFactor?: string | null;
  actions?: string | null;
  failPicture?: string | null;
  evidencePicture?: string | null;
  failPictureFile?: File | null;
  evidencePictureFile?: File | null;
}
