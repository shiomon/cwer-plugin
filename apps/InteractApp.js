import plugin from '../../../lib/plugins/plugin.js'
import { CONFIG, CMD_PREFIX, NO_PET_MSG, GROUP_ONLY_MSG, getUserColor } from '../config/cfg.js'
import { segment } from 'oicq'

const safeAt = (id) => { const n = Number(id); return Number.isFinite(n) ? segment.at(n) : '' }

const _EFFECTS = CONFIG.INTERACTION_EFFECTS
const CARE_ACTIONS = new Set()
const TRAIN_ACTIONS = new Set()
for (const [name, cfg] of Object.entries(_EFFECTS)) {
  if (cfg.type === 'pet') CARE_ACTIONS.add(name)
  else if (cfg.type === 'train') TRAIN_ACTIONS.add(name)
}
const BOND_ONLY_ACTIONS = new Set(['撒娇', '生气气', '讨好', '献媚', '勾引'])
const SPECIAL_ACTIONS = new Set(['求关注', '嘲讽'])
const ALL_ACTION_NAMES = [...CARE_ACTIONS, ...TRAIN_ACTIONS, ...SPECIAL_ACTIONS].join('|')
const ACTION_REG = new RegExp(`^${CMD_PREFIX}(${ALL_ACTION_NAMES}).*`)
const ACTION_EXTRACT = new RegExp(`(${ALL_ACTION_NAMES})`)

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

    if (SPECIAL_ACTIONS.has(action)) {
      return this.handleSpecial(e, action, groupId, userId, userName)
    }

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData) return e.reply(NO_PET_MSG)

    const isTrain = TRAIN_ACTIONS.has(action)
    const isBondOnly = BOND_ONLY_ACTIONS.has(action)

    if (isTrain || isBondOnly) {
      if (userData.owner && userData.owner.petId) {
        if (userData.owner.status !== 'bonded') return e.reply(isTrain ? '领养阶段仅可用宠爱指令，$缔约 后才可用调教指令！' : '请先$缔约 后才能使用此指令！')
        return this.executeAction(e, userData, action, userName, userId, groupId, true)
      }
      if (userData.masterId) {
        const ownerData = this.sys.dm.readUserData(groupId, userData.masterId)
        if (ownerData && ownerData.owner && ownerData.owner.status === 'bonded') {
          ownerData._userId = userData.masterId
          return this.executeAction(e, ownerData, action, userName, userId, groupId, false)
        }
      }
      return e.reply(NO_PET_MSG)
    }

    if (CARE_ACTIONS.has(action)) {
      if (userData.owner && userData.owner.petId) {
        return this.executeAction(e, userData, action, userName, userId, groupId, true)
      }
      if (userData.masterId) {
        const ownerData = this.sys.dm.readUserData(groupId, userData.masterId)
        if (ownerData && ownerData.owner && ownerData.owner.status === 'bonded') {
          ownerData._userId = userData.masterId
          return this.executeAction(e, ownerData, action, userName, userId, groupId, false)
        }
      }
      return e.reply(NO_PET_MSG)
    }

    return e.reply('未知的互动方式')
  }

  async handleSpecial(e, action, groupId, userId, userName) {
    const { ownerData, userData } = this.sys.dm.resolveOwnerData(groupId, userId)
    if (!ownerData || !ownerData.owner) return e.reply(NO_PET_MSG)
    if (ownerData.owner.status !== 'bonded') return e.reply('请先$缔约 后才能使用此指令！')
    ownerData._userId = userData.masterId || userId
    const isOwner = !userData.masterId
    const targetId = isOwner ? ownerData.owner.petId : userData.masterId

    if (action === '求关注') {
      this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 求关注！`, '#66ccff')
      this.sys.postInteraction(ownerData, null, groupId)
      return await e.reply([safeAt(targetId), ` ${userName} 求关注！你的宠物在等你互动哦~`])
    }

    if (action === '嘲讽') {
      const categories = Object.keys(CONFIG.TAUNT_MESSAGES)
      const category = categories[Math.floor(Math.random() * categories.length)]
      const taunts = CONFIG.TAUNT_MESSAGES[category]
      const taunt = taunts[Math.floor(Math.random() * taunts.length)]
      this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span>：${taunt}`, '#ff69b4')
      this.sys.dm.saveUserData(ownerData, groupId)
      return await e.reply([safeAt(targetId), ` ${userName}：${taunt}`])
    }
  }

  async executeAction(e, ownerData, action, userName, userId, groupId, isOwner = true) {
    const o = ownerData.owner
    if (!o) return e.reply(NO_PET_MSG)

    const remain = this.sys.checkCooldown(o.petSys)
    if (remain !== null) return e.reply(`宠物在回味中...请${remain}秒后再来`)

    const zeroStats = []
    if (o.petStats.satiety <= 0) zeroStats.push('饱食')
    if (o.petStats.energy <= 0) zeroStats.push('体力')
    if (o.petStats.hygiene <= 0) zeroStats.push('清洁')
    if (o.petStats.sensitivity <= 0) zeroStats.push('敏感')
    if (o.status === 'bonded' && o.petStats.pain <= 0) zeroStats.push('疼痛')

    if (isOwner && o.status !== 'bonded') {
      const evasionChance = this.sys.dm.getEvasionChance(o.obedience)
      if (evasionChance > 0 && Math.random() < evasionChance) {
        this.sys.dm.addLog(ownerData, `<span style="color:${this.sys.getUserColor(userId)};font-weight:600">${userName}</span> 试图${action}，但宠物不配合！`, '#ff9900')
        this.sys.dm.saveUserData(ownerData, groupId)
        return e.reply(`宠物不配合！${action}失败了~`)
      }
    }

    o.petSys.lastInteractTime = Date.now()
    const result = this.sys.ie.executeInteraction(ownerData, action, userName, userId, isOwner)
    let reply = this.sys.ie.formatInteractionReply(result)
    if (zeroStats.length > 0) reply += `\n⚠ ${zeroStats.join('、')}为0，无加成`

    this.sys.postInteraction(ownerData, result, groupId)

    await e.reply(reply)
  }
}

export default InteractApp
