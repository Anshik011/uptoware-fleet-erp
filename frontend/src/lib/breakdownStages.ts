import { VehicleBreakdown, BreakdownWorkflowAction } from '@/types/fleet';

export interface BreakdownStageDef {
  stage: number;
  num: string;
  title: string;
  actorRole: string;
  inputLabel: string;
  inputPlaceholder: string;
  mappedWorkflowAction?: BreakdownWorkflowAction;
}

export interface StageHistoryEntry {
  stage: number;
  title: string;
  time: string;
  actor: string;
  note: string;
}

export interface ParsedStageState {
  currentStage: number; // 1..15
  history: Record<number, StageHistoryEntry>;
  plainInspectionNotes: string;
}

export const BREAKDOWN_15_STAGES: BreakdownStageDef[] = [
  {
    stage: 1,
    num: '01',
    title: 'Breakdown Reported',
    actorRole: 'Driver / Site Supervisor',
    inputLabel: 'Initial Breakdown Note',
    inputPlaceholder: 'Describe initial breakdown symptom and location...',
  },
  {
    stage: 2,
    num: '02',
    title: 'Workshop Entry',
    actorRole: 'Transport Dept.',
    inputLabel: 'Assigned Workshop / Bay',
    inputPlaceholder: 'e.g. Talcher Central Workshop Bay 2',
    mappedWorkflowAction: 'Send to Workshop',
  },
  {
    stage: 3,
    num: '03',
    title: 'Mechanic Assigned',
    actorRole: 'Workshop Supervisor',
    inputLabel: 'Assigned Mechanic Name',
    inputPlaceholder: 'Enter lead mechanic / technician name...',
  },
  {
    stage: 4,
    num: '04',
    title: 'Under Inspection',
    actorRole: 'Mechanic',
    inputLabel: 'Inspection Findings',
    inputPlaceholder: 'Detail mechanical/electrical inspection findings...',
  },
  {
    stage: 5,
    num: '05',
    title: 'Breakdown Reason (Photo / Video)',
    actorRole: 'Mechanic',
    inputLabel: 'Root Cause & Photo/Video Evidence URL',
    inputPlaceholder: 'Enter root cause summary or photo/video reference...',
  },
  {
    stage: 6,
    num: '06',
    title: 'Repair Approval Pending',
    actorRole: 'Transport Manager',
    inputLabel: 'Estimated Repair Scope',
    inputPlaceholder: 'Summarize work & parts estimate submitted for approval...',
  },
  {
    stage: 7,
    num: '07',
    title: 'Repair Approved',
    actorRole: 'Manager',
    inputLabel: 'Approval Remarks / Authorized By',
    inputPlaceholder: 'Enter manager approval note...',
    mappedWorkflowAction: 'Approve',
  },
  {
    stage: 8,
    num: '08',
    title: 'Prepared Purchases Order',
    actorRole: 'Store Dept.',
    inputLabel: 'PO / Material Request Reference',
    inputPlaceholder: 'Enter PO number or parts requisition note...',
    mappedWorkflowAction: 'Request Parts',
  },
  {
    stage: 9,
    num: '09',
    title: 'Purchases Order Approved',
    actorRole: 'Purchase Head',
    inputLabel: 'PO Approval Reference',
    inputPlaceholder: 'Authorized by Purchase Head / PO approval note...',
  },
  {
    stage: 10,
    num: '10',
    title: 'Spare Parts Receive In Workshop',
    actorRole: 'Store Incharge',
    inputLabel: 'Delivery Person & Challan No.',
    inputPlaceholder: 'e.g. Delivered by Rajesh, Challan #CH-104...',
    mappedWorkflowAction: 'Parts Received',
  },
  {
    stage: 11,
    num: '11',
    title: 'Repair Work In Progress',
    actorRole: 'Mechanic',
    inputLabel: 'Repair Work & Labour Details',
    inputPlaceholder: 'Describe ongoing repair work in workshop...',
  },
  {
    stage: 12,
    num: '12',
    title: 'Repair Completed',
    actorRole: 'Mechanic',
    inputLabel: 'Completion Notes & Evidence',
    inputPlaceholder: 'Confirm all repairs completed & parts fitted...',
    mappedWorkflowAction: 'Mark Repaired',
  },
  {
    stage: 13,
    num: '13',
    title: 'Trial / Testing',
    actorRole: 'Driver',
    inputLabel: 'Road / Load Trial Result',
    inputPlaceholder: 'Record trial run & safety check result...',
  },
  {
    stage: 14,
    num: '14',
    title: 'Ready for Operation',
    actorRole: 'Supervisor',
    inputLabel: 'Supervisor Sign-Off / Acknowledgement',
    inputPlaceholder: 'Supervisor clearance & handover sign-off...',
  },
  {
    stage: 15,
    num: '15',
    title: 'Vehicle Running',
    actorRole: 'Driver',
    inputLabel: 'Final Handover & Active Duty Note',
    inputPlaceholder: 'Vehicle handed over to driver & returned to active fleet...',
    mappedWorkflowAction: 'Close Breakdown',
  },
];

const TRACKER_PREFIX = '[STAGE_TRACKER:';
const TRACKER_SUFFIX = ']';

export function inferStageFromRepairStatus(repairStatus?: string): number {
  switch (repairStatus) {
    case 'Reported':
      return 1;
    case 'In Workshop':
      return 2;
    case 'Approved':
      return 7;
    case 'Awaiting Parts':
      return 8;
    case 'Repaired':
      return 12;
    case 'Closed':
      return 15;
    default:
      return 1;
  }
}

export function parseBreakdownStageState(breakdown: VehicleBreakdown): ParsedStageState {
  const raw = breakdown.inspectionNotes || '';
  const startIdx = raw.indexOf(TRACKER_PREFIX);
  let plainNotes = raw;
  let currentStage = inferStageFromRepairStatus(breakdown.repairStatus);
  let history: Record<number, StageHistoryEntry> = {};

  if (startIdx !== -1) {
    const endIdx = raw.indexOf(TRACKER_SUFFIX, startIdx + TRACKER_PREFIX.length);
    if (endIdx !== -1) {
      const jsonStr = raw.slice(startIdx + TRACKER_PREFIX.length, endIdx);
      plainNotes = (raw.slice(0, startIdx) + raw.slice(endIdx + 1)).trim();
      try {
        const parsed = JSON.parse(jsonStr);
        if (typeof parsed.currentStage === 'number' && parsed.currentStage >= 1 && parsed.currentStage <= 15) {
          currentStage = Math.max(currentStage, parsed.currentStage);
        }
        if (parsed.history && typeof parsed.history === 'object') {
          history = parsed.history;
        }
      } catch {
        // Ignore malformed tracker JSON and use inferred stage
      }
    }
  }

  // Ensure stage 1 always has an entry from the breakdown record
  if (!history[1]) {
    history[1] = {
      stage: 1,
      title: 'Breakdown Reported',
      time: [breakdown.breakdownDate, breakdown.breakdownTime].filter(Boolean).join(' ') || 'Logged',
      actor: breakdown.driverName || breakdown.reportedByName || breakdown.driver || 'Driver / Site Sup',
      note: breakdown.description || breakdown.breakdownType || 'Breakdown reported',
    };
  }

  return {
    currentStage,
    history,
    plainInspectionNotes: plainNotes,
  };
}

export function serializeBreakdownStageState(
  plainNotes: string,
  currentStage: number,
  history: Record<number, StageHistoryEntry>
): string {
  const cleanPlain = (plainNotes || '').trim();
  const payload = JSON.stringify({ currentStage, history });
  const marker = `${TRACKER_PREFIX}${payload}${TRACKER_SUFFIX}`;
  return cleanPlain ? `${cleanPlain}\n\n${marker}` : marker;
}
