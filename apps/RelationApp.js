import plugin from '../../../lib/plugins/plugin.js'
import { CONFIG, CMD_PREFIX, NO_PET_MSG, NO_OWNER_MSG, getUserColor, GROUP_ONLY_MSG } from '../config/cfg.js'
import { segment } from 'oicq'

const activeBondRequests = new Map()
const releaseCooldowns = new Map()
const escapeCooldowns = new Map()

class RelationApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-关系',
      dsc: '宠物领养/抢夺/缔约',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: `^${CMD_PREFIX}领养.*`, fnc: 'adopt' },
        { reg: `^${CMD_PREFIX}抢.*`, fnc: 'steal' },
        { reg: `^${CMD_PREFIX}缔约.*`, fnc: 'bond' },
        { reg: `^${CMD_PREFIX}缔约主人.*`, fnc: 'bondMaster' },
        { reg: `^${CMD_PREFIX}同意.*`, fnc: 'agreeBond' },
        { reg: `^${CMD_PREFIX}不同意.*`, fnc: 'rejectBond' },
        { reg: `^${CMD_PREFIX}解除.*`, fnc: 'release' },
        { reg: `^${CMD_PREFIX}摆脱.*`, fnc: 'escape' }
      ]
    })
    this.sys = global.cwerSys
  }

  async adopt(e) {
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    const at = e.message?.find(m => m.type === 'at')
    const targetId = String(e.at || at?.qq || at?.id || '')
    if (targetId && targetId !== '0' && targetId !== String(e.user_id)) {
      return this.adoptTarget(e, targetId)
    }
    return this.adoptRandom(e)
  }

  async adoptTarget(e, targetId) {
    const groupId = String(e.group_id)
    const ownerId = String(e.user_id)
    const ownerName = e.sender.card || e.sender.nickname

    const ownerData = this.sys.dm.readUserData(groupId, ownerId) || {}
    ownerData._userId = ownerId
    if (ownerData.owner && ownerData.owner.petId) {
      const msg = ownerData.owner.status === 'bonded' ? '你已经缔约了，无法再领养！' : '你已经养了宠物了，先解除关系再领养新的吧！'
      return e.reply(msg)
    }

    const petExisting = this.sys.dm.findRelationByPet(groupId, targetId)
    if (petExisting) {
      const petOwnerData = this.sys.dm.readUserData(groupId, petExisting.ownerId)
      if (petOwnerData && petOwnerData.owner && petOwnerData.owner.status === 'bonded') {
        return e.reply('该宠物已缔约，无法领养！')
      }
    }

    if (Math.random() > CONFIG.ADOPT_CHANCE) {
      const taunts = CONFIG.TAUNT_MESSAGES.adoptFail
      const fail = taunts[Math.floor(Math.random() * taunts.length)]
      return e.reply(`领养失败！${fail}`)
    }

    if (petExisting && petExisting.ownerId === ownerId) {
      return e.reply('你已经领养了这个宠物！')
    }

    if (petExisting) {
      const oldOwnerData = this.sys.dm.readUserData(groupId, petExisting.ownerId)
      if (oldOwnerData) {
        oldOwnerData._userId = petExisting.ownerId
        this.sys.dm.clearOwnerRelation(oldOwnerData)
        this.sys.dm.saveUserData(oldOwnerData, groupId)
      }
    }

    const bot = e.bot ?? Bot
    const group = bot.pickGroup?.(e.group_id) || e.group
    let petName = null
    let petAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${targetId}`
    try {
      const member = group?.pickMember?.(Number(targetId))
      let info = member?.info
      if (!info?.nickname) { try { info = await member?.getInfo?.() } catch {} }
      petName = info?.card || info?.nickname || null
    } catch {}

    const ownerAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${ownerId}`
    const petData = this.sys.dm.readUserData(groupId, targetId) || { _userId: targetId }

    this.sys.dm.setupOwnerRelation(ownerData, petData, ownerName, petName, petAvatar, ownerAvatar)
    this.sys.dm.setupPetMasterLink(groupId, ownerId, targetId)
    if (!ownerData.owner.petSys.startTimestamp) ownerData.owner.petSys.startTimestamp = Date.now()
    this.sys.dm.saveUserData(ownerData, groupId)

    await e.reply([`成功领养为宠物！快去宠爱ta吧~`, segment.at(Number(targetId))])
  }

  async adoptRandom(e) {
    const groupId = String(e.group_id)
    const ownerId = String(e.user_id)
    const ownerName = e.sender.card || e.sender.nickname

    const ownerData = this.sys.dm.readUserData(groupId, ownerId) || {}
    ownerData._userId = ownerId
    if (ownerData.owner && ownerData.owner.petId) {
      const msg = ownerData.owner.status === 'bonded' ? '你已经缔约了，无法再领养！' : '你已经养了宠物了，先解除关系再领养新的吧！'
      return e.reply(msg)
    }

    const bot = e.bot ?? Bot
    const group = bot.pickGroup?.(e.group_id) || e.group
    let memberMap
    try { memberMap = await group?.getMemberMap?.() } catch {}
    if (!memberMap) {
      try { memberMap = (await group?.renew?.())?.data } catch {}
    }
    if (!memberMap) return e.reply('获取群成员列表失败')

    const candidates = []
    for (const [id, info] of memberMap) {
      const uid = String(id)
      if (uid === ownerId || uid === String(bot.uin)) continue
      const rel = this.sys.dm.findRelationByPet(groupId, uid)
      if (rel && rel.ownerId === ownerId) continue
      if (rel) {
        const d = this.sys.dm.readUserData(groupId, rel.ownerId)
        if (d && d.owner && d.owner.status === 'bonded') continue
      }
      candidates.push({ id: uid, name: info?.card || info?.nickname || null })
    }

    if (candidates.length === 0) {
      return e.reply('群内没有可领养的对象~')
    }

    const target = candidates[Math.floor(Math.random() * candidates.length)]

    if (Math.random() > CONFIG.ADOPT_CHANCE) {
      const taunts = CONFIG.TAUNT_MESSAGES.adoptFail
      const fail = taunts[Math.floor(Math.random() * taunts.length)]
      return e.reply(`随机到了 ${target.name || '某人'}，但领养失败！${fail}`)
    }

    const petExisting = this.sys.dm.findRelationByPet(groupId, target.id)
    if (petExisting) {
      const oldOwnerData = this.sys.dm.readUserData(groupId, petExisting.ownerId)
      if (oldOwnerData) {
        oldOwnerData._userId = petExisting.ownerId
        this.sys.dm.clearOwnerRelation(oldOwnerData)
        this.sys.dm.saveUserData(oldOwnerData, groupId)
      }
    }

    const ownerAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${ownerId}`
    const petData = this.sys.dm.readUserData(groupId, target.id) || { _userId: target.id }

    this.sys.dm.setupOwnerRelation(ownerData, petData, ownerName, target.name, `https://q1.qlogo.cn/g?b=qq&s=100&nk=${target.id}`, ownerAvatar)
    this.sys.dm.setupPetMasterLink(groupId, ownerId, target.id)
    if (!ownerData.owner.petSys.startTimestamp) ownerData.owner.petSys.startTimestamp = Date.now()
    this.sys.dm.saveUserData(ownerData, groupId)

    await e.reply([`命运选择了你！领养成功~`, segment.at(Number(target.id))])
  }

  async steal(e) {
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    const at = e.message?.find(m => m.type === 'at')
    const targetId = String(e.at || at?.qq || at?.id || '')
    if (targetId && targetId !== '0' && targetId !== String(e.user_id)) {
      return this.stealTarget(e, targetId)
    }
    return this.stealRandom(e)
  }

  async stealTarget(e, targetId) {
    const groupId = String(e.group_id)
    const ownerId = String(e.user_id)
    const ownerName = e.sender.card || e.sender.nickname

    const ownerData = this.sys.dm.readUserData(groupId, ownerId) || {}
    ownerData._userId = ownerId
    if (ownerData.owner && ownerData.owner.petId) {
      const msg = ownerData.owner.status === 'bonded' ? '你已经缔约了，无法再抢夺！' : '你已经养了宠物了，先解除关系再抢别人的吧！'
      return e.reply(msg)
    }

    const petRel = this.sys.dm.findRelationByPet(groupId, targetId)
    if (petRel) {
      const petOwnerData = this.sys.dm.readUserData(groupId, petRel.ownerId)
      if (petOwnerData && petOwnerData.owner && petOwnerData.owner.status === 'bonded') {
        return e.reply('该宠物已缔约，无法抢夺！')
      }
    }

    if (Math.random() > CONFIG.STEAL_CHANCE) {
      const taunts = CONFIG.TAUNT_MESSAGES.stealFail
      const fail = taunts[Math.floor(Math.random() * taunts.length)]
      return e.reply(`抢夺失败！${fail}`)
    }

    if (petRel && petRel.ownerId === ownerId) {
      return e.reply('你不能抢自己的宠物！')
    }

    if (petRel) {
      const oldOwnerData = this.sys.dm.readUserData(groupId, petRel.ownerId)
      if (oldOwnerData) {
        const oldPetData = this.sys.dm.extractPetData(oldOwnerData)
        this.sys.dm.clearOwnerRelation(oldOwnerData)
        this.sys.dm.saveUserData(oldOwnerData, groupId)

        const ownerAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${ownerId}`
        oldPetData._userId = targetId
        this.sys.dm.setupOwnerRelation(ownerData, oldPetData, ownerName, oldPetData.pet?.petName || null, `https://q1.qlogo.cn/g?b=qq&s=100&nk=${targetId}`, ownerAvatar)
        this.sys.dm.setupPetMasterLink(groupId, ownerId, targetId)
        if (!ownerData.owner.petSys.startTimestamp) ownerData.owner.petSys.startTimestamp = Date.now()
        this.sys.dm.saveUserData(ownerData, groupId)

        return e.reply([`成功抢走了 `, segment.at(Number(targetId)), ` 太厉害了！`])
      }
    }

    return this.adoptTarget(e, targetId)
  }

  async stealRandom(e) {
    const groupId = String(e.group_id)
    const ownerId = String(e.user_id)
    const ownerName = e.sender.card || e.sender.nickname

    const ownerData = this.sys.dm.readUserData(groupId, ownerId) || {}
    ownerData._userId = ownerId
    if (ownerData.owner && ownerData.owner.petId) {
      const msg = ownerData.owner.status === 'bonded' ? '你已经缔约了，无法再抢夺！' : '你已经养了宠物了，先解除关系再抢别人的吧！'
      return e.reply(msg)
    }

    const allRels = this.sys.dm.findAllRelations(groupId)
    const candidates = allRels.filter(r => r.ownerId !== ownerId)
    if (candidates.length === 0) return e.reply('没有可抢的宠物~')

    const target = candidates[Math.floor(Math.random() * candidates.length)]

    if (Math.random() > CONFIG.STEAL_CHANCE) {
      const taunts = CONFIG.TAUNT_MESSAGES.stealFail
      const fail = taunts[Math.floor(Math.random() * taunts.length)]
      return e.reply(`抢夺失败！${fail}`)
    }

    const oldOwnerData = this.sys.dm.readUserData(groupId, target.ownerId)
    if (!oldOwnerData) return e.reply('数据异常')

    const oldPetData = this.sys.dm.extractPetData(oldOwnerData)
    this.sys.dm.clearOwnerRelation(oldOwnerData)
    this.sys.dm.saveUserData(oldOwnerData, groupId)

    const ownerAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${ownerId}`
    oldPetData._userId = target.petId
    this.sys.dm.setupOwnerRelation(ownerData, oldPetData, ownerName, oldPetData.pet?.petName || null, `https://q1.qlogo.cn/g?b=qq&s=100&nk=${target.petId}`, ownerAvatar)
    this.sys.dm.setupPetMasterLink(groupId, ownerId, target.petId)
    if (!ownerData.owner.petSys.startTimestamp) ownerData.owner.petSys.startTimestamp = Date.now()
    this.sys.dm.saveUserData(ownerData, groupId)

    await e.reply([`成功抢走了 `, segment.at(Number(target.petId)), ` 太厉害了！`])
  }

  async bond(e) {
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    const groupId = String(e.group_id)
    const userId = String(e.user_id)

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData) return e.reply(NO_PET_MSG)

    if (userData.owner && userData.owner.petId && userData.owner.status !== 'bonded') {
      const petId = userData.owner.petId
      if (!petId) return e.reply(NO_PET_MSG)
      if (userData.owner.intimacy < 99) {
        return e.reply(`亲密度不足99，当前等级：${this.sys.dm.getIntimacyLevel(userData.owner.intimacy)}`)
      }

      activeBondRequests.set(`${groupId}_${petId}`, { requesterId: userId, requesterName: e.sender.card || e.sender.nickname, type: 'owner', time: Date.now() })
      return e.reply([
        `向宠物发起了缔约请求！\n⚠️ 缔约后双方所有其他宠物/主人关系将被清除\n`,
        segment.at(Number(petId)),
        ` 请在30秒内回复 #宠物同意 或 #宠物不同意`
      ])
    }

    if (userData.masterId) {
      const ownerData = this.sys.dm.readUserData(groupId, userData.masterId)
      if (!ownerData) return e.reply('数据异常')

      const notifications = this.executeBond(groupId, ownerData, userData, userData.masterId, userId)
      let msg = '缔约成功！解锁更多姿势了呢'
      if (notifications.length > 0) msg += '\n' + notifications.join('\n')
      await e.reply([msg, segment.at(Number(userData.masterId))])
      const petData = this.sys.dm.extractPetData(ownerData)
      petData._userId = userId
      await this.sys.renderer.renderPanel(e, petData, ownerData)
      return
    }

    return e.reply(NO_PET_MSG)
  }

  async bondMaster(e) {
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    const groupId = String(e.group_id)
    const userId = String(e.user_id)

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData || !userData.masterId) {
      return e.reply(NO_OWNER_MSG)
    }
    userData._userId = userId

    const ownerId = userData.masterId
    const ownerData = this.sys.dm.readUserData(groupId, ownerId)
    if (!ownerData) return e.reply('数据异常')
    ownerData._userId = ownerId

    if (ownerData.owner && ownerData.owner.status === 'bonded') {
      return e.reply('已经和主人缔约了！')
    }

    if (ownerData.owner.intimacy < 99) {
      return e.reply(`亲密度不足99，当前等级：${this.sys.dm.getIntimacyLevel(ownerData.owner.intimacy)}`)
    }

    const notifications = this.executeBond(groupId, ownerData, userData, ownerId, userId)
    let msg = '缔约成功！解锁更多姿势了呢'
    if (notifications.length > 0) msg += '\n' + notifications.join('\n')
    await e.reply([msg, segment.at(Number(ownerId))])
    const petData = this.sys.dm.extractPetData(ownerData)
    petData._userId = userId
    await this.sys.renderer.renderPanel(e, petData, ownerData)
  }

  async agreeBond(e) {
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    const groupId = String(e.group_id)
    const userId = String(e.user_id)
    const key = `${groupId}_${userId}`

    const request = activeBondRequests.get(key)
    if (!request) return false
    if (Date.now() - request.time > CONFIG.BOND_REQUEST_TIMEOUT * 1000) {
      activeBondRequests.delete(key)
      return e.reply('缔约请求已超时')
    }

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData) return e.reply('数据异常')
    userData._userId = userId

    let notifications = []
    if (request.type === 'owner') {
      const requesterData = this.sys.dm.readUserData(groupId, request.requesterId)
      if (!requesterData) return e.reply('数据异常')
      requesterData._userId = request.requesterId
      if (!requesterData.owner || requesterData.owner.petId !== userId) return e.reply('关系已变更')

      notifications = this.executeBond(groupId, requesterData, userData, request.requesterId, userId)
    }

    activeBondRequests.delete(key)
    let msg = '缔约成功！解锁更多姿势了呢'
    if (notifications.length > 0) msg += '\n' + notifications.join('\n')
    await e.reply([msg, segment.at(Number(request.requesterId))])
    const ownerDataForRender = request.type === 'owner'
      ? this.sys.dm.readUserData(groupId, request.requesterId)
      : userData
    const petData = this.sys.dm.extractPetData(ownerDataForRender)
    if (petData) {
      petData._userId = userId
      await this.sys.renderer.renderPanel(e, petData, ownerDataForRender)
    }
  }

  async rejectBond(e) {
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    const groupId = String(e.group_id)
    const userId = String(e.user_id)
    const key = `${groupId}_${userId}`

    const request = activeBondRequests.get(key)
    if (!request) return false
    activeBondRequests.delete(key)
    await e.reply(`已拒绝 ${request.requesterName} 的缔约请求`)
  }

  executeBond(groupId, ownerSideData, petSideData, ownerId, petId) {
    const notifications = []

    const savedPetName = ownerSideData.owner?.petName || null
    const savedOwnerName = ownerSideData.owner?.ownerName || null

    if (petSideData.owner && petSideData.owner.petId && petSideData.owner.petId !== petId) {
      const oldPetId = petSideData.owner.petId
      const oldPetData2 = this.sys.dm.readUserData(groupId, oldPetId)
      if (oldPetData2) {
        oldPetData2._userId = oldPetId
        notifications.push(`已解除与 ${oldPetData2.owner?.petName || '宠物'} 的主人宠物关系`)
        this.sys.dm.clearOwnerRelation(oldPetData2)
        this.sys.dm.saveUserData(oldPetData2, groupId)
      }
      this.sys.dm.clearOwnerRelation(petSideData)
    }

    if (ownerSideData.owner && ownerSideData.owner.petId && ownerSideData.owner.petId !== petId) {
      const oldPetId = ownerSideData.owner.petId
      const oldPetData = this.sys.dm.readUserData(groupId, oldPetId)
      if (oldPetData) {
        oldPetData._userId = oldPetId
        notifications.push(`已解除与 ${oldPetData.owner?.petName || '宠物'} 的宠物关系`)
        this.sys.dm.clearOwnerRelation(oldPetData)
        this.sys.dm.saveUserData(oldPetData, groupId)
      }
      this.sys.dm.clearOwnerRelation(ownerSideData)
    }

    ownerSideData.owner = {
      petId,
      petName: savedPetName,
      petAvatar: `https://q1.qlogo.cn/g?b=qq&s=100&nk=${petId}`,
      ownerName: savedOwnerName,
      ownerAvatar: `https://q1.qlogo.cn/g?b=qq&s=100&nk=${ownerId}`,
      status: 'bonded',
      createdAt: ownerSideData.owner?.createdAt || Date.now(),
      bondedAt: Date.now(),
      intimacy: ownerSideData.owner?.intimacy || 0,
      obedience: ownerSideData.owner?.obedience || 0,
      lewd: ownerSideData.owner?.lewd || 0,
      petStats: ownerSideData.owner?.petStats || {},
      petClothes: ownerSideData.owner?.petClothes || {},
      petHouse: ownerSideData.owner?.petHouse || 'broken',
      petTraits: ownerSideData.owner?.petTraits || [],
      petDiary: ownerSideData.owner?.petDiary || [],
      petAchievements: ownerSideData.owner?.petAchievements || {},
      petSys: ownerSideData.owner?.petSys || {}
    }

    petSideData.masterId = ownerId

    this.sys.dm.saveUserData(ownerSideData, groupId)
    this.sys.dm.saveUserData(petSideData, groupId)

    return notifications
  }

  async release(e) {
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    const groupId = String(e.group_id)
    const userId = String(e.user_id)

    const cooldownKey = `${groupId}_${userId}_release`
    const lastRelease = releaseCooldowns.get(cooldownKey)
    if (lastRelease && Date.now() - lastRelease < CONFIG.RELATION_COOLDOWN) {
      const remain = Math.ceil((CONFIG.RELATION_COOLDOWN - (Date.now() - lastRelease)) / 60000)
      return e.reply(`解除冷却中...请${remain}分钟后再试`)
    }

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData) return e.reply(NO_PET_MSG)
    userData._userId = userId

    if (userData.owner && userData.owner.petId) {
      const petId = userData.owner.petId
      const petName = userData.owner.petName || '宠物'
      const statusText = userData.owner.status === 'bonded' ? '缔约' : '领养'

      this.sys.dm.clearOwnerRelation(userData)

      const petFileData = this.sys.dm.readUserData(groupId, petId)
      if (petFileData) {
        petFileData._userId = petId
        petFileData.masterId = null
        this.sys.dm.saveUserData(petFileData, groupId)
      }

      this.sys.dm.saveUserData(userData, groupId)

      releaseCooldowns.set(cooldownKey, Date.now())
      return e.reply(`已解除与 ${petName} 的${statusText}关系`)
    }

    if (userData.masterId) {
      const ownerData = this.sys.dm.readUserData(groupId, userData.masterId)
      if (!ownerData) return e.reply('数据异常')

      if (ownerData.owner && ownerData.owner.status !== 'bonded') {
        return e.reply('领养阶段请使用 #宠物摆脱 来脱离主人')
      }
      const ownerName = ownerData.owner?.ownerName || '主人'

      this.sys.dm.clearOwnerRelation(ownerData)
      userData.masterId = null

      this.sys.dm.saveUserData(ownerData, groupId)
      this.sys.dm.saveUserData(userData, groupId)

      releaseCooldowns.set(cooldownKey, Date.now())
      return e.reply(`已解除与 ${ownerName} 的缔约关系`)
    }

    return e.reply(NO_PET_MSG)
  }

  async escape(e) {
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    const groupId = String(e.group_id)
    const userId = String(e.user_id)

    const cooldownKey = `${groupId}_${userId}_escape`
    const lastEscape = escapeCooldowns.get(cooldownKey)
    if (lastEscape && Date.now() - lastEscape < CONFIG.RELATION_COOLDOWN) {
      const remain = Math.ceil((CONFIG.RELATION_COOLDOWN - (Date.now() - lastEscape)) / 60000)
      return e.reply(`摆脱冷却中...请${remain}分钟后再试`)
    }

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData || !userData.masterId) {
      return e.reply(NO_OWNER_MSG)
    }
    userData._userId = userId

    const ownerData = this.sys.dm.readUserData(groupId, userData.masterId)
    if (ownerData && ownerData.owner && ownerData.owner.status === 'bonded') {
      return e.reply('缔约关系请使用 #宠物解除')
    }

    const ownerName = ownerData?.owner?.ownerName || '主人'

    if (ownerData) {
      this.sys.dm.clearOwnerRelation(ownerData)
      ownerData._userId = userData.masterId
    }

    userData.masterId = null

    if (ownerData) this.sys.dm.saveUserData(ownerData, groupId)
    this.sys.dm.saveUserData(userData, groupId)

    escapeCooldowns.set(cooldownKey, Date.now())
    return e.reply(`已摆脱与 ${ownerName} 的领养关系`)
  }
}

export default RelationApp
