import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { fetchBeatLeaderReplayPreviewData } from './replay-preview-bl-data.server';

export const getBeatLeaderReplayPreviewTitle = createServerFn({ method: 'GET' })
  .validator(z.object({ scoreId: z.string().regex(/^\d{1,20}$/) }))
  .handler(async ({ data: { scoreId } }) => {
    const result = await fetchBeatLeaderReplayPreviewData(scoreId);
    if (result.isErr()) return 'BeatLeader Replay';

    const data = result.value;
    const songTitle = data.song.subName === '' ? data.song.name : `${data.song.name} ${data.song.subName}`;
    const pp = data.pp > 0 ? ` / ${data.pp.toFixed(2)}pp` : '';
    return `Replay - ${data.player.name} (${(data.accuracy * 100).toFixed(2)}%${pp}) [${songTitle}]`;
  });
