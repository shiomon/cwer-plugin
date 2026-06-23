import { CONFIG, EQUIPMENT_RARITY, CLOTHING_SLOTS, getUserColor } from '../config/cfg.js'

const DUR_LOSS_ACTIONS = new Set(['鞭打', '打脸', '打屁股', '振动', '滴蜡'])

const ACTION_META = {
  投喂: { critColor: '#33cc33', normalColor: '#33cc33' },
  洗澡: { critColor: '#44aaff', normalColor: '#88ccff' },
  陪玩: { critColor: '#44ff44', normalColor: '#88cc44' },
  摸头: { critColor: '#33cc33', normalColor: '#aaffaa' },
  拥抱: { critColor: '#44ff44', normalColor: '#aaffaa' },
  送礼物: { critColor: '#ff9900', normalColor: '#ffcc00' },
  挠痒: { critColor: '#ff33ff', normalColor: '#ff66ff' },
  狗叫: { critColor: '#ff9800', normalColor: '#ffcc80' },
  羞辱: { critColor: '#ff9900', normalColor: '#ffcc00' },
  鞭打: { critColor: '#ff3333', normalColor: '#ff6666' },
  打脸: { critColor: '#ff3333', normalColor: '#ff6666' },
  打屁股: { critColor: '#ff3333', normalColor: '#ff6666' },
  禁闭: { critColor: '#7b1fa2', normalColor: '#ab47bc' },
  振动: { critColor: '#e91e63', normalColor: '#ff66ff' },
  滴蜡: { critColor: '#ff5722', normalColor: '#ff8a65' },
  强制鞭打: { critColor: '#ff0000', normalColor: '#cc0000' },
  强制禁闭: { critColor: '#ff0000', normalColor: '#cc0000' },
  强制羞辱: { critColor: '#ff0000', normalColor: '#cc0000' }
}

class InteractionEngine {
  constructor(eventSystem, dataManager) {
    this.es = eventSystem
    this.dm = dataManager
  }

  executeOwnerInteraction(petData, action, userName, userId) {
    const config = CONFIG.INTERACTION_EFFECTS[action]
    if (!config) {
      return { logText: '未知的互动方式', replyText: '未知的互动方式', logColor: '#ccc', roll: 0 }
    }

    const isForce = config.type === 'force'
    const roll = isForce ? 0 : Math.floor(Math.random() * 100) + 1
    const isCrit = !isForce && config.critThreshold > 0 && roll >= config.critThreshold

    const baseBonus = this.dm.getTrainBonusSync(petData)

    const locationModifier = this.es.getLocationModifier(petData, action)

    this.applyAction(petData, action, config, isCrit, baseBonus, locationModifier, false)

    const meta = ACTION_META[action]
    const logColor = isCrit ? meta.critColor : meta.normalColor
    const ownerName = petData.pet?.ownerName || '主人'
    const petName = petData._userId || '宠物'
    let logText = this.getLogText(userName, isCrit, isForce, petName, action, userId)
    let replyText = this.getLogText(userName, isCrit, isForce, petName, action, userId)

    if (DUR_LOSS_ACTIONS.has(action)) {
      const broken = this.damageRandomCommonClothing(petData)
      if (broken.length > 0) {
        const names = broken.map(c => c.name).join('、')
        const msg = `\n【爆衣警告】${names} 被彻底撕碎了！`
        logText += msg
        replyText += msg
      }
    }

    return { logText, replyText, logColor, roll }
  }

  executePetInteraction(ownerData, action, userName, userId) {
    const config = CONFIG.INTERACTION_EFFECTS[action]
    if (!config || !ownerData.pet) {
      return { logText: '未知的互动方式', replyText: '未知的互动方式', logColor: '#ccc', roll: 0 }
    }

    const halfMult = 0.5
    const pet = ownerData.pet

    if (config.intimacyGain) {
      pet.intimacy += Math.round(config.intimacyGain * halfMult)
    }
    if (config.intimacyLoss) {
      pet.intimacy -= Math.round(config.intimacyLoss * halfMult)
    }
    if (config.obedienceGain) {
      pet.obedience += Math.round(config.obedienceGain * halfMult)
    }
    if (config.lewdGain) {
      pet.lewd += Math.round(config.lewdGain * halfMult)
    }

    const ownerName = ownerData.pet.ownerName || '主人'
    let logText = `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span> 对${ownerName}使用了${action}~`
    let replyText = `${userName} 对${ownerName}使用了${action}~`

    return { logText, replyText, logColor: '#aaffaa', roll: 0 }
  }

  applyAction(data, action, config, isCrit, bonus, modifier, isPetSender) {
    const isBonded = data.pet?.status === 'bonded'
    const st = data.stats
    const pet = data.pet

    const satOptimal = st.satiety >= CONFIG.SATIETY_OPTIMAL_MIN && st.satiety <= CONFIG.SATIETY_OPTIMAL_MAX
    const engOptimal = st.energy >= CONFIG.ENERGY_OPTIMAL_MIN
    const hygOptimal = st.hygiene >= CONFIG.HYGIENE_OPTIMAL_MIN
    const sensOptimal = st.sensitivity >= CONFIG.SENSITIVITY_OPTIMAL_MIN
    const painOptimal = isBonded ? st.pain >= CONFIG.PAIN_OPTIMAL_MIN : true

    const satZero = st.satiety <= 0
    const engZero = st.energy <= 0
    const hygZero = st.hygiene <= 0
    const sensZero = st.sensitivity <= 0
    const painZero = st.pain <= 0

    const nm = CONFIG.NON_OPTIMAL_MULTIPLIER

    if (isBonded) {
      if (config.painGain && !painZero) {
        const base = isCrit ? (config.critPainGain || config.painGain) : config.painGain
        data.stats.pain += base * (painOptimal ? 1 : nm)
      }
      if (config.painLoss && !painZero) {
        const base = isCrit ? (config.critPainLoss || config.painLoss) : config.painLoss
        data.stats.pain -= base * (painOptimal ? 1 : nm)
      }
    }
    if (config.satietyGain && !satZero) {
      const base = isCrit ? (config.critSatietyGain || config.satietyGain) : config.satietyGain
      data.stats.satiety += base * (satOptimal ? 1 : nm)
    }
    if (config.satietyLoss && !satZero) {
      const base = config.satietyLoss
      data.stats.satiety -= base * (satOptimal ? 1 : nm)
    }
    if (config.energyGain && !engZero) {
      const base = isCrit ? (config.critEnergyGain || config.energyGain) : config.energyGain
      data.stats.energy += base * (engOptimal ? 1 : nm)
    }
    if (config.energyLoss && !engZero) {
      const base = config.energyLoss
      data.stats.energy -= base * (engOptimal ? 1 : nm)
    }
    if (config.hygieneGain && !hygZero) {
      const base = isCrit ? (config.critHygieneGain || config.hygieneGain) : config.hygieneGain
      data.stats.hygiene += base * (hygOptimal ? 1 : nm)
    }
    if (config.sensitivityGain && !sensZero) {
      const base = isCrit ? (config.critSensitivityGain || config.sensitivityGain) : config.sensitivityGain
      data.stats.sensitivity += base * (sensOptimal ? 1 : nm)
    }

    if (pet) {
      if (config.intimacyGain) {
        const gain = isCrit ? (config.critIntimacyGain || config.intimacyGain) : config.intimacyGain
        const isTrainAction = config.type === 'train' || config.type === 'force'
        pet.intimacy += Math.round(gain * (isTrainAction ? bonus : 1))
      }
      if (config.intimacyLoss) {
        const loss = isCrit ? (config.critIntimacyLoss || config.intimacyLoss) : config.intimacyLoss
        pet.intimacy -= Math.round(loss * (config.forceMultiplier || 1))
      }
      if (config.obedienceGain) {
        const gain = isCrit ? (config.critObedienceGain || config.obedienceGain) : config.obedienceGain
        pet.obedience += Math.round(gain * bonus * (config.forceMultiplier || 1))
      }
      if (config.lewdGain) {
        const gain = isCrit ? (config.critLewdGain || config.lewdGain) : config.lewdGain
        pet.lewd += Math.round(gain * bonus)
      }
    }

    const achValue = config.type === 'pet' ? 10 : (config.type === 'train' ? 8 : 12)
    if (config.type === 'pet') {
      data.achievements.totalPet = (data.achievements.totalPet || 0) + achValue
      data.achievements.totalHeal = (data.achievements.totalHeal || 0) + achValue
    } else {
      data.achievements.totalTrain = (data.achievements.totalTrain || 0) + achValue
    }

    if (modifier) this.es.applyModifier(data.stats, modifier)
  }

  damageRandomCommonClothing(data) {
    const commonSlots = CLOTHING_SLOTS.filter(slot => {
      const item = data.clothes[slot]
      return item && item.rarity === 'common' && item.dur > 0
    })
    if (commonSlots.length === 0) return []
    const targetSlot = commonSlots[Math.floor(Math.random() * commonSlots.length)]
    const item = data.clothes[targetSlot]
    const broken = []
    if (Math.random() < 0.1) {
      item.dur = 0
      data.achievements.destroyMasterCount = (data.achievements.destroyMasterCount || 0) + 1
    } else {
      const damage = Math.floor(Math.random() * 31) + 20
      item.dur = Math.max(0, item.dur - damage)
    }
    if (item.dur === 0) {
      broken.push({ ...item })
      data.clothes[targetSlot] = { name: '未穿', rarity: 'none', charm: 0, dur: 0, effect: null }
      data.sys.clothesBroken = (data.sys.clothesBroken || 0) + 1
      data.achievements.clothesBroken = (data.achievements.clothesBroken || 0) + 1
    }
    return broken
  }

  getLogText(userName, isCrit, isForce, targetName, action, userId) {
    const u = `<span style="color:${getUserColor(userId)};font-weight:600">${userName}</span>：`
    const logs = {
      投喂: { crit: () => `${u} 投喂了丰盛大餐！${targetName}吃得好满足！`, normal: () => `${u} 投喂了零食，${targetName}恢复了饱食和体力。` },
      洗澡: { crit: () => `${u} 小心翼翼帮${targetName}洗澡，非常舒适！`, normal: () => `${u} 帮${targetName}洗了个澡，清洁度恢复了。` },
      陪玩: { crit: () => `${u} 陪${targetName}玩出了【暴击】！开心极了！`, normal: () => `${u} 陪${targetName}玩耍，亲密度提升了不少。` },
      摸头: { crit: () => `${u} 极其温柔地摸头...${targetName}发出了呼噜声！`, normal: () => `${u} 摸了摸${targetName}的头。` },
      拥抱: { crit: () => `${u} 给了${targetName}一个暴击拥抱！温暖溢出！`, normal: () => `${u} 给了${targetName}一个温暖的抱抱。` },
      送礼物: { crit: () => `${u} 送出了精美礼物！${targetName}感动不已！`, normal: () => `${u} 送了礼物给${targetName}。` },
      挠痒: { crit: () => `${u} 挠痒挤出了【暴击】！${targetName}笑到窒息！`, normal: () => `${u} 疯狂挠${targetName}的痒！` },
      狗叫: { crit: () => `${u}让${targetName}学出了【暴击狗叫】！彻底沦陷！`, normal: () => `${u}让${targetName}学了一声狗叫，害羞了。` },
      羞辱: { crit: () => `${u} 的羞辱让${targetName}深深恐惧！`, normal: () => `${u} 对${targetName}进行了严厉羞辱。` },
      鞭打: { crit: () => `${u} 挥鞭抽出了【暴击】！${targetName}皮开肉绽！`, normal: () => `${u} 狠狠鞭打了${targetName}。` },
      打脸: { crit: () => `${u} 一巴掌扇出了【暴击】！${targetName}脸都肿了！`, normal: () => `${u} 扇了${targetName}一巴掌。` },
      打屁股: { crit: () => `${u} 一巴掌打出【暴击】！${targetName}屁股红透了！`, normal: () => `${u} 狠狠打了${targetName}的屁股。` },
      禁闭: { crit: () => `${u} 把${targetName}关进小黑屋，彻底屈服！`, normal: () => `${u} 把${targetName}关进了禁闭室。` },
      振动: { crit: () => `${u} 开启了【强力振动】！${targetName}身体颤抖不已！`, normal: () => `${u} 开启了振动模式，${targetName}敏感度大幅提升。` },
      滴蜡: { crit: () => `${u} 滴蜡滴出了【暴击】！${targetName}又痛又爽！`, normal: () => `${u} 在${targetName}身上滴下蜡烛。` },
      强制鞭打: { crit: () => `${u} 强制鞭打！${targetName}无处可逃！`, normal: () => `${u} 强制鞭打！${targetName}无处可逃！` },
      强制禁闭: { crit: () => `${u} 强制关禁闭！${targetName}被彻底锁住！`, normal: () => `${u} 强制关禁闭！${targetName}被彻底锁住！` },
      强制羞辱: { crit: () => `${u} 强制羞辱！${targetName}尊严尽失！`, normal: () => `${u} 强制羞辱！${targetName}尊严尽失！` }
    }
    const entry = logs[action]
    if (!entry) return `${u} 对${targetName}进行了${action}。`
    if (isForce) return entry.crit ? entry.crit() : `${u} 强制对${targetName}进行了${action}！`
    if (isCrit && entry.crit) return entry.crit()
    return entry.normal ? entry.normal() : `${u} 对${targetName}进行了${action}。`
  }

  formatInteractionReply(result) {
    const cleanText = result.replyText.replace(/<[^>]+>/g, '').replace(/\n/g, ' ')
    if (result.roll === 0) return cleanText
    return `RNG检定[${result.roll}]:\n${cleanText}`
  }
}

export default InteractionEngine
