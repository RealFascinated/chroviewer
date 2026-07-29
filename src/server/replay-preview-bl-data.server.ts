import { z } from 'zod';

import { env } from '../env';
import { requestJson } from '../sources/http';

export interface BeatLeaderPreviewData {
  songName: string;
  songSubName: string;
  songAuthor: string;
  songMapper: string;
  coverUrl: string;
  difficulty: number;
  modeName: string;
  stars: number;
  accuracy: number;
  modifiedScore: number;
  pp: number;
  rank: number;
  fullCombo: boolean;
  badCuts: number;
  missedNotes: number;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  playerCountry: string;
  playerRank: number;
  playerCountryRank: number;
}

const beatLeaderPreviewScoreSchema = z.object({
  accuracy: z.number(),
  modifiedScore: z.int(),
  pp: z.number(),
  rank: z.int(),
  fullCombo: z.boolean(),
  badCuts: z.int().nonnegative(),
  missedNotes: z.int().nonnegative(),
  player: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    avatar: z.string(),
    country: z.string(),
    rank: z.int(),
    countryRank: z.int(),
  }),
  difficulty: z.object({
    value: z.int(),
    modeName: z.string(),
    stars: z.number(),
  }),
  song: z.object({
    cover: z.string(),
    name: z.string(),
    subName: z.string(),
    author: z.string(),
    mapper: z.string(),
  }),
});

export function fetchBeatLeaderReplayPreviewData(scoreId: string) {
  return requestJson(`${env.VITE_BEATLEADER_API_URL}/score/${scoreId}`, beatLeaderPreviewScoreSchema, {
    source: 'beatleader',
    label: `BeatLeader score ${scoreId}`,
    operation: 'load-score-preview',
  });
}
