export type ContributionKind =
  | "commit"
  | "pr_merged"
  | "review"
  | "issue_closed";

export type ScoreContribution = {
  kind: ContributionKind;
  day: string;
  onDefaultBranch: boolean;
  lines?: number;
  isBot?: boolean;
};

export type ScoreResult = {
  points: number;
  streak: number;
  commits: number;
};

const MAX_COMMIT_POINTS = 35;
const DAILY_POINTS_CAP = 120;
const MAX_STREAK_BONUS = 40;

const qualitySignalPoints: Record<
  Exclude<ContributionKind, "commit">,
  number
> = {
  pr_merged: 30,
  review: 12,
  issue_closed: 10,
};

export function computeScore(
  contributions: ScoreContribution[],
): ScoreResult {
  const pointsByDay = new Map<string, number>();
  let commits = 0;

  for (const contribution of contributions) {
    if (contribution.isBot === true || !contribution.onDefaultBranch) {
      continue;
    }

    const points = contributionPoints(contribution);
    if (points === 0) {
      continue;
    }

    if (contribution.kind === "commit") {
      commits += 1;
    }

    pointsByDay.set(
      contribution.day,
      Math.min(DAILY_POINTS_CAP, (pointsByDay.get(contribution.day) ?? 0) + points),
    );
  }

  const contributionPointsTotal = Array.from(pointsByDay.values()).reduce(
    (total, points) => total + points,
    0,
  );
  const streak = computeStreak(Array.from(pointsByDay.keys()));

  return {
    points: contributionPointsTotal + streakBonus(streak),
    streak,
    commits,
  };
}

function contributionPoints(contribution: ScoreContribution): number {
  if (contribution.kind !== "commit") {
    return qualitySignalPoints[contribution.kind];
  }

  if (contribution.lines === undefined || contribution.lines <= 0) {
    return 0;
  }

  return Math.min(
    MAX_COMMIT_POINTS,
    Math.round(8 * Math.log1p(contribution.lines)),
  );
}

function computeStreak(activeDays: string[]): number {
  const uniqueDays = new Set(activeDays);
  const latestDay = Array.from(uniqueDays).sort().at(-1);
  if (latestDay === undefined) {
    return 0;
  }

  let streak = 0;
  let cursor = dayNumber(latestDay);

  while (uniqueDays.has(dayString(cursor))) {
    streak += 1;
    cursor -= 1;
  }

  return streak;
}

function streakBonus(streak: number): number {
  return streak <= 1 ? 0 : Math.min(MAX_STREAK_BONUS, streak * 5);
}

function dayNumber(day: string): number {
  const [year, month, date] = day.split("-").map(Number);

  return Math.floor(Date.UTC(year, month - 1, date) / 86_400_000);
}

function dayString(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}
