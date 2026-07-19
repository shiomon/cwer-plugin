import plugin from '../../../lib/plugins/plugin.js'
import { CONFIG, CMD_PREFIX, NO_PET_MSG, NO_OWNER_MSG, GROUP_ONLY_MSG, avatarUrl } from '../config/cfg.js'
import { makeDefaultPetSys, makeDefaultPetAchievements } from '../model/DataManager.js'
import { segment } from 'oicq'

const safeAt = (id) => { const n = Number(id); return Number.isFinite(n) ? segment.at(n) : '' }

const activeBondRequests = new Map()
const releaseCooldowns = new Map()
const escapeCooldowns = new Map()

const COOLDOWN_CLEANUP_INTERVAL = 30 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const [key, time] of releaseCooldowns) {
    if (now - time > CONFIG.RELATION_COOLDOWN * 2) releaseCooldowns.delete(key)
  }
  for (const [key, time] of escapeCooldowns) {
    if (now - time > CONFIG.RELATION_COOLDOWN * 2) escapeCooldowns.delete(key)
  }
}, COOLDOWN_CLEANUP_INTERVAL)

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

  _getPhase(groupId, userData) {
    if (userData.owner && userData.owner.petId && userData.owner.status === 'bonded') {
      return { phase: 'bonded', role: 'owner', targetId: userData.owner.petId }
    }
    if (userData.masterId) {
      const masterData = this.sys.dm.readUserData(groupId, userData.masterId)
      if (masterData && masterData.owner && masterData.owner.status === 'bonded') {
        return { phase: 'bonded', role: 'pet', targetId: userData.masterId }
      }
      return { phase: 'claimed', role: 'pet', targetId: userData.masterId }
    }
    if (userData.owner && userData.owner.petId) {
      return { phase: 'claimed', role: 'owner', targetId: userData.owner.petId }
    }
    return { phase: 'free', role: null, targetId: null }
  }


  _clearOldPetRelation(groupId, petExisting) {
    if (!petExisting) return
    const oldOwnerData = this.sys.dm.readUserData(groupId, petExisting.ownerId)
    if (oldOwnerData) {
      oldOwnerData._userId = petExisting.ownerId
      this.sys.dm.clearOwnerRelation(oldOwnerData)
      this.sys.dm.saveUserData(oldOwnerData, groupId)
    }
  }

  _executeSteal(groupId, ownerData, oldOwnerData, targetId, ownerId, ownerName) {
    const oldPetData = this.sys.dm.extractPetData(oldOwnerData)
    this.sys.dm.clearOwnerRelation(oldOwnerData)
    this.sys.dm.saveUserData(oldOwnerData, groupId)

    const ownerAvatar = avatarUrl(ownerId)
    oldPetData._userId = targetId
    this.sys.dm.setupOwnerRelation(ownerData, oldPetData, ownerName, oldPetData.pet?.petName || null, avatarUrl(targetId), ownerAvatar)
    this.sys.dm.setupPetMasterLink(groupId, ownerId, targetId)
    if (!ownerData.owner.petSys.startTimestamp) ownerData.owner.petSys.startTimestamp = Date.now()
    this.sys.dm.saveUserData(ownerData, groupId)
  }

  _clearSideOldRelation(groupId, sideData, sideLabel, petId, notifications) {
    if (sideData.owner && sideData.owner.petId && sideData.owner.petId !== petId) {
      const oldPetId = sideData.owner.petId
      const oldPetData = this.sys.dm.readUserData(groupId, oldPetId)
      if (oldPetData) {
        oldPetData._userId = oldPetId
        notifications.push(`已解除与 ${oldPetData.owner?.petName || '宠物'} 的${sideLabel}关系`)
        this.sys.dm.clearOwnerRelation(oldPetData)
        this.sys.dm.saveUserData(oldPetData, groupId)
      }
      this.sys.dm.clearOwnerRelation(sideData)
    }
  }

  async adopt(e) {
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    const at = e.message?.find(m => m.type === 'at')
    const targetId = String(e.at || at?.qq || at?.id || '')
    if (targetId && targetId !== '0') {
      if (targetId === String(e.user_id)) return e.reply('不能领养自己哦~')
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

    const userPhase = this._getPhase(groupId, ownerData)
    if (userPhase.phase === 'bonded') return e.reply('你已经缔约了，无法再领养！')
    if (userPhase.phase === 'claimed' && userPhase.role === 'owner') return e.reply('你已经养了宠物了，先解除关系再领养新的吧！')

    const targetData = this.sys.dm.readUserData(groupId, targetId)
    const targetPhase = targetData ? this._getPhase(groupId, targetData) : { phase: 'free' }
    if (targetPhase.phase === 'bonded') return e.reply('对方已缔约，无法领养！')

    const petExisting = this.sys.dm.findRelationByPet(groupId, targetId)
    if (petExisting) {
      const petOwnerData = this.sys.dm.readUserData(groupId, petExisting.ownerId)
      if (petOwnerData && petOwnerData.owner && petOwnerData.owner.status === 'bonded') {
        return e.reply('该宠物已缔约，无法领养！')
      }
    }

    if (Math.random() > CONFIG.ADOPT_CHANCE) {
      const fail = CONFIG.TAUNT_MESSAGES.adoptFail[Math.floor(Math.random() * CONFIG.TAUNT_MESSAGES.adoptFail.length)]
      return e.reply(`领养失败！${fail}`)
    }

    if (petExisting && petExisting.ownerId === ownerId) {
      return e.reply('你已经领养了这个宠物！')
    }

    this._clearOldPetRelation(groupId, petExisting)

    const bot = e.bot ?? Bot
    const group = bot.pickGroup?.(e.group_id) || e.group
    let petName = null
    try {
      const member = group?.pickMember?.(Number(targetId))
      let info = member?.info
      if (!info?.nickname) { try { info = await member?.getInfo?.() } catch {} }
      petName = info?.card || info?.nickname || null
    } catch {}

    const ownerAvatar = avatarUrl(ownerId)
    const petData = this.sys.dm.readUserData(groupId, targetId) || { _userId: targetId }
    this.sys.dm.setupOwnerRelation(ownerData, petData, ownerName, petName, avatarUrl(targetId), ownerAvatar)
    this.sys.dm.setupPetMasterLink(groupId, ownerId, targetId)
    if (!ownerData.owner.petSys.startTimestamp) ownerData.owner.petSys.startTimestamp = Date.now()
    this.sys.dm.saveUserData(ownerData, groupId)

    await e.reply([`成功领养为宠物！快去宠爱ta吧~`, safeAt(targetId)])
  }

  async adoptRandom(e) {
    const groupId = String(e.group_id)
    const ownerId = String(e.user_id)
    const ownerName = e.sender.card || e.sender.nickname

    const ownerData = this.sys.dm.readUserData(groupId, ownerId) || {}
    ownerData._userId = ownerId

    const userPhase = this._getPhase(groupId, ownerData)
    if (userPhase.phase === 'bonded') return e.reply('你已经缔约了，无法再领养！')
    if (userPhase.phase === 'claimed' && userPhase.role === 'owner') return e.reply('你已经养了宠物了，先解除关系再领养新的吧！')

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
      const td = this.sys.dm.readUserData(groupId, uid)
      const tp = td ? this._getPhase(groupId, td) : { phase: 'free' }
      if (tp.phase === 'bonded') continue
      const rel = this.sys.dm.findRelationByPet(groupId, uid)
      if (rel && rel.ownerId === ownerId) continue
      if (rel) {
        const d = this.sys.dm.readUserData(groupId, rel.ownerId)
        if (d && d.owner && d.owner.status === 'bonded') continue
      }
      candidates.push({ id: uid, name: info?.card || info?.nickname || null })
    }

    if (candidates.length === 0) return e.reply('群内没有可领养的对象~')

    const target = candidates[Math.floor(Math.random() * candidates.length)]

    if (Math.random() > CONFIG.ADOPT_CHANCE) {
      const fail = CONFIG.TAUNT_MESSAGES.adoptFail[Math.floor(Math.random() * CONFIG.TAUNT_MESSAGES.adoptFail.length)]
      return e.reply(`随机到了 ${target.name || '某人'}，但领养失败！${fail}`)
    }

    const petExisting = this.sys.dm.findRelationByPet(groupId, target.id)
    this._clearOldPetRelation(groupId, petExisting)

    const ownerAvatar = avatarUrl(ownerId)
    const petData = this.sys.dm.readUserData(groupId, target.id) || { _userId: target.id }
    this.sys.dm.setupOwnerRelation(ownerData, petData, ownerName, target.name, avatarUrl(target.id), ownerAvatar)
    this.sys.dm.setupPetMasterLink(groupId, ownerId, target.id)
    if (!ownerData.owner.petSys.startTimestamp) ownerData.owner.petSys.startTimestamp = Date.now()
    this.sys.dm.saveUserData(ownerData, groupId)

    await e.reply([`命运选择了你！领养成功~`, safeAt(target.id)])
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

    const userPhase = this._getPhase(groupId, ownerData)
    if (userPhase.phase === 'bonded') return e.reply('你已经缔约了，无法再抢夺！')
    if (userPhase.phase === 'claimed' && userPhase.role === 'owner') return e.reply('你已经养了宠物了，先解除关系再抢新的吧！')

    const targetData2 = this.sys.dm.readUserData(groupId, targetId)
    const targetPhase = targetData2 ? this._getPhase(groupId, targetData2) : { phase: 'free' }
    if (targetPhase.phase === 'bonded') return e.reply('对方已缔约，无法抢夺！')

    const petRel = this.sys.dm.findRelationByPet(groupId, targetId)
    if (petRel) {
      const petOwnerData = this.sys.dm.readUserData(groupId, petRel.ownerId)
      if (petOwnerData && petOwnerData.owner && petOwnerData.owner.status === 'bonded') {
        return e.reply('该宠物已缔约，无法抢夺！')
      }
    }

    const hasOwner = userPhase.phase === 'claimed'
    const stealChance = hasOwner ? CONFIG.STEAL_CHANCE_OWNER : CONFIG.STEAL_CHANCE_STRANGER
    if (Math.random() > stealChance) {
      const fail = CONFIG.TAUNT_MESSAGES.stealFail[Math.floor(Math.random() * CONFIG.TAUNT_MESSAGES.stealFail.length)]
      return e.reply(`抢夺失败！${fail}`)
    }

    if (petRel && petRel.ownerId === ownerId) return e.reply('你不能抢自己的宠物！')

    if (petRel) {
      const oldOwnerData = this.sys.dm.readUserData(groupId, petRel.ownerId)
      if (oldOwnerData) {
        this._executeSteal(groupId, ownerData, oldOwnerData, targetId, ownerId, ownerName)
        return e.reply([`成功抢走了 `, safeAt(targetId), ` 太厉害了！`])
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

    const userPhase = this._getPhase(groupId, ownerData)
    if (userPhase.phase === 'bonded') return e.reply('你已经缔约了，无法再抢夺！')
    if (userPhase.phase === 'claimed' && userPhase.role === 'owner') return e.reply('你已经养了宠物了，先解除关系再抢新的吧！')

    const allRels = this.sys.dm.findAllRelations(groupId)
    const candidates = allRels.filter(r => {
      if (r.ownerId === ownerId) return false
      const d = this.sys.dm.readUserData(groupId, r.ownerId)
      return d && d.owner && d.owner.status !== 'bonded'
    })
    if (candidates.length === 0) return e.reply('没有可抢的宠物~')

    const target = candidates[Math.floor(Math.random() * candidates.length)]

    const hasOwner = userPhase.phase === 'claimed'
    const stealChance = hasOwner ? CONFIG.STEAL_CHANCE_OWNER : CONFIG.STEAL_CHANCE_STRANGER
    if (Math.random() > stealChance) {
      const fail = CONFIG.TAUNT_MESSAGES.stealFail[Math.floor(Math.random() * CONFIG.TAUNT_MESSAGES.stealFail.length)]
      return e.reply(`抢夺失败！${fail}`)
    }

    const oldOwnerData = this.sys.dm.readUserData(groupId, target.ownerId)
    if (!oldOwnerData) return e.reply('数据异常')

    this._executeSteal(groupId, ownerData, oldOwnerData, target.petId, ownerId, ownerName)
    await e.reply([`成功抢走了 `, safeAt(target.petId), ` 太厉害了！`])
  }

  async bond(e) {
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    const groupId = String(e.group_id)
    const userId = String(e.user_id)

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData) return e.reply(NO_PET_MSG)

    const userPhase = this._getPhase(groupId, userData)

    if (userPhase.phase === 'claimed' && userPhase.role === 'owner') {
      const petId = userData.owner.petId
      if (userData.owner.intimacy < 99) {
        return e.reply(`亲密度不足99，当前等级：${this.sys.dm.getIntimacyLevel(userData.owner.intimacy)}\n💡 多用宠爱指令增加亲密度`)
      }

      const key = `${groupId}_${petId}`
      activeBondRequests.set(key, { requesterId: userId, requesterName: e.sender.card || e.sender.nickname, type: 'owner', time: Date.now() })

      setTimeout(() => {
        const req = activeBondRequests.get(key)
        if (req && Date.now() - req.time >= CONFIG.BOND_REQUEST_TIMEOUT * 1000) {
          activeBondRequests.delete(key)

        }
      }, CONFIG.BOND_REQUEST_TIMEOUT * 1000)

      return e.reply([
        safeAt(petId),
        ` 你的主人向你发起了缔约请求！\n⚠️ 缔约后双方所有其他宠物/主人关系将被清除\n请在3分钟内回复 $同意 或 $不同意`
      ])
    }


    if (userPhase.phase === 'bonded') {
      return e.reply('你已经缔约了！')
    }

    return e.reply(NO_PET_MSG)
  }

  async bondMaster(e) {
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    const groupId = String(e.group_id)
    const userId = String(e.user_id)

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData || !userData.masterId) return e.reply(NO_OWNER_MSG)
    userData._userId = userId

    const userPhase = this._getPhase(groupId, userData)
    if (userPhase.phase === 'bonded') return e.reply('已经和主人缔约了！')

    const ownerId = userData.masterId
    const ownerData = this.sys.dm.readUserData(groupId, ownerId)
    if (!ownerData) return e.reply('数据异常')
    ownerData._userId = ownerId

    if (ownerData.owner.intimacy < 99) {
      return e.reply(`亲密度不足99，当前等级：${this.sys.dm.getIntimacyLevel(ownerData.owner.intimacy)}\n💡 多用宠爱指令增加亲密度`)
    }

    const notifications = this.executeBond(groupId, ownerData, userData, ownerId, userId)
    let msg = '缔约成功！解锁更多姿势了呢'
    if (notifications.length > 0) msg += '\n' + notifications.join('\n')
    await e.reply([msg, safeAt(ownerId)])
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
    await e.reply([msg, safeAt(request.requesterId)])
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

    this._clearSideOldRelation(groupId, petSideData, '主人宠物', petId, notifications)
    this._clearSideOldRelation(groupId, ownerSideData, '宠物', petId, notifications)

    ownerSideData.owner = {
      petId,
      petName: savedPetName,
      petAvatar: avatarUrl(petId),
      ownerName: savedOwnerName,
      ownerAvatar: avatarUrl(ownerId),
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
      petAchievements: ownerSideData.owner?.petAchievements || makeDefaultPetAchievements(),
      petSys: ownerSideData.owner?.petSys || makeDefaultPetSys()
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

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData) return e.reply(NO_PET_MSG)
    userData._userId = userId

    const userPhase = this._getPhase(groupId, userData)
    if (userPhase.phase === 'free') return e.reply(NO_PET_MSG)

    const cooldownKey = `${groupId}_${userId}_release`
    const lastRelease = releaseCooldowns.get(cooldownKey)
    if (lastRelease && Date.now() - lastRelease < CONFIG.RELATION_COOLDOWN) {
      const remain = Math.ceil((CONFIG.RELATION_COOLDOWN - (Date.now() - lastRelease)) / 60000)
      return e.reply(`解除冷却中...请${remain}分钟后再试`)
    }

    if (userPhase.role === 'owner') {
      const petId = userData.owner.petId
      const petName = userData.owner.petName || '宠物'
      const statusText = userPhase.phase === 'bonded' ? '缔约' : '领养'

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

    if (userPhase.phase === 'bonded' && userPhase.role === 'pet') {
      const ownerData = this.sys.dm.readUserData(groupId, userPhase.targetId)
      if (!ownerData) return e.reply('数据异常')
      const ownerName = ownerData.owner?.ownerName || '主人'

      this.sys.dm.clearOwnerRelation(ownerData)
      userData.masterId = null
      this.sys.dm.saveUserData(ownerData, groupId)
      this.sys.dm.saveUserData(userData, groupId)

      releaseCooldowns.set(cooldownKey, Date.now())
      return e.reply(`已解除与 ${ownerName} 的缔约关系`)
    }

    if (userPhase.phase === 'claimed' && userPhase.role === 'pet') {
      return e.reply('领养阶段请使用 #宠物摆脱 来脱离主人')
    }

    return e.reply(NO_PET_MSG)
  }

  async escape(e) {
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    const groupId = String(e.group_id)
    const userId = String(e.user_id)

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData || !userData.masterId) return e.reply(NO_OWNER_MSG)
    userData._userId = userId

    const userPhase = this._getPhase(groupId, userData)
    if (userPhase.phase === 'bonded') {
      return e.reply('缔约关系请使用 #宠物解除')
    }

    const cooldownKey = `${groupId}_${userId}_escape`
    const lastEscape = escapeCooldowns.get(cooldownKey)
    if (lastEscape && Date.now() - lastEscape < CONFIG.RELATION_COOLDOWN) {
      const remain = Math.ceil((CONFIG.RELATION_COOLDOWN - (Date.now() - lastEscape)) / 60000)
      return e.reply(`摆脱冷却中...请${remain}分钟后再试`)
    }

    const ownerData = this.sys.dm.readUserData(groupId, userData.masterId)
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
