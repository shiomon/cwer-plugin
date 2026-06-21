import plugin from '../../../lib/plugins/plugin.js'
import { CONFIG, getUserColor } from '../config/cfg.js'

const PET_ACTIONS = '撒娇|生气气|讨好|献媚|求关注|告状|勾引|冷战'
const ACTION_REG = new RegExp(`^([#＃]宠物|[\\$＄])(${PET_ACTIONS})`)
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
        { reg: '^([#＃]宠物|[\\$＄])嘲讽.*', fnc: 'taunt' }
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

    const asPet = this.sys.dm.findRelationByPet(groupId, userId)
    if (!asPet) {
      return e.reply('你不是任何人的宠物，无法使用宠物指令！')
    }

    const data = this.sys.dm.readData(groupId, asPet.ownerId, asPet.petId)
    if (!data) return e.reply('数据异常')

    if (data.relation.status !== 'bonded') {
      return e.reply('需要缔约后才能使用此指令！')
    }

    const config = CONFIG.PET_ACTIONS[action]
    if (!config) return e.reply('未知指令')

    const now = Date.now()
    if (config.cooldown > 0 && data.sys.petActionCooldowns?.[action] && now - data.sys.petActionCooldowns[action] < config.cooldown) {
      const remain = Math.ceil((config.cooldown - (now - data.sys.petActionCooldowns[action])) / 1000)
      return e.reply(`冷却中...请${remain}秒后再来`)
    }

    if (!data.sys.petActionCooldowns) data.sys.petActionCooldowns = {}
    data.sys.petActionCooldowns[action] = now

    if (!data.sys.startTimestamp) {
      data.sys.startTimestamp = Date.now()
    }

    const ownerName = data.relation.ownerName || '主人'
    const statsBefore = { ...data.stats }

    switch (action) {
      case '撒娇': {
        data.stats.intimacy += config.intimacyGain
        this.sys.dm.addLog(data, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 向${ownerName}撒了个娇~`, '#ff69b4')
        await e.reply(`${userName} 向${ownerName}撒了个娇~ 亲密度+${config.intimacyGain}`)
        break
      }
      case '生气气': {
        data.stats.intimacy -= config.intimacyLoss
        data.stats.satiety += config.satietyGain
        this.sys.dm.addLog(data, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 生气气了！化悲愤为食欲！`, '#ff4444')
        await e.reply(`${userName} 生气气了！化悲愤为食欲，饱食+${config.satietyGain}，亲密-${config.intimacyLoss}`)
        break
      }
      case '讨好': {
        data.stats.intimacy += config.intimacyGain
        data.stats.pain -= config.painLoss
        this.sys.dm.addLog(data, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 讨好${ownerName}~`, '#ffcc00')
        await e.reply(`${userName} 讨好${ownerName}~ 亲密+${config.intimacyGain}，疼痛-${config.painLoss}`)
        break
      }
      case '献媚': {
        data.stats.intimacy += config.intimacyGain
        data.stats.lewd += config.lewdGain
        this.sys.dm.addLog(data, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 向${ownerName}献媚~`, '#cc66ff')
        await e.reply(`${userName} 向${ownerName}献媚~ 亲密+${config.intimacyGain}，涩气+${config.lewdGain}`)
        break
      }
      case '求关注': {
        data.sys.attentionRequest = { petId: userId, time: now, bonus: config.intimacyBonus }
        this.sys.dm.addLog(data, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 求关注！`, '#66ccff')
        await e.reply([`${userName} 求关注！`, segment.at(Number(asPet.ownerId)), ` 你的宠物在等你互动哦~`])
        break
      }
      case '告状': {
        data.stats.intimacy -= config.intimacyLoss
        this.sys.dm.addLog(data, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 在群里吐槽${ownerName}！`, '#ff9900')
        const complaints = [`${ownerName}太坏了！`, `${ownerName}不理我！`, `${ownerName}欺负我！`, `${ownerName}不给我饭吃！`]
        await e.reply(complaints[Math.floor(Math.random() * complaints.length)])
        break
      }
      case '勾引': {
        data.stats.lewd += config.lewdGain
        data.stats.intimacy += config.intimacyGain
        data.sys.goldCoins += config.ownerGoldReward + this.sys.dm.getHouseGoldBonus(data)
        this.sys.dm.addLog(data, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 勾引${ownerName}~`, '#e91e63')
        await e.reply(`${userName} 向${ownerName}抛了个媚眼~ 涩气+${config.lewdGain}，亲密+${config.intimacyGain}，${ownerName}获得${config.ownerGoldReward}金币`)
        break
      }
      case '冷战': {
        if (data.relation.coldWar && Date.now() < data.relation.coldWarUntil) {
          data.relation.coldWar = false
          data.relation.coldWarUntil = null
          this.sys.dm.addLog(data, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 结束了冷战`, '#66ccff')
          await e.reply(`${userName} 结束了冷战~`)
        } else {
          data.relation.coldWar = true
          data.relation.coldWarUntil = now + config.duration
          data.stats.intimacy -= config.intimacyLoss
          this.sys.dm.addLog(data, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 发起了冷战！`, '#666')
          await e.reply(`${userName} 对${ownerName}发起了冷战！30分钟内互动无效~`)
        }
        break
      }
    }

    this.sys.es.tickTime(data, CONFIG.INTERACTION_TIME_COST)
    this.sys.dm.applyHouseBonus(data)
    this.sys.shop.checkAchievements(data)

    const diffParts = this.sys.dm.computeDiffParts(statsBefore, data.stats)

    this.sys.dm.saveData(data, groupId)
  }

  async taunt(e) {
    const groupId = String(e.group_id)
    const userId = String(e.user_id)
    const userName = e.sender.card || e.sender.nickname

    const asPet = this.sys.dm.findRelationByPet(groupId, userId)
    if (!asPet) {
      return e.reply('你不是任何人的宠物，无法嘲讽！')
    }

    const data = this.sys.dm.readData(groupId, asPet.ownerId, asPet.petId)
    if (!data) return e.reply('数据异常')

    if (data.relation.status !== 'bonded') {
      return e.reply('需要缔约后才能使用嘲讽！')
    }

    const taunts = CONFIG.TAUNT_MESSAGES.taunt
    const msg = taunts[Math.floor(Math.random() * taunts.length)]
    const ownerName = asPet.ownerId || '主人'
    await e.reply([`${userName}：${msg}`, segment.at(Number(asPet.ownerId))])
  }
}

export default PetActionApp
