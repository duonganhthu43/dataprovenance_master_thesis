import { BaseComponent, ProvenanceInfo, Chapter, Agent, Activity, Entity } from '.'
var hash = require('object-hash');
const groupBy = key => array =>
  array.reduce((objectsByKeyValue, obj) => {
    const value = obj[key];
    objectsByKeyValue[value] = (objectsByKeyValue[value] || []).concat(obj);
    return objectsByKeyValue;
  }, {});

export class ProvenananeGenerator {
  static getProvName<T extends BaseComponent<T>>(input: T) {
    return `prov:${input.name.replace(/\s/g, "_")}${input.hashInfo ? `_${input.hashInfo}` : ''}`
  }

  static getProvAttOfActivity(input) {
    var result = {}
    if (input.info && input.info.length > 0) {
      result = {
        "prov:changes": this.stringifyValue(input.info)
      }
    }
    return result
  }
  static getProvAttOfAgent(input) {
    var result = {}
    let keysDisplay = ['email', 'fullname', 'name', 'id']
    let keys = Object.keys(input.info)
    keys.forEach(el => {
      if (keysDisplay.findIndex((k) => { return k === el }) > 0 && input.info[el] !== null && input.info[el] !== undefined && input.info[el] !== "") {
        result[`prov:${el}`] = input.info[el]
      }
    })
    return result
  }

  static getProvAttOfEntity(input) {
    var result = {}
    let keysDisplay = ['id', 'name', 'title', 'state', 'license_id', 'resources']
    let keys = Object.keys(input.info)
    keys.forEach(el => {
      if (keysDisplay.findIndex((k) => { return k === el }) > 0 && input.info[el] !== null && input.info[el] !== undefined && input.info[el] !== "") {
        result[`prov:${el}`] = ProvenananeGenerator.stringifyValue(input.info[el])
      }
    })
    return result
  }

  static getProvAtt<T extends BaseComponent<T>>(input: T) {
    if (input.type === 'activity') {
      return ProvenananeGenerator.getProvAttOfActivity(input)
    }
    return {}
    var result = {
      'prov:type': input.associated_type ? input.associated_type : input.constructor.name,
    }
    if (input.type === 'activity') {
      return ProvenananeGenerator.getProvAttOfActivity(input)
    }
    if (input.type === 'agent') {
      return ProvenananeGenerator.getProvAttOfAgent(input)
    }
    if (input.type === 'entity') {
      return ProvenananeGenerator.getProvAttOfEntity(input)
    }
    if (input.info && Object.keys(input.info).length > 0) {
      let keys = Object.keys(input.info)
      keys.forEach(el => {
        if (input.info[el] !== null && input.info[el] !== undefined && input.info[el] !== "")
          result[`prov:${el}`] = ProvenananeGenerator.stringifyValue(input.info[el])
      });
    }
    return result
  }
  static stringifyValue(inpuValue: any) {
    return JSON.stringify(inpuValue, (key, value) => { if (value !== null) return value })
  }

  static generateProvJS<T extends ProvenanceInfo>(input: T) {
    var myInput: any = input
    if (input instanceof ProvenanceInfo) {
      myInput = input.toJSON(true)
    }
    let keys = Object.keys(myInput)
    var result = {}
    if (keys && keys.length > 0) {
      keys.forEach(k => {
        if (k !== 'shortName' && k !== 'type')
          result[`prov:${k}`] = myInput[k]
      })
    }
    return result
  }

  static generateDatasetHashName(info) {
    // let myHash =  hash.MD5(info)
    let hashObject = Object.assign({}, info)
    let myHash = hash(hashObject, { algorithm: 'md5', encoding: 'base64', respectType: 'false' })
    return `prov:${info['name'].replace(/\s/g, "_")}_${myHash}`
  }

  static generateEntitiesProvJS(entities) {

    let modifiedEntities = {}
    entities.forEach(entity => {
      let entityId = entity && entity.info && entity.info.id
      if (!modifiedEntities[entityId]) {
        modifiedEntities[entityId] = [entity]
      } else {
        modifiedEntities[entityId] = modifiedEntities[entityId].concat(entity)
        modifiedEntities[entityId].sort((a, b) => { return a.modified - b.modified })
      }
    })
    let entityObj = {}
    // get keys 
    let idsObj = Object.keys(modifiedEntities)
    idsObj.forEach((id) => {
      // array byId
      let arrayById = modifiedEntities[id]
      arrayById.forEach((entity, idx) => {
        entityObj[ProvenananeGenerator.getProvName(entity)] = ProvenananeGenerator.getProvAtt(entity)
      });

    })
    return entityObj
  }

  static generateChapterProvJS(input: Chapter) {
    let agentObj = {}
    input.agents.forEach(agent => {
      agentObj[ProvenananeGenerator.getProvName(agent)] = ProvenananeGenerator.getProvAtt(agent)
    })
    let entityObj = ProvenananeGenerator.generateEntitiesProvJS(input.entities)
    let activityObj = {}
    input.activities.forEach(activity => {
      activityObj[ProvenananeGenerator.getProvName(activity)] = ProvenananeGenerator.getProvAtt(activity)
    })
    var result = {
      "agent": agentObj,
      "entity": entityObj,
      "activity": activityObj,
    }

    const groupByType = groupBy('type');
    let proveByType = groupByType(input.provenanceInfo)
    let keyTypes = Object.keys(proveByType)

    if (keyTypes && keyTypes.length > 0) {
      keyTypes.forEach((key) => {
        let arrayWithKey = proveByType[key]
        let objectWithKey = {}
        arrayWithKey.forEach((provenance: ProvenanceInfo, idx) => {
          let keyName = "_:" + provenance.shortName + idx
          objectWithKey[keyName] = ProvenananeGenerator.generateProvJS(provenance)
        })
        result[key] = objectWithKey
      })
    }
    return result
  }

  static generateProvStoryJS(input: Array<Chapter>) {
    // merge all chapter into single 1
    if (input && input.length > 0) {
      let agents: Agent[] = []
      let activities: Activity[] = []
      let entities: Entity[] = []
      let prov: ProvenanceInfo[] = []
      input.forEach(chapter => {
        agents = agents.concat(chapter.agents)
        activities = activities.concat(chapter.activities)
        entities = entities.concat(chapter.entities)
        prov = prov.concat(chapter.provenanceInfo)
      })

      // distinct agents
      let checkedAgentHash: Array<string> = []
      let distinctAgents = []
      agents.forEach(agent => {
        if (checkedAgentHash.findIndex((value) => { return value === agent.hashInfo }) < 0) {
          checkedAgentHash = checkedAgentHash.concat(agent.hashInfo)
          distinctAgents = distinctAgents.concat(agent)
        }
      })

      // distinct entities
      let checkedEntitiesHash: Array<string> = []
      let distinctEntities = []
      entities.forEach(entity => {
        if (checkedEntitiesHash.findIndex((value) => { return entity.hashInfo ? value === entity.hashInfo : value === entity.name }) < 0) {
          checkedEntitiesHash = checkedEntitiesHash.concat(entity.hashInfo)
          distinctEntities = distinctEntities.concat(entity)
        }
      })
      // distinct activities
      let checkedActivitiesHash: Array<string> = []
      let distinctActivities = []
      activities.forEach(activity => {
        if (checkedActivitiesHash.findIndex((value) => { return value === activity.hashInfo }) < 0) {
          checkedActivitiesHash = checkedActivitiesHash.concat(activity.hashInfo)
          distinctActivities = distinctActivities.concat(activity)
        }
      })

      let combinedChapter = new Chapter()
      combinedChapter.entities = distinctEntities
      combinedChapter.agents = distinctAgents
      combinedChapter.activities = distinctActivities
      combinedChapter.provenanceInfo = prov
      return ProvenananeGenerator.generateChapterProvJS(combinedChapter)

    }
    return undefined
  }
}