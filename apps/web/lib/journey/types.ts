export type StageStatus = 'LOCKED' | 'ACTIVE' | 'COMPLETED';

export type NodeType =
  | 'FIRST_WEIGH_IN'
  | 'LOG_MEALS_TODAY'
  | 'HIT_PROTEIN_GOAL'
  | 'WEEK_STREAK_3'
  | 'WEEK_STREAK_7';

export type JourneyNode = {
  id: string;
  order: number;           // vertical order on rail
  chapter: 'BASICS' | 'ADVANCED';
  type: NodeType;
  title: string;
  subtitle?: string;
  points: number;          // reward
};

export type UserNodeState = {
  node_id: string;
  status: StageStatus;
  progress: number;        // 0..1
  updated_at: string;
};
