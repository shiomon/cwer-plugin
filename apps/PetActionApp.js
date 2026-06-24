import plugin from '../../../lib/plugins/plugin.js'
import { CONFIG, getUserColor, CMD_PREFIX, NO_OWNER_MSG } from '../config/cfg.js'
import { segment } from 'oicq'

const PET_ACTION_REG = new RegExp(`^${CMD_PREFIX}(撒娇|生气气|讨好|献媚|求关注|吐槽|勾引|冷战).*`)
const TAUNT_REG = new RegExp(`^${CMD_PREFIX}嘲讽.*`)

class PetActionApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-宠物自主',
      dsc: '宠物自主指令',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: PET_ACTION_REG, fnc: 'petAction' },
        { reg: TAUNT_REG, fnc: 'taunt' }
      ]
    })
    this.sys = global.cwerSys
  }

  async petAction(e) {
    const action = e.msg.match(/撒娇|生气气|讨好|献媚|求关注|吐槽|勾引|冷战/)?.[0]
    if (!action) return false

    const groupId = String(e.group_id)
    const userId = String(e.user_id)
    const userName = e.sender.card || e.sender.nickname

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData || !userData.masterId) {
      return e.reply(NO_OWNER_MSG)
    }
    userData._userId = userId

    const ownerData = this.sys.dm.readUserData(groupId, userData.masterId)
    if (!ownerData || !ownerData.owner) return e.reply(NO_OWNER_MSG)
    ownerData._userId = userData.masterId

    if (ownerData.owner.status !== 'bonded') {
      return e.reply('需要缔约后才能使用此指令！')
    }

    const now = Date.now()
    if (ownerData.owner.petSys.lastInteractTime && now - ownerData.owner.petSys.lastInteractTime < CONFIG.INTERACTION_COOLDOWN) {
      const remain = Math.ceil((CONFIG.INTERACTION_COOLDOWN - (now - ownerData.owner.petSys.lastInteractTime)) / 1000)
      return e.reply(`还在回味中...请${remain}秒后再来`)
    }

    ownerData.owner.petSys.lastInteractTime = now

    if (action === '求关注') {
      const config = CONFIG.PET_ACTIONS[action]
      ownerData.owner.petSys.attentionRequest = { petId: userId, time: now, bonus: config?.intimacyBonus || 3 }
      this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 求关注！`, '#66ccff')
      this.sys.es.tickTime(ownerData, CONFIG.INTERACTION_TIME_COST)
      this.sys.dm.applyHouseBonus(ownerData)
      this.sys.shop.checkAchievements(ownerData)
      this.sys.dm.saveUserData(ownerData, groupId)
      await e.reply([`${userName} 求关注！`, segment.at(Number(userData.masterId)), ` 你的宠物在等你互动哦~`])
      return
    }

    if (action === '冷战') {
      if (ownerData.owner.petSys.coldWar) {
        ownerData.owner.petSys.coldWar = false
        this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 结束了冷战`, '#66ccff')
      } else {
        ownerData.owner.petSys.coldWar = true
        this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 发起了冷战！`, '#666')
      }
      this.sys.es.tickTime(ownerData, CONFIG.INTERACTION_TIME_COST)
      this.sys.dm.applyHouseBonus(ownerData)
      this.sys.shop.checkAchievements(ownerData)
      this.sys.dm.saveUserData(ownerData, groupId)
      await e.reply([`${userName} ${ownerData.owner.petSys.coldWar ? '发起了冷战！' : '结束了冷战~'}`, segment.at(Number(userData.masterId))])
      return
    }

    if (action === '吐槽') {
      this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 在群里吐槽${ownerData.owner.ownerName || '主人'}！`, '#ff69b4')
      this.sys.es.tickTime(ownerData, CONFIG.INTERACTION_TIME_COST)
      this.sys.dm.applyHouseBonus(ownerData)
      this.sys.shop.checkAchievements(ownerData)
      this.sys.dm.saveUserData(ownerData, groupId)
      const ownerName = ownerData.owner.ownerName || '主人'
      await e.reply([`${userName} 在群里吐槽${ownerName}！`, segment.at(Number(userData.masterId))])
      return
    }

    const statsBefore = { ...ownerData.owner.petStats }
    const petBefore = { intimacy: ownerData.owner.intimacy, obedience: ownerData.owner.obedience, lewd: ownerData.owner.lewd }

    const result = this.sys.ie.executePetInteraction(ownerData, action, userName, userId)
    this.sys.dm.addLog(ownerData, result.logText, result.logColor)

    const diffParts = this.sys.dm.computeDiffParts(statsBefore, ownerData.owner.petStats, petBefore, { intimacy: ownerData.owner.intimacy, obedience: ownerData.owner.obedience, lewd: ownerData.owner.lewd })
    const replyText = this.sys.ie.formatInteractionReply(result)
    const reply = diffParts.length > 0 ? `${replyText} | ${diffParts.join(', ')}` : replyText

    this.sys.es.tickTime(ownerData, CONFIG.INTERACTION_TIME_COST)
    this.sys.dm.applyHouseBonus(ownerData)
    this.sys.shop.checkAchievements(ownerData)
    this.sys.dm.saveUserData(ownerData, groupId)

    await e.reply([reply, segment.at(Number(userData.masterId))])
  }

  async taunt(e) {
    const groupId = String(e.group_id)
    const userId = String(e.user_id)
    const userName = e.sender.card || e.sender.nickname

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData || !userData.masterId) {
      return e.reply(NO_OWNER_MSG)
    }
    userData._userId = userId

    const ownerData = this.sys.dm.readUserData(groupId, userData.masterId)
    if (!ownerData || !ownerData.owner) return e.reply(NO_OWNER_MSG)
    ownerData._userId = userData.masterId

    if (ownerData.owner.status !== 'bonded') {
      return e.reply('需要缔约后才能使用嘲讽！')
    }

    const now = Date.now()
    if (ownerData.owner.petSys.lastInteractTime && now - ownerData.owner.petSys.lastInteractTime < CONFIG.INTERACTION_COOLDOWN) {
      const remain = Math.ceil((CONFIG.INTERACTION_COOLDOWN - (now - ownerData.owner.petSys.lastInteractTime)) / 1000)
      return e.reply(`还在回味中...请${remain}秒后再来`)
    }

    ownerData.owner.petSys.lastInteractTime = now

    const categories = Object.keys(CONFIG.TAUNT_MESSAGES)
    const category = categories[Math.floor(Math.random() * categories.length)]
    const taunts = CONFIG.TAUNT_MESSAGES[category]
    const taunt = taunts[Math.floor(Math.random() * taunts.length)]

    this.sys.dm.addLog(ownerData, `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span>：${taunt}`, '#ff69b4')
    this.sys.dm.saveUserData(ownerData, groupId)

    await e.reply([`${userName}：${taunt}`, segment.at(Number(userData.masterId))])
  }
}

export default PetActionApp
