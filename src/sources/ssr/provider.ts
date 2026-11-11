import { Result } from 'better-result';
import { z } from 'zod';

import { env } from '../../env';
import { requestArrayBuffer, requestJson } from '../http';
import { SourceError } from '../source-error';
import type { DownloadProgressHandler, FetchRequest, SourceResult } from '../source-types';

interface ResolveOptions {
  onProgress?: DownloadProgressHandler;
  request?: FetchRequest;
  signal?: AbortSignal;
}

interface SsrReference {
  kind: 'score';
  id: string;
}

/** Subset of the SSR `GET /scores/:scoreId` response (a ScoreSaber score id) that the viewer needs. */
const scoreSchema = z.object({
  score: z.object({
    scoreId: z.number().int().nonnegative(),
    playerId: z.string().min(1),
    difficulty: z.string().min(1),
    characteristic: z.string().min(1),
    playerInfo: z
      .object({
        id: z.string(),
        name: z.string().optional(),
        country: z.string().optional(),
        avatar: z.string().nullish(),
      })
      .optional(),
    beatLeaderScore: z.object({ scoreId: z.number().int().nonnegative() }).optional(),
  }),
  leaderboard: z.object({
    songHash: z.string().min(1),
    difficulty: z.object({ difficulty: z.string().min(1), characteristic: z.string().min(1) }),
  }),
});

const difficultyValues: Record<string, number> = { Easy: 1, Normal: 3, Hard: 5, Expert: 7, ExpertPlus: 9 };

export function ssrReference(input: string): SsrReference | null {
  const value = input.trim();
  const prefixedScore = /^ssr:\s*(\d+)$/i.exec(value)?.[1];
  return prefixedScore === undefined ? null : { kind: 'score', id: prefixedScore };
}

export function ssrReplayUrl(beatLeaderScoreId: string | number) {
  return `${env.VITE_SSR_API_URL}/beatleader/replay/${String(beatLeaderScoreId)}.bsor`;
}

export async function fetchSsrReplayMetadata(scoreId: string, options: ResolveOptions = {}) {
  if (!/^\d+$/.test(scoreId)) {
    return Result.err(new SourceError({ message: 'invalid SSR score ID', source: 'ssr', operation: 'parse-score-id' }));
  }
  return Result.gen(async function* () {
    const data = yield* Result.await(
      requestJson(`${env.VITE_SSR_API_URL}/scores/${scoreId}`, scoreSchema, {
        ...options,
        source: 'ssr',
        label: `SSR score ${scoreId}`,
        operation: 'load-score',
      }),
    );
    const beatLeader = data.score.beatLeaderScore;
    if (beatLeader === undefined) {
      return Result.err(
        new SourceError({ message: `SSR score ${scoreId} has no replay`, source: 'ssr', operation: 'validate-score' }),
      );
    }
    const info = data.score.playerInfo;
    return Result.ok({
      scoreId: String(beatLeader.scoreId),
      ssrScoreId: String(data.score.scoreId),
      hash: data.leaderboard.songHash,
      difficulty: difficultyValues[data.leaderboard.difficulty.difficulty] ?? 0,
      characteristic: data.leaderboard.difficulty.characteristic,
      player: {
        id: data.score.playerId,
        name: info?.name ?? 'Player',
        avatar: info?.avatar ?? '',
        country: info?.country ?? '',
      },
      replayUrl: ssrReplayUrl(beatLeader.scoreId),
    });
  });
}

export function fetchSsrReplayFile(url: string, options: ResolveOptions = {}): Promise<SourceResult<ArrayBuffer>> {
  return requestArrayBuffer(url, { ...options, source: 'ssr', label: 'SSR replay', operation: 'download-replay' });
}
