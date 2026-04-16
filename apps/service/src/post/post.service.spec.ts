import { EMediaStatus, EPostStatus, EPostVisibility } from '@app/common';
import { BadRequestException } from '@nestjs/common';
import { PostService } from './post.service';

describe('PostService', () => {
  const postRepository = {
    create: jest.fn(),
  };
  const mediaService = {
    lockSession: jest.fn(),
    attachToPost: jest.fn(),
  };
  const sportService = {
    ensurePlayerCanUseSport: jest.fn(),
  };
  const storageService = {
    buildPublicUrl: jest.fn((value) => `public:${value}`),
    buildSignedDownloadUrl: jest.fn((value) => Promise.resolve(`signed:${value}`)),
  };
  const streakService = {
    recordEvent: jest.fn().mockResolvedValue(undefined),
  };
  const quotaUsageService = {
    increment: jest.fn().mockResolvedValue(undefined),
  };
  const subscriptionsService = {
    getActiveSubscription: jest.fn().mockResolvedValue(null),
  };

  const videoAnalysisService = {
    dispatch: jest.fn().mockResolvedValue(undefined),
  };

  let service: PostService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PostService(
      postRepository as never,
      mediaService as never,
      sportService as never,
      storageService as never,
      streakService as never,
      videoAnalysisService as never,
      quotaUsageService as never,
      subscriptionsService as never,
    );
  });

  it('rejects creation before media lookup when the sport is invalid', async () => {
    sportService.ensurePlayerCanUseSport.mockRejectedValue(
      new BadRequestException('Sport not found or inactive'),
    );

    await expect(
      service.createPost('user-1', {
        mediaId: 'media-1',
        sportId: 'sport-1',
        visibility: EPostVisibility.PUBLIC,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mediaService.lockSession).not.toHaveBeenCalled();
  });

  it('persists sportId when post creation succeeds', async () => {
    sportService.ensurePlayerCanUseSport.mockResolvedValue(undefined);
    mediaService.lockSession.mockResolvedValue({
      _id: 'media-1',
      objectKey: 'videos/1.mp4',
      mimeType: 'video/mp4',
      status: EMediaStatus.UPLOADED,
      linkedPostId: null,
    });
    postRepository.create.mockResolvedValue({
      _id: 'post-1',
      sportId: 'sport-1',
      visibility: EPostVisibility.PUBLIC,
      status: EPostStatus.PROCESSING,
      media: [{ url: 'videos/1.mp4', type: 'video', mimeType: 'video/mp4' }],
    });
    mediaService.attachToPost.mockResolvedValue(undefined);

    const result = await service.createPost('user-1', {
      mediaId: 'media-1',
      sportId: 'sport-1',
      visibility: EPostVisibility.PUBLIC,
      caption: 'Clip',
    });

    expect(sportService.ensurePlayerCanUseSport).toHaveBeenCalledWith('user-1', 'sport-1');
    expect(postRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        sportId: 'sport-1',
        caption: 'Clip',
      }),
    );
    expect(result.media[0].url).toBe('public:videos/1.mp4');
  });
});
