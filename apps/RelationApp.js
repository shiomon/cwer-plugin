import plugin from '../../../lib/plugins/plugin.js'
import { CONFIG, CMD_PREFIX } from '../config/cfg.js'

const activeBondRequests = new Map()
const releaseCooldowns = new Map()

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
        { reg: `^${CMD_PREFIX}缔约.*`, fnc: 'bond' },
        { reg: `^${CMD_PREFIX}同意.*`, fnc: 'agreeBond' },
        { reg: `^${CMD_PREFIX}不同意.*`, fnc: 'rejectBond' },
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

    const existingPet = this.sys.dm.findRelationByOwner(groupId, ownerId)
    if (existingPet.length > 0) {
      return e.reply('你已经养了宠物了，先解除关系再领养新的吧！')
    }

    const petExisting = this.sys.dm.findRelationByPet(groupId, targetId)
    if (petExisting && petExisting.ownerId !== ownerId) {
      const petData = this.sys.dm.readData(groupId, petExisting.ownerId, targetId)
      if (petData && petData.relation.status.startsWith('bonded')) {
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
      this.sys.dm.deleteData(groupId, petExisting.ownerId, targetId)
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

    const data = this.sys.dm.resetData(groupId, ownerId, targetId)
    data.relation.ownerName = ownerName
    data.relation.petName = petName
    data.relation.petAvatar = petAvatar
    data.relation.ownerAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${ownerId}`
    data.sys.startTimestamp = Date.now()
    this.sys.dm.saveData(data, groupId)

    await e.reply([`成功将 ${petName} 领养为宠物！快去宠爱ta吧~\n💡 宠物可以发 #宠物解除 解除关系`, segment.at(Number(targetId))])
  }

  async adoptRandom(e) {
    const groupId = String(e.group_id)
    const ownerId = String(e.user_id)
    const ownerName = e.sender.card || e.sender.nickname

    const existingPet = this.sys.dm.findRelationByOwner(groupId, ownerId)
    if (existingPet.length > 0) {
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
        const d = this.sys.dm.readData(groupId, rel.ownerId, uid)
        if (d && d.relation.status.startsWith('bonded')) continue
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
      this.sys.dm.deleteData(groupId, petExisting.ownerId, target.id)
    }

    const data = this.sys.dm.resetData(groupId, ownerId, target.id)
    data.relation.ownerName = ownerName
    data.relation.petName = target.name
    data.relation.petAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${target.id}`
    data.relation.ownerAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${ownerId}`
    data.sys.startTimestamp = Date.now()
    this.sys.dm.saveData(data, groupId)

    await e.reply([`命运选择了 ${target.name}！领养成功~`, segment.at(Number(target.id))])
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

    const existingPet = this.sys.dm.findRelationByOwner(groupId, ownerId)
    if (existingPet.length > 0) {
      return e.reply('你已经养了宠物了，先解除关系再抢别人的吧！')
    }

    const petRel = this.sys.dm.findRelationByPet(groupId, targetId)
    if (petRel) {
      const petData = this.sys.dm.readData(groupId, petRel.ownerId, petRel.petId)
      if (petData && petData.relation.status.startsWith('bonded')) {
        return e.reply('该宠物已缔约，无法抢夺！')
      }

      if (Math.random() > CONFIG.ADOPT_CHANCE) {
        const taunts = CONFIG.TAUNT_MESSAGES.stealFail
        const fail = taunts[Math.floor(Math.random() * taunts.length)]
        return e.reply(`抢夺失败！${fail}`)
      }

      const oldOwnerName = petData?.relation.ownerName || '某人'
      this.sys.dm.deleteData(groupId, petRel.ownerId, petRel.petId)

      const data = this.sys.dm.resetData(groupId, ownerId, targetId)
      data.relation.ownerName = ownerName
      data.relation.petName = petData?.relation.petName || targetId
      data.relation.petAvatar = petData?.relation.petAvatar || `https://q1.qlogo.cn/g?b=qq&s=100&nk=${targetId}`
      data.relation.ownerAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${ownerId}`
      data.sys.startTimestamp = Date.now()
      this.sys.dm.saveData(data, groupId)

      return e.reply([`成功从 ${oldOwnerName} 手中抢走了 ${data.relation.petName}！`, segment.at(Number(targetId))])
    }

    const ownerRel = this.sys.dm.findRelationByOwner(groupId, targetId)
    if (ownerRel.length > 0) {
      const stealable = ownerRel.filter(r => {
        const d = this.sys.dm.readData(groupId, r.ownerId, r.petId)
        return d && !d.relation.status.startsWith('bonded')
      })
      if (stealable.length === 0) {
        return e.reply('该主人的宠物已全部缔约，无法抢夺！')
      }
      const target = stealable[Math.floor(Math.random() * stealable.length)]
      const targetData = this.sys.dm.readData(groupId, target.ownerId, target.petId)

      if (Math.random() > CONFIG.ADOPT_CHANCE) {
        const taunts = CONFIG.TAUNT_MESSAGES.stealFail
        const fail = taunts[Math.floor(Math.random() * taunts.length)]
        return e.reply(`抢夺失败！${fail}`)
      }

      const oldOwnerName = targetData?.relation.ownerName || '某人'
      const petName = targetData?.relation.petName || target.petId
      const petAvatar = targetData?.relation.petAvatar || `https://q1.qlogo.cn/g?b=qq&s=100&nk=${target.petId}`
      this.sys.dm.deleteData(groupId, target.ownerId, target.petId)

      const data = this.sys.dm.resetData(groupId, ownerId, target.petId)
      data.relation.ownerName = ownerName
      data.relation.petName = petName
      data.relation.petAvatar = petAvatar
      data.relation.ownerAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${ownerId}`
      data.sys.startTimestamp = Date.now()
      this.sys.dm.saveData(data, groupId)

      return e.reply([`成功从 ${oldOwnerName} 手中抢走了 ${petName}！`, segment.at(Number(target.petId))])
    }

    return e.reply('这个人还没有宠物关系，直接用 #宠物领养 吧！')
  }

  async stealRandom(e) {
    const groupId = String(e.group_id)
    const ownerId = String(e.user_id)
    const ownerName = e.sender.card || e.sender.nickname

    const existingPet = this.sys.dm.findRelationByOwner(groupId, ownerId)
    if (existingPet.length > 0) {
      return e.reply('你已经养了宠物了，先解除关系再抢别人的吧！')
    }

    const allRels = this.sys.dm.findAllRelations(groupId)
    const stealable = []
    for (const rel of allRels) {
      if (rel.ownerId === ownerId) continue
      const d = this.sys.dm.readData(groupId, rel.ownerId, rel.petId)
      if (d && !d.relation.status.startsWith('bonded') && d.relation.ownerId !== ownerId) {
        stealable.push(rel)
      }
    }

    if (stealable.length === 0) {
      return this.adoptRandom(e)
    }

    const target = stealable[Math.floor(Math.random() * stealable.length)]
    const targetData = this.sys.dm.readData(groupId, target.ownerId, target.petId)

    if (Math.random() > CONFIG.ADOPT_CHANCE) {
      const taunts = CONFIG.TAUNT_MESSAGES.stealFail
      const fail = taunts[Math.floor(Math.random() * taunts.length)]
      return e.reply(`抢夺失败！${fail}`)
    }

    const oldOwnerName = targetData?.relation.ownerName || '某人'
    const petName = targetData?.relation.petName || target.petId
    const petAvatar = targetData?.relation.petAvatar || `https://q1.qlogo.cn/g?b=qq&s=100&nk=${target.petId}`
    this.sys.dm.deleteData(groupId, target.ownerId, target.petId)

    const data = this.sys.dm.resetData(groupId, ownerId, target.petId)
    data.relation.ownerName = ownerName
    data.relation.petName = petName
    data.relation.petAvatar = petAvatar
    data.relation.ownerAvatar = `https://q1.qlogo.cn/g?b=qq&s=100&nk=${ownerId}`
    data.sys.startTimestamp = Date.now()
    this.sys.dm.saveData(data, groupId)

    await e.reply([`成功从 ${oldOwnerName} 手中抢走了 ${petName}！`, segment.at(Number(target.petId))])
  }

  async bond(e) {
    const groupId = String(e.group_id)
    const userId = String(e.user_id)
    const userName = e.sender.card || e.sender.nickname

    const asOwner = this.sys.dm.findRelationByOwner(groupId, userId)
    const asPet = this.sys.dm.findRelationByPet(groupId, userId)

    if (asOwner.length > 0) {
      const rel = asOwner[0]
      const data = this.sys.dm.readData(groupId, rel.ownerId, rel.petId)
      if (!data) return e.reply('数据异常')
      if (data.relation.status.startsWith('bonded')) return e.reply('已经缔约了！')
      if (data.stats.intimacy < 99) return e.reply(`亲密度不足99，当前等级：${this.sys.dm.getIntimacyLevel(data.stats.intimacy)}`)

      const petId = rel.petId
      activeBondRequests.set(`${groupId}_${petId}`, { requesterId: userId, requesterName: userName, type: 'owner', time: Date.now() })
      return e.reply([
        `向宠物发起了缔约请求！\n⚠️ 缔约后双方所有其他宠物/主人关系将被清除\n`,
        segment.at(Number(petId)),
        ` 请在30秒内回复 #宠物同意 或 #宠物不同意`
      ])
    }

    if (asPet) {
      const rel = asPet
      const data = this.sys.dm.readData(groupId, rel.ownerId, rel.petId)
      if (!data) return e.reply('数据异常')
      if (data.relation.status.startsWith('bonded')) return e.reply('已经缔约了！')
      if (data.stats.intimacy < 99) return e.reply(`亲密度不足99，当前等级：${this.sys.dm.getIntimacyLevel(data.stats.intimacy)}`)

      data.relation.status = 'bonded'
      data.relation.bondedAt = Date.now()
      this.sys.dm.saveData(data, groupId)

      const notifications = this.cleanAllRelations(groupId, userId, rel.ownerId)

      let msg = `缔约成功！`
      if (notifications.length > 0) {
        msg += '\n' + notifications.join('\n')
      } else {
        msg += '\n双方无其他关系需清除'
      }
      await e.reply(msg)
      await this.sys.renderer.renderPanel(e, data)
      return
    }

    return e.reply('你还没有任何宠物关系，先领养一个吧！')
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

    const rel = this.sys.dm.findRelationByPet(groupId, userId)
    if (!rel) return e.reply('数据异常')

    const data = this.sys.dm.readData(groupId, rel.ownerId, rel.petId)
    if (!data) return e.reply('数据异常')
    if (data.relation.status.startsWith('bonded')) return e.reply('已经缔约了！')

    data.relation.status = 'bonded'
    data.relation.bondedAt = Date.now()
    this.sys.dm.saveData(data, groupId)
    activeBondRequests.delete(key)

    const notifications = this.cleanAllRelations(groupId, userId, rel.ownerId)

    let msg = '缔约成功！'
    if (notifications.length > 0) {
      msg += '\n' + notifications.join('\n')
    } else {
      msg += '\n双方无其他关系需清除'
    }
    await e.reply(msg)
    await this.sys.renderer.renderPanel(e, data)
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

  async release(e) {
    const groupId = String(e.group_id)
    const userId = String(e.user_id)

    const cooldownKey = `${groupId}_${userId}`
    const lastRelease = releaseCooldowns.get(cooldownKey)
    if (lastRelease && Date.now() - lastRelease < CONFIG.RELATION_COOLDOWN) {
      const remain = Math.ceil((CONFIG.RELATION_COOLDOWN - (Date.now() - lastRelease)) / 60000)
      return e.reply(`解除冷却中...请${remain}分钟后再试`)
    }

    const asOwner = this.sys.dm.findRelationByOwner(groupId, userId)
    const asPet = this.sys.dm.findRelationByPet(groupId, userId)

    if (asOwner.length > 0) {
      const rel = asOwner[0]
      const data = this.sys.dm.readData(groupId, rel.ownerId, rel.petId)
      if (data) {
        const petName = data.relation.petName || '宠物'
        this.sys.dm.deleteData(groupId, rel.ownerId, rel.petId)
        releaseCooldowns.set(cooldownKey, Date.now())
        return e.reply(`已解除与 ${petName} 的关系`)
      }
    }

    if (asPet) {
      const data = this.sys.dm.readData(groupId, asPet.ownerId, asPet.petId)
      if (data) {
        const ownerName = data.relation.ownerName || '主人'
        this.sys.dm.deleteData(groupId, asPet.ownerId, asPet.petId)
        releaseCooldowns.set(cooldownKey, Date.now())
        return e.reply(`已解除与 ${ownerName} 的关系`)
      }
    }

    return e.reply('你没有任何宠物关系')
  }

  cleanAllRelations(groupId, bondedUserId, partnerId) {
    const notifications = []

    const asPet = this.sys.dm.findRelationByPet(groupId, bondedUserId)
    if (asPet && asPet.ownerId !== partnerId) {
      const oldData = this.sys.dm.readData(groupId, asPet.ownerId, asPet.petId)
      const oldOwnerName = oldData?.relation.ownerName || '某人'
      notifications.push(`已解除与 ${oldOwnerName} 的宠物关系`)
      this.sys.dm.deleteData(groupId, asPet.ownerId, asPet.petId)
    }

    const asOwner = this.sys.dm.findRelationByOwner(groupId, bondedUserId)
    for (const rel of asOwner) {
      if (rel.petId !== partnerId) {
        const oldData = this.sys.dm.readData(groupId, rel.ownerId, rel.petId)
        const oldPetName = oldData?.relation.petName || '宠物'
        notifications.push(`已解除与 ${oldPetName} 的主人关系`)
        this.sys.dm.deleteData(groupId, rel.ownerId, rel.petId)
      }
    }

    const partnerAsPet = this.sys.dm.findRelationByPet(groupId, partnerId)
    if (partnerAsPet && partnerAsPet.petId !== bondedUserId) {
      const oldData = this.sys.dm.readData(groupId, partnerAsPet.ownerId, partnerAsPet.petId)
      const oldOwnerName = oldData?.relation.ownerName || '某人'
      notifications.push(`${oldData?.relation.ownerName || '主人'} 已解除与 ${oldData?.relation.petName || '宠物'} 的关系`)
      this.sys.dm.deleteData(groupId, partnerAsPet.ownerId, partnerAsPet.petId)
    }

    const partnerAsOwner = this.sys.dm.findRelationByOwner(groupId, partnerId)
    for (const rel of partnerAsOwner) {
      if (rel.petId !== bondedUserId) {
        const oldData = this.sys.dm.readData(groupId, rel.ownerId, rel.petId)
        const oldPetName = oldData?.relation.petName || '宠物'
        notifications.push(`${oldData?.relation.ownerName || '主人'} 已解除与 ${oldPetName} 的主人关系`)
        this.sys.dm.deleteData(groupId, rel.ownerId, rel.petId)
      }
    }

    return notifications
  }
}

export default RelationApp