  async RESOURCES(iddata: BilibiliId): Promise < boolean | undefined > {
  Config.app.EmojiReply && await this.e.bot.setMsgReaction(this.e.contact, this.e.messageId, Config.app.EmojiReplyID, true)
    Config.bilibili.tip && await this.e.reply('检测到B站链接，开始解析')
    switch (this.Type) {
      case 'dynamic_info': {
    const dynamicInfo = await this.amagi.getBilibiliData('动态详情数据', { dynamic_id: iddata.dynamic_id, typeMode: 'strict' })
    const dynamicInfoCard = await this.amagi.getBilibiliData('动态卡片数据', { dynamic_id: dynamicInfo.data.data.item.id_str, typeMode: 'strict' })
    const commentsData = dynamicInfo.data.data.item.type !== DynamicType.LIVE_RCMD && await this.amagi.getBilibiliData('评论数据', {
      type: mapping_table(dynamicInfo.data.data.item.type),
      oid: oid(dynamicInfo.data, dynamicInfoCard.data),
      number: Config.bilibili.numcomment,
      typeMode: 'strict'
    })
    const dynamicCARD = JSON.parse(dynamicInfoCard.data.data.card.card)
    const userProfileData = await this.amagi.getBilibiliData('用户主页数据', { host_mid: dynamicInfo.data.data.item.modules.module_author.mid, typeMode: 'strict' })

    switch (dynamicInfo.data.data.item.type) {
      /** 图文、纯图 */
      case DynamicType.DRAW: {
        const imgArray = []
        for (const img of dynamicInfo.data.data.item.modules.module_dynamic?.major?.opus?.pics ?? []) {
          if (img.url) {
            imgArray.push(segment.image(img.url))
          }
        }

        if (Config.bilibili.comment && commentsData) {
          const commentsdata = bilibiliComments(commentsData.data)
          img = await Render('bilibili/comment', {
            Type: '动态',
            CommentsData: commentsdata,
            CommentLength: String(commentsdata?.length ?? 0),
            share_url: 'https://t.bilibili.com/' + dynamicInfo.data.data.item.id_str,
            ImageLength: dynamicInfo.data.data.item.modules?.module_dynamic?.major?.draw?.items?.length ?? '动态中没有附带图片',

            shareurl: '动态分享链接'
          })
          if (imgArray.length === 1) this.e.reply(imgArray[0])
          if (imgArray.length > 1) {
            const forwardMsg = common.makeForward(imgArray, this.e.userId, this.e.sender.nick)
            await this.e.bot.sendForwardMsg(this.e.contact, forwardMsg)
          }
          this.e.reply(img)
        }

        const dynamicCARD = JSON.parse(dynamicInfoCard.data.data.card.card)

        if ('topic' in dynamicInfo.data.data.item.modules.module_dynamic && dynamicInfo.data.data.item.modules.module_dynamic.topic !== null) {
          const name = (dynamicInfo.data.data.item.modules.module_dynamic.topic as { name: string }).name
          dynamicInfo.data.data.item.modules.module_dynamic.major.opus.summary.rich_text_nodes.unshift({
            orig_text: name,
            jump_url: '',
            text: name,
            type: 'topic'
          })
          dynamicInfo.data.data.item.modules.module_dynamic.major.opus.summary.text = `${name}\n\n` + dynamicInfo.data.data.item.modules.module_dynamic.major.opus.summary.text
        }
        this.e.reply(await Render('bilibili/dynamic/DYNAMIC_TYPE_DRAW', {
          image_url: dynamicCARD.item.pictures && cover(dynamicCARD.item.pictures),
          // TIP: 2025/08/20, 动态卡片数据中，图文动态的描述文本在 major.opus.summary 中
          text: dynamicInfo.data.data.item.modules.module_dynamic.major
            ? replacetext(
              br(dynamicInfo.data.data.item.modules.module_dynamic.major.opus?.summary?.text ?? ''),
              dynamicInfo.data.data.item.modules.module_dynamic.major.opus?.summary?.rich_text_nodes ?? []
            )
            : '',
          dianzan: Count(dynamicInfo.data.data.item.modules.module_stat.like.count),
          pinglun: Count(dynamicInfo.data.data.item.modules.module_stat.comment.count),
          share: Count(dynamicInfo.data.data.item.modules.module_stat.forward.count),
          create_time: dynamicInfo.data.data.item.modules.module_author.pub_time,
          avatar_url: dynamicInfo.data.data.item.modules.module_author.face,
          frame: dynamicInfo.data.data.item.modules.module_author.pendant.image,
          share_url: 'https://t.bilibili.com/' + dynamicInfo.data.data.item.id_str,
          username: checkvip(userProfileData.data.data.card),
          fans: Count(userProfileData.data.data.follower),
          user_shortid: dynamicInfo.data.data.item.modules.module_author.mid,
          total_favorited: Count(userProfileData.data.data.like_num),
          following_count: Count(userProfileData.data.data.card.attention),
          decoration_card: generateDecorationCard(dynamicInfo.data.data.item.modules.module_author.decorate),
          render_time: Common.getCurrentTime(),
          dynamicTYPE: '图文动态'
        }))
        break
      }
      /** 纯文 */
      case DynamicType.WORD: {
        const text = replacetext(br(dynamicInfo.data.data.item.modules.module_dynamic.major.opus.summary.text), dynamicInfo.data.data.item.modules.module_dynamic.major.opus.summary.rich_text_nodes)

        this.e.reply(
          await Render('bilibili/dynamic/DYNAMIC_TYPE_WORD', {
            text,
            dianzan: Count(dynamicInfo.data.data.item.modules.module_stat.like.count),
            pinglun: Count(dynamicInfo.data.data.item.modules.module_stat.comment.count),
            share: Count(dynamicInfo.data.data.item.modules.module_stat.forward.count),
            create_time: dynamicInfo.data.data.item.modules.module_author.pub_time,
            avatar_url: dynamicInfo.data.data.item.modules.module_author.face,
            frame: dynamicInfo.data.data.item.modules.module_author.pendant.image,
            share_url: 'https://t.bilibili.com/' + dynamicInfo.data.data.item.id_str,
            username: checkvip(dynamicInfo.data.data.card),
            fans: Count(dynamicInfo.data.data.follower),
            user_shortid: dynamicInfo.data.data.item.modules.module_author.mid,
            total_favorited: Count(userProfileData.data.data.like_num),
            following_count: Count(userProfileData.data.data.card.attention),
            dynamicTYPE: '纯文动态'
          })
        )
        commentsData && this.e.reply(
          await Render('bilibili/comment', {
            Type: '动态',
            CommentsData: bilibiliComments(commentsData.data),
            CommentLength: String((bilibiliComments(commentsData.data)?.length) ? bilibiliComments(commentsData.data).length : 0),
            share_url: 'https://t.bilibili.com/' + dynamicInfo.data.data.item.id_str,
            ImageLength: dynamicInfo.data.data.item.modules?.module_dynamic?.major?.draw?.items?.length ?? '动态中没有附带图片',
            shareurl: '动态分享链接'
          })
        )
        break
      }
      /** 转发动态 */
      case DynamicType.FORWARD: {
        const text = replacetext(
          br(dynamicInfo.data.data.item.modules.module_dynamic.desc!.text),
          dynamicInfo.data.data.item.modules.module_dynamic.major!.opus.summary.rich_text_nodes
        )
        let data = {}
        switch (dynamicInfo.data.data.item.orig.type) {
          case DynamicType.AV: {
            data = {
              username: checkvip(dynamicInfo.data.data.item.orig.modules.module_author),
              pub_action: dynamicInfo.data.data.item.orig.modules.module_author.pub_action,
              avatar_url: dynamicInfo.data.data.item.orig.modules.module_author.face,
              duration_text: dynamicInfo.data.data.item.orig.modules.module_dynamic.major.archive.duration_text,
              title: dynamicInfo.data.data.item.orig.modules.module_dynamic.major.archive.title,
              danmaku: dynamicInfo.data.data.item.orig.modules.module_dynamic.major.archive.stat.danmaku,
              view: dynamicInfo.data.data.item.orig.modules.module_dynamic.major.archive.stat.view,
              play: dynamicInfo.data.data.item.orig.modules.module_dynamic.major.archive.stat.play,
              cover: dynamicInfo.data.data.item.orig.modules.module_dynamic.major.archive.cover,
              create_time: Common.convertTimestampToDateTime(dynamicInfo.data.data.item.orig.modules.module_author.pub_ts),
              decoration_card: generateDecorationCard(dynamicInfo.data.data.item.orig.modules.module_author.decorate),
              frame: dynamicInfo.data.data.item.orig.modules.module_author.pendant.image
            }
            break
          }
          case DynamicType.DRAW: {
            const dynamicCARD = await getBilibiliData('动态卡片数据', Config.cookies.bilibili, { dynamic_id: dynamicInfo.data.data.item.orig.id_str })
            const cardData = JSON.parse(dynamicCARD.data.card.card)
            data = {
              username: checkvip(dynamicInfo.data.data.item.orig.modules.module_author),
              create_time: Common.convertTimestampToDateTime(dynamicInfo.data.data.item.orig.modules.module_author.pub_ts),
              avatar_url: dynamicInfo.data.data.item.orig.modules.module_author.face,
              text: replacetext(br(dynamicInfo.data.data.item.orig.modules.module_dynamic.desc.text), dynamicInfo.data.data.item.orig.modules.module_dynamic.desc.rich_text_nodes),
              image_url: cover(cardData.item.pictures),
              decoration_card: generateDecorationCard(dynamicInfo.data.data.item.orig.modules.module_author.decorate),
              frame: dynamicInfo.data.data.item.orig.modules.module_author.pendant.image
            }
            break
          }
          case DynamicType.WORD: {
            data = {
              username: checkvip(dynamicInfo.data.data.item.orig.modules.module_author),
              create_time: Common.convertTimestampToDateTime(dynamicInfo.data.data.item.orig.modules.module_author.pub_ts),
              avatar_url: dynamicInfo.data.data.item.orig.modules.module_author.face,
              text: replacetext(br(dynamicInfo.data.data.item.orig.modules.module_dynamic.desc.text), dynamicInfo.data.data.item.orig.modules.module_dynamic.desc.rich_text_nodes),
              decoration_card: generateDecorationCard(dynamicInfo.data.data.item.orig.modules.module_author.decorate),
              frame: dynamicInfo.data.data.item.orig.modules.module_author.pendant.image
            }
            break
          }
          case DynamicType.LIVE_RCMD: {
            const liveData = JSON.parse(dynamicInfo.data.data.item.orig.modules.module_dynamic.major.live_rcmd.content)
            data = {
              username: checkvip(dynamicInfo.data.data.item.orig.modules.module_author),
              create_time: Common.convertTimestampToDateTime(dynamicInfo.data.data.item.orig.modules.module_author.pub_ts),
              avatar_url: dynamicInfo.data.data.item.orig.modules.module_author.face,
              decoration_card: generateDecorationCard(dynamicInfo.data.data.item.orig.modules.module_author.decorate),
              frame: dynamicInfo.data.data.item.orig.modules.module_author.pendant.image,
              cover: liveData.live_play_info.cover,
              text_large: liveData.live_play_info.watched_show.text_large,
              area_name: liveData.live_play_info.area_name,
              title: liveData.live_play_info.title,
              online: liveData.live_play_info.online
            }
            break
          }
          case DynamicType.FORWARD:
          default: {
            logger.warn(`UP主：${userProfileData.data.data.card.name}的${logger.green('转发动态')}转发的原动态类型为「${logger.yellow(dynamicInfo.data.item.orig.type)}」暂未支持解析`)
            break
          }
        }
        this.e.reply(
          await Render('bilibili/dynamic/DYNAMIC_TYPE_FORWARD', {
            text,
            dianzan: Count(dynamicInfo.data.data.item.modules.module_stat.like.count),
            pinglun: Count(dynamicInfo.data.data.item.modules.module_stat.comment.count),
            share: Count(dynamicInfo.data.data.item.modules.module_stat.forward.count),
            create_time: dynamicInfo.data.data.item.modules.module_author.pub_time,
            avatar_url: dynamicInfo.data.data.item.modules.module_author.face,
            frame: dynamicInfo.data.data.item.modules.module_author.pendant.image,
            share_url: 'https://t.bilibili.com/' + dynamicInfo.data.data.item.id_str,
            username: checkvip(userProfileData.data.data.card),
            fans: Count(userProfileData.data.data.follower),
            user_shortid: dynamicInfo.data.data.item.modules.module_author.mid,
            total_favorited: Count(userProfileData.data.data.like_num),
            following_count: Count(userProfileData.data.data.card.attention),
            dynamicTYPE: '转发动态解析',
            decoration_card: generateDecorationCard(dynamicInfo.data.data.item.modules.module_author.decorate),
            render_time: Common.getCurrentTime(),
            original_content: { [dynamicInfo.data.data.item.orig.type]: data }
          })
        )
        break
      }
      /** 视频动态 */
      case DynamicType.AV: {
        if (dynamicInfo.data.data.item.modules.module_dynamic.major.type === 'MAJOR_TYPE_ARCHIVE') {
          const bvid = dynamicInfo.data.data.item.modules.module_dynamic.major.archive.bvid
          const INFODATA = await getBilibiliData('单个视频作品数据', '', { bvid, typeMode: 'strict' })
          const dycrad = dynamicInfoCard.data.data.card && dynamicInfoCard.data.data.card.card && JSON.parse(dynamicInfoCard.data.data.card.card)

          commentsData && this.e.reply(
            await Render('bilibili/comment', {
              Type: '动态',
              CommentsData: bilibiliComments(commentsData.data),
              CommentLength: String((bilibiliComments(commentsData.data)?.length) ? bilibiliComments(commentsData.data).length : 0),
              share_url: 'https://www.bilibili.com/video/' + bvid,
              ImageLength: dynamicInfo.data.data.item.modules?.module_dynamic?.major?.draw?.items?.length ?? '动态中没有附带图片',
              shareurl: '动态分享链接'
            })
          )

          img = await Render('bilibili/dynamic/DYNAMIC_TYPE_AV',
            {
              image_url: [{ image_src: INFODATA.data.data.pic }],
              text: br(INFODATA.data.data.title),
              desc: br(dycrad.desc),
              dianzan: Count(INFODATA.data.data.stat.like),
              pinglun: Count(INFODATA.data.data.stat.reply),
              share: Count(INFODATA.data.data.stat.share),
              view: Count(dycrad.stat.view),
              coin: Count(dycrad.stat.coin),
              duration_text: dynamicInfo.data.data.item.modules.module_dynamic.major.archive.duration_text,
              create_time: Common.convertTimestampToDateTime(INFODATA.data.data.ctime),
              avatar_url: INFODATA.data.data.owner.face,
              frame: dynamicInfo.data.data.item.modules.module_author.pendant.image,
              share_url: 'https://www.bilibili.com/video/' + bvid,
              username: checkvip(userProfileData.data.data.card),
              fans: Count(userProfileData.data.data.follower),
              user_shortid: userProfileData.data.data.card.mid,
              total_favorited: Count(userProfileData.data.data.like_num),
              following_count: Count(userProfileData.data.data.card.attention),
              dynamicTYPE: '视频动态'
            }
          )
          this.e.reply(img)
        }
        break
      }
      /** 直播动态 */
      case DynamicType.LIVE_RCMD: {
        const userINFO = await getBilibiliData('用户主页数据', '', { host_mid: dynamicInfo.data.data.item.modules.module_author.mid, typeMode: 'strict' })
        img = await Render('bilibili/dynamic/DYNAMIC_TYPE_LIVE_RCMD',
          {
            image_url: [{ image_src: dynamicCARD.live_play_info.cover }],
            text: br(dynamicCARD.live_play_info.title),
            liveinf: br(`${dynamicCARD.live_play_info.area_name} | 房间号: ${dynamicCARD.live_play_info.room_id}`),
            username: checkvip(userINFO.data.card),
            avatar_url: userINFO.data.card.face,
            frame: dynamicInfo.data.data.item.modules.module_author.pendant.image,
            fans: Count(userINFO.data.follower),
            create_time: Common.convertTimestampToDateTime(dynamicInfo.data.data.item.modules.module_author.pub_ts),
            now_time: Common.getCurrentTime(),
            share_url: 'https://live.bilibili.com/' + dynamicCARD.live_play_info.room_id,
            dynamicTYPE: '直播动态'
          }
        )
        this.e.reply(img)
        break
      }
      default:
        this.e.reply(`该动态类型「${dynamicInfo.data.data.item.type}」暂未支持解析`)
        break
    }
    break
  }
      case 'live_room_detail': {
    const liveInfo = await this.amagi.getBilibiliData('直播间信息', { room_id: iddata.room_id, typeMode: 'strict' })
    const roomInitInfo = await this.amagi.getBilibiliData('直播间初始化信息', { room_id: iddata.room_id, typeMode: 'strict' })
    const userProfileData = await this.amagi.getBilibiliData('用户主页数据', { host_mid: roomInitInfo.data.uid, typeMode: 'strict' })

    if (roomInitInfo.data.live_status === 0) {
      this.e.reply(`${userProfileData.data.data.card.name} 未开播，正在休息中~`)
      return true
    }
    const img = await Render('bilibili/dynamic/DYNAMIC_TYPE_LIVE_RCMD',
      {
        image_url: [{ image_src: liveInfo.data.user_cover }],
        text: br(liveInfo.data.title),
        liveinf: br(`${liveInfo.data.area_name} | 房间号: ${liveInfo.data.room_id}`),
        username: userProfileData.data.data.card.name,
        avatar_url: userProfileData.data.data.card.face,
        frame: userProfileData.data.data.card.pendant.image,
        fans: Count(userProfileData.data.data.card.fans),
        create_time: liveInfo.data.live_time === '-62170012800' ? '获取失败' : liveInfo.data.live_time,
        now_time: 114514,
        share_url: 'https://live.bilibili.com/' + liveInfo.data.room_id,
        dynamicTYPE: '直播'
      }
    )
    this.e.reply(img)
    break
  }
      default:
  break
}
  }