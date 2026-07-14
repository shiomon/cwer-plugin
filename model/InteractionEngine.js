import { CONFIG, EQUIPMENT_RARITY, CLOTHING_SLOTS, getUserColor } from '../config/cfg.js'

const DUR_LOSS_ACTIONS = new Set(['鞭打', '打脸', '打屁股', '振动', '滴蜡'])

const ACH_VALUES = { pet: 10, train: 8 }

const SHARED_ACTIONS = new Set(['羞辱', '鞭打', '打脸', '打屁股', '禁闭', '振动', '滴蜡', '撒娇', '生气气', '讨好', '献媚', '勾引'])

const ACTION_META = {
  投喂: { critColor: '#33cc33', normalColor: '#33cc33' },
  洗澡: { critColor: '#44aaff', normalColor: '#88ccff' },
  陪玩: { critColor: '#44ff44', normalColor: '#88cc44' },
  顺毛: { critColor: '#33cc33', normalColor: '#aaffaa' },
  摸摸: { critColor: '#33cc33', normalColor: '#aaffaa' },
  亲亲: { critColor: '#ff69b4', normalColor: '#ffb6c1' },
  捏脸: { critColor: '#ffab40', normalColor: '#ffe0b2' },
  抱抱: { critColor: '#44ff44', normalColor: '#aaffaa' },
  送礼物: { critColor: '#ff9900', normalColor: '#ffcc00' },
  羞辱: { critColor: '#ff9900', normalColor: '#ffcc00' },
  鞭打: { critColor: '#ff3333', normalColor: '#ff6666' },
  打脸: { critColor: '#ff3333', normalColor: '#ff6666' },
  打屁股: { critColor: '#ff3333', normalColor: '#ff6666' },
  禁闭: { critColor: '#7b1fa2', normalColor: '#ab47bc' },
  振动: { critColor: '#e91e63', normalColor: '#ff66ff' },
  滴蜡: { critColor: '#ff5722', normalColor: '#ff8a65' },
  撒娇: { critColor: '#ff69b4', normalColor: '#ffb6c1' },
  生气气: { critColor: '#ff3333', normalColor: '#ff6666' },
  讨好: { critColor: '#33cc33', normalColor: '#aaffaa' },
  献媚: { critColor: '#e91e63', normalColor: '#ff66ff' },
  勾引: { critColor: '#ff5722', normalColor: '#ff8a65' }
}

class InteractionEngine {
  constructor(eventSystem, dataManager) {
    this.es = eventSystem
    this.dm = dataManager
  }

  executeInteraction(ownerData, action, userName, userId, isOwner = true) {
    const config = CONFIG.INTERACTION_EFFECTS[action]
    if (!config || !ownerData.owner) {
      return { logText: '未知的互动方式', replyText: '未知的互动方式', logColor: '#ccc', roll: 0 }
    }

    const o = ownerData.owner
    const roll = Math.floor(Math.random() * 100) + 1
    const isCrit = config.critThreshold > 0 && roll >= config.critThreshold

    const { bonus: baseBonus } = this.dm.getTrainBonusSync(ownerData)
    const locationModifier = this.es.getLocationModifier(ownerData, action)

    const before = this._snapshotStats(o)
    this.applyAction(ownerData, action, config, isCrit, baseBonus, locationModifier)

    const meta = ACTION_META[action]
    const logColor = isCrit ? (meta?.critColor || '#aaffaa') : (meta?.normalColor || '#aaffaa')
    const targetName = isOwner ? (o.petName || '宠物') : (o.ownerName || '主人')
    let replyText = this.getLogText(userName, isCrit, targetName, action, userId, isOwner)
    let logText = replyText

    const diff = this._diffStats(before, o)
    if (diff) logText += `\n${diff}`

    if (isOwner) {
      if (DUR_LOSS_ACTIONS.has(action)) {
        const broken = this.damageRandomCommonClothing(ownerData, 0.1)
        if (broken.length > 0) {
          const names = broken.map(c => c.name).join('、')
          logText += `\n【爆衣警告】${names} 被彻底撕碎了！`
          replyText += `\n【爆衣警告】${names} 被彻底撕碎了！`
        }
      }
    }

    if (config.goldReward) {
      o.petSys.goldCoins = (o.petSys.goldCoins || 0) + config.goldReward
    }
    if (config.goldCost) {
      o.petSys.goldCoins = Math.max(0, (o.petSys.goldCoins || 0) - config.goldCost)
    }

    return { logText, replyText, logColor, roll }
  }

  applyAction(ownerData, action, config, isCrit, bonus, modifier) {
    const o = ownerData.owner
    const isBonded = o.status === 'bonded'

    if (isBonded) {
      if (config.painGain) {
        const base = isCrit ? (config.critPainGain || config.painGain) : config.painGain
        o.petStats.pain += base
      }
      if (config.painLoss) {
        const base = isCrit ? (config.critPainLoss || config.painLoss) : config.painLoss
        o.petStats.pain -= base
      }
    }
    if (config.satietyGain) {
      const base = isCrit ? (config.critSatietyGain || config.satietyGain) : config.satietyGain
      o.petStats.satiety += base
    }
    if (config.satietyLoss) {
      const base = isCrit ? (config.critSatietyLoss || config.satietyLoss) : config.satietyLoss
      o.petStats.satiety -= base
    }
    if (config.energyGain) {
      const base = isCrit ? (config.critEnergyGain || config.energyGain) : config.energyGain
      o.petStats.energy += base
    }
    if (config.energyLoss) {
      const base = isCrit ? (config.critEnergyLoss || config.energyLoss) : config.energyLoss
      o.petStats.energy -= base
    }
    if (config.hygieneGain) {
      const base = isCrit ? (config.critHygieneGain || config.hygieneGain) : config.hygieneGain
      o.petStats.hygiene += base
    }
    if (config.hygieneLoss) {
      const base = isCrit ? (config.critHygieneLoss || config.hygieneLoss) : config.hygieneLoss
      o.petStats.hygiene -= base
    }
    if (config.sensitivityGain) {
      const base = isCrit ? (config.critSensitivityGain || config.sensitivityGain) : config.sensitivityGain
      o.petStats.sensitivity += base
    }

    if (config.intimacyGain) {
      const gain = isCrit ? (config.critIntimacyGain || config.intimacyGain) : config.intimacyGain
      o.intimacy += Math.round(gain * bonus)
    }
    if (config.intimacyLoss) {
      const loss = isCrit ? (config.critIntimacyLoss || config.intimacyLoss) : config.intimacyLoss
      o.intimacy -= Math.round(loss)
    }
    if (config.obedienceGain) {
      const gain = isCrit ? (config.critObedienceGain || config.obedienceGain) : config.obedienceGain
      o.obedience += Math.round(gain * bonus)
    }
    if (config.lewdGain) {
      const gain = isCrit ? (config.critLewdGain || config.lewdGain) : config.lewdGain
      o.lewd += Math.round(gain * bonus)
    }


    const achValue = ACH_VALUES[config.type] || 8
    if (config.type === 'pet') {
      o.petAchievements.totalPet = (o.petAchievements.totalPet || 0) + achValue
      o.petAchievements.totalHeal = (o.petAchievements.totalHeal || 0) + achValue
    } else {
      o.petAchievements.totalTrain = (o.petAchievements.totalTrain || 0) + achValue
    }

    if (modifier) {
      if (!isBonded && modifier.pain) {
        const filtered = { ...modifier }
        delete filtered.pain
        if (Object.keys(filtered).length > 0) this.es.applyModifier(o.petStats, filtered)
      } else {
        this.es.applyModifier(o.petStats, modifier)
      }
    }
  }


  damageRandomCommonClothing(ownerData, breakChance = 0.1) {
    const o = ownerData.owner
    const commonSlots = CLOTHING_SLOTS.filter(slot => {
      const item = o.petClothes[slot]
      return item && item.rarity === 'common' && item.dur > 0
    })
    if (commonSlots.length === 0) return []
    const targetSlot = commonSlots[Math.floor(Math.random() * commonSlots.length)]
    const item = o.petClothes[targetSlot]
    const broken = []
    if (Math.random() < breakChance) {
      item.dur = 0
      o.petAchievements.destroyMasterCount = (o.petAchievements.destroyMasterCount || 0) + 1
    } else {
      const damage = Math.floor(Math.random() * 31) + 20
      item.dur = Math.max(0, item.dur - damage)
    }
    if (item.dur === 0) {
      broken.push({ ...item })
      o.petClothes[targetSlot] = { name: '未穿', rarity: 'none', charm: 0, dur: 0, effect: null }
      o.petSys.clothesBroken = (o.petSys.clothesBroken || 0) + 1
      o.petAchievements.clothesBroken = (o.petAchievements.clothesBroken || 0) + 1
    }
    return broken
  }

  getLogText(userName, isCrit, targetName, action, userId, isOwner = true) {
    const u = `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span>：`
    const ownerLogs = {
      投喂: { crit: () => `${u} 投喂了丰盛大餐！${targetName}吃得好满足！`, normal: () => `${u} 投喂了零食，${targetName}恢复了饱食和体力。` },
      洗澡: { crit: () => `${u} 小心翼翼帮${targetName}洗澡，非常舒适！`, normal: () => `${u} 帮${targetName}洗了个澡，清洁度恢复了。` },
      陪玩: { crit: () => `${u} 陪${targetName}玩出了【暴击】！开心极了！`, normal: () => `${u} 陪${targetName}玩耍，亲密度提升了不少。` },
      顺毛: { crit: () => `${u} 顺毛顺出了【暴击】！${targetName}舒服得打呼噜！`, normal: () => `${u} 顺着${targetName}的毛摸，好乖。` },
      摸摸: { crit: () => `${u} 温柔地摸摸${targetName}...暴击！${targetName}舒服地眯起了眼！`, normal: () => `${u} 摸了摸${targetName}，好乖。` },
      亲亲: { crit: () => `${u} 亲了${targetName}一口！暴击亲亲！${targetName}脸红透了！`, normal: () => `${u} 亲了亲${targetName}。` },
      捏脸: { crit: () => `${u} 捏${targetName}的脸捏出了【暴击】！软软的！`, normal: () => `${u} 捏了捏${targetName}的脸。` },
      抱抱: { crit: () => `${u} 给了${targetName}一个暴击抱抱！温暖溢出！`, normal: () => `${u} 给了${targetName}一个温暖的抱抱。` },
      送礼物: { crit: () => `${u} 送出了精美礼物！${targetName}感动不已！`, normal: () => `${u} 送了礼物给${targetName}。` },
      羞辱: { crit: () => `${u} 的羞辱让${targetName}深深恐惧！`, normal: () => `${u} 对${targetName}进行了严厉羞辱。` },
      鞭打: { crit: () => `${u} 挥鞭抽出了【暴击】！${targetName}皮开肉绽！`, normal: () => `${u} 狠狠鞭打了${targetName}。` },
      打脸: { crit: () => `${u} 一巴掌扇出了【暴击】！${targetName}脸都肿了！`, normal: () => `${u} 扇了${targetName}一巴掌。` },
      打屁股: { crit: () => `${u} 一巴掌打出【暴击】！${targetName}屁股红透了！`, normal: () => `${u} 狠狠打了${targetName}的屁股。` },
      禁闭: { crit: () => `${u} 把${targetName}关进小黑屋，彻底屈服！`, normal: () => `${u} 把${targetName}关进了禁闭室。` },
      振动: { crit: () => `${u} 开启了【强力振动】！${targetName}身体颤抖不已！`, normal: () => `${u} 开启了振动模式，${targetName}敏感度大幅提升。` },
      滴蜡: { crit: () => `${u} 滴蜡滴出了【暴击】！${targetName}又痛又爽！`, normal: () => `${u} 在${targetName}身上滴下蜡烛。` },
      撒娇: { crit: () => `${u} 撒了个大娇！${targetName}心都化了！`, normal: () => `${u} 向${targetName}撒了个娇~` },
      生气气: { crit: () => `${u} 气鼓鼓的！化悲愤为暴食！`, normal: () => `${u} 生气气了！化悲愤为食欲！` },
      讨好: { crit: () => `${u} 极力讨好${targetName}！效果拔群！`, normal: () => `${u} 讨好${targetName}~` },
      献媚: { crit: () => `${u} 献媚献出了【暴击】！${targetName}心跳加速！`, normal: () => `${u} 向${targetName}献媚~` },
      勾引: { crit: () => `${u} 勾引出了【暴击】！${targetName}欲罢不能！`, normal: () => `${u} 勾引${targetName}~` }
    }
    const petLogs = {
      投喂: { crit: () => `${u} 给${targetName}做了丰盛大餐！自己也吃得好满足！`, normal: () => `${u} 给${targetName}做了点吃的，自己也恢复了饱食和体力。` },
      洗澡: { crit: () => `${u} 帮${targetName}放好洗澡水，自己也洗得舒舒服服！`, normal: () => `${u} 帮${targetName}放好洗澡水，自己也顺便洗了个澡。` },
      陪玩: { crit: () => `${u} 陪${targetName}玩出了【暴击】！开心极了！`, normal: () => `${u} 陪${targetName}玩耍，亲密度提升了不少。` },
      顺毛: { crit: () => `${u} 凑过去让${targetName}顺毛...暴击！舒服得打呼噜！`, normal: () => `${u} 凑过去让${targetName}顺了顺毛。` },
      摸摸: { crit: () => `${u} 凑过去让${targetName}摸摸...暴击！舒服得眯起了眼！`, normal: () => `${u} 凑过去让${targetName}摸了摸。` },
      亲亲: { crit: () => `${u} 亲了${targetName}一口！暴击！脸红透了！`, normal: () => `${u} 亲了亲${targetName}。` },
      捏脸: { crit: () => `${u} 让${targetName}捏脸...暴击！软软的！`, normal: () => `${u} 让${targetName}捏了捏脸。` },
      抱抱: { crit: () => `${u} 扑进${targetName}怀里！暴击抱抱！温暖溢出！`, normal: () => `${u} 抱了抱${targetName}，好温暖。` },
      送礼物: { crit: () => `${u} 精心准备了礼物送给${targetName}！${targetName}感动不已！`, normal: () => `${u} 送了礼物给${targetName}。` }
    }

    let logs
    if (SHARED_ACTIONS.has(action)) {
      logs = ownerLogs
    } else {
      logs = isOwner ? ownerLogs : petLogs
    }
    const entry = logs[action]
    if (!entry) return `${u} 对${targetName}进行了${action}。`

    if (isCrit && entry.crit) return entry.crit()
    return entry.normal ? entry.normal() : `${u} 对${targetName}进行了${action}。`
  }

  formatInteractionReply(result) {
    const cleanText = result.replyText.replace(/<[^>]+>/g, '').replace(/\n/g, ' ')
    if (result.roll === 0) return cleanText
    return `RNG检定[${result.roll}]:\n${cleanText}`
  }

  _snapshotStats(o) {
    return {
      satiety: o.petStats.satiety,
      energy: o.petStats.energy,
      hygiene: o.petStats.hygiene,
      pain: o.petStats.pain,
      sensitivity: o.petStats.sensitivity,
      intimacy: o.intimacy,
      obedience: o.obedience,
      lewd: o.lewd
    }
  }

  _diffStats(before, o) {
    const pctNames = { satiety: '饱', energy: '体', hygiene: '洁', pain: '疼', sensitivity: '敏' }
    const progNames = { lewd: '涩', obedience: '服', intimacy: '亲' }
    const parts = []
    for (const [k, label] of Object.entries(pctNames)) {
      const d = Math.round((o.petStats[k] - before[k]) * 10) / 10
      if (Math.abs(d) > 0.01) parts.push(`${label}${d > 0 ? '+' : ''}${d}`)
    }
    for (const [k, label] of Object.entries(progNames)) {
      const d = Math.round(o[k] - before[k])
      if (d !== 0) parts.push(`${label}${d > 0 ? '+' : ''}${d}`)
    }
    return parts.length > 0 ? parts.join(' ') : null
  }
}

export default InteractionEngine
