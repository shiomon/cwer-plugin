import plugin from '../../../lib/plugins/plugin.js'
import { CONFIG, getUserColor, CMD_PREFIX } from '../config/cfg.js'

const PET_ACTIONS = '撒娇|生气气|讨好|献媚|求关注|告状|勾引|冷战'
const ACTION_REG = new RegExp(`^${CMD_PREFIX}(${PET_ACTIONS})`)
const ACTION_EXTRACT = new RegExp(`(${PET_ACTIONS})`)

class PetActionApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-宠物自主',
      dsc: '宠物自主行动',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: ACTION_REG, fnc: 'petAction' },
        { reg: `^${CMD_PREFIX}嘲讽.*`, fnc: 'taunt' }
      ]
    })
    this.sys = global.cwerSys
  }

  async petAction(e) {
    const match = e.msg.match(ACTION_EXTRACT)
    if (!match) return false

    const action = match[0]
    const groupId = String(e.group_id)
    const userId = String(e.user_id)
    const userName = e.sender.card || e.sender.nickname

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData || !userData.pet || !userData.pet.ownerId) {
      return e.reply('你好像没主人呢，让别人领养你吧')
    }
    userData._userId = userId

    if (userData.pet.status !== 'bonded') {
      return e.reply('需要缔约后才能使用此指令！')
    }

    const config = CONFIG.PET_ACTIONS[action]
    if (!config) return e.reply('未知指令')

    const now = Date.now()
    if (config.cooldown > 0 && userData.sys.petActionCooldowns?.[action] && now - userData.sys.petActionCooldowns[action] < config.cooldown) {
      const remain = Math.ceil((config.cooldown - (now - userData.sys.petActionCooldowns[action])) / 1000)
      return e.reply(`宠物在回味中...请${remain}秒后再来`)
    }

    if (!userData.sys.petActionCooldowns) userData.sys.petActionCooldowns = {}
    userData.sys.petActionCooldowns[action] = now

    if (!userData.sys.startTimestamp) {
      userData.sys.startTimestamp = Date.now()
    }

    const ownerData = this.sys.dm.readUserData(groupId, userData.pet.ownerId)
    if (!ownerData) return e.reply('数据异常')
    ownerData._userId = userData.pet.ownerId

    const ownerName = userData.pet.ownerName || '主人'
    const petBefore = ownerData.pet ? { ...ownerData.pet } : null

    switch (action) {
      case '撒娇': {
        ownerData.pet.intimacy += config.intimacyGain
        this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 向${ownerName}撒了个娇~`, '#ff69b4')
        await e.reply(`${userName} 向${ownerName}撒了个娇~ 亲密度+${config.intimacyGain}`)
        break
      }
      case '生气气': {
        ownerData.pet.intimacy -= config.intimacyLoss
        userData.stats.satiety += config.satietyGain
        this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 生气气了！化悲愤为食欲！`, '#ff4444')
        await e.reply(`${userName} 生气气了！化悲愤为食欲，饱食+${config.satietyGain}，亲密-${config.intimacyLoss}`)
        break
      }
      case '讨好': {
        ownerData.pet.intimacy += config.intimacyGain
        userData.stats.pain -= config.painLoss
        this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 讨好${ownerName}~`, '#ffcc00')
        await e.reply(`${userName} 讨好${ownerName}~ 亲密+${config.intimacyGain}，疼痛-${config.painLoss}`)
        break
      }
      case '献媚': {
        ownerData.pet.intimacy += config.intimacyGain
        ownerData.pet.lewd += config.lewdGain
        this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 向${ownerName}献媚~`, '#cc66ff')
        await e.reply(`${userName} 向${ownerName}献媚~ 亲密+${config.intimacyGain}，涩气+${config.lewdGain}`)
        break
      }
      case '求关注': {
        userData.sys.attentionRequest = { petId: userId, time: now, bonus: config.intimacyBonus }
        this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 求关注！`, '#66ccff')
        await e.reply([`${userName} 求关注！`, segment.at(Number(userData.pet.ownerId)), ` 你的宠物在等你互动哦~`])
        break
      }
      case '告状': {
        ownerData.pet.intimacy -= config.intimacyLoss
        this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 在群里吐槽${ownerName}！`, '#ff9900')
        const complaints = [`${ownerName}太坏了！`, `${ownerName}不理我！`, `${ownerName}欺负我！`, `${ownerName}不给我饭吃！`]
        await e.reply(complaints[Math.floor(Math.random() * complaints.length)])
        break
      }
      case '勾引': {
        ownerData.pet.lewd += config.lewdGain
        ownerData.pet.intimacy += config.intimacyGain
        ownerData.sys.goldCoins += config.ownerGoldReward + this.sys.dm.getHouseGoldBonus(ownerData)
        this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 勾引${ownerName}~`, '#e91e63')
        await e.reply(`${userName} 向${ownerName}抛了个媚眼~ 涩气+${config.lewdGain}，亲密+${config.intimacyGain}，${ownerName}获得${config.ownerGoldReward}金币`)
        break
      }
      case '冷战': {
        if (ownerData.pet.coldWar && Date.now() < ownerData.pet.coldWarUntil) {
          ownerData.pet.coldWar = false
          ownerData.pet.coldWarUntil = null
          this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 结束了冷战`, '#66ccff')
          await e.reply(`${userName} 结束了冷战~`)
        } else {
          ownerData.pet.coldWar = true
          ownerData.pet.coldWarUntil = now + config.duration
          ownerData.pet.intimacy -= config.intimacyLoss
          this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 发起了冷战！`, '#666')
          await e.reply(`${userName} 对${ownerName}发起了冷战！30分钟内互动无效~`)
        }
        break
      }
    }

    this.sys.es.tickTime(ownerData, CONFIG.INTERACTION_TIME_COST)
    this.sys.dm.applyHouseBonus(ownerData)
    this.sys.shop.checkAchievements(ownerData)


    this.sys.dm.saveUserData(ownerData, groupId)
    this.sys.dm.saveUserData(userData, groupId)
  }

  async taunt(e) {
    const groupId = String(e.group_id)
    const userId = String(e.user_id)
    const userName = e.sender.card || e.sender.nickname

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData || !userData.pet || !userData.pet.ownerId) {
      return e.reply('你好像没主人呢，让别人领养你吧')
    }

    if (userData.pet.status !== 'bonded') {
      return e.reply('需要缔约后才能使用嘲讽！')
    }

    const taunts = CONFIG.TAUNT_MESSAGES.taunt
    const msg = taunts[Math.floor(Math.random() * taunts.length)]
    const ownerId = userData.pet.ownerId
    await e.reply([`${userName}：${msg}`, segment.at(Number(ownerId))])
  }
}

export default PetActionApp
