import plugin from '../../../lib/plugins/plugin.js'
import { CONFIG, CMD_PREFIX } from '../config/cfg.js'

const activeBondRequests = new Map()
const releaseCooldowns = new Map()
const escapeCooldowns = new Map()

class RelationApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-关系',
      dsc: '宠物关系管理',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: `^${CMD_PREFIX}领养`, fnc: 'adopt' },
        { reg: `^${CMD_PREFIX}抢.*`, fnc: 'steal' },
        { reg: `^${CMD_PREFIX}缔约主人`, fnc: 'bondMaster' },
        { reg: `^${CMD_PREFIX}缔约.*`, fnc: 'bond' },
        { reg: `^${CMD_PREFIX}同意.*`, fnc: 'agreeBond' },
        { reg: `^${CMD_PREFIX}不同意.*`, fnc: 'rejectBond' },
        { reg: `^${CMD_PREFIX}摆脱.*`, fnc: 'escape' },
        { reg: `^${CMD_PREFIX}解除.*`, fnc: 'release' }
      ]
    })
    this.sys = global.cwerSys
  }

  async adopt(e) {
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

    const ownerData = this.sys.dm.readUserData(groupId, ownerId) || this.sys.dm.resetUserData(groupId, ownerId)
    ownerData._userId = ownerId
    if (ownerData.owner && ownerData.owner.petId) {
      return e.reply('你已经养了宠物了，先解除关系再领养新的吧！')
    }


    const petExisting = this.sys.dm.findRelationByPet(groupId, targetId)
    if (petExisting) {
      const petOwnerData = this.sys.dm.readUserData(groupId, petExisting.ownerId)
      if (petOwnerData && petOwnerData.pet && petOwnerData.pet.status === 'bonded') {
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
    let petName = ''
    let petAvatar = ''
    try {
      const member = group?.pickMember?.(Number(targetId))
      let info = member?.info
      if (!info?.nickname) { try { info = await member?.getInfo?.() } catch {} }
      petName = info?.card || info?.nickname || targetId
      petAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${targetId}`
    } catch {
      petName = targetId
    }

    const ownerAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${ownerId}`
    const petData = this.sys.dm.readUserData(groupId, targetId) || this.sys.dm.resetUserData(groupId, targetId)
    petData._userId = targetId

    this.sys.dm.setupOwnerRelation(ownerData, petData, ownerName, petName, petAvatar, ownerAvatar)
    if (!petData.sys.startTimestamp) petData.sys.startTimestamp = Date.now()
    this.sys.dm.saveUserData(ownerData, groupId)
    this.sys.dm.saveUserData(petData, groupId)

    await e.reply([`成功领养为宠物！快去宠爱ta吧~`, segment.at(Number(targetId))])
  }

  async adoptRandom(e) {
    const groupId = String(e.group_id)
    const ownerId = String(e.user_id)
    const ownerName = e.sender.card || e.sender.nickname

    const ownerData = this.sys.dm.readUserData(groupId, ownerId) || this.sys.dm.resetUserData(groupId, ownerId)
    ownerData._userId = ownerId
    if (ownerData.owner && ownerData.owner.petId) {
      return e.reply('你已经养了宠物了，先解除关系再领养新的吧！')
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
        const d = this.sys.dm.readUserData(groupId, uid)
        if (d && d.pet && d.pet.status === 'bonded') continue
      }

      candidates.push({ id: uid, name: info?.card || info?.nickname || uid })
    }

    if (candidates.length === 0) {
      return e.reply('群内没有可领养的对象~')
    }

    const target = candidates[Math.floor(Math.random() * candidates.length)]

    if (Math.random() > CONFIG.ADOPT_CHANCE) {
      const taunts = CONFIG.TAUNT_MESSAGES.adoptFail
      const fail = taunts[Math.floor(Math.random() * taunts.length)]
      return e.reply(`随机到了 ${target.name}，但领养失败！${fail}`)
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
    const petData = this.sys.dm.readUserData(groupId, target.id) || this.sys.dm.resetUserData(groupId, target.id)
    petData._userId = target.id

    this.sys.dm.setupOwnerRelation(ownerData, petData, ownerName, target.name, `https://q1.qlogo.cn/g?b=qq&s=100&nk=${target.id}`, ownerAvatar)
    if (!petData.sys.startTimestamp) petData.sys.startTimestamp = Date.now()
    this.sys.dm.saveUserData(ownerData, groupId)
    this.sys.dm.saveUserData(petData, groupId)

    await e.reply([`命运选择了你！领养成功~`, segment.at(Number(target.id))])
  }

  async steal(e) {
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

    const ownerData = this.sys.dm.readUserData(groupId, ownerId) || this.sys.dm.resetUserData(groupId, ownerId)
    ownerData._userId = ownerId
    if (ownerData.owner && ownerData.owner.petId) {
      return e.reply('你已经养了宠物了，先解除关系再抢别人的吧！')
    }


    const petRel = this.sys.dm.findRelationByPet(groupId, targetId)
    if (petRel) {
      const petData = this.sys.dm.readUserData(groupId, targetId)
      if (petData && petData.pet && petData.pet.status === 'bonded') {
        return e.reply('该宠物已缔约，无法抢夺！')
      }

      if (Math.random() > CONFIG.ADOPT_CHANCE) {
        const taunts = CONFIG.TAUNT_MESSAGES.stealFail
        const fail = taunts[Math.floor(Math.random() * taunts.length)]
        return e.reply(`抢夺失败！${fail}`)
      }

      const oldOwnerName = petData?.pet?.ownerName || '某人'
      const oldOwnerId = petData?.pet?.ownerId
      let petName = targetId
      if (oldOwnerId) {
        const oldOwnerData = this.sys.dm.readUserData(groupId, oldOwnerId)
        if (oldOwnerData) {
          petName = oldOwnerData.owner?.petName || targetId
          oldOwnerData._userId = oldOwnerId
          this.sys.dm.clearOwnerRelation(oldOwnerData)
          this.sys.dm.saveUserData(oldOwnerData, groupId)
        }
      }

      const ownerAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${ownerId}`
      petData._userId = targetId
      const petAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${targetId}`

      this.sys.dm.setupOwnerRelation(ownerData, petData, ownerName, petName, petAvatar, ownerAvatar)
      if (!petData.sys.startTimestamp) petData.sys.startTimestamp = Date.now()
      this.sys.dm.saveUserData(ownerData, groupId)
      this.sys.dm.saveUserData(petData, groupId)

      return e.reply([`成功抢走了 `, segment.at(Number(targetId)), ` 太厉害了！`])
    }

    return this.adoptTarget(e, targetId)
  }

  async stealRandom(e) {
    const groupId = String(e.group_id)
    const ownerId = String(e.user_id)

    const ownerData = this.sys.dm.readUserData(groupId, ownerId) || this.sys.dm.resetUserData(groupId, ownerId)
    ownerData._userId = ownerId
    if (ownerData.owner && ownerData.owner.petId) {
      return e.reply('你已经养了宠物了，先解除关系再抢别人的吧！')
    }

    const allRels = this.sys.dm.findAllRelations(groupId)
    const stealable = []
    for (const rel of allRels) {
      if (rel.ownerId === ownerId) continue
      const d = this.sys.dm.readUserData(groupId, rel.petId)
      if (d && d.pet && d.pet.status !== 'bonded' && d.pet.ownerId !== ownerId) {
        stealable.push(rel)
      }
    }

    if (stealable.length === 0) {
      return this.adoptRandom(e)
    }

    const target = stealable[Math.floor(Math.random() * stealable.length)]
    const petData = this.sys.dm.readUserData(groupId, target.petId)

    if (Math.random() > CONFIG.ADOPT_CHANCE) {
      const taunts = CONFIG.TAUNT_MESSAGES.stealFail
      const fail = taunts[Math.floor(Math.random() * taunts.length)]
      return e.reply(`抢夺失败！${fail}`)
    }

    const oldOwnerName = petData?.pet?.ownerName || '某人'
    const oldOwnerId = petData?.pet?.ownerId
    let petName = target.petId
    if (oldOwnerId) {
      const oldOwnerData = this.sys.dm.readUserData(groupId, oldOwnerId)
      if (oldOwnerData) {
        petName = oldOwnerData.owner?.petName || target.petId
        oldOwnerData._userId = oldOwnerId
        this.sys.dm.clearOwnerRelation(oldOwnerData)
        this.sys.dm.saveUserData(oldOwnerData, groupId)
      }
    }

    const ownerName = e.sender.card || e.sender.nickname
    const ownerAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${ownerId}`
    const petAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${target.petId}`

    petData._userId = target.petId
    this.sys.dm.setupOwnerRelation(ownerData, petData, ownerName, petName, petAvatar, ownerAvatar)
    if (!petData.sys.startTimestamp) petData.sys.startTimestamp = Date.now()
    this.sys.dm.saveUserData(ownerData, groupId)
    this.sys.dm.saveUserData(petData, groupId)

    await e.reply([`成功抢走了 `, segment.at(Number(target.petId)), ` 太厉害了！`])
  }

  async bond(e) {
    const groupId = String(e.group_id)
    const userId = String(e.user_id)
    const userName = e.sender.card || e.sender.nickname

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData) return e.reply('你还没有宠物哦，\n可发 $领养 随机或 $领养@群友 也可 $抢@群友，\n如已被领养可发 $缔约主人')

    if (userData.owner && userData.owner.petId && userData.owner.status !== 'bonded') {
      const petData = this.sys.dm.readUserData(groupId, userData.owner.petId)
      if (!petData) return e.reply('数据异常')
      if (!petData.pet || petData.pet.intimacy < 99) {
        return e.reply(`亲密度不足99，当前等级：${this.sys.dm.getIntimacyLevel(petData.pet?.intimacy || 0)}`)
      }

      const petId = userData.owner.petId
      activeBondRequests.set(`${groupId}_${petId}`, { requesterId: userId, requesterName: userName, type: 'owner', time: Date.now() })
      return e.reply([
        `向宠物发起了缔约请求！\n⚠️ 缔约后双方所有其他宠物/主人关系将被清除\n`,
        segment.at(Number(petId)),
        ` 请在30秒内回复 #宠物同意 或 #宠物不同意`
      ])
    }

    if (userData.pet && userData.pet.ownerId && userData.pet.status !== 'bonded') {
      if (userData.pet.intimacy < 99) {
        return e.reply(`亲密度不足99，当前等级：${this.sys.dm.getIntimacyLevel(userData.pet.intimacy)}`)
      }

      const ownerData = this.sys.dm.readUserData(groupId, userData.pet.ownerId)
      if (!ownerData) return e.reply('数据异常')

      const notifications = this.executeBond(groupId, userData, ownerData, userId, userData.pet.ownerId)
      let msg = '缔约成功！解锁更多姿势了呢'
      if (notifications.length > 0) msg += '\n' + notifications.join('\n')
      await e.reply(msg)
      await this.sys.renderer.renderPanel(e, userData)
      return
    }

    return e.reply('你还没有宠物哦，\n可发 $领养 随机或 $领养@群友 也可 $抢@群友，\n如已被领养可发 $缔约主人')
  }

  async bondMaster(e) {
    const groupId = String(e.group_id)
    const userId = String(e.user_id)
    const userName = e.sender.card || e.sender.nickname

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData || !userData.pet || !userData.pet.ownerId) {
      return e.reply('你好像没主人呢，让别人领养你吧')
    }

    if (userData.pet.status === 'bonded') {
      return e.reply('已经和主人缔约了！')
    }

    if (userData.pet.intimacy < 99) {
      return e.reply(`亲密度不足99，当前等级：${this.sys.dm.getIntimacyLevel(userData.pet.intimacy)}`)
    }

    const ownerId = userData.pet.ownerId
    activeBondRequests.set(`${groupId}_${ownerId}`, { requesterId: userId, requesterName: userName, type: 'pet', time: Date.now() })
    return e.reply([
      `向主人发起了缔约请求！\n`,
      segment.at(Number(ownerId)),
      ` 请在30秒内回复 #宠物同意 或 #宠物不同意`
    ])
  }

  async agreeBond(e) {
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
    } else {
      const requesterData = this.sys.dm.readUserData(groupId, request.requesterId)
      if (!requesterData) return e.reply('数据异常')
      requesterData._userId = request.requesterId
      if (!requesterData.pet || requesterData.pet.ownerId !== userId) return e.reply('关系已变更')

      notifications = this.executeBond(groupId, userData, requesterData, userId, request.requesterId)
    }

    activeBondRequests.delete(key)
    let msg = '缔约成功！解锁更多姿势了呢'
    if (notifications.length > 0) msg += '\n' + notifications.join('\n')
    await e.reply(msg)
    await this.sys.renderer.renderPanel(e, userData)
  }

  async rejectBond(e) {
    const groupId = String(e.group_id)
    const userId = String(e.user_id)
    const key = `${groupId}_${userId}`

    const request = activeBondRequests.get(key)
    if (!request) return false
    if (Date.now() - request.time > CONFIG.BOND_REQUEST_TIMEOUT * 1000) {
      activeBondRequests.delete(key)
      return e.reply(`缔约请求已超时，视为拒绝 ${request.requesterName} 的缔约请求`)
    }

    activeBondRequests.delete(key)
    await e.reply(`已拒绝 ${request.requesterName} 的缔约请求`)
  }

  executeBond(groupId, ownerSideData, petSideData, ownerId, petId) {
    const notifications = []

    const savedPetName = ownerSideData.owner?.petName || petId
    const savedOwnerName = petSideData.pet?.ownerName || ownerId

    if (petSideData.pet && petSideData.pet.ownerId && petSideData.pet.ownerId !== ownerId) {
      const oldOwnerId = petSideData.pet.ownerId
      const oldOwnerData = this.sys.dm.readUserData(groupId, oldOwnerId)
      if (oldOwnerData) {
        oldOwnerData._userId = oldOwnerId
        notifications.push(`已解除与 ${oldOwnerData.owner?.petName || '某人'} 的主人关系`)
        this.sys.dm.clearOwnerRelation(oldOwnerData)
        this.sys.dm.saveUserData(oldOwnerData, groupId)
      }
      this.sys.dm.clearPetRelation(petSideData)
    }

    if (ownerSideData.owner && ownerSideData.owner.petId && ownerSideData.owner.petId !== petId) {
      const oldPetId = ownerSideData.owner.petId
      const oldPetData = this.sys.dm.readUserData(groupId, oldPetId)
      if (oldPetData) {
        oldPetData._userId = oldPetId
        notifications.push(`已解除与 ${oldPetData.pet?.ownerName || '宠物'} 的宠物关系`)
        this.sys.dm.clearPetRelation(oldPetData)
        this.sys.dm.saveUserData(oldPetData, groupId)
      }
      this.sys.dm.clearOwnerRelation(ownerSideData)
    }

    if (petSideData.owner && petSideData.owner.petId && petSideData.owner.petId !== ownerId) {
      const oldPetId2 = petSideData.owner.petId
      const oldPetData2 = this.sys.dm.readUserData(groupId, oldPetId2)
      if (oldPetData2) {
        oldPetData2._userId = oldPetId2
        notifications.push(`已解除与 ${oldPetData2.pet?.ownerName || '宠物'} 的主人宠物关系`)
        this.sys.dm.clearPetRelation(oldPetData2)
        this.sys.dm.saveUserData(oldPetData2, groupId)
      }
      this.sys.dm.clearOwnerRelation(petSideData)
    }

    if (ownerSideData.pet && ownerSideData.pet.ownerId && ownerSideData.pet.ownerId !== petId) {
      const oldOwnerId2 = ownerSideData.pet.ownerId
      const oldOwnerData2 = this.sys.dm.readUserData(groupId, oldOwnerId2)
      if (oldOwnerData2) {
        oldOwnerData2._userId = oldOwnerId2
        notifications.push(`已解除与 ${oldOwnerData2.owner?.petName || '某人'} 的主人关系`)
        this.sys.dm.clearOwnerRelation(oldOwnerData2)
        this.sys.dm.saveUserData(oldOwnerData2, groupId)
      }
      this.sys.dm.clearPetRelation(ownerSideData)
    }

    ownerSideData.owner = {
      petId,
      petName: savedPetName,
      petAvatar: `https://q1.qlogo.cn/g?b=qq&s=100&nk=${petId}`,
      status: 'bonded',
      createdAt: ownerSideData.owner?.createdAt || Date.now(),
      bondedAt: Date.now()
    }

    petSideData.pet = {
      ownerId,
      ownerName: savedOwnerName,
      ownerAvatar: `https://q1.qlogo.cn/g?b=qq&s=100&nk=${ownerId}`,
      petName: savedPetName,
      status: 'bonded',
      createdAt: petSideData.pet?.createdAt || Date.now(),
      bondedAt: Date.now(),
      intimacy: petSideData.pet?.intimacy || 0,
      obedience: petSideData.pet?.obedience || 0,
      lewd: petSideData.pet?.lewd || 0
    }

    this.sys.dm.saveUserData(ownerSideData, groupId)
    this.sys.dm.saveUserData(petSideData, groupId)

    return notifications
  }

  async release(e) {
    const groupId = String(e.group_id)
    const userId = String(e.user_id)

    const cooldownKey = `${groupId}_${userId}_release`
    const lastRelease = releaseCooldowns.get(cooldownKey)
    if (lastRelease && Date.now() - lastRelease < CONFIG.RELATION_COOLDOWN) {
      const remain = Math.ceil((CONFIG.RELATION_COOLDOWN - (Date.now() - lastRelease)) / 60000)
      return e.reply(`解除冷却中...请${remain}分钟后再试`)
    }

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData) return e.reply('你还没有宠物哦，\n可发 $领养 随机或 $领养@群友 也可 $抢@群友，\n如已被领养可发 $缔约主人')
    userData._userId = userId

    if (userData.owner && userData.owner.petId) {
      const petData = this.sys.dm.readUserData(groupId, userData.owner.petId)
      const petName = userData.owner.petName || '宠物'
      const statusText = userData.owner.status === 'bonded' ? '缔约' : '领养'

      this.sys.dm.clearOwnerRelation(userData)
      this.sys.dm.saveUserData(userData, groupId)

      if (petData) {
        petData._userId = userData.owner.petId
        this.sys.dm.clearPetRelation(petData)
        this.sys.dm.saveUserData(petData, groupId)
      }

      releaseCooldowns.set(cooldownKey, Date.now())
      return e.reply(`已解除与 ${petName} 的${statusText}关系`)
    }

    if (userData.pet && userData.pet.ownerId) {
      if (userData.pet.status !== 'bonded') {
        return e.reply('领养阶段请使用 #宠物摆脱 来脱离主人')
      }
      const ownerData = this.sys.dm.readUserData(groupId, userData.pet.ownerId)
      const ownerName = userData.pet.ownerName || '主人'

      this.sys.dm.clearPetRelation(userData)
      this.sys.dm.saveUserData(userData, groupId)

      if (ownerData) {
        ownerData._userId = userData.pet.ownerId
        this.sys.dm.clearOwnerRelation(ownerData)
        this.sys.dm.saveUserData(ownerData, groupId)
      }

      releaseCooldowns.set(cooldownKey, Date.now())
      return e.reply(`已解除与 ${ownerName} 的缔约关系`)
    }

    return e.reply('你还没有宠物哦，\n可发 $领养 随机或 $领养@群友 也可 $抢@群友，\n如已被领养可发 $缔约主人')
  }

  async escape(e) {
    const groupId = String(e.group_id)
    const userId = String(e.user_id)

    const cooldownKey = `${groupId}_${userId}_escape`
    const lastEscape = escapeCooldowns.get(cooldownKey)
    if (lastEscape && Date.now() - lastEscape < CONFIG.RELATION_COOLDOWN) {
      const remain = Math.ceil((CONFIG.RELATION_COOLDOWN - (Date.now() - lastEscape)) / 60000)
      return e.reply(`摆脱冷却中...请${remain}分钟后再试`)
    }

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData || !userData.pet || !userData.pet.ownerId) {
      return e.reply('你好像没主人呢，让别人领养你吧')
    }
    userData._userId = userId

    if (userData.pet.status === 'bonded') {
      return e.reply('缔约关系请使用 #宠物解除')
    }

    const ownerName = userData.pet.ownerName || '主人'
    const ownerId = userData.pet.ownerId
    const ownerData = this.sys.dm.readUserData(groupId, ownerId)

    this.sys.dm.clearPetRelation(userData)
    this.sys.dm.saveUserData(userData, groupId)

    if (ownerData) {
      ownerData._userId = ownerId
      this.sys.dm.clearOwnerRelation(ownerData)
      this.sys.dm.saveUserData(ownerData, groupId)
    }

    escapeCooldowns.set(cooldownKey, Date.now())
    return e.reply(`已摆脱与 ${ownerName} 的领养关系`)
  }
}

export default RelationApp
