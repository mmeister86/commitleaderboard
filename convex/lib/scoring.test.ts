import { describe, expect, test } from "vitest";

import { computeScore, type ScoreContribution } from "./scoring";

const baseCommit = {
  kind: "commit",
  day: "2026-06-28",
  onDefaultBranch: true,
} satisfies Omit<ScoreContribution, "lines">;

describe("computeScore", () => {
  test("returns zeroes for empty input", () => {
    expect(computeScore([])).toEqual({
      points: 0,
      streak: 0,
      commits: 0,
    });
  });

  test.each([
    { lines: 1, expectedPoints: 6 },
    { lines: 10, expectedPoints: 19 },
    { lines: 100, expectedPoints: 35 },
    { lines: 1_000_000, expectedPoints: 35 },
  ])(
    "log-dampens $lines changed lines to $expectedPoints commit points",
    ({ lines, expectedPoints }) => {
      expect(
        computeScore([
          {
            ...baseCommit,
            lines,
          },
        ]),
      ).toEqual({
        points: expectedPoints,
        streak: 1,
        commits: 1,
      });
    },
  );

  test("caps contribution points per day", () => {
    const commits = Array.from({ length: 10 }, () => ({
      ...baseCommit,
      lines: 100,
    }));

    expect(computeScore(commits)).toEqual({
      points: 120,
      streak: 1,
      commits: 10,
    });
  });

  test("scores every quality signal kind from the schema", () => {
    expect(
      computeScore([
        {
          kind: "pr_merged",
          day: "2026-06-28",
          onDefaultBranch: true,
        },
        {
          kind: "review",
          day: "2026-06-28",
          onDefaultBranch: true,
        },
        {
          kind: "issue_closed",
          day: "2026-06-28",
          onDefaultBranch: true,
        },
      ]),
    ).toEqual({
      points: 52,
      streak: 1,
      commits: 0,
    });
  });

  test("adds a streak bonus for consecutive active days ending at the latest day", () => {
    expect(
      computeScore([
        {
          ...baseCommit,
          day: "2026-06-26",
          lines: 1,
        },
        {
          ...baseCommit,
          day: "2026-06-27",
          lines: 1,
        },
        {
          ...baseCommit,
          day: "2026-06-28",
          lines: 1,
        },
      ]),
    ).toEqual({
      points: 33,
      streak: 3,
      commits: 3,
    });
  });

  test("resets the streak when the latest active day has a gap before it", () => {
    expect(
      computeScore([
        {
          ...baseCommit,
          day: "2026-06-26",
          lines: 1,
        },
        {
          ...baseCommit,
          day: "2026-06-28",
          lines: 1,
        },
      ]),
    ).toEqual({
      points: 12,
      streak: 1,
      commits: 2,
    });
  });

  test("limits one huge commit as an anti-gaming vector", () => {
    expect(
      computeScore([
        {
          ...baseCommit,
          lines: 1_000_000,
        },
      ]),
    ).toEqual({
      points: 35,
      streak: 1,
      commits: 1,
    });
  });

  test("caps many tiny commits as an anti-gaming vector", () => {
    const commits = Array.from({ length: 30 }, () => ({
      ...baseCommit,
      lines: 1,
    }));

    expect(computeScore(commits)).toEqual({
      points: 120,
      streak: 1,
      commits: 30,
    });
  });

  test("ignores empty commits, bot commits, and off-default-branch commits", () => {
    expect(
      computeScore([
        {
          ...baseCommit,
          lines: 0,
        },
        {
          ...baseCommit,
          lines: -5,
        },
        {
          ...baseCommit,
        },
        {
          ...baseCommit,
          lines: 100,
          isBot: true,
        },
        {
          ...baseCommit,
          lines: 100,
          onDefaultBranch: false,
        },
      ]),
    ).toEqual({
      points: 0,
      streak: 0,
      commits: 0,
    });
  });
});
