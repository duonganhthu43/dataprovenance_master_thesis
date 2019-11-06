import {
  Controller,
  Invokable,
  Param
} from '@worldsibu/convector-core';
import { Dataset } from './dataset.model';
import * as yup from 'yup';
import { BaseProvController } from '../common';
import { DataProvenance, Agent, Entity, Activity, WasGeneratedBy, WasAttributedTo, WasAssociatedWith, ActedOnBehalfOf, Chapter, ProvenananeGenerator, WasDerivedFrom, HadMember, ProvenanceInfo } from '../data-provenance';
import { User } from '../user';
import { Resource } from '../resource/resource.model'
import { Utilities } from '../common/utilities';
import { History } from '@worldsibu/convector-core';

@Controller('dataset')
export class DatasetController extends BaseProvController<Dataset> {
  async onDelete_validate(modelInfo: any, sender: User): Promise<Dataset> {
    return await Dataset.getOne(modelInfo.id)
  }
  // implement abstract base class
  async onUpdate_Validate(modelInfo): Promise<Dataset> {
    let listDataset = await Dataset.query(Dataset, {
      "selector": {
        type: new Dataset().type,
        "id": modelInfo['id'],
        'source': modelInfo['source']
      }
    }) as Dataset[]
    if (listDataset.length !== 1) {
      throw new Error('Theres no dataset related to id' + modelInfo['id'] + 'from ' + modelInfo['source'])
    }
    return listDataset[0]
  }
  async onUpdate(oldModel: Dataset, newInfo: any, sender: User): Promise<Dataset> {
    return this.mappingValue(newInfo, oldModel)
  }
  async onFindDiff(oldValue: any, newValue: any): Promise<any[]> {
    return Utilities.findDiff(oldValue, newValue, { resources: 'id' })
  }
  async onCreateProv(currentSender: User, dataset: Dataset, dataInfo: any) {
    return await this.provenanceInfo_create(dataset, currentSender, dataInfo)
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
    // load again from dataset 
    let savedDataset = await Dataset.getOne(newDataset.id)
    return newDataset

  }
  async associatedAgent_create(newValue: Dataset, info: any): Promise<Agent[]> {
    let userInfoAssociatied = { ...info['user'] }
    if (!userInfoAssociatied || Object.keys(userInfoAssociatied).length < 1) {
      return []
    }
    let associatedAgent = new Agent()
    associatedAgent.info = userInfoAssociatied
    associatedAgent.name = userInfoAssociatied['name']
    let userByID = await Utilities.findUserById(userInfoAssociatied['id'])
    if (userByID) {
      associatedAgent.id = userByID.id
      associatedAgent.associated_type = userByID.type
      associatedAgent.name = userByID.name
      associatedAgent.info = userByID.toJSON(true)
    } else {
      associatedAgent.id = userInfoAssociatied['id']
    }
    return [associatedAgent]
  }

  public async provenanceInfo_extra_update(updatedValue: Dataset, currentSender: User, info: any, oldValue: any, detailDifference: any, currentChapter: Chapter): Promise<Chapter> {
    if (!detailDifference || detailDifference.length < 1) { return currentChapter }
    var result = []
    let modifiedChapter = currentChapter
    detailDifference.forEach(diff => {
      if (diff['key'] && diff['key'] === 'resources' && diff['embededKey'] === 'id' && diff['changes'] && diff['changes'].length > 0) {
        var changes = diff['changes']
        changes.forEach(resourceChanges => {
          if (resourceChanges['type'] === 'add') {
            let resourceEntity = new Entity()
            resourceEntity.name = `resource-${resourceChanges['key']}`
            modifiedChapter.entities = modifiedChapter.entities.concat(resourceEntity)
            let hadMember = new HadMember()
            hadMember.entity = `prov:${resourceEntity.name}`
            hadMember.collection = ProvenananeGenerator.getProvName(currentChapter.entities[0])
            modifiedChapter.provenanceInfo = modifiedChapter.provenanceInfo.concat(hadMember)
          }
        })
      }
    })
    return modifiedChapter
  }

  @Invokable()
  public async create(@Param(yup.object()) datasetInfo: any) { return await super.create(datasetInfo) }

  @Invokable()
  public async update(@Param(yup.object()) datasetInfo: any) { return await super.baseUpdate(datasetInfo) }

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
    return listDataset.map(dataset => <Dataset>dataset.toJSON(true))
  }

  @Invokable()
  public async getbyid(
    @Param(yup.object())
    datasetInfo: any
  ) {
    try {
      let currentSender = await this.validateCurrentSender()
      let datasetById = await Dataset.getOne(datasetInfo['dataset_id'])
      // let listDataset = await Dataset.query(Dataset, {
      //   "selector": {
      //     type: new Dataset().type,
      //     id: datasetInfo['dataset_id']
      //   }
      // }) as Dataset[]
      if (datasetById) {
        let resourceQuerry = {
          "selector": {
            type: new Resource().type,
            "package_id": datasetInfo['dataset_id'],
          }
        }
        let lstResourceByPackageId = await Resource.query(Resource, resourceQuerry) as Resource[]
        return { ...(<Dataset>datasetById.toJSON(true)), resources: lstResourceByPackageId.map(r => <Resource>r.toJSON(true)) }
      }
      console.log('=== return empty array')
      return undefined
    }
    catch (err) {
      console.log('=== error in getbyid', err)
    }
  }
  @Invokable()
  public async gethistory(
    @Param(yup.object())
    datasetInfo: any
  ): Promise<History<Dataset>[]> {
    let currentSender = await this.validateCurrentSender()
    let datasetById = await Dataset.getOne(datasetInfo['datasetId'])
    if (datasetById) {
      return datasetById.history()
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
    var combinedStory = currentDataProvenance.story
    // get related story
    if (false) {
      let resourcesRelated = await Resource.query(Resource, {
        "selector": {
          type: new Resource().type,
          package_id: datasetInfo['datasetId']
        }
      }) as Resource[]
      if (resourcesRelated && resourcesRelated.length > 0) {
        for (var i = 0; i < resourcesRelated.length; i++) {
          let resource = resourcesRelated[i]
          let resourceProv = await DataProvenance.query(DataProvenance, {
            "selector": {
              type: new DataProvenance().type,
              associated_with_obj_id: resource.id,
              object_type: new Resource().type
            }
          }) as DataProvenance[]
          if (resourceProv && resourceProv.length === 1) {
            combinedStory = combinedStory.concat(resourceProv[0].story)
          }
        }
      }
    }
    var response = ProvenananeGenerator.generateProvStoryJS(combinedStory)

    // var response = ProvenananeGenerator.generateProvStoryJS(currentDataProvenance.story)
    // if (true) {
    //   let resourceBunddle = {}
    //   let resourcesRelated = await Resource.query(Resource, {
    //     "selector": {
    //       type: new Resource().type,
    //       package_id: datasetInfo['datasetId']
    //     }
    //   }) as Resource[]
    //   console.log('==== resourcesRelated', resourcesRelated)
    //   if (resourcesRelated && resourcesRelated.length > 0) {
    //     for (var i = 0; i < resourcesRelated.length; i++) {
    //       let resource = resourcesRelated[i]
    //       console.log('==== resource', resource)

    //       let resourceProv = await DataProvenance.query(DataProvenance, {
    //         "selector": {
    //           type: new DataProvenance().type,
    //           associated_with_obj_id: resource.id,
    //           object_type: new Resource().type
    //         }
    //       }) as DataProvenance[]
    //       let resourceStory = resourceProv[0]
    //       let jsonResourceStory = ProvenananeGenerator.generateProvStoryJS(resourceStory.story)
    //       resourceBunddle[`prov:resource-${resource.id}`] = jsonResourceStory
    //     }
    //   }
    //   console.log('===== resourceBunddle ', resourceBunddle)
    //   if (Object.keys(resourceBunddle).length > 0) {
    //     response['bundle'] = resourceBunddle
    //   }

    // }
    return response
  }


  mappingValue(source: object, destination: Dataset): Dataset {
    let newDataset = destination.clone()
    newDataset.title = source['title']
    newDataset.name = source['name']
    let keysArr = ['maintainer', 'author_email', 'url', 'state', 'version', 'notes', 'maintainer_email', 'license_id', 'creator_user_id', 'tags', 'tag_string', 'source', 'owner_org', 'extras', 'allowed_users']
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

}