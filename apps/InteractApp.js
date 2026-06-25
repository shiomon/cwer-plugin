import plugin from '../../../lib/plugins/plugin.js'
import { CONFIG, getUserColor, CMD_PREFIX, NO_PET_MSG, GROUP_ONLY_MSG } from '../config/cfg.js'

const ACTION_NAMES = '投喂|洗澡|陪玩|摸头|拥抱|送礼物|鞭打|打脸|打屁股|羞辱|禁闭|振动|狗叫|滴蜡|挠痒|强制鞭打|强制禁闭|强制羞辱'
const ACTION_REG = new RegExp(`^${CMD_PREFIX}(${ACTION_NAMES}).*`)
const ACTION_EXTRACT = new RegExp(`(${ACTION_NAMES})`)

const CARE_ACTIONS = new Set(['投喂', '洗澡', '陪玩', '摸头', '拥抱', '送礼物'])
const TRAIN_ACTIONS = new Set(['鞭打', '打脸', '打屁股', '羞辱', '禁闭', '振动', '狗叫', '滴蜡', '挠痒'])
const FORCE_ACTIONS = new Set(['强制鞭打', '强制禁闭', '强制羞辱'])

class InteractApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-互动',
      dsc: '宠物互动',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: ACTION_REG, fnc: 'interact' }
      ]
    })
    this.sys = global.cwerSys
  }

  async interact(e) {
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    const action = e.msg.match(ACTION_EXTRACT)?.[0]
    if (!action) return false

    const groupId = String(e.group_id)
    const userId = String(e.user_id)
    const userName = e.sender.card || e.sender.nickname

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData) return e.reply(NO_PET_MSG)

    const hasOwner = userData.owner && userData.owner.petId
    const hasMaster = userData.masterId

    const isTrainOrForce = TRAIN_ACTIONS.has(action) || FORCE_ACTIONS.has(action)
    const isCare = CARE_ACTIONS.has(action)

    if (isTrainOrForce) {
      if (!hasOwner) return e.reply('你没有宠物，无法使用调教指令！')
      if (userData.owner.status !== 'bonded') return e.reply('请先与宠物缔约后才能使用调教指令！')
      return this.executeOwnerAction(e, userData, action, userName, userId, groupId)
    }

    if (isCare) {
      if (hasOwner) return this.executeOwnerAction(e, userData, action, userName, userId, groupId)
      if (hasMaster) {
        const ownerData = this.sys.dm.readUserData(groupId, userData.masterId)
        if (!ownerData || !ownerData.owner || ownerData.owner.status !== 'bonded') {
          return e.reply('需要缔约后才能使用照顾类指令！')
        }
        ownerData._userId = userData.masterId
        return this.executePetAction(e, ownerData, action, userName, userId, groupId)
      }
      return e.reply(NO_PET_MSG)
    }

    return e.reply('未知的互动方式')
  }

  async executeOwnerAction(e, ownerData, action, userName, userId, groupId) {
    const o = ownerData.owner
    if (!o) return e.reply(NO_PET_MSG)

    const now = Date.now()
    if (o.petSys.lastInteractTime && now - o.petSys.lastInteractTime < CONFIG.INTERACTION_COOLDOWN) {
      const remain = Math.ceil((CONFIG.INTERACTION_COOLDOWN - (now - o.petSys.lastInteractTime)) / 1000)
      return e.reply(`宠物在回味中...请${remain}秒后再来`)
    }

    const evasionChance = this.sys.dm.getEvasionChance(o.obedience)
    if (evasionChance > 0 && Math.random() * 100 < evasionChance) {
      this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 试图${action}，但宠物不配合！`, '#ff9900')
      this.sys.dm.saveUserData(ownerData, groupId)
      return e.reply(`宠物不配合！${action}失败了~`)
    }

    o.petSys.lastInteractTime = now
    const result = this.sys.ie.executeOwnerInteraction(ownerData, action, userName, userId)

    const reply = this.sys.ie.formatInteractionReply(result)

    this.sys.es.tickTime(ownerData, CONFIG.INTERACTION_TIME_COST)
    this.sys.dm.applyHouseBonus(ownerData)
    this.sys.shop.checkAchievements(ownerData)
    this.sys.dm.addLog(ownerData, result.logText, result.logColor)
    this.sys.dm.saveUserData(ownerData, groupId)

    await e.reply(reply)
  }

  async executePetAction(e, ownerData, action, userName, userId, groupId) {
    const o = ownerData.owner
    if (!o) return e.reply(NO_PET_MSG)

    const now = Date.now()
    if (o.petSys.lastInteractTime && now - o.petSys.lastInteractTime < CONFIG.INTERACTION_COOLDOWN) {
      const remain = Math.ceil((CONFIG.INTERACTION_COOLDOWN - (now - o.petSys.lastInteractTime)) / 1000)
      return e.reply(`还在回味中...请${remain}秒后再来`)
    }

    o.petSys.lastInteractTime = now
    const result = this.sys.ie.executePetInteraction(ownerData, action, userName, userId)

    const reply = this.sys.ie.formatInteractionReply(result)

    this.sys.es.tickTime(ownerData, CONFIG.INTERACTION_TIME_COST)
    this.sys.dm.applyHouseBonus(ownerData)
    this.sys.shop.checkAchievements(ownerData)
    this.sys.dm.addLog(ownerData, result.logText, result.logColor)
    this.sys.dm.saveUserData(ownerData, groupId)

    await e.reply(reply)
  }
}

export default InteractApp
