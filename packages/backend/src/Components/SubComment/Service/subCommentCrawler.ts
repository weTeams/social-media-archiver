import { getSubCommentApi } from './subCommentApi';
import camelcaseKeys from 'camelcase-keys';
import {
  CommentDocument,
  COMMENT_IOC_SYMBOLS,
  ICommentService,
} from '../../Comment/Types';
import { map, asyncify } from 'async';
import {
  SubCommentCrawlerParams,
  ISubCommentService,
  ISubCommentCrawler,
  ISubComment,
  SUB_COMMENT_IOC_SYMBOLS,
} from '../Types';
import { asyncPriorityQueuePush } from '../../../Jobs/Queue';
import { Q_PRIORITY } from '../../../Config';
import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import dayjs from 'dayjs';
import { IUserService, USER_IOC_SYMBOLS } from '../../User/Types';
import { container } from '../../../Config/inversify.config';
import { NotImplementedError } from '../../../Error/ErrorClass';
@injectable()
class SubCommentCrawler implements ISubCommentCrawler {
  private commentService!: ICommentService;
  private subCommentService!: ISubCommentService;
  private userService: IUserService;
  constructor(
    @inject(USER_IOC_SYMBOLS.IUserService)
    userService: IUserService,
  ) {
    this.userService = userService;
  }

  lazyInject() {
    this.commentService = container.get<ICommentService>(
      COMMENT_IOC_SYMBOLS.ICommentService,
    );
    this.subCommentService = container.get<ISubCommentService>(
      SUB_COMMENT_IOC_SYMBOLS.ISubCommentService,
    );
  }

  startCrawling = (commentDoc: CommentDocument) => {
    asyncPriorityQueuePush(
      this.crawl,
      { commentDoc, /* other initial params here */ },
      Q_PRIORITY.CRAWLER_SUB_COMMENT,
    );
  };

  private crawl = async (params: SubCommentCrawlerParams) => {
    const { commentDoc /* deconstruct other params for the API here  */ } =
      params;
    const res = await getSubCommentApi(/* API params here */);

    const { nextParams, infos, usersRaw } = this.transformData(res, params);

    await map(infos, asyncify(this.subCommentService.save));
    await map(
      usersRaw.map((userRaw) =>
        this.userService.transformUserResponse(userRaw),
      ),
      asyncify(this.userService.save),
    );

    const newSubComments: string[] = infos.map(
      (subCommentInfo: ISubComment) => subCommentInfo.id,
    );

    this.commentService.addSubComments(newSubComments, commentDoc);

    if (nextParams) {
      asyncPriorityQueuePush(
        this.crawl,
        nextParams,
        Q_PRIORITY.CRAWLER_SUB_COMMENT,
      );
    }
  };

  /**
   * take in the response from the API and transform it into the nextParams for the next request, and the infos of the comments,and the users
   * @param res the axios api response object
   * @param prevParams previous params
   * @returns {nextParams, infos, usersRaw}
   */
  private transformData(
    res: any,
    prevParams: SubCommentCrawlerParams,
  ): {
    nextParams: SubCommentCrawlerParams | null;
    infos: ISubComment[];
    usersRaw: unknown[];
  } {
    throw new NotImplementedError('Not implemented');
  }
}

export { SubCommentCrawler };
