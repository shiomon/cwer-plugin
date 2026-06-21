import plugin from '../../../lib/plugins/plugin.js'
import { CONFIG, getUserColor } from '../config/cfg.js'

const PET_ACTIONS = '投喂|洗澡|陪玩|摸头|拥抱|送礼物|鞭打|打脸|打屁股|羞辱|禁闭|振动|狗叫|滴蜡|挠痒|强制鞭打|强制禁闭|强制羞辱'
const ACTION_REG = new RegExp(`^([#＃]宠物|[\\$＄])(${PET_ACTIONS}).*`)
const ACTION_EXTRACT = new RegExp(`(${PET_ACTIONS})`)

const PET_CARE_ACTIONS = new Set(['投喂', '洗澡', '陪玩', '摸头', '拥抱', '送礼物'])
const TRAIN_ONLY_ACTIONS = new Set(['鞭打', '打脸', '打屁股', '羞辱', '禁闭', '振动', '狗叫', '滴蜡', '挠痒'])
const FORCE_ACTIONS = new Set(['强制鞭打', '强制禁闭', '强制羞辱'])

class InteractApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-互动',
      dsc: '主宠互动',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: ACTION_REG, fnc: 'interact' }
      ]
    })
    this.sys = global.cwerSys
  }

  async interact(e) {
    const match = e.msg.match(ACTION_EXTRACT)
    if (!match) return false

    const action = match[0]
    const groupId = String(e.group_id)
    const userId = String(e.user_id)
    const userName = e.sender.card || e.sender.nickname

    const asOwner = this.sys.dm.findRelationByOwner(groupId, userId)
    const asPet = this.sys.dm.findRelationByPet(groupId, userId)

    const isTrainOrForce = TRAIN_ONLY_ACTIONS.has(action) || FORCE_ACTIONS.has(action)
    const isPetCare = PET_CARE_ACTIONS.has(action)

    if (isTrainOrForce) {
      if (!asOwner.length && !asPet) {
        return e.reply('请先领养宠物或者做别人的宠物，领养发送$领养或者@群友$抢')
      }
      if (!asOwner.length) {
        return e.reply('请先提升亲密度后缔约')
      }
      const rel = asOwner[0]
      const data = this.sys.dm.readData(groupId, rel.ownerId, rel.petId)
      if (!data) return e.reply('数据异常')
      if (data.relation.status !== 'bonded') {
        return e.reply('请先提升亲密度后缔约')
      }
      return this.executeAction(e, data, action, userName, userId, groupId, false)
    }

    if (isPetCare) {
      if (asOwner.length > 0) {
        const rel = asOwner[0]
        const data = this.sys.dm.readData(groupId, rel.ownerId, rel.petId)
        if (data) {
          return this.executeAction(e, data, action, userName, userId, groupId, false)
        }
      }
      if (asPet) {
        const data = this.sys.dm.readData(groupId, asPet.ownerId, asPet.petId)
        if (data) {
          return this.executeAction(e, data, action, userName, userId, groupId, true)
        }
      }
      return e.reply('请先领养宠物或者做别人的宠物，领养发送$领养或者@群友$抢')
    }

    return e.reply('未知的互动方式')
  }

  async executeAction(e, data, action, userName, userId, groupId, isPetSender) {
    if (data.relation.coldWar && Date.now() < data.relation.coldWarUntil) {
      return e.reply('宠物正在冷战中，不想理你~')
    }

    const now = Date.now()
    const cooldownMs = CONFIG.INTERACT_COOLDOWN * 1000
    if (data.sys.lastInteractTime && now - data.sys.lastInteractTime < cooldownMs) {
      const remain = Math.ceil((cooldownMs - (now - data.sys.lastInteractTime)) / 1000)
      return e.reply(`冷却中...请${remain}秒后再来`)
    }
    data.sys.lastInteractTime = now

    if (!data.sys.startTimestamp) {
      data.sys.startTimestamp = Date.now()
    }

    if (!isPetSender && data.relation.status === 'claimed') {
      const evasionChance = this.sys.dm.getEvasionChance(data.stats.obedience)
      if (Math.random() < evasionChance) {
        const evasionMsgs = CONFIG.TAUNT_MESSAGES.evasion
        const evasionMsg = evasionMsgs[Math.floor(Math.random() * evasionMsgs.length)]
        this.sys.dm.addLog(data, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 试图${action}，但宠物不配合！`, '#ff9900')
        this.sys.dm.saveData(data, groupId)
        return e.reply(evasionMsg)
      }
    }

    const config = CONFIG.INTERACTION_EFFECTS[action]
    if (config && config.goldCost) {
      if (data.sys.goldCoins < config.goldCost) {
        return e.reply(`金币不足！需要 ${config.goldCost} 金币，当前只有 ${data.sys.goldCoins} 金币。`)
      }
      data.sys.goldCoins -= config.goldCost
    }

    const warnings = []
    const zeroStats = []
    const isBonded = data.relation.status === 'bonded'
    if (data.stats.satiety <= 0) zeroStats.push('饱食')
    if (data.stats.energy <= 0) zeroStats.push('体力')
    if (data.stats.hygiene <= 0) zeroStats.push('清洁')
    if (data.stats.sensitivity <= 0) zeroStats.push('敏感')
    if (isBonded && data.stats.pain <= 0) zeroStats.push('疼痛')
    if (zeroStats.length > 0) {
      warnings.push(`${zeroStats.join('、')}已归零，互动效果将大幅降低！`)
    }
    if (data.stats.satiety <= 0 && data.stats.energy <= 0) {
      warnings.push('💀 宠物已失去意识，像具尸体一样躺在地上...')
    } else if (data.stats.satiety <= 0) {
      warnings.push('💀 宠物饿得动弹不得，急需投喂！')
    } else if (data.stats.energy <= 0) {
      warnings.push('💀 宠物精疲力竭，连眼皮都抬不起来了...')
    }

    const statsBefore = { ...data.stats }

    const result = this.sys.ie.executeInteraction(data, action, userName, userId, isPetSender)

    if (config) {
      const goldReward = config.goldReward || 0
      const forceMult = FORCE_ACTIONS.has(action) ? 1.5 : 1
      data.sys.goldCoins += Math.round(goldReward * forceMult) + this.sys.dm.getHouseGoldBonus(data)
    }

    this.sys.es.tickTime(data, CONFIG.INTERACTION_TIME_COST)
    this.sys.dm.applyHouseBonus(data)
    this.sys.shop.checkAchievements(data)

    const diffParts = this.sys.dm.computeDiffParts(statsBefore, data.stats)
    if (diffParts.length > 0) {
      result.logText += ` | ${diffParts.join(', ')}`
    }

    this.sys.dm.addLog(data, result.logText, result.logColor)
    this.sys.dm.saveData(data, groupId)

    let outMsg = this.sys.ie.formatInteractionReply(result)
    if (warnings.length > 0) {
      outMsg += '\n⚠️ ' + warnings.join('\n⚠️ ')
    }
    await e.reply(outMsg)
  }
}

export default InteractApp
