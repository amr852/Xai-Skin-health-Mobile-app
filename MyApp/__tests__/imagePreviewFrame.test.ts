import { resolveImagePreviewFrame } from '@/lib/bboxLayout';

describe('resolveImagePreviewFrame', () => {
  it('uses the natural aspect ratio for full-width previews', () => {
    expect(
      resolveImagePreviewFrame({
        width: '100%',
        fallbackHeight: 220,
        imageW: 3024,
        imageH: 4032,
      }),
    ).toEqual({ aspectRatio: 0.75 });
  });

  it('keeps fixed-size thumbnail slots fixed', () => {
    expect(
      resolveImagePreviewFrame({
        width: 72,
        fallbackHeight: 72,
        imageW: 3024,
        imageH: 4032,
      }),
    ).toEqual({ height: 72 });
  });
});
