import {
  Controller,
  Invokable,
  Param
} from '@worldsibu/convector-core';
import { Dataset } from './dataset.model';
import * as yup from 'yup';
import { BaseController } from '../common';
import { DataProvenance, Agent, Entity, Activity, WasGeneratedBy, WasAttributedTo, WasAssociatedWith, ActedOnBehalfOf, Chapter, ProvenananeGenerator, WasDerivedFrom } from '../data-provenance';
import { User } from '../user';
import { Resource } from '../resource/resource.model'
import { Utilities } from '../common/utilities';

@Controller('dataset')
export class DatasetController extends BaseController<Dataset> {
  public async onCreateProv(currentSender: User, dataset: Dataset, dataInfo: any) {
    return await this.provenanceInfo_create(dataset,currentSender,dataInfo)
  }
  async onCreate(modelInfo: any, sender: User): Promise<Dataset> {
    let listDataset = await Dataset.query(Dataset, {
      "selector": {
        type: new Dataset().type,
        "id": modelInfo['id'],
        'source': modelInfo['source']
      }
    }) as Dataset[]
    if (listDataset.length > 0) {
      throw new Error('There already existed dataset with id' + modelInfo['id'] + 'from ' + modelInfo['source'])
    }
    let newDataset = new Dataset()
    newDataset.createAuditField(this.sender)
    newDataset = this.mappingValue(modelInfo, newDataset)
    newDataset.id = modelInfo.id ? modelInfo.id : this.tx.stub.generateUUID(JSON.stringify(modelInfo))
    await newDataset.save();
    return newDataset

  }
  
  @Invokable()
  public async create(
    @Param(yup.object())
    datasetInfo: any
  ) {
    return await super.create(datasetInfo)
  }

  @Invokable()
  public async getlist(
  ) {
    let currentSender = await this.validateCurrentSender()
    let listDataset = await Dataset.query(Dataset, {
      "selector": {
        type: new Dataset().type,
        "creator_user_id": currentSender.id,
      }
    }) as Dataset[]
    return JSON.parse(JSON.stringify(listDataset))
  }
  
  @Invokable()
  public async getbyid(
    @Param(yup.object())
    datasetInfo: any
  ) {
    let currentSender = await this.validateCurrentSender()
    let listDataset = await Dataset.query(Dataset, {
      "selector": {
        type: new Dataset().type,
        id: datasetInfo['dataset_id']
      }
    }) as Dataset[]
    if (listDataset && listDataset.length > 0) {
      let fistDataset = listDataset[0]

      let resourceQuerry = {
        "selector": {
          type: new Resource().type,
          "package_id": datasetInfo['dataset_id'],
        }
      }
      let lstResourceByPackageId = await Resource.query(Resource, resourceQuerry) as Resource[]
      let jsonResource = <Resource[]>lstResourceByPackageId.map(value => value.toJSON())
      return { ...fistDataset.toJSON(), resources: jsonResource }
    }
    return []
  }
  @Invokable()
  public async gethistory(
    @Param(yup.object())
    datasetInfo: any
  ) {
    let currentSender = await this.validateCurrentSender()
    let listDataset = await Dataset.query(Dataset, {
      "selector": {
        type: new Dataset().type,
        id: datasetInfo['datasetId']
      }
    }) as Dataset[]
    if (listDataset && listDataset.length > 0) {
      let fistDataset = listDataset[0]
      let lstHistory = await fistDataset.history()
      return lstHistory.map(valueHist => JSON.parse(JSON.stringify(valueHist)))
    }
    return []
  }

  @Invokable()
  public async getprovenance(
    @Param(yup.object())
    datasetInfo: any
  ) {
    let currentSender = await this.validateCurrentSender()
    let lstDataProvenance = await DataProvenance.query(DataProvenance, {
      "selector": {
        type: new DataProvenance().type,
        associated_with_obj_id: datasetInfo['datasetId'],
        object_type: new Dataset().type
      }
    }) as DataProvenance[]

    if (lstDataProvenance.length !== 1) {
      throw new Error('Cannot find provenance related to this dataset ' + datasetInfo['datasetId'] + 'from ' + datasetInfo['source'])
    }
    let currentDataProvenance = lstDataProvenance[0]
    return ProvenananeGenerator.generateProvStoryJS(currentDataProvenance.story)
  }

  @Invokable()
  public async update(
    @Param(yup.object())
    datasetInfo: any
  ) {
    let currentSender = await this.validateCurrentSender()

    let listDataset = await Dataset.query(Dataset, {
      "selector": {
        type: new Dataset().type,
        "id": datasetInfo['id'],
        'source': datasetInfo['source']
      }
    }) as Dataset[]
    if (listDataset.length !== 1) {
      throw new Error('Theres no dataset related to id' + datasetInfo['id'] + 'from ' + datasetInfo['source'])
    }
    let dataset = listDataset[0]
    let oldValue = { ...dataset.toJSON() }
    dataset = this.mappingValue(datasetInfo, dataset)
    let newValue = { ...dataset.toJSON() }
    let diff = Utilities.findDiff(oldValue, newValue, { resources: 'id' })
    // get previous hash info = 
    if (!diff || diff.length < 1) { return <Dataset>dataset.toJSON() }
    await this.updateProvenanceInfo(dataset, currentSender, newValue, diff, oldValue)
    
    await dataset.save();
    return <Dataset>dataset.toJSON()
  }

  mappingValue(source: object, destination: Dataset) {
    let newDataset = destination.clone()
    newDataset.title = source['title']
    newDataset.name = source['name']
    let keysArr = ['maintainer', 'author_email', 'url', 'state', 'version', 'notes', 'maintainer_email', 'license_id', 'creator_user_id', 'tags', 'tag_string', 'source', 'owner_org']
    keysArr.forEach(key => {
      if (source[key]) {
        newDataset[key] = source[key]
      }
    })
    let resourcesList = source['resources']
    let convertedList = []
    if (resourcesList && Array.isArray(resourcesList) && resourcesList.length > 0) {
      let keyArrays = ['description', 'format', 'id', 'mimetype', 'name', 'url', 'url_type']
      resourcesList.forEach(rs => {
        let tempObj = {}
        keyArrays.forEach(key => {
          tempObj[key] = rs[key]
        })
        convertedList = convertedList.concat(tempObj)
      })
      newDataset.resources = convertedList
    } else {
      newDataset.resources = []
    }
    return newDataset
  }












  // public async onCreateAgentsAndEntity(currentSender: User, userInfoAssociatied: any, currentDataset: Dataset, datasetInfo: any) {
  //   let chapter = new Chapter
  //   // create agent from current sender

  //   let currentSender_Agent = this.createAgentFromCurrentSender(currentSender)
  //   chapter.agents = [currentSender_Agent]
  //   // checking if have associatied agent
  //   let associatedAgent: Agent = await this.createAgentFromUserAssociated(userInfoAssociatied);
  //   if (associatedAgent) {
  //     chapter.agents = chapter.agents.concat(associatedAgent)
  //   }
  //   // create current related entity
  //   let entity = this.createRelatedEntity(currentDataset, datasetInfo)
  //   chapter.entities = [entity]
  //   return chapter
  // }

  // public async onCreateChapterComponent(currentSender: User, userInfoAssociatied: any, currentDataset: Dataset, datasetInfo: any) {
  //   let chapter = await this.onCreateAgentsAndEntity(currentSender, userInfoAssociatied, currentDataset, datasetInfo)
  //   let activitity = this.createActivityWithName('create_new_dataset')
  //   chapter.activities = [activitity]
  //   return chapter
  // }

  // public async onUpdatedChapterComponent(currentSender: User, userInfoAssociatied: any, currentDataset: Dataset, datasetInfo: any, detailDifference: any) {
  //   let chapter = await this.onCreateAgentsAndEntity(currentSender, userInfoAssociatied, currentDataset, datasetInfo)
  //   let activitity = this.createActivityWithName('update_dataset')
  //   activitity.info = detailDifference
  //   chapter.activities = [activitity]
  //   return chapter
  // }

  // public async createProvenanceInfo(newDataset: Dataset, currentSender: User, datasetInfo: any) {
  //   // create provenance for dataset
  //   let datasetProvenance = new DataProvenance()
  //   datasetProvenance.associated_with_obj_id = newDataset.id
  //   datasetProvenance.object_type = newDataset.type
  //   let userInfoAssociatied = { ...datasetInfo['user'] }
  //   // manually remove user info
  //   delete datasetInfo["user"]
  //   let newChapter = await this.onCreateChapterComponent(currentSender, userInfoAssociatied, newDataset, datasetInfo)

  //   // create provenance info
  //   let wasGeneratedBy_info = new WasGeneratedBy()
  //   wasGeneratedBy_info.entity = ProvenananeGenerator.getProvName(newChapter.entities[0])
  //   wasGeneratedBy_info.activity = ProvenananeGenerator.getProvName(newChapter.activities[0])
  //   newChapter.provenanceInfo = [wasGeneratedBy_info]

  //   let isHaveUserAssociated: boolean = newChapter.agents.length > 1
  //   let wasAttributedTo_info = new WasAttributedTo()
  //   wasAttributedTo_info.entity = ProvenananeGenerator.getProvName(newChapter.entities[0])
  //   wasAttributedTo_info.agent = isHaveUserAssociated ? ProvenananeGenerator.getProvName(newChapter.agents[1]) : ProvenananeGenerator.getProvName(newChapter.agents[0])
  //   newChapter.provenanceInfo = newChapter.provenanceInfo.concat(wasAttributedTo_info)

  //   if (isHaveUserAssociated) {
  //     let wasAssociatedWith_info = new WasAssociatedWith()
  //     wasAssociatedWith_info.agent = ProvenananeGenerator.getProvName(newChapter.agents[0])
  //     wasAssociatedWith_info.activity =  ProvenananeGenerator.getProvName( newChapter.activities[0])
  //     newChapter.provenanceInfo = newChapter.provenanceInfo.concat(wasAssociatedWith_info)

  //     let actedOnBehalfOf_info = new ActedOnBehalfOf()
  //     actedOnBehalfOf_info.delegate = ProvenananeGenerator.getProvName(newChapter.agents[0])
  //     actedOnBehalfOf_info.responsible = ProvenananeGenerator.getProvName(newChapter.agents[1])
  //     newChapter.provenanceInfo = newChapter.provenanceInfo.concat(actedOnBehalfOf_info)
  //   }

  //   datasetProvenance.story = [newChapter]
  //   datasetProvenance.id = this.tx.stub.generateUUID(`datasetprovenance-${datasetProvenance.associated_with_obj_id}-${datasetProvenance.object_type}`)
  //   return await datasetProvenance.save()
  // }


  // public async updateProvenanceInfo(updatedDataset: Dataset, currentSender: User, datasetInfo: any, detailDifference: any, oldValue: any) {
  //   let lstDataProvenance = await DataProvenance.query(DataProvenance, {
  //     "selector": {
  //       type: new DataProvenance().type,
  //       associated_with_obj_id: updatedDataset.id,
  //       object_type: new Dataset().type
  //     }
  //   }) as DataProvenance[]

  //   if (lstDataProvenance.length !== 1) {
  //     throw new Error('Cannot find story related to this dataset ' + datasetInfo['id'] + 'from ' + datasetInfo['source'])
  //   }
  //   let currentDataProvenance = lstDataProvenance[0]
  //   let userInfoAssociatied = { ...datasetInfo['user'] }
  //   // manually remove user info
  //   delete datasetInfo["user"]

  //   if(Object.keys(userInfoAssociatied).length < 1 && updatedDataset.creator_user_id) {
  //     userInfoAssociatied= {
  //       id: updatedDataset.creator_user_id
  //     } 
  //   }

  //   let newChapter = await this.onUpdatedChapterComponent(currentSender, userInfoAssociatied, updatedDataset, datasetInfo, detailDifference)
  //   // create provenance info
  //   let wasGeneratedBy_info = new WasGeneratedBy()
  //   wasGeneratedBy_info.entity =  ProvenananeGenerator.getProvName(newChapter.entities[0])
  //   wasGeneratedBy_info.activity = ProvenananeGenerator.getProvName( newChapter.activities[0])
  //   newChapter.provenanceInfo = [wasGeneratedBy_info]

  //   let isHaveUserAssociated: boolean = newChapter.agents.length > 1
  //   let wasAttributedTo_info = new WasAttributedTo()
  //   wasAttributedTo_info.entity = ProvenananeGenerator.getProvName( newChapter.entities[0])
  //   wasAttributedTo_info.agent = isHaveUserAssociated ? ProvenananeGenerator.getProvName( newChapter.agents[1]) :  ProvenananeGenerator.getProvName(newChapter.agents[0])
  //   newChapter.provenanceInfo = newChapter.provenanceInfo.concat(wasAttributedTo_info)

  //   if (isHaveUserAssociated) {
  //     let wasAssociatedWith_info = new WasAssociatedWith()
  //     wasAssociatedWith_info.agent =  ProvenananeGenerator.getProvName( newChapter.agents[0])
  //     wasAssociatedWith_info.activity = ProvenananeGenerator.getProvName( newChapter.activities[0])
  //     newChapter.provenanceInfo = newChapter.provenanceInfo.concat(wasAssociatedWith_info)

  //     let actedOnBehalfOf_info = new ActedOnBehalfOf()
  //     actedOnBehalfOf_info.delegate =  ProvenananeGenerator.getProvName(newChapter.agents[0])
  //     actedOnBehalfOf_info.responsible = ProvenananeGenerator.getProvName(newChapter.agents[1])
  //     newChapter.provenanceInfo = newChapter.provenanceInfo.concat(actedOnBehalfOf_info)
  //   }
  //   // create revision of
  //   let wasDerivedFrom = new WasDerivedFrom()
  //   wasDerivedFrom.generatedEntity =ProvenananeGenerator.getProvName(newChapter.entities[0])
  //   // find latest entity have same id
  //   wasDerivedFrom.usedEntity = ProvenananeGenerator.generateDatasetHashName(oldValue)
    
  //   newChapter.provenanceInfo = newChapter.provenanceInfo.concat(wasDerivedFrom)
  //   currentDataProvenance.story = currentDataProvenance.story.concat(newChapter)
  //   return await currentDataProvenance.save()
  // }

}