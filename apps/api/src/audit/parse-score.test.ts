import { describe, expect, it } from 'vitest';
import { parseScore } from './llm.js';

describe('parseScore', () => {
  it('正常な JSON を解析する', () => {
    const s = parseScore(
      '{"relatedScore":80,"impactSupportScore":70,"contributionSupportScore":60,"confidence":90,"reason":"ok","extractedSummary":"sum"}',
    );
    expect(s).toEqual({
      relatedScore: 80,
      impactSupportScore: 70,
      contributionSupportScore: 60,
      confidence: 90,
      reason: 'ok',
      extractedSummary: 'sum',
    });
  });

  it('JSON の前後に余計なテキストがあっても抽出する', () => {
    const s = parseScore(
      '以下が結果です。\n{"relatedScore":1,"impactSupportScore":2,"contributionSupportScore":3,"confidence":4,"reason":"r","extractedSummary":"e"}\n以上',
    );
    expect(s?.relatedScore).toBe(1);
  });

  it('範囲外のスコアは 0〜100 にクランプする', () => {
    const s = parseScore(
      '{"relatedScore":150,"impactSupportScore":-10,"contributionSupportScore":50.6,"confidence":100,"reason":"","extractedSummary":""}',
    );
    expect(s?.relatedScore).toBe(100);
    expect(s?.impactSupportScore).toBe(0);
    expect(s?.contributionSupportScore).toBe(51);
  });

  it('数値文字列も受け入れる', () => {
    const s = parseScore(
      '{"relatedScore":"80","impactSupportScore":"70","contributionSupportScore":"60","confidence":"90","reason":"r","extractedSummary":"e"}',
    );
    expect(s?.relatedScore).toBe(80);
  });

  it('スコア欠落・非数値は null を返す', () => {
    expect(parseScore('{"relatedScore":"abc"}')).toBeNull();
    expect(parseScore('{"relatedScore":80}')).toBeNull();
  });

  it('JSON でないテキストは null を返す', () => {
    expect(parseScore('スコアは80点です')).toBeNull();
    expect(parseScore('')).toBeNull();
  });

  it('reason / extractedSummary が無くても空文字で補完する', () => {
    const s = parseScore(
      '{"relatedScore":1,"impactSupportScore":2,"contributionSupportScore":3,"confidence":4}',
    );
    expect(s?.reason).toBe('');
    expect(s?.extractedSummary).toBe('');
  });
});
