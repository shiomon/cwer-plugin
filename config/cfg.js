const CONFIG = {
  MAX_LOGS: 10,
  INTERACT_COOLDOWN: 30,
  ADOPT_CHANCE: 0.7,
  RELATION_COOLDOWN: 30 * 60 * 1000,
  BOND_REQUEST_TIMEOUT: 30,
  STAT_LIMITS: {
    satiety: 100,
    energy: 100,
    hygiene: 100,
    pain: 100,
    sensitivity: 100,
    lewd: 1314,
    obedience: 1314,
    intimacy: 1314
  },
  SATIETY_OPTIMAL_MIN: 60,
  SATIETY_OPTIMAL_MAX: 80,
  ENERGY_OPTIMAL_MIN: 80,
  ENERGY_OPTIMAL_MAX: 100,
  PAIN_OPTIMAL_MIN: 80,
  PAIN_OPTIMAL_MAX: 100,
  SENSITIVITY_OPTIMAL_MIN: 80,
  SENSITIVITY_OPTIMAL_MAX: 100,
  HYGIENE_OPTIMAL_MIN: 80,
  HYGIENE_OPTIMAL_MAX: 100,
  NON_OPTIMAL_MULTIPLIER: 0.25,
  INITIAL_GOLD: 99,
  TAUNT_MESSAGES: {
    adoptFail: [
      '就这？连个宠物都抓不住~',
      '哈哈哈，太弱了吧！',
      '人家根本不想跟你走嘛~',
      '你的魅力不够哦，再练练吧！',
      '别白费力气了，你不配~',
      '手残党连领养都不会吗？',
      '宠物看了你一眼，嫌弃地走开了~'
    ],
    stealFail: [
      '想抢？做梦吧你！',
      '你的手太短了够不着~',
      '宠物表示：我不认识你！',
      '抢夺失败，丢人！',
      '别来碰我，你不行~',
      '就这还想抢人？回去练练吧~'
    ],
    noPet: [
      '连宠物都没有还想互动？可怜~',
      '先去领养个宠物再来吧，没人要的单身狗~',
      '没有宠物还在这晃悠？快去领养啊，废物~'
    ],
    notBonded: [
      '还没缔约就想调教？做梦！',
      '亲密度不够还想来这套？宠物不答应~',
      '先提升亲密度缔约了再说吧，心急吃不了热豆腐~'
    ],
    evasion: [
      '你的宠物不乖，挣脱了你的手！',
      '宠物调皮地躲开了~',
      '宠物不配合，扭头就跑！',
      '宠物傲娇地甩开了你~',
      '宠物装作没听见，互动无效！',
      '宠物翻了个白眼，懒得理你~'
    ],
    taunt: [
      '主人太不行了~',
      '太小了没感觉呢~',
      '就这点本事？不够不够~',
      '主人好弱啊，完全没感觉~',
      '这点程度，本宠物完全不在意~',
      '主人你是不是没吃饭啊？',
      '就这？本宠物还没开始热身呢~',
      '主人你是在给我挠痒痒吗？',
      '太小了，完全进不来呢~',
      '主人不行的话，换我来？',
      '哈哈哈，主人你认真的吗？',
      '本宠物表示毫无波澜~',
      '主人加油哦，虽然你很弱~',
      '这点程度连舒服都算不上~',
      '主人你是不是该去锻炼了？'
    ]
  },
  EVASION_TIERS: [
    { max: 99, chance: 0.40 },
    { max: 199, chance: 0.20 },
    { max: 299, chance: 0.05 }
  ],
  INTIMACY_LEVELS: [
    { min: 0, name: '陌生人' },
    { min: 29, name: '熟悉' },
    { min: 99, name: '信赖' },
    { min: 299, name: '依恋之心' },
    { min: 520, name: '告白时刻' },
    { min: 666, name: '非你不可' },
    { min: 999, name: '深情不悔' },
    { min: 1314, name: '一生一世' }
  ],
  BOND_TIERS: {
    bonded: { minIntimacy: 299, label: '缔约' }
  },
  INTERACTION_EFFECTS: {
    投喂: {
      satietyGain: 30, energyGain: 20, intimacyGain: 5,
      critSatietyGain: 40, critEnergyGain: 30, critIntimacyGain: 10,
      painLoss: 10, critPainLoss: 15,
      critThreshold: 90, type: 'pet', goldReward: 3
    },
    洗澡: {
      hygieneGain: 50, intimacyGain: 5,
      critHygieneGain: 70, critIntimacyGain: 10,
      painLoss: 10, critPainLoss: 15,
      critThreshold: 80, type: 'pet', goldReward: 3
    },
    陪玩: {
      intimacyGain: 8, sensitivityGain: 10,
      critIntimacyGain: 16, critSensitivityGain: 18,
      critThreshold: 85, type: 'pet', goldReward: 5
    },
    摸头: {
      intimacyGain: 5, sensitivityGain: 8,
      critIntimacyGain: 10, critSensitivityGain: 14,
      critThreshold: 90, type: 'pet', goldReward: 2
    },
    拥抱: {
      intimacyGain: 5, painLoss: 15,
      critIntimacyGain: 10, critPainLoss: 25,
      critThreshold: 85, type: 'pet', goldReward: 2
    },
    送礼物: {
      intimacyGain: 15, critIntimacyGain: 25,
      critThreshold: 85, type: 'pet', goldReward: 0, goldCost: 20
    },
    挠痒: {
      obedienceGain: 5, lewdGain: 12, intimacyLoss: 3,
      critObedienceGain: 10, critLewdGain: 20, critIntimacyLoss: 5,
      critThreshold: 85, type: 'train', goldReward: 8
    },
    狗叫: {
      lewdGain: 8, intimacyLoss: 3,
      critLewdGain: 16, critIntimacyLoss: 5,
      critThreshold: 85, type: 'train', goldReward: 8
    },
    羞辱: {
      obedienceGain: 10, intimacyLoss: 5,
      critObedienceGain: 20, critIntimacyLoss: 8,
      critThreshold: 90, type: 'train', goldReward: 8
    },
    鞭打: {
      obedienceGain: 8, painGain: 15, intimacyLoss: 8,
      critObedienceGain: 16, critPainGain: 30, critIntimacyLoss: 12,
      critThreshold: 95, type: 'train', goldReward: 8
    },
    打脸: {
      obedienceGain: 6, painGain: 10, intimacyLoss: 8,
      critObedienceGain: 12, critPainGain: 20, critIntimacyLoss: 12,
      critThreshold: 90, type: 'train', goldReward: 8
    },
    打屁股: {
      lewdGain: 8, painGain: 12, intimacyLoss: 6,
      critLewdGain: 16, critPainGain: 24, critIntimacyLoss: 10,
      critThreshold: 88, type: 'train', goldReward: 10
    },
    禁闭: {
      obedienceGain: 10, satietyLoss: 10, energyLoss: 15, intimacyLoss: 8,
      critObedienceGain: 20, critIntimacyLoss: 12,
      critThreshold: 90, type: 'train', goldReward: 12
    },
    振动: {
      lewdGain: 10, sensitivityGain: 15, intimacyLoss: 6,
      critLewdGain: 20, critSensitivityGain: 25, critIntimacyLoss: 10,
      critThreshold: 90, type: 'train', goldReward: 10
    },
    滴蜡: {
      lewdGain: 6, sensitivityGain: 8, painGain: 12, intimacyLoss: 6,
      critLewdGain: 12, critSensitivityGain: 16, critPainGain: 24, critIntimacyLoss: 10,
      critThreshold: 88, type: 'train', goldReward: 10
    },
    强制鞭打: {
      obedienceGain: 12, painGain: 30, intimacyLoss: 20,
      critObedienceGain: 24, critPainGain: 50, critIntimacyLoss: 35,
      critThreshold: 0, type: 'force', goldReward: 15, forceMultiplier: 1.5
    },
    强制禁闭: {
      obedienceGain: 15, satietyLoss: 30, energyLoss: 30, intimacyLoss: 25,
      critObedienceGain: 30, critIntimacyLoss: 40,
      critThreshold: 0, type: 'force', goldReward: 20, forceMultiplier: 1.5
    },
    强制羞辱: {
      obedienceGain: 15, intimacyLoss: 20,
      critObedienceGain: 30, critIntimacyLoss: 35,
      critThreshold: 0, type: 'force', goldReward: 15, forceMultiplier: 1.5
    }
  },
  PET_ACTIONS: {
    撒娇: { intimacyGain: 5, cooldown: 30 * 1000 },
    生气气: { intimacyLoss: 3, satietyGain: 10, cooldown: 30 * 1000 },
    讨好: { intimacyGain: 5, painLoss: 5, cooldown: 30 * 1000 },
    献媚: { intimacyGain: 3, lewdGain: 5, cooldown: 30 * 1000 },
    求关注: { intimacyBonus: 3, cooldown: 30 * 1000 },
    告状: { intimacyLoss: 2, cooldown: 0 },
    勾引: { lewdGain: 5, intimacyGain: 3, ownerGoldReward: 8, cooldown: 30 * 1000 },
    冷战: { intimacyLoss: 5, duration: 30 * 60 * 1000, cooldown: 30 * 1000 }
  },
  INTERACTION_TIME_COST: 15,
  SHOP_TIME_COST: 5,
  DAILY_ENERGY_RECOVERY: 30,
  DAILY_SATIETY_LOSS: 15,
  NIGHT_EVENT_CHANCE: 0.4,
  TICK_DECAY: {
    satiety: -5,
    energy: -5,
    pain: -5,
    sensitivity: -5,
    hygiene: -5
  },
  ACHIEVEMENTS: {
    'first_pet': { name: '初次宠爱', desc: '累计宠爱100点', target: 100, reward: 50 },
    'pet_200': { name: '温柔之手', desc: '累计宠爱200点', target: 200, reward: 60 },
    'pet_500': { name: '千宠百爱', desc: '累计宠爱500点', target: 500, reward: 120 },
    'obedience_66': { name: '初识顺从', desc: '服从值达到66', target: 66, reward: 40 },
    'obedience_299': { name: '渐趋顺从', desc: '服从值达到299', target: 299, reward: 60 },
    'obedience_520': { name: '死心塌地', desc: '服从值达到520', target: 520, reward: 80 },
    'obedience_888': { name: '深度臣服', desc: '服从值达到888', target: 888, reward: 120 },
    'obedience_1314': { name: '永恒臣服', desc: '服从值达到1314', target: 1314, reward: 200 },
    'lewd_66': { name: '涩气初绽', desc: '涩气值达到66', target: 66, reward: 40 },
    'lewd_299': { name: '欲念渐起', desc: '涩气值达到299', target: 299, reward: 60 },
    'lewd_520': { name: '欲念缠身', desc: '涩气值达到520', target: 520, reward: 80 },
    'lewd_888': { name: '欲壑难填', desc: '涩气值达到888', target: 888, reward: 120 },
    'lewd_1314': { name: '极欲化身', desc: '涩气值达到1314', target: 1314, reward: 200 },
    'intimacy_299': { name: '依恋之心', desc: '亲密度达到299', target: 299, reward: 60 },
    'intimacy_520': { name: '告白时刻', desc: '亲密度达到520', target: 520, reward: 80 },
    'intimacy_666': { name: '非你不可', desc: '亲密度达到666', target: 666, reward: 100 },
    'intimacy_999': { name: '深情不悔', desc: '亲密度达到999', target: 999, reward: 120 },
    'intimacy_1314': { name: '一生一世', desc: '亲密度达到1314', target: 1314, reward: 200 },
    'pain_m_awaken': { name: 'M显现', desc: '疼痛首次达到100', type: 'first_reach', stat: 'pain', value: 100, reward: 100 },
    'pain_collapse': { name: '濒临崩溃', desc: '连续3次疼痛为100', type: 'consecutive', stat: 'pain', value: 100, count: 3, reward: 80 },
    'sensitivity_stone': { name: '麻木', desc: '敏感度归零', type: 'reach_zero', stat: 'sensitivity', reward: 50 },
    'sensitivity_fly': { name: '一触即飞', desc: '连续3次敏感度为100', type: 'consecutive', stat: 'sensitivity', value: 100, count: 3, reward: 100 },
    'energy_dying': { name: '奄奄一息', desc: '连续3次体力为0', type: 'consecutive', stat: 'energy', value: 0, count: 3, reward: 80 },
    'energy_revive': { name: '阎王不收', desc: '体力从0恢复', type: 'revive_from_zero', stat: 'energy', reward: 60 },
    'satiety_starving': { name: '饥肠辘辘', desc: '饱食归零', type: 'reach_zero', stat: 'satiety', reward: 50 },
    'satiety_starve_to_death': { name: '我饿死也不', desc: '连续3次饱食为0', type: 'consecutive', stat: 'satiety', value: 0, count: 3, reward: 100 },
    'satiety_overfeed': { name: '你要撑死我', desc: '连续3次饱食为100', type: 'consecutive', stat: 'satiety', value: 100, count: 3, reward: 80 },
    'hygiene_cinderella': { name: '灰姑娘', desc: '连续3次清洁为0', type: 'consecutive', stat: 'hygiene', value: 0, count: 3, reward: 60 },
    'hygiene_lotus': { name: '我有洁癖', desc: '连续3次清洁为100', type: 'consecutive', stat: 'hygiene', value: 100, count: 3, reward: 100 },
    'survivor_3': { name: '黏人的宠物', desc: '宠物存活3天', target: 3, reward: 60 },
    'survivor_30': { name: '久经陪伴', desc: '宠物存活30天', target: 30, reward: 150 },
    'survivor_99': { name: '长长久久', desc: '宠物存活99天', target: 99, reward: 200 },
    'survivor_520': { name: '我爱你', desc: '宠物存活520天', target: 520, reward: 300 },
    'survivor_1314': { name: '一生一世', desc: '宠物存活1314天', target: 1314, reward: 500 },
    'breaker_5': { name: '衣不蔽体', desc: '累计破坏5件衣物', target: 5, reward: 40 },
    'breaker_10': { name: '碎衣狂魔', desc: '累计破坏10件衣物', target: 10, reward: 70 },
    'shop_first_buy': { name: '初入衣柜', desc: '购买1件衣服', type: 'shop_buy', target: 1, reward: 30 },
    'shop_all_buy': { name: '全图鉴', desc: '商店衣服全买', type: 'shop_all', reward: 200 },
    'shop_has_bra': { name: '半柜芬芳', desc: '拥有5件胸罩', type: 'clothes_count', slot: 'bra', target: 5, reward: 50 },
    'shop_5_panty': { name: '迷迭香', desc: '拥有5件内裤', type: 'clothes_count', slot: 'panty', target: 5, reward: 80 },
    'shop_5_shoes': { name: '足控', desc: '拥有5件鞋子', type: 'clothes_count', slot: 'shoes', target: 5, reward: 80 },
    'shop_full_mythic': { name: '神装', desc: '拥有全套神话装', type: 'full_mythic', reward: 300 },
    'shop_destroy_master': { name: '善解人衣', desc: '触发2次10%掉光耐久', type: 'destroy_master', target: 2, reward: 100 },
    'shop_naked_3d': { name: '衣服是什么', desc: '未穿连续3天', type: 'naked_days', target: 3, reward: 60 },
    'shop_naked_7d': { name: '裸体宠物', desc: '未穿连续7天', type: 'naked_days', target: 7, reward: 100 },
    'house_cozy': { name: '温馨之家', desc: '升级到温馨小屋', type: 'house', house: 'cozy', reward: 50 },
    'house_luxury': { name: '豪宅梦', desc: '升级到豪华公寓', type: 'house', house: 'luxury', reward: 80 },
    'house_palace': { name: '帝王享受', desc: '升级到奢华别墅', type: 'house', house: 'palace', reward: 150 },
    'charm_520': { name: '小妖精', desc: '总魅力达到520', target: 520, reward: 80 },
    'charm_1314': { name: '万众倾倒', desc: '总魅力达到1314', target: 1314, reward: 150 },
    'charm_3640': { name: '绝世魅影', desc: '总魅力达到3640', target: 3640, reward: 200 }
  },
  STATUS_TEXTS: [
    { priority: 100, condition: 'energy <= 0 && satiety <= 0', text: '已失去意识，需要紧急抢救...' },
    { priority: 95, condition: 'energy <= 20', text: '精疲力竭，连站起来的力气都没有...' },
    { priority: 90, condition: 'satiety <= 20', text: '饥饿难耐，肚子咕咕叫...' },
    { priority: 85, condition: 'hygiene <= 20', text: '浑身污垢，急需清洁...' },
    { priority: 82, condition: 'sensitivity <= 20', text: '一点感觉都没有吖~' },
    { priority: 80, condition: 'pain >= 80 && energy >= 50 && satiety >= 50', text: 'M属性觉醒，状态极佳！' },
    { priority: 75, condition: 'pain >= 50 && sensitivity >= 50', text: '身体火热，渴望更多刺激...' },
    { priority: 70, condition: 'lewd >= 1314', text: '极欲化身' },
    { priority: 68, condition: 'lewd >= 666', text: '气息紊乱，欲念缠身...' },
    { priority: 66, condition: 'intimacy >= 999', text: '深爱着主人，无法自拔...' },
    { priority: 65, condition: 'intimacy >= 520', text: '深深依恋着主人...' },
    { priority: 62, condition: 'intimacy >= 299', text: '对主人充满依恋' },
    { priority: 60, condition: 'obedience >= 520', text: '温顺乖巧，等待主人指令...' },
    { priority: 55, condition: 'energy >= 80 && satiety >= 80 && hygiene >= 50', text: '精神焕发，活力满满！' },
    { priority: 50, condition: 'pain <= 20', text: '状态平稳，等待互动...' },
    { priority: 0, condition: 'true', text: '正在适应中...' }
  ],
  TRAITS: [
    { priority: 100, condition: 'energy <= 0 && satiety <= 0', name: '濒死', css: 'trait-bad' },
    { priority: 95, condition: 'energy <= 20 && energy > 0', name: '虚脱', css: 'trait-bad' },
    { priority: 90, condition: 'satiety <= 20', name: '饥饿', css: 'trait-bad' },
    { priority: 80, condition: 'hygiene <= 20', name: '污垢', css: 'trait-bad' },
    { priority: 75, condition: 'pain >= 80', name: 'M体质', css: 'trait-lewd' },
    { priority: 70, condition: 'sensitivity >= 80', name: '极度敏感', css: 'trait-lewd' },
    { priority: 65, condition: 'lewd >= 666', name: '欲念缠身', css: 'trait-lewd' },
    { priority: 60, condition: 'lewd >= 299 && lewd < 666', name: '欲念渐起', css: 'trait-lewd' },
    { priority: 55, condition: 'obedience >= 666', name: '绝对服从', css: 'trait-good' },
    { priority: 50, condition: 'obedience >= 299 && obedience < 666', name: '顺从', css: 'trait-good' },
    { priority: 46, condition: 'intimacy >= 666 && intimacy < 999', name: '非你不可', css: 'trait-good' },
    { priority: 45, condition: 'intimacy >= 520 && intimacy < 666', name: '深爱', css: 'trait-good' },
    { priority: 40, condition: 'intimacy >= 299 && intimacy < 520', name: '依恋', css: 'trait-good' },
    { priority: 35, condition: 'energy >= 80 && satiety >= 80', name: '状态良好', css: 'trait-good' },
    { priority: 30, condition: 'hygiene >= 80', name: '洁净', css: 'trait-good' }
  ],
  TRAIT_LIMITS: { bad: 3, good: 3, lewd: 4 }
}

const LOCATIONS = [
  { name: '杂乱的卧室', modifier: { energy: 5, satiety: -3, hygiene: -5 } },
  { name: '黑海岸沙滩', modifier: { sensitivity: 5, intimacy: 5, hygiene: 3, obedience: -3 } },
  { name: '幽暗的地下室', modifier: { pain: 5, obedience: 5, sensitivity: -3 } },
  { name: '温暖的浴场', modifier: { hygiene: 15, satiety: 3, sensitivity: 3, pain: -10 } },
  { name: '梦幻乐园', modifier: { lewd: 10, intimacy: 10, obedience: 10 } },
  { name: '昏暗的酒吧', modifier: { lewd: 5, satiety: 5, energy: -5 } },
  { name: '教室', modifier: { energy: 3, pain: 5, lewd: -3, intimacy: -3 } }
]

const EQUIPMENT_RARITY = {
  common: { name: '普通', color: '#aaaaaa', charm: 0, multiplier: 1.0 },
  rare: { name: '稀有', color: '#44aaff', charmRange: [60, 120], effectCount: 1, multiplier: 1.3 },
  epic: { name: '传说', color: '#ff9933', charmRange: [120, 250], effectCount: 2, multiplier: 1.6 },
  mythic: { name: '神话', color: '#e91e63', charmRange: [250, 520], effectCount: 3, multiplier: 2.0 }
}

const EFFECT_POOL = [
  { stat: 'lewd', range: [1, 5] },
  { stat: 'obedience', range: [1, 5] },
  { stat: 'intimacy', range: [1, 5] },
  { stat: 'pain', range: [1, 5] },
  { stat: 'sensitivity', range: [1, 5] },
  { stat: 'energy', range: [-5, -1] }
]

function generateRandomEffect(count) {
  const effect = {}
  const pool = [...EFFECT_POOL]
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    const { stat, range } = pool.splice(idx, 1)[0]
    const value = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1))
    effect[stat] = value
  }
  return effect
}

const CLOTHING_SLOTS = ['head', 'upper', 'lower', 'bra', 'panty', 'accessory', 'shoes']

const SLOT_NAMES = {
  head: '头饰', upper: '上装', lower: '下装', bra: '胸罩', panty: '内裤', accessory: '饰品', shoes: '鞋子'
}

const CLOTHING_DB = {
  head: [
    { name: '发夹', dur: 100, rarity: 'common' },
    { name: '发带', dur: 100, rarity: 'common' },
    { name: '大圆框眼镜', dur: 100, rarity: 'common' },
    { name: '运动帽', dur: 100, rarity: 'common' },
    { name: '兔耳兜帽', rarity: 'rare' },
    { name: '猫耳贝雷帽', rarity: 'rare' },
    { name: '拘束头套', rarity: 'epic' },
    { name: '盲拘头套', rarity: 'epic' },
    { name: '毛绒猫耳', rarity: 'mythic' }
  ],
  upper: [
    { name: '白色T恤', dur: 100, rarity: 'common' },
    { name: '白色衬衫', dur: 100, rarity: 'common' },
    { name: '紧身透衣', dur: 100, rarity: 'common' },
    { name: '丝质睡衣', dur: 100, rarity: 'common' },
    { name: '女仆装', rarity: 'rare' },
    { name: '丝绸礼服', rarity: 'rare' },
    { name: '胶衣套装', rarity: 'epic' },
    { name: '束缚皮带', rarity: 'epic' },
    { name: '半透猫娘衣', rarity: 'mythic' }
  ],
  lower: [
    { name: '牛仔短裤', dur: 100, rarity: 'common' },
    { name: '百褶短裙', dur: 100, rarity: 'common' },
    { name: '紧身透短裤', dur: 100, rarity: 'common' },
    { name: '丝质短裙', dur: 100, rarity: 'common' },
    { name: '女仆短裙', rarity: 'rare' },
    { name: '皮质热裤', rarity: 'rare' },
    { name: '死库水', rarity: 'epic' },
    { name: '拘束裤', rarity: 'epic' },
    { name: '猫尾超短裙', rarity: 'mythic' }
  ],
  bra: [
    { name: '棉质胸罩', dur: 100, rarity: 'common' },
    { name: '蕾丝胸罩', dur: 100, rarity: 'common' },
    { name: '黑丝胸罩', dur: 100, rarity: 'common' },
    { name: '乳贴', dur: 100, rarity: 'common' },
    { name: '拘束胸罩', rarity: 'rare' },
    { name: '蕾丝半罩', rarity: 'rare' },
    { name: '振动乳贴', rarity: 'epic' },
    { name: '极拘束胸罩', rarity: 'epic' },
    { name: '乳首铃铛夹', rarity: 'mythic' }
  ],
  panty: [
    { name: '棉质内裤', dur: 100, rarity: 'common' },
    { name: '三角内裤', dur: 100, rarity: 'common' },
    { name: '蕾丝内裤', dur: 100, rarity: 'common' },
    { name: '黑丝紧内裤', dur: 100, rarity: 'common' },
    { name: 'C字裤', rarity: 'rare' },
    { name: '蕾丝丁字裤', rarity: 'rare' },
    { name: '开裆内裤', rarity: 'epic' },
    { name: '拘束内裤', rarity: 'epic' },
    { name: '猫型开档', rarity: 'mythic' }
  ],
  accessory: [
    { name: '手表', dur: 100, rarity: 'common' },
    { name: '手链', dur: 100, rarity: 'common' },
    { name: '普通项链', dur: 100, rarity: 'common' },
    { name: '腕带', dur: 100, rarity: 'common' },
    { name: '猫耳头饰', rarity: 'rare' },
    { name: '口球', rarity: 'rare' },
    { name: '真皮项圈', rarity: 'epic' },
    { name: '拘束项圈', rarity: 'epic' },
    { name: '猫铃项圈', rarity: 'mythic' }
  ],
  shoes: [
    { name: '休闲板鞋', dur: 100, rarity: 'common' },
    { name: '软底拖鞋', dur: 100, rarity: 'common' },
    { name: '黑色皮鞋', dur: 100, rarity: 'common' },
    { name: '运动鞋', dur: 100, rarity: 'common' },
    { name: '高跟鞋', rarity: 'rare' },
    { name: '猫爪短靴', rarity: 'rare' },
    { name: '拘束靴', rarity: 'epic' },
    { name: '过膝拘束靴', rarity: 'epic' },
    { name: '猫爪长筒靴', rarity: 'mythic' }
  ]
}

const CLOTHING_PRESETS = [
  {
    name: '运动装',
    clothes: {
      head: { ...CLOTHING_DB.head[3] },
      upper: { ...CLOTHING_DB.upper[2] },
      lower: { ...CLOTHING_DB.lower[2] },
      bra: { ...CLOTHING_DB.bra[2] },
      panty: { ...CLOTHING_DB.panty[3] },
      accessory: { ...CLOTHING_DB.accessory[3] },
      shoes: { ...CLOTHING_DB.shoes[3] }
    }
  }
]

const COMMON_SETS = {
  t1: {
    name: '日常套装', cost: 200,
    items: { head: 0, upper: 0, lower: 0, bra: 0, panty: 0, accessory: 0, shoes: 0 }
  },
  t2: {
    name: '睡衣套装', cost: 250,
    items: { head: 1, upper: 3, lower: 3, bra: 1, panty: 2, accessory: 1, shoes: 1 }
  },
  t3: {
    name: '校园套装', cost: 240,
    items: { head: 2, upper: 1, lower: 1, bra: 3, panty: 1, accessory: 2, shoes: 2 }
  },
  t4: {
    name: '运动套装', cost: 230,
    items: { head: 3, upper: 2, lower: 2, bra: 2, panty: 3, accessory: 3, shoes: 3 }
  }
}

const SHOP_ITEMS = {
  '兔耳兜帽': { cost: 60, type: 'clothing', items: ['head:4'] },
  '猫耳贝雷帽': { cost: 60, type: 'clothing', items: ['head:5'] },
  '女仆装': { cost: 60, type: 'clothing', items: ['upper:4'] },
  '丝绸礼服': { cost: 70, type: 'clothing', items: ['upper:5'] },
  '女仆短裙': { cost: 55, type: 'clothing', items: ['lower:4'] },
  '皮质热裤': { cost: 55, type: 'clothing', items: ['lower:5'] },
  '拘束胸罩': { cost: 50, type: 'clothing', items: ['bra:4'] },
  '蕾丝半罩': { cost: 50, type: 'clothing', items: ['bra:5'] },
  'C字裤': { cost: 45, type: 'clothing', items: ['panty:4'] },
  '蕾丝丁字裤': { cost: 45, type: 'clothing', items: ['panty:5'] },
  '猫耳头饰': { cost: 50, type: 'clothing', items: ['accessory:4'] },
  '口球': { cost: 55, type: 'clothing', items: ['accessory:5'] },
  '高跟鞋': { cost: 55, type: 'clothing', items: ['shoes:4'] },
  '猫爪短靴': { cost: 55, type: 'clothing', items: ['shoes:5'] },
  '拘束头套': { cost: 120, type: 'clothing', items: ['head:6'] },
  '盲拘头套': { cost: 160, type: 'clothing', items: ['head:7'] },
  '胶衣套装': { cost: 200, type: 'clothing', items: ['upper:6'] },
  '束缚皮带': { cost: 200, type: 'clothing', items: ['upper:7'] },
  '死库水': { cost: 180, type: 'clothing', items: ['lower:6'] },
  '拘束裤': { cost: 180, type: 'clothing', items: ['lower:7'] },
  '振动乳贴': { cost: 170, type: 'clothing', items: ['bra:6'] },
  '极拘束胸罩': { cost: 170, type: 'clothing', items: ['bra:7'] },
  '开裆内裤': { cost: 140, type: 'clothing', items: ['panty:6'] },
  '拘束内裤': { cost: 170, type: 'clothing', items: ['panty:7'] },
  '真皮项圈': { cost: 130, type: 'clothing', items: ['accessory:6'] },
  '拘束项圈': { cost: 170, type: 'clothing', items: ['accessory:7'] },
  '拘束靴': { cost: 150, type: 'clothing', items: ['shoes:6'] },
  '过膝拘束靴': { cost: 180, type: 'clothing', items: ['shoes:7'] },
  '毛绒猫耳': { cost: 500, type: 'clothing', items: ['head:8'] },
  '半透猫娘衣': { cost: 600, type: 'clothing', items: ['upper:8'] },
  '猫尾超短裙': { cost: 550, type: 'clothing', items: ['lower:8'] },
  '乳首铃铛夹': { cost: 520, type: 'clothing', items: ['bra:8'] },
  '猫型开档': { cost: 580, type: 'clothing', items: ['panty:8'] },
  '猫铃项圈': { cost: 500, type: 'clothing', items: ['accessory:8'] },
  '猫爪长筒靴': { cost: 550, type: 'clothing', items: ['shoes:8'] }
}

const HOUSES = {
  broken: { name: '破败的房子', emoji: '🏚️', cost: 0, bonus: {} },
  cozy: { name: '温馨小屋', emoji: '🏠', cost: 200, bonus: { goldBonus: 1 } },
  luxury: { name: '豪华公寓', emoji: '🏢', cost: 500, bonus: { goldBonus: 2, intimacyPct: 5 } },
  palace: { name: '奢华别墅', emoji: '🏰', cost: 1000, bonus: { goldBonus: 5, intimacyPct: 10 } }
}

const HOUSE_UPGRADE_ORDER = ['broken', 'cozy', 'luxury', 'palace']

const RANDOM_EVENTS = {
  night: [
    { text: '宠物做了个美梦，心情愉悦~', effect: { intimacy: 3 }, weight: 3 },
    { text: '半夜被雷声惊醒，瑟瑟发抖...', effect: { sensitivity: 5 }, weight: 2 },
    { text: '梦游走出了房间，撞到了墙', effect: { pain: 5 }, weight: 1 },
    { text: '梦里和主人一起玩耍，好开心！', effect: { intimacy: 5, obedience: 3 }, weight: 2 }
  ],
  day: [
    { text: '阳光洒进窗户，温暖舒适~', effect: { energy: 5 }, weight: 3 },
    { text: '不小心打翻了水杯，衣服湿了...', effect: { hygiene: -10 }, weight: 2 },
    { text: '路过商店橱窗，眼巴巴地看着...', effect: { intimacy: 2 }, weight: 2 },
    { text: '在角落里发现了藏起来的零食！', effect: { satiety: 10 }, weight: 1 },
    { text: '被路过的野猫吓了一跳！', effect: { sensitivity: 5, pain: 3 }, weight: 1 }
  ],
  location: {
    '杂乱的卧室': [
      { text: '在床缝里找到了遗忘的零食~', effect: { satiety: 5 }, weight: 2 }
    ],
    '黑海岸沙滩': [
      { text: '海风吹过，沙子钻进了衣服里...', effect: { hygiene: -5, sensitivity: 5 }, weight: 2 }
    ],
    '幽暗的地下室': [
      { text: '黑暗中传来奇怪的声响...', effect: { pain: 5, obedience: 3 }, weight: 2 }
    ],
    '温暖的浴场': [
      { text: '泡在温水里，全身放松~', effect: { hygiene: 10, pain: -5 }, weight: 3 }
    ],
    '梦幻乐园': [
      { text: '坐了旋转木马，好开心！', effect: { intimacy: 5, lewd: 3 }, weight: 2 }
    ],
    '昏暗的酒吧': [
      { text: '喝了一杯果汁，微醺~', effect: { lewd: 5, satiety: 5 }, weight: 2 }
    ],
    '教室': [
      { text: '认真听讲，学到了新知识！', effect: { obedience: 5 }, weight: 2 }
    ]
  }
}

function getUserColor(userId) {
  const colors = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#4caf50', '#ff9800', '#ff5722', '#795548']
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash |= 0
  }
  return colors[Math.abs(hash) % colors.length]
}

const CMD_PREFIX = '([#＃]宠物|[\\$＄])'

export {
  CONFIG, LOCATIONS, EQUIPMENT_RARITY, CLOTHING_SLOTS, SLOT_NAMES, CLOTHING_DB,
  CLOTHING_PRESETS, COMMON_SETS, SHOP_ITEMS, HOUSES, HOUSE_UPGRADE_ORDER,
  RANDOM_EVENTS, generateRandomEffect, getUserColor, CMD_PREFIX
}